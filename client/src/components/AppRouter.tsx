'use client';
import { useEffect } from 'react';
import { useSocket } from '@/context/SocketContext';
import { useGame } from '@/context/GameContext';
import LobbyPage from '@/components/LobbyPage';
import RoomPage from '@/components/RoomPage';
import GamePage from '@/components/GamePage';
import VotePage from '@/components/VotePage';

export default function AppRouter() {
  const { connected, on } = useSocket();
  const { state, dispatch } = useGame();
  const { currentPage } = state;

  // Global socket event bridge from SocketContext to GameContext
  useEffect(() => {
    const offGameContext = on('game:started', (ctx: any) => {
      dispatch({ type: 'SET_GAME_CONTEXT', context: ctx });
    });
    return () => { offGameContext?.(); };
  }, [on, dispatch]);

  return (
    <div className="app-container">
      {/* Connection indicator */}
      <div className={`connection-badge ${connected ? 'connected' : 'disconnected'}`}>
        <span className="conn-dot" />
        {connected ? '已連線' : '連線中…'}
      </div>

      {currentPage === 'lobby' && <LobbyPage />}
      {currentPage === 'room'  && <RoomPage />}
      {currentPage === 'game'  && <GamePage />}
      {currentPage === 'vote'  && <VotePage />}
    </div>
  );
}
