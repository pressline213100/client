'use client';
import React, { createContext, useContext, useReducer, useCallback } from 'react';

const GameContext = createContext(null);

const initialState = {
  playerId: null,
  playerName: '',
  avatar: '🎴',
  room: null,
  hand: [],
  thirteenSegments: null,
  currentPage: 'lobby', // lobby | room | game | vote
  gameContext: null,
  voteState: null,
  trashMessages: [],
};

function gameReducer(state, action) {
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
      const players = state.room.players.map(p =>
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

  const setPlayer = useCallback((playerId, playerName, avatar) => {
    dispatch({ type: 'SET_PLAYER', playerId, playerName, avatar });
  }, []);

  const setRoom = useCallback((room) => {
    dispatch({ type: 'SET_ROOM', room });
  }, []);

  const setPage = useCallback((page) => {
    dispatch({ type: 'SET_PAGE', page });
  }, []);

  const setHand = useCallback((hand) => {
    dispatch({ type: 'SET_HAND', hand });
  }, []);

  const addTrashMessage = useCallback((message) => {
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
  return context as any;
};
