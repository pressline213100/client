// ============================================================
// 撲克牌遊戲伺服器 — Main Socket.io Server
// Port: 3001
// ============================================================

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const {
  createRoom, joinRoom, leaveRoom,
  startGame, sortPlayerHand, advancePlaylist,
  initVote, castVote, resolveVote, getRoom,
} = require('./engine/roomManager');
const { getRandomTrashTalk, resolveShortcut, getShortcuts } = require('./engine/trashTalk');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

// Map: socketId → { playerId, roomId }
const socketPlayerMap = new Map();

// ─── REST Endpoints ──────────────────────────────────────────
app.get('/api/rooms', (req, res) => {
  const { rooms } = require('./engine/roomManager');
  const list = [];
  rooms.forEach(room => {
    if (room.phase === 'waiting') {
      list.push({
        id: room.id,
        name: room.name,
        players: room.players.length,
        maxPlayers: room.maxPlayers,
        playlist: room.gamePlaylist,
      });
    }
  });
  res.json(list);
});

app.get('/api/shortcuts', (req, res) => {
  res.json(getShortcuts());
});

// ─── Socket.io Events ────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`[+] Socket connected: ${socket.id}`);

  // ── Create Room ──
  socket.on('room:create', ({ playerName, avatar, roomName, playlist, settings }) => {
    const playerId = uuidv4();
    const player = {
      id: playerId,
      name: playerName || '玩家',
      avatar: avatar || '🎴',
      isConnected: true,
      hand: [],
      score: 0,
      wins: 0,
    };

    const room = createRoom(player, roomName || '撲克房間', playlist || ['big_two'], settings || {});
    socketPlayerMap.set(socket.id, { playerId, roomId: room.id });

    socket.join(room.id);
    socket.emit('room:created', { room, playerId });
    console.log(`[Room] Created ${room.id} by ${playerName}`);
  });

  // ── Join Room ──
  socket.on('room:join', ({ roomId, playerName, avatar }) => {
    const playerId = uuidv4();
    const player = {
      id: playerId,
      name: playerName || '玩家',
      avatar: avatar || '🎭',
      isConnected: true,
      hand: [],
      score: 0,
      wins: 0,
    };

    const result = joinRoom(roomId, player);
    if (result.error) {
      socket.emit('error', result.error);
      return;
    }

    socketPlayerMap.set(socket.id, { playerId, roomId });
    socket.join(roomId);

    socket.emit('room:joined', { room: result.room, playerId });
    io.to(roomId).emit('player:joined', player);
    io.to(roomId).emit('room:updated', result.room);
    console.log(`[Room] ${playerName} joined ${roomId}`);
  });

  // ── Leave Room ──
  socket.on('room:leave', () => handleLeave(socket));

  // ── Start Game ──
  socket.on('game:start', () => {
    const ctx = socketPlayerMap.get(socket.id);
    if (!ctx) return;
    const room = getRoom(ctx.roomId);
    if (!room || room.hostId !== ctx.playerId) {
      socket.emit('error', '只有房主可以開始遊戲');
      return;
    }

    const result = startGame(ctx.roomId);
    if (result.error) { socket.emit('error', result.error); return; }

    // Send each player their own hand
    result.room.players.forEach(player => {
      const playerSockets = getSocketsByPlayerId(player.id);
      playerSockets.forEach(s => {
        s.emit('game:cardDealt', player.hand);
      });
    });

    io.to(ctx.roomId).emit('game:started', result.room.currentGame);
    io.to(ctx.roomId).emit('room:updated', result.room);
    console.log(`[Game] Started in room ${ctx.roomId} — mode: ${result.room.currentGame.mode}`);
  });

  // ── Sort Hand ──
  socket.on('game:sortHand', () => {
    const ctx = socketPlayerMap.get(socket.id);
    if (!ctx) return;

    const sortedHand = sortPlayerHand(ctx.roomId, ctx.playerId);
    if (sortedHand) {
      socket.emit('game:sorted', sortedHand);
    }
  });

  // ── Play Cards ──
  socket.on('game:playCards', (cards) => {
    const ctx = socketPlayerMap.get(socket.id);
    if (!ctx) return;
    const room = getRoom(ctx.roomId);
    if (!room) return;

    // Broadcast to all players what was played
    io.to(ctx.roomId).emit('game:cardsPlayed', {
      playerId: ctx.playerId,
      cards,
    });
  });

  // ── End Round → Advance Playlist ──
  socket.on('game:endRound', ({ winnerId }) => {
    const ctx = socketPlayerMap.get(socket.id);
    if (!ctx) return;
    const room = getRoom(ctx.roomId);
    if (!room || room.hostId !== ctx.playerId) return;

    // Update win count
    const winner = room.players.find(p => p.id === winnerId);
    if (winner) winner.wins++;

    const advance = advancePlaylist(ctx.roomId);
    if (!advance) return;

    if (advance.done) {
      // Playlist finished → start voting
      const voteTimeoutSecs = room.settings.voteTimeoutSeconds || 15;
      const voteState = initVote(ctx.roomId, voteTimeoutSecs);
      io.to(ctx.roomId).emit('vote:started', { voteState, timeoutSeconds: voteTimeoutSecs });

      // Auto-resolve after timeout
      setTimeout(() => {
        const resolved = resolveVote(ctx.roomId);
        if (!resolved) return;
        io.to(ctx.roomId).emit('vote:result', resolved.result);
        if (resolved.result === 'quit') {
          io.to(ctx.roomId).emit('lobby:return');
        }
      }, voteTimeoutSecs * 1000);
    } else {
      // Next game in playlist
      io.to(ctx.roomId).emit('game:nextMode', advance.nextMode);
      io.to(ctx.roomId).emit('room:updated', advance.room);
    }
  });

  // ── Cast Vote ──
  socket.on('vote:cast', (choice) => {
    const ctx = socketPlayerMap.get(socket.id);
    if (!ctx) return;

    const updatedVote = castVote(ctx.roomId, ctx.playerId, choice);
    if (!updatedVote) return;

    io.to(ctx.roomId).emit('vote:updated', updatedVote);

    // Check if all voted
    const allVoted = Object.values(updatedVote.votes).every(v => v !== null);
    if (allVoted) {
      const resolved = resolveVote(ctx.roomId);
      io.to(ctx.roomId).emit('vote:result', resolved.result);
      if (resolved.result === 'quit') {
        io.to(ctx.roomId).emit('lobby:return');
      }
    }
  });

  // ── Trash Talk ──
  socket.on('trash:send', (message) => {
    const ctx = socketPlayerMap.get(socket.id);
    if (!ctx) return;
    const room = getRoom(ctx.roomId);
    if (!room || !room.settings.trashTalkEnabled) return;

    const player = room.players.find(p => p.id === ctx.playerId);
    let finalMsg;

    // Check shortcut
    const shortcut = resolveShortcut(message);
    if (shortcut) {
      finalMsg = shortcut;
    } else if (message === '!random') {
      finalMsg = getRandomTrashTalk(room.currentGame?.mode || 'big_two', 'general');
    } else {
      finalMsg = { text: message, emoji: '💬' };
    }

    io.to(ctx.roomId).emit('trash:talk', {
      playerId: ctx.playerId,
      playerName: player?.name || '玩家',
      message: finalMsg.text,
      emoji: finalMsg.emoji,
      timestamp: Date.now(),
    });
  });

  // ── Disconnect ──
  socket.on('disconnect', () => {
    console.log(`[-] Socket disconnected: ${socket.id}`);
    handleLeave(socket);
  });
});

// ─── Helper: Handle Leave ─────────────────────────────────────
function handleLeave(socket) {
  const ctx = socketPlayerMap.get(socket.id);
  if (!ctx) return;

  const { playerId, roomId } = ctx;
  socketPlayerMap.delete(socket.id);

  const updatedRoom = leaveRoom(roomId, playerId);

  if (!updatedRoom) {
    io.to(roomId).emit('room:closed');
    return;
  }

  io.to(roomId).emit('player:left', playerId);

  // Notify host migration if host changed
  const newHost = updatedRoom.players.find(p => p.isHost);
  if (newHost && newHost.id !== playerId) {
    io.to(roomId).emit('host:migrated', newHost.id);
  }

  io.to(roomId).emit('room:updated', updatedRoom);
  socket.leave(roomId);
}

// ─── Helper: Get sockets by playerId ─────────────────────────
function getSocketsByPlayerId(playerId) {
  const result = [];
  socketPlayerMap.forEach((ctx, socketId) => {
    if (ctx.playerId === playerId) {
      const s = io.sockets.sockets.get(socketId);
      if (s) result.push(s);
    }
  });
  return result;
}

// ─── Start Server ─────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🃏 撲克牌遊戲伺服器運行於 http://localhost:${PORT}`);
});
