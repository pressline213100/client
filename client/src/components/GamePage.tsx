'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useSocket } from '@/context/SocketContext';
import { useGame } from '@/context/GameContext';
import { CardComponent, FanOfCards } from './Card';

const GAME_LABELS: Record<string, { name: string; icon: string; color: string }> = {
  big_two:      { name: '大老二',   icon: '2️⃣', color: '#6c63ff' },
  bridge:       { name: '橋牌',     icon: '🌉', color: '#00b4d8' },
  solitaire:    { name: '接龍',     icon: '🔗', color: '#06d6a0' },
  dou_dizhu:    { name: '鬥地主',   icon: '👨‍🌾', color: '#ef233c' },
  thirteen:     { name: '十三支',   icon: '🎯', color: '#f77f00' },
  texas_holdem: { name: '德州撲克', icon: '♠️', color: '#e9c46a' },
};

export default function GamePage() {
  const { emit, on } = useSocket();
  const { state, setHand, setRoom, setPage, addTrashMessage, dispatch } = useGame();
  const { room, playerId, hand, gameContext, trashMessages } = state;

  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [trashInput, setTrashInput] = useState('');
  const [playedCards, setPlayedCards] = useState<any[]>([]);
  const [lastPlayer, setLastPlayer] = useState('');
  const [notification, setNotification] = useState('');
  const trashRef = useRef<HTMLDivElement>(null);

  const currentMode = gameContext?.mode || 'big_two';
  const modeInfo = GAME_LABELS[currentMode] || GAME_LABELS.big_two;

  // Socket listeners
  useEffect(() => {
    const offSorted   = on('game:sorted',     (h: any[]) => { setHand(h); setSelectedCards([]); });
    const offDealt    = on('game:cardDealt',  (h: any[]) => { setHand(h); });
    const offUpdated  = on('room:updated',    (r: any)   => setRoom(r));
    const offNextMode = on('game:nextMode',   (mode: string) => {
      showNotification(`🎮 下一局：${GAME_LABELS[mode]?.name || mode}`);
    });
    const offTrash    = on('trash:talk',      (msg: any)  => {
      addTrashMessage(msg);
      setTimeout(() => {
        trashRef.current?.scrollTo({ top: trashRef.current.scrollHeight, behavior: 'smooth' });
      }, 50);
    });
    const offPlayed = on('game:cardsPlayed', ({ playerId: pid, cards }: any) => {
      const p = room?.players.find((x: any) => x.id === pid);
      setPlayedCards(cards);
      setLastPlayer(p?.name || '玩家');
    });
    const offVoteStart = on('vote:started', () => setPage('vote'));
    const offClosed    = on('room:closed',  () => setPage('lobby'));
    const offHost      = on('host:migrated', (newHostId: string) => {
      const p = room?.players.find((x: any) => x.id === newHostId);
      showNotification(`👑 ${p?.name || '玩家'} 成為新房主`);
    });

    return () => {
      offSorted?.(); offDealt?.(); offUpdated?.(); offNextMode?.();
      offTrash?.(); offPlayed?.(); offVoteStart?.(); offClosed?.(); offHost?.();
    };
  }, [on, room, setHand, setRoom, setPage, addTrashMessage]);

  // Keyboard shortcut: Space = auto sort
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' && e.target === document.body) {
        e.preventDefault();
        handleSort();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(''), 3000);
  };

  const toggleCard = useCallback((cardId: string) => {
    setSelectedCards(prev =>
      prev.includes(cardId) ? prev.filter(x => x !== cardId) : [...prev, cardId]
    );
  }, []);

  const handleSort = () => { emit('game:sortHand', null); };

  const handlePlay = () => {
    if (selectedCards.length === 0) return;
    const cards = hand.filter((c: any) => selectedCards.includes(c.id));
    emit('game:playCards', cards);
    setSelectedCards([]);
  };

  const handleTrashSend = () => {
    if (!trashInput.trim()) return;
    emit('trash:send', trashInput.trim());
    setTrashInput('');
  };

  const handleRandomTrash = () => {
    emit('trash:send', '!random');
  };

  const opponents = room?.players.filter((p: any) => p.id !== playerId) || [];
  const selfPlayer = room?.players.find((p: any) => p.id === playerId);
  const isHost = selfPlayer?.isHost;

  // Thirteen segments rendering
  const segments = state.thirteenSegments;

  return (
    <div className="game-page">
      {/* Notification Toast */}
      {notification && (
        <div className="game-notification">{notification}</div>
      )}

      {/* Top Bar */}
      <header className="game-header">
        <div className="game-mode-badge" style={{ borderColor: modeInfo.color }}>
          <span>{modeInfo.icon}</span>
          <span style={{ color: modeInfo.color }}>{modeInfo.name}</span>
        </div>

        {/* Playlist progress */}
        <div className="playlist-progress">
          {room?.gamePlaylist.map((m: string, i: number) => (
            <div
              key={i}
              className={`progress-dot ${i === room.currentPlaylistIndex ? 'current' : i < room.currentPlaylistIndex ? 'done' : ''}`}
              title={GAME_LABELS[m]?.name || m}
            >
              {GAME_LABELS[m]?.icon || '🃏'}
            </div>
          ))}
        </div>

        {isHost && (
          <button className="btn btn-sm btn-danger" onClick={() => emit('game:endRound', { winnerId: null })}>
            結束本局
          </button>
        )}
      </header>

      <div className="game-body">
        {/* Left: Trash Talk */}
        <div className="side-panel trash-panel">
          <div className="trash-title">💬 嗆人頻道</div>
          <div className="trash-messages" ref={trashRef}>
            {trashMessages.map((msg: any, i: number) => (
              <div key={i} className={`trash-msg ${msg.playerId === playerId ? 'self' : ''}`}>
                <span className="trash-emoji">{msg.emoji}</span>
                <div>
                  <div className="trash-name">{msg.playerName}</div>
                  <div className="trash-text">{msg.message}</div>
                </div>
              </div>
            ))}
            {trashMessages.length === 0 && (
              <div className="trash-empty">尚無訊息，率先出口！</div>
            )}
          </div>
          <div className="trash-shortcuts">
            {['!gg', '!wp', '!lol', '!rush', '!cry'].map(s => (
              <button key={s} className="shortcut-chip" onClick={() => {
                setTrashInput(s);
                setTimeout(() => {
                  emit('trash:send', s);
                  setTrashInput('');
                }, 50);
              }}>
                {s}
              </button>
            ))}
            <button className="shortcut-chip random" onClick={handleRandomTrash}>🎲 隨機</button>
          </div>
          <div className="trash-input-row">
            <input
              className="input-field"
              value={trashInput}
              onChange={e => setTrashInput(e.target.value)}
              placeholder="說點什麼…"
              onKeyDown={e => e.key === 'Enter' && handleTrashSend()}
            />
            <button className="btn btn-sm btn-primary" onClick={handleTrashSend}>送出</button>
          </div>
        </div>

        {/* Center: Game Table */}
        <div className="game-table">
          {/* Opponents */}
          <div className="opponents-row">
            {opponents.map((p: any) => (
              <div key={p.id} className="opponent-slot">
                <div className="opponent-avatar">{p.avatar}</div>
                <div className="opponent-name">
                  {p.name}
                  {p.isHost && <span>👑</span>}
                </div>
                <FanOfCards count={p.hand?.length || 13} size="sm" />
                <div className="opponent-card-count">{p.hand?.length || '?'} 張</div>
              </div>
            ))}
          </div>

          {/* Center play area */}
          <div className="play-area">
            {playedCards.length > 0 ? (
              <div className="played-cards">
                <div className="played-by">{lastPlayer} 出牌:</div>
                <div className="played-row">
                  {playedCards.map((c: any) => (
                    <CardComponent key={c.id} card={c} size="md" />
                  ))}
                </div>
              </div>
            ) : (
              <div className="play-hint">
                <span className="hint-icon">🃏</span>
                <span>選擇牌後點擊出牌</span>
              </div>
            )}
          </div>

          {/* Thirteen segments (if applicable) */}
          {currentMode === 'thirteen' && segments && (
            <div className="thirteen-segments">
              {(['tail', 'middle', 'head'] as const).map((seg) => (
                <div key={seg} className="segment">
                  <div className="segment-label">
                    {seg === 'head' ? '頭 (3張)' : seg === 'middle' ? '中 (5張)' : '尾 (5張)'}
                  </div>
                  <div className="segment-cards">
                    {(segments[seg] || []).map((c: any) => (
                      <CardComponent
                        key={c.id}
                        card={c}
                        size="sm"
                        selected={selectedCards.includes(c.id)}
                        onClick={() => toggleCard(c.id)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Self hand */}
          {currentMode !== 'thirteen' && (
            <div className="self-hand">
              <div className="hand-header">
                <span className="hand-label">
                  {selfPlayer?.avatar} {selfPlayer?.name}
                  {selfPlayer?.isHost && ' 👑'}
                  <span className="hand-count"> ({hand.length} 張)</span>
                </span>
                <div className="hand-actions">
                  <button className="btn btn-sm btn-secondary" onClick={handleSort} title="快捷鍵: Space">
                    🔀 理牌 (Space)
                  </button>
                  <button
                    className="btn btn-sm btn-primary"
                    onClick={handlePlay}
                    disabled={selectedCards.length === 0}
                  >
                    ✅ 出牌 ({selectedCards.length})
                  </button>
                  <button
                    className="btn btn-sm btn-ghost"
                    onClick={() => setSelectedCards([])}
                    disabled={selectedCards.length === 0}
                  >
                    取消選擇
                  </button>
                </div>
              </div>
              <div className="hand-cards">
                {hand.map((card: any) => (
                  <CardComponent
                    key={card.id}
                    card={card}
                    size="md"
                    selected={selectedCards.includes(card.id)}
                    onClick={() => toggleCard(card.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Player stats */}
        <div className="side-panel stats-panel">
          <div className="stats-title">📊 本局統計</div>
          {room?.players.map((p: any) => (
            <div key={p.id} className={`stat-player ${p.id === playerId ? 'self' : ''}`}>
              <span className="stat-avatar">{p.avatar}</span>
              <div className="stat-info">
                <div className="stat-name">{p.name} {p.isHost ? '👑' : ''}</div>
                <div className="stat-cards">剩餘 {p.hand?.length ?? '?'} 張</div>
              </div>
              <div className="stat-wins">{p.wins}W</div>
            </div>
          ))}

          <div className="combo-hint">
            <div className="combo-title">牌型識別</div>
            {[
              { type: '同花順', emoji: '🌈', weight: '最高' },
              { type: '四條/炸彈', emoji: '💣', weight: '極高' },
              { type: '葫蘆', emoji: '🏠', weight: '高' },
              { type: '同花', emoji: '♠️', weight: '中高' },
              { type: '順子', emoji: '📈', weight: '中' },
              { type: '三條', emoji: '3️⃣', weight: '低中' },
              { type: '對子', emoji: '2️⃣', weight: '低' },
              { type: '單張', emoji: '1️⃣', weight: '最低' },
            ].map(c => (
              <div key={c.type} className="combo-row">
                <span>{c.emoji}</span>
                <span>{c.type}</span>
                <span className="combo-weight">{c.weight}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
