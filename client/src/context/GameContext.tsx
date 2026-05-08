'use client';
import React, { createContext, useContext, useReducer, useCallback } from 'react';

interface GameState {
  playerId: string | null;
  playerName: string;
  avatar: string;
  room: any;
  hand: any[];
  thirteenSegments: any;
  currentPage: string;
  gameContext: any;
  voteState: any;
  trashMessages: any[];
}

const GameContext = createContext<any>(null);

const initialState: GameState = {
  playerId: null,
  playerName: '',
  avatar: '🎴',
  room: null,
  hand: [],
  thirteenSegments: null,
  currentPage: 'lobby',
  gameContext: null,
  voteState: null,
  trashMessages: [],
};

function gameReducer(state: GameState, action: any): GameState {
  switch (action.type) {
    case 'SET_PLAYER':
      return { ...state, playerId: action.playerId, playerName: action.playerName, avatar: action.avatar };
    case 'SET_ROOM':
      return { ...state, room: action.room };
    case 'SET_PAGE':
      return { ...state, currentPage: action.page };
    case 'SET_HAND':
      return { ...state, hand: action.hand };
    case 'SET_THIRTEEN':
      return { ...state, thirteenSegments: action.segments };
    case 'SET_GAME_CONTEXT':
      return { ...state, gameContext: action.context };
    case 'SET_VOTE':
      return { ...state, voteState: action.voteState };
    case 'ADD_TRASH':
      return { ...state, trashMessages: [...state.trashMessages.slice(-19), action.message] };
    case 'CLEAR_TRASH':
      return { ...state, trashMessages: [] };
    case 'UPDATE_PLAYER_IN_ROOM': {
      if (!state.room) return state;
      const players = state.room.players.map((p: any) =>
        p.id === action.playerId ? { ...p, ...action.updates } : p
      );
      return { ...state, room: { ...state.room, players } };
    }
    case 'RESET':
      return { ...initialState };
    default:
      return state;
  }
}

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, initialState);

  const setPlayer = useCallback((playerId: any, playerName: any, avatar: any) => {
    dispatch({ type: 'SET_PLAYER', playerId, playerName, avatar });
  }, []);

  const setRoom = useCallback((room: any) => {
    dispatch({ type: 'SET_ROOM', room });
  }, []);

  const setPage = useCallback((page: any) => {
    dispatch({ type: 'SET_PAGE', page });
  }, []);

  const setHand = useCallback((hand: any) => {
    dispatch({ type: 'SET_HAND', hand });
  }, []);

  const addTrashMessage = useCallback((message: any) => {
    dispatch({ type: 'ADD_TRASH', message });
  }, []);

  return (
    <GameContext.Provider value={{ state, dispatch, setPlayer, setRoom, setPage, setHand, addTrashMessage }}>
      {children}
    </GameContext.Provider>
  );
}

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) throw new Error('useGame must be used within GameProvider');
  return context;
};
