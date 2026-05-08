'use client';
import { useState, useEffect } from 'react';
import { useSocket } from '@/context/SocketContext';
import { useGame } from '@/context/GameContext';

const AVATARS = ['🎴', '🃏', '♠️', '♥️', '♦️', '♣️', '🎰', '🎲', '🎯', '🦁', '🐯', '🦊', '🐺', '🐻', '🦄', '🐉'];
const GAME_MODES: { id: string; name: string; icon: string; desc: string }[] = [
  { id: 'big_two',      name: '大老二',   icon: '2️⃣', desc: '數字2最大，同花順/四條必贏' },
  { id: 'bridge',       name: '橋牌',     icon: '🌉', desc: '依花色分堆，策略取勝' },
  { id: 'solitaire',    name: '接龍',     icon: '🔗', desc: '花色優先，順序排列' },
  { id: 'dou_dizhu',    name: '鬥地主',   icon: '👨‍🌾', desc: '地主 vs 農民，炸彈稱霸' },
  { id: 'thirteen',     name: '十三支',   icon: '🎯', desc: '智能三道分配' },
  { id: 'texas_holdem', name: '德州撲克', icon: '♠️', desc: 'All-in 的藝術' },
];

export default function LobbyPage() {
  const { emit, on } = useSocket();
  const { setPlayer, setRoom, setPage } = useGame();

  const [tab, setTab] = useState<'join' | 'create'>('join');
  const [playerName, setPlayerName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0]);
  const [roomName, setRoomName] = useState('');
  const [roomId, setRoomId] = useState('');
  const [playlist, setPlaylist] = useState<string[]>(['big_two']);
  const [publicRooms, setPublicRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch public rooms
  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3001';
        const res = await fetch(`${serverUrl}/api/rooms`);
        const data = await res.json();
        setPublicRooms(data);
      } catch { /* server may not be up */ }
    };
    fetchRooms();
    const interval = setInterval(fetchRooms, 3000);
    return () => clearInterval(interval);
  }, []);

  // Socket listeners
  useEffect(() => {
    const offCreated = on('room:created', ({ room, playerId }: any) => {
      setLoading(false);
      setPlayer(playerId, playerName, selectedAvatar);
      setRoom(room);
      setPage('room');
    });
    const offJoined = on('room:joined', ({ room, playerId }: any) => {
      setLoading(false);
      setPlayer(playerId, playerName, selectedAvatar);
      setRoom(room);
      setPage('room');
    });
    const offError = on('error', (msg: string) => {
      setLoading(false);
      setError(msg);
    });
    return () => { offCreated?.(); offJoined?.(); offError?.(); };
  }, [on, playerName, selectedAvatar, setPlayer, setRoom, setPage]);

  const togglePlaylistItem = (id: string) => {
    setPlaylist(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleCreate = () => {
    if (!playerName.trim()) { setError('請輸入玩家名稱'); return; }
    if (!roomName.trim()) { setError('請輸入房間名稱'); return; }
    if (playlist.length === 0) { setError('請至少選擇一個遊戲'); return; }
    setLoading(true); setError('');
    emit('room:create', {
      playerName: playerName.trim(),
      avatar: selectedAvatar,
      roomName: roomName.trim(),
      playlist,
      settings: { autoSort: true, trashTalkEnabled: true, voteTimeoutSeconds: 15, allowSpectators: false },
    });
  };

  const handleJoin = (id?: string) => {
    const target = id || roomId;
    if (!playerName.trim()) { setError('請輸入玩家名稱'); return; }
    if (!target.trim()) { setError('請輸入房間代碼'); return; }
    setLoading(true); setError('');
    emit('room:join', {
      roomId: target.toUpperCase(),
      playerName: playerName.trim(),
      avatar: selectedAvatar,
    });
  };

  return (
    <div className="lobby-page">
      {/* Header */}
      <header className="lobby-header">
        <div className="logo-area">
          <span className="logo-icon">🃏</span>
          <div>
            <h1 className="logo-title">POKER WORLD</h1>
            <p className="logo-sub">多人撲克遊戲平台</p>
          </div>
        </div>
        <div className="header-stats">
          <div className="stat-pill">
            <span className="stat-dot online" />
            <span>{publicRooms.length} 個房間開放中</span>
          </div>
        </div>
      </header>

      <div className="lobby-body">
        {/* Left: Profile */}
        <div className="panel profile-panel">
          <h2 className="panel-title">玩家設定</h2>
          <div className="avatar-grid">
            {AVATARS.map((a, i) => (
              <button
                key={i}
                className={`avatar-btn ${selectedAvatar === a ? 'selected' : ''}`}
                onClick={() => setSelectedAvatar(a)}
              >
                {a}
              </button>
            ))}
          </div>
          <div className="selected-avatar-preview">
            <span>{selectedAvatar}</span>
          </div>
          <input
            className="input-field"
            placeholder="輸入玩家名稱…"
            value={playerName}
            onChange={e => setPlayerName(e.target.value)}
            maxLength={12}
          />
        </div>

        {/* Middle: Tabs */}
        <div className="panel main-panel">
          <div className="tab-bar">
            <button className={`tab-btn ${tab === 'join' ? 'active' : ''}`} onClick={() => setTab('join')}>
              加入房間
            </button>
            <button className={`tab-btn ${tab === 'create' ? 'active' : ''}`} onClick={() => setTab('create')}>
              建立房間
            </button>
          </div>

          {error && <div className="error-banner">{error}</div>}

          {tab === 'join' && (
            <div className="tab-content">
              <div className="input-row">
                <input
                  className="input-field"
                  placeholder="輸入房間代碼 (6碼)"
                  value={roomId}
                  onChange={e => setRoomId(e.target.value.toUpperCase())}
                  maxLength={6}
                />
                <button className="btn btn-primary" onClick={() => handleJoin()} disabled={loading}>
                  {loading ? '加入中…' : '加入'}
                </button>
              </div>

              <div className="rooms-divider">
                <span>或選擇公開房間</span>
              </div>

              <div className="rooms-list">
                {publicRooms.length === 0 ? (
                  <div className="empty-rooms">目前沒有開放的房間</div>
                ) : (
                  publicRooms.map(room => (
                    <div key={room.id} className="room-card" onClick={() => handleJoin(room.id)}>
                      <div className="room-info">
                        <span className="room-name">{room.name}</span>
                        <span className="room-code">#{room.id}</span>
                      </div>
                      <div className="room-meta">
                        <span className="room-games">
                          {room.playlist.map((g: string) => GAME_MODES.find(m => m.id === g)?.icon || g).join(' → ')}
                        </span>
                        <span className="room-players">
                          👥 {room.players}/{room.maxPlayers}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {tab === 'create' && (
            <div className="tab-content">
              <input
                className="input-field"
                placeholder="房間名稱…"
                value={roomName}
                onChange={e => setRoomName(e.target.value)}
                maxLength={20}
              />

              <div className="section-label">遊戲清單 (可多選，依序進行)</div>
              <div className="mode-grid">
                {GAME_MODES.map(mode => (
                  <div
                    key={mode.id}
                    className={`mode-card ${playlist.includes(mode.id) ? 'selected' : ''}`}
                    onClick={() => togglePlaylistItem(mode.id)}
                  >
                    <span className="mode-icon">{mode.icon}</span>
                    <span className="mode-name">{mode.name}</span>
                    <span className="mode-desc">{mode.desc}</span>
                    {playlist.includes(mode.id) && (
                      <span className="mode-order">
                        {playlist.indexOf(mode.id) + 1}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {playlist.length > 0 && (
                <div className="playlist-preview">
                  <span className="playlist-label">遊戲順序：</span>
                  {playlist.map((id, i) => {
                    const m = GAME_MODES.find(x => x.id === id);
                    return (
                      <span key={id} className="playlist-item">
                        {m?.icon} {m?.name}
                        {i < playlist.length - 1 && <span className="playlist-arrow">→</span>}
                      </span>
                    );
                  })}
                </div>
              )}

              <button className="btn btn-primary btn-full" onClick={handleCreate} disabled={loading}>
                {loading ? '建立中…' : '🚀 建立房間'}
              </button>
            </div>
          )}
        </div>

        {/* Right: Leaderboard / Info */}
        <div className="panel info-panel">
          <h2 className="panel-title">遊戲指南</h2>
          <div className="mode-guide">
            {GAME_MODES.map(m => (
              <div key={m.id} className="guide-item">
                <span className="guide-icon">{m.icon}</span>
                <div>
                  <div className="guide-name">{m.name}</div>
                  <div className="guide-desc">{m.desc}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="shortcut-panel">
            <h3 className="panel-title" style={{ fontSize: 13 }}>快捷嗆人指令</h3>
            {['!gg', '!wp', '!lol', '!rush', '!random'].map(s => (
              <span key={s} className="shortcut-tag">{s}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
