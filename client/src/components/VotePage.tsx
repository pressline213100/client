'use client';
import { useEffect, useState } from 'react';
import { useSocket } from '@/context/SocketContext';
import { useGame } from '@/context/GameContext';

export default function VotePage() {
  const { emit, on } = useSocket();
  const { state, setPage, dispatch } = useGame();
  const { room, playerId, voteState } = state;

  const [timeLeft, setTimeLeft] = useState(15);
  const [myVote, setMyVote] = useState<'continue' | 'quit' | null>(null);
  const [result, setResult] = useState<'continue' | 'quit' | null>(null);
  const [votes, setVotes] = useState<Record<string, 'continue' | 'quit' | null>>({});

  useEffect(() => {
    const offVoteStarted = on('vote:started', ({ voteState: vs, timeoutSeconds }: any) => {
      setVotes(vs.votes);
      setTimeLeft(timeoutSeconds);
    });

    const offUpdated = on('vote:updated', (vs: any) => {
      setVotes(vs.votes);
    });

    const offResult = on('vote:result', (r: 'continue' | 'quit') => {
      setResult(r);
      dispatch({ type: 'SET_VOTE', voteState: { result: r } });
    });

    const offReturn = on('lobby:return', () => {
      setTimeout(() => {
        setPage('lobby');
        dispatch({ type: 'RESET' });
      }, 2500);
    });

    return () => { offVoteStarted?.(); offUpdated?.(); offResult?.(); offReturn?.(); };
  }, [on, setPage, dispatch]);

  // Countdown
  useEffect(() => {
    if (result) return;
    if (timeLeft <= 0) return;
    const timer = setInterval(() => setTimeLeft(t => Math.max(0, t - 1)), 1000);
    return () => clearInterval(timer);
  }, [timeLeft, result]);

  const handleVote = (choice: 'continue' | 'quit') => {
    setMyVote(choice);
    emit('vote:cast', choice);
  };

  const continueCount = Object.values(votes).filter(v => v === 'continue').length;
  const quitCount     = Object.values(votes).filter(v => v === 'quit').length;
  const totalVoters   = Object.keys(votes).length;
  const progress      = ((15 - timeLeft) / 15) * 100;

  return (
    <div className="vote-page">
      <div className="vote-card">
        {/* Result overlay */}
        {result && (
          <div className={`result-overlay ${result}`}>
            <div className="result-icon">{result === 'continue' ? '🎉' : '🏁'}</div>
            <div className="result-text">
              {result === 'continue' ? '繼續開局！' : '遊戲結束，回大廳…'}
            </div>
          </div>
        )}

        <div className="vote-header">
          <span className="vote-icon">🗳️</span>
          <h1 className="vote-title">續局投票</h1>
          <p className="vote-subtitle">所有遊戲已完成，要繼續嗎？</p>
        </div>

        {/* Countdown */}
        {!result && (
          <div className="countdown-section">
            <div className="countdown-ring">
              <svg viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
                <circle
                  cx="50" cy="50" r="42" fill="none"
                  stroke={timeLeft <= 5 ? '#ef233c' : '#6c63ff'}
                  strokeWidth="8"
                  strokeDasharray={`${2 * Math.PI * 42}`}
                  strokeDashoffset={`${2 * Math.PI * 42 * (timeLeft / 15)}`}
                  strokeLinecap="round"
                  transform="rotate(-90 50 50)"
                  style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s' }}
                />
              </svg>
              <div className="countdown-number" style={{ color: timeLeft <= 5 ? '#ef233c' : '#fff' }}>
                {timeLeft}
              </div>
            </div>
            <p className="countdown-hint">
              {timeLeft === 0 ? '自動跟票給最高票！' : `${timeLeft} 秒後自動跟票`}
            </p>
          </div>
        )}

        {/* Vote buttons */}
        {!myVote && !result && (
          <div className="vote-buttons">
            <button
              className="vote-btn continue-btn"
              onClick={() => handleVote('continue')}
            >
              <span className="vote-btn-icon">🔥</span>
              <span className="vote-btn-text">繼續玩！</span>
              <span className="vote-btn-sub">再來一輪</span>
            </button>
            <button
              className="vote-btn quit-btn"
              onClick={() => handleVote('quit')}
            >
              <span className="vote-btn-icon">🏁</span>
              <span className="vote-btn-text">結束遊戲</span>
              <span className="vote-btn-sub">回到大廳</span>
            </button>
          </div>
        )}

        {myVote && !result && (
          <div className="voted-indicator">
            <span>{myVote === 'continue' ? '🔥 你選擇繼續' : '🏁 你選擇結束'}</span>
            <span className="voted-waiting">等待其他玩家…</span>
          </div>
        )}

        {/* Vote tally */}
        <div className="vote-tally">
          <div className="tally-row">
            <div className="tally-item continue">
              <span className="tally-icon">🔥</span>
              <span className="tally-count">{continueCount}</span>
              <span className="tally-label">繼續</span>
            </div>
            <div className="tally-vs">VS</div>
            <div className="tally-item quit">
              <span className="tally-icon">🏁</span>
              <span className="tally-count">{quitCount}</span>
              <span className="tally-label">結束</span>
            </div>
          </div>
        </div>

        {/* Player votes */}
        <div className="player-votes">
          {room?.players.map((p: any) => {
            const vote = votes[p.id];
            return (
              <div key={p.id} className="player-vote-row">
                <span className="pv-avatar">{p.avatar}</span>
                <span className="pv-name">{p.name}</span>
                <span className={`pv-vote ${vote ? 'voted' : 'pending'}`}>
                  {vote === 'continue' ? '🔥 繼續' : vote === 'quit' ? '🏁 結束' : '⏳ 等待中'}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
