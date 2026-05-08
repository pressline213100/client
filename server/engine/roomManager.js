// ============================================================
// 房間管理引擎 — Room Manager
// Handles: room CRUD, host migration, game playlist, voting
// ============================================================

const { v4: uuidv4 } = require('uuid');
const { createDeck, dealCards } = require('./cardEngine');
const SortProvider = require('./sortProvider');

// In-memory room store (replace with Redis in production)
const rooms = new Map();

// ─── Helper ───────────────────────────────────────────────────
function getRoom(roomId) {
  return rooms.get(roomId) || null;
}

function saveRoom(room) {
  rooms.set(room.id, room);
}

// ─── Create Room ──────────────────────────────────────────────
function createRoom(hostPlayer, roomName, playlist, settings) {
  const room = {
    id: uuidv4().slice(0, 6).toUpperCase(),
    name: roomName,
    hostId: hostPlayer.id,
    players: [{ ...hostPlayer, isHost: true, seatIndex: 0, joinedAt: Date.now() }],
    maxPlayers: 4,
    gamePlaylist: playlist.length > 0 ? playlist : ['big_two'],
    currentPlaylistIndex: 0,
    currentGame: null,
    phase: 'waiting',
    createdAt: Date.now(),
    settings: {
      autoSort: true,
      trashTalkEnabled: true,
      voteTimeoutSeconds: 15,
      allowSpectators: false,
      ...settings,
    },
    voteState: null,
    voteTimer: null,
  };
  saveRoom(room);
  return room;
}

// ─── Join Room ────────────────────────────────────────────────
function joinRoom(roomId, player) {
  const room = getRoom(roomId);
  if (!room) return { error: '房間不存在' };
  if (room.players.length >= room.maxPlayers) return { error: '房間已滿' };
  if (room.phase !== 'waiting') return { error: '遊戲進行中，無法加入' };

  const seatIndex = room.players.length;
  room.players.push({
    ...player,
    isHost: false,
    seatIndex,
    joinedAt: Date.now(),
    isReady: false,
    isConnected: true,
    hand: [],
    score: 0,
    wins: 0,
  });
  saveRoom(room);
  return { room };
}

// ─── Leave Room ───────────────────────────────────────────────
function leaveRoom(roomId, playerId) {
  const room = getRoom(roomId);
  if (!room) return null;

  room.players = room.players.filter(p => p.id !== playerId);

  // Empty room
  if (room.players.length === 0) {
    rooms.delete(roomId);
    return null;
  }

  // Host migration: assign to earliest-joined remaining player
  if (room.hostId === playerId) {
    const newHost = room.players.reduce((earliest, p) =>
      p.joinedAt < earliest.joinedAt ? p : earliest
    );
    newHost.isHost = true;
    room.hostId = newHost.id;
  }

  saveRoom(room);
  return room;
}

// ─── Start Game ───────────────────────────────────────────────
function startGame(roomId) {
  const room = getRoom(roomId);
  if (!room) return { error: '房間不存在' };

  const currentMode = room.gamePlaylist[room.currentPlaylistIndex];
  const needsJokers = currentMode === 'dou_dizhu';
  const deck = createDeck(needsJokers);

  const cardsPerPlayer = currentMode === 'thirteen' ? 13 : 13;
  const hands = dealCards(deck, room.players.length, cardsPerPlayer);

  const sortRule = buildSortRule(currentMode);

  room.players.forEach((p, i) => {
    p.hand = SortProvider.autoSort(hands[i], { mode: currentMode, sortRule });
  });

  room.currentGame = {
    mode: currentMode,
    sortRule,
    roundNumber: room.currentPlaylistIndex + 1,
    phase: 'playing',
  };
  room.phase = 'playing';

  saveRoom(room);
  return { room };
}

// ─── Sort Player Hand ─────────────────────────────────────────
function sortPlayerHand(roomId, playerId) {
  const room = getRoom(roomId);
  if (!room || !room.currentGame) return null;

  const player = room.players.find(p => p.id === playerId);
  if (!player) return null;

  const result = SortProvider.autoSort(player.hand, room.currentGame);
  if (result.flat) {
    player.hand = result.flat;
    player.thirteenSegments = { head: result.head, middle: result.middle, tail: result.tail };
  } else {
    player.hand = result;
  }

  saveRoom(room);
  return player.hand;
}

// ─── Next Game In Playlist ────────────────────────────────────
function advancePlaylist(roomId) {
  const room = getRoom(roomId);
  if (!room) return null;

  room.currentPlaylistIndex++;
  if (room.currentPlaylistIndex >= room.gamePlaylist.length) {
    // Playlist complete → enter voting
    room.phase = 'voting';
    saveRoom(room);
    return { done: true, room };
  }

  const nextMode = room.gamePlaylist[room.currentPlaylistIndex];
  room.phase = 'waiting';
  room.currentGame = null;
  saveRoom(room);
  return { done: false, nextMode, room };
}

// ─── Voting ───────────────────────────────────────────────────
function initVote(roomId, timeoutSeconds) {
  const room = getRoom(roomId);
  if (!room) return null;

  const votes = {};
  room.players.forEach(p => { votes[p.id] = null; });

  room.voteState = {
    votes,
    timeoutAt: Date.now() + timeoutSeconds * 1000,
    result: 'pending',
  };
  room.phase = 'voting';
  saveRoom(room);
  return room.voteState;
}

function castVote(roomId, playerId, choice) {
  const room = getRoom(roomId);
  if (!room || !room.voteState) return null;

  room.voteState.votes[playerId] = choice;
  saveRoom(room);
  return room.voteState;
}

function resolveVote(roomId) {
  const room = getRoom(roomId);
  if (!room || !room.voteState) return null;

  const votes = room.voteState.votes;
  let continueCount = 0;
  let quitCount = 0;

  Object.values(votes).forEach(v => {
    if (v === 'continue') continueCount++;
    else if (v === 'quit') quitCount++;
  });

  // Auto-vote unvoted players to the leading option
  const nullVoters = Object.entries(votes).filter(([, v]) => v === null).map(([id]) => id);
  if (nullVoters.length > 0) {
    const autoVote = continueCount >= quitCount ? 'continue' : 'quit';
    nullVoters.forEach(id => { room.voteState.votes[id] = autoVote; });
    if (autoVote === 'continue') continueCount += nullVoters.length;
    else quitCount += nullVoters.length;
  }

  const total = room.players.length;

  if (continueCount > quitCount && continueCount > 0) {
    room.voteState.result = 'continue';
    room.currentPlaylistIndex = 0;
    room.phase = 'waiting';
  } else {
    room.voteState.result = 'quit';
    room.phase = 'finished';
  }

  saveRoom(room);
  return room.voteState;
}

// ─── Build Sort Rule ──────────────────────────────────────────
function buildSortRule(gameMode) {
  const rules = {
    big_two:      { primary: 'combo', secondary: 'rank', ascending: true,  gameMode: 'big_two' },
    bridge:       { primary: 'suit',  secondary: 'rank', ascending: true,  gameMode: 'bridge' },
    solitaire:    { primary: 'suit',  secondary: 'rank', ascending: true,  gameMode: 'solitaire' },
    dou_dizhu:    { primary: 'combo', secondary: 'rank', ascending: false, gameMode: 'dou_dizhu' },
    thirteen:     { primary: 'combo', secondary: 'rank', ascending: true,  gameMode: 'thirteen' },
    texas_holdem: { primary: 'rank',  secondary: 'suit', ascending: false, gameMode: 'texas_holdem' },
  };
  return rules[gameMode] || rules.big_two;
}

// ─── Exports ──────────────────────────────────────────────────
module.exports = {
  createRoom,
  joinRoom,
  leaveRoom,
  startGame,
  sortPlayerHand,
  advancePlaylist,
  initVote,
  castVote,
  resolveVote,
  getRoom,
  rooms,
};
