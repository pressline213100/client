'use client';
import { useEffect, useState } from 'react';
import { useSocket } from '@/context/SocketContext';
import { useGame } from '@/context/GameContext';

const GAME_LABELS: Record<string, { name: string; icon: string }> = {
  big_two:      { name: '大老二',   icon: '2️⃣' },
  bridge:       { name: '橋牌',     icon: '🌉' },
  solitaire:    { name: '接龍',     icon: '🔗' },
  dou_dizhu:    { name: '鬥地主',   icon: '👨‍🌾' },
  thirteen:     { name: '十三支',   icon: '🎯' },
  texas_holdem: { name: '德州撲克', icon: '♠️' },
};

export default function RoomPage() {
  const { emit, on } = useSocket();
  const { state, setRoom, setPage } = useGame();
  const { room, playerId } = state;
  const [copied, setCopied] = useState(false);

  const isHost = room?.players.find((p: any) => p.id === playerId)?.isHost;

  useEffect(() => {
    const offUpdated  = on('room:updated',   (r: any) => setRoom(r));
    const offJoined   = on('player:joined',  () => {});
    const offLeft     = on('player:left',    () => {});
    const offMigrated = on('host:migrated',  () => {});
    const offStarted  = on('game:started',   () => setPage('game'));
    const offClosed   = on('room:closed',    () => setPage('lobby'));
    return () => {
      offUpdated?.(); offJoined?.(); offLeft?.();
      offMigrated?.(); offStarted?.(); offClosed?.();
    };
  }, [on, setRoom, setPage]);

  const copyRoomId = () => {
    if (!room?.id) return;
    navigator.clipboard.writeText(room.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLeave = () => {
    emit('room:leave', null);
    setPage('lobby');
  };

  const handleStart = () => {
    emit('game:start', null);
  };

  if (!room) return null;

  return (
    <div className="room-page">
      {/* Header */}
      <header className="room-header">
        <button className="btn btn-ghost" onClick={handleLeave}>← 離開</button>
        <div className="room-title-area">
          <h1 className="room-title">{room.name}</h1>
          <div className="room-id-badge" onClick={copyRoomId}>
            #{room.id}
            <span className="copy-hint">{copied ? '已複製!' : '點擊複製'}</span>
          </div>
        </div>
        <div className="room-header-right">
          {isHost && (
            <button
              className="btn btn-primary"
              onClick={handleStart}
              disabled={room.players.length < 2}
            >
              🚀 開始遊戲
            </button>
          )}
        </div>
      </header>

      <div className="room-body">
        {/* Playlist */}
        <div className="panel playlist-panel">
          <h2 className="panel-title">🎮 遊戲清單</h2>
          <div className="playlist-timeline">
            {room.gamePlaylist.map((mode: string, i: number) => {
              const info = GAME_LABELS[mode] || { name: mode, icon: '🃏' };
              const isCurrent = i === room.currentPlaylistIndex;
              const isPast = i < room.currentPlaylistIndex;
              return (
                <div key={i} className={`timeline-item ${isCurrent ? 'current' : ''} ${isPast ? 'past' : ''}`}>
                  <div className="timeline-dot">
                    {isPast ? '✓' : isCurrent ? '▶' : (i + 1)}
                  </div>
                  <div className="timeline-content">
                    <span className="timeline-icon">{info.icon}</span>
                    <span className="timeline-name">{info.name}</span>
                    {isCurrent && <span className="timeline-badge">當前</span>}
                  </div>
                  {i < room.gamePlaylist.length - 1 && <div className="timeline-line" />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Players */}
        <div className="panel players-panel">
          <h2 className="panel-title">👥 玩家 ({room.players.length}/{room.maxPlayers})</h2>
          <div className="players-grid">
            {room.players.map((p: any, i: number) => (
              <div key={p.id} className={`player-card ${p.id === playerId ? 'self' : ''}`}>
                <div className="player-avatar-wrap">
                  <span className="player-avatar">{p.avatar}</span>
                  {p.isHost && <span className="host-crown">👑</span>}
                  <div className={`online-dot ${p.isConnected ? 'online' : 'offline'}`} />
                </div>
                <div className="player-name">{p.name}</div>
                <div className="player-seat">座位 #{i + 1}</div>
              </div>
            ))}
            {/* Empty seats */}
            {Array.from({ length: room.maxPlayers - room.players.length }).map((_, i) => (
              <div key={`empty_${i}`} className="player-card empty">
                <div className="player-avatar-wrap">
                  <span className="player-avatar" style={{ opacity: 0.3 }}>👤</span>
                </div>
                <div className="player-name" style={{ opacity: 0.3 }}>等待加入…</div>
              </div>
            ))}
          </div>
        </div>

        {/* Room Settings */}
        <div className="panel settings-panel">
          <h2 className="panel-title">⚙️ 房間設定</h2>
          <div className="settings-list">
            <div className="setting-row">
              <span>自動理牌</span>
              <span className={`setting-val ${room.settings.autoSort ? 'on' : 'off'}`}>
                {room.settings.autoSort ? 'ON' : 'OFF'}
              </span>
            </div>
            <div className="setting-row">
              <span>嗆人系統</span>
              <span className={`setting-val ${room.settings.trashTalkEnabled ? 'on' : 'off'}`}>
                {room.settings.trashTalkEnabled ? 'ON' : 'OFF'}
              </span>
            </div>
            <div className="setting-row">
              <span>投票超時</span>
              <span className="setting-val on">{room.settings.voteTimeoutSeconds}秒</span>
            </div>
            <div className="setting-row">
              <span>最大玩家</span>
              <span className="setting-val on">{room.maxPlayers} 人</span>
            </div>
          </div>

          {!isHost && (
            <div className="waiting-hint">
              <div className="waiting-spinner" />
              等待房主開始遊戲…
            </div>
          )}

          {isHost && room.players.length < 2 && (
            <div className="waiting-hint">
              需要至少 2 位玩家才能開始
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
