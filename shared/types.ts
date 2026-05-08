// ============================================================
// 撲克牌遊戲系統 — 核心類型定義
// Universal Poker Game System — Core Type Definitions
// ============================================================

// ─── Card Interface ─────────────────────────────────────────
export type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs' | 'joker';
export type Rank =
  | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10'
  | 'J' | 'Q' | 'K' | 'A'
  | 'small_joker' | 'big_joker';

export interface Card {
  id: string;           // unique card identifier e.g. "spades_A"
  suit: Suit;
  rank: Rank;
  rankValue: number;    // numeric weight (game-dependent)
  suitValue: number;    // numeric suit weight (game-dependent)
  isJoker: boolean;
  faceUp: boolean;
}

// ─── Combo / Hand Types ─────────────────────────────────────
export type ComboType =
  | 'single'
  | 'pair'
  | 'triple'
  | 'straight'
  | 'flush'
  | 'full_house'
  | 'four_of_a_kind'
  | 'straight_flush'
  | 'royal_flush'
  | 'bomb'            // 鬥地主炸彈
  | 'rocket'          // 鬥地主火箭 (雙王)
  | 'sequence_pair'   // 鬥地主連對
  | 'airplane'        // 鬥地主飛機
  | 'invalid';

export interface CardCombo {
  type: ComboType;
  cards: Card[];
  weight: number;     // combo strength for comparison
}

// ─── Game Modes ──────────────────────────────────────────────
export type GameMode =
  | 'big_two'         // 大老二
  | 'bridge'          // 橋牌
  | 'solitaire'       // 接龍
  | 'dou_dizhu'       // 鬥地主
  | 'thirteen'        // 十三支
  | 'texas_holdem';   // 德州撲克

// ─── Sort Dimensions ─────────────────────────────────────────
export type SortDimension = 'rank' | 'suit' | 'combo';

export interface SortRule {
  primary: SortDimension;
  secondary?: SortDimension;
  ascending: boolean;
  gameMode: GameMode;
}

// ─── Game Context ─────────────────────────────────────────────
export interface GameContext {
  mode: GameMode;
  sortRule: SortRule;
  roundNumber: number;
  phase: GamePhase;
}

export type GamePhase =
  | 'waiting'
  | 'dealing'
  | 'playing'
  | 'voting'
  | 'finished';

// ─── Player ──────────────────────────────────────────────────
export interface Player {
  id: string;
  name: string;
  avatar: string;       // emoji or image URL
  isHost: boolean;
  isReady: boolean;
  isConnected: boolean;
  hand: Card[];
  score: number;
  wins: number;
  joinedAt: number;     // timestamp for host migration
  seatIndex: number;
}

// ─── Room ────────────────────────────────────────────────────
export interface Room {
  id: string;
  name: string;
  hostId: string;
  players: Player[];
  maxPlayers: number;
  gamePlaylist: GameMode[];   // game sequence
  currentPlaylistIndex: number;
  currentGame: GameContext | null;
  phase: GamePhase;
  createdAt: number;
  settings: RoomSettings;
}

export interface RoomSettings {
  autoSort: boolean;
  trashTalkEnabled: boolean;
  voteTimeoutSeconds: number;   // default 15
  allowSpectators: boolean;
}

// ─── Voting ──────────────────────────────────────────────────
export interface VoteState {
  votes: Record<string, 'continue' | 'quit' | null>;
  timeoutAt: number;
  result: 'continue' | 'quit' | 'pending';
}

// ─── Thirteen Segments (十三支) ──────────────────────────────
export interface ThirteenSegments {
  head: Card[];    // 頭 (3 cards)
  middle: Card[];  // 中 (5 cards)
  tail: Card[];    // 尾 (5 cards)
}

// ─── Socket Event Payloads ───────────────────────────────────
export interface ServerToClientEvents {
  'room:updated': (room: Room) => void;
  'game:started': (context: GameContext) => void;
  'game:cardDealt': (hand: Card[]) => void;
  'game:sorted': (hand: Card[]) => void;
  'game:nextMode': (mode: GameMode) => void;
  'vote:updated': (state: VoteState) => void;
  'vote:result': (result: 'continue' | 'quit') => void;
  'player:joined': (player: Player) => void;
  'player:left': (playerId: string) => void;
  'host:migrated': (newHostId: string) => void;
  'trash:talk': (payload: TrashTalkPayload) => void;
  'error': (message: string) => void;
}

export interface ClientToServerEvents {
  'room:create': (payload: CreateRoomPayload) => void;
  'room:join': (payload: JoinRoomPayload) => void;
  'room:leave': () => void;
  'game:start': () => void;
  'game:sortHand': () => void;
  'game:playCards': (cards: Card[]) => void;
  'vote:cast': (choice: 'continue' | 'quit') => void;
  'trash:send': (message: string) => void;
}

export interface CreateRoomPayload {
  roomName: string;
  playerName: string;
  avatar: string;
  playlist: GameMode[];
  settings: RoomSettings;
}

export interface JoinRoomPayload {
  roomId: string;
  playerName: string;
  avatar: string;
}

export interface TrashTalkPayload {
  playerId: string;
  playerName: string;
  message: string;
  emoji: string;
  timestamp: number;
}
