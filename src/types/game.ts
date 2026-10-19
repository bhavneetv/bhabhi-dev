export type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';
export type SortMode = 'suit' | 'rank-desc' | 'rank-asc';

export interface Card {
  id: string; // e.g., '0-spades-A'
  suit: Suit;
  rank: Rank;
  deckIndex: 0 | 1;
  value: number; // 2..14 (A=14)
}

export type BotDifficulty = 'easy' | 'medium' | 'hard';

export interface Player {
  id: string;
  name: string;
  avatar: string;
  isBot: boolean;
  botDifficulty?: BotDifficulty;
  cards: Card[];
  cardCount?: number;
  seatIndex: number;
  isHost: boolean;
  isReady: boolean;
  isOut: boolean;
  finishPosition: number | null; // 1, 2, 3...
  isSpeaking?: boolean;
  isOnline?: boolean;
  consecutiveTimeouts: number;
}

export interface TrickPlay {
  playerId: string;
  card: Card;
  isThulla: boolean;
  timestamp: number;
}

export interface Trick {
  leadSuit: Suit | null;
  plays: TrickPlay[];
  outcome?: 'clean' | 'thulla';
  winnerId?: string;
  pickerId?: string;
  pickedCount?: number;
}

export interface LastTrickSummary {
  leaderId: string;
  leadSuit: Suit;
  plays: TrickPlay[];
  outcome: 'clean' | 'thulla';
  winnerId?: string;
  pickerId?: string;
  pickedCount?: number;
}

export type Theme = 'emerald' | 'crimson' | 'cyber';

export interface RoomSettings {
  deckCount: 1 | 2;
  tieRule: 'first' | 'last';
  turnTimerSeconds: number; // 0 for off, 15, 30, 60
  equalHands: boolean;
  pickupMode: 'auto' | 'manual';
  neutralNames: boolean;
  cardTracker: boolean;
  voiceEnabled: boolean;
  maxPlayers: number;
  fourColorSuits: boolean;
  animationSpeed: 'normal' | 'fast' | 'instant';
}

export type GamePhase =
  | 'HOME'
  | 'LOBBY'
  | 'DEALING'
  | 'PLAYING'
  | 'THULLA_RESOLVE'
  | 'CLEAN_RESOLVE'
  | 'GAME_OVER';

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  isSystem?: boolean;
  timestamp: number;
}

export interface FlyingCardAnim {
  id: string;
  card: Card;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  rotation: number;
  duration: number;
}
