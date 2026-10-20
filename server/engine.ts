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
  finishPosition: number | null;
  isSpeaking?: boolean;
  isOnline?: boolean;
  consecutiveTimeouts: number;
  ping?: number;
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

export const SUITS: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs'];
export const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

export const RANK_VALUES: Record<Rank, number> = {
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  '10': 10,
  'J': 11,
  'Q': 12,
  'K': 13,
  'A': 14,
};

export function createDeck(deckCount: 1 | 2 = 1): Card[] {
  const cards: Card[] = [];
  for (let d = 0; d < deckCount; d++) {
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        cards.push({
          id: `${d}-${suit}-${rank}`,
          suit,
          rank,
          deckIndex: d as 0 | 1,
          value: RANK_VALUES[rank],
        });
      }
    }
  }
  return cards;
}

export function shuffleDeck(cards: Card[]): Card[] {
  const shuffled = [...cards];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function dealCards(
  players: Player[],
  deckCount: 1 | 2,
  equalHands: boolean = true
): { dealtPlayers: Player[]; removedCards: Card[] } {
  const deck = shuffleDeck(createDeck(deckCount));
  const playerCount = players.length;
  if (playerCount === 0) return { dealtPlayers: [], removedCards: [] };

  const cardsPerPlayer = equalHands ? Math.floor(deck.length / playerCount) : Math.ceil(deck.length / playerCount);
  const totalToDeal = equalHands ? cardsPerPlayer * playerCount : deck.length;
  const removedCards: Card[] = [];

  if (equalHands && deck.length > totalToDeal) {
    const excess = deck.length - totalToDeal;
    const safeToRemoveIndices: number[] = [];
    for (let i = deck.length - 1; i >= 0 && safeToRemoveIndices.length < excess; i--) {
      const c = deck[i];
      if (!(c.suit === 'spades' && c.rank === 'A')) {
        safeToRemoveIndices.push(i);
      }
    }
    safeToRemoveIndices.sort((a, b) => b - a);
    for (const idx of safeToRemoveIndices) {
      removedCards.push(deck.splice(idx, 1)[0]);
    }
  }

  const hands: Card[][] = Array.from({ length: playerCount }, () => []);
  deck.forEach((card, i) => {
    if (i < totalToDeal) {
      hands[i % playerCount].push(card);
    }
  });

  const dealtPlayers = players.map((p, idx) => ({
    ...p,
    cards: sortHand(hands[idx] || []),
    cardCount: (hands[idx] || []).length,
    isOut: false,
    finishPosition: null,
  }));

  return { dealtPlayers, removedCards };
}

export function sortHand(cards: Card[], mode: SortMode = 'suit'): Card[] {
  const suitOrder: Record<Suit, number> = { spades: 0, hearts: 1, clubs: 2, diamonds: 3 };
  return [...cards].sort((a, b) => {
    if (mode === 'rank-desc') {
      if (b.value !== a.value) return b.value - a.value;
      return suitOrder[a.suit] - suitOrder[b.suit];
    }
    if (mode === 'rank-asc') {
      if (a.value !== b.value) return a.value - b.value;
      return suitOrder[a.suit] - suitOrder[b.suit];
    }
    if (suitOrder[a.suit] !== suitOrder[b.suit]) {
      return suitOrder[a.suit] - suitOrder[b.suit];
    }
    return a.value - b.value;
  });
}

export function findStartingPlayerIndex(players: Player[]): { playerIndex: number; cardId: string } {
  let bestIndex = -1;
  let bestCardId = '';

  for (let i = 0; i < players.length; i++) {
    const aceOfSpades = players[i].cards.find((c) => c.suit === 'spades' && c.rank === 'A');
    if (aceOfSpades) {
      if (bestIndex === -1 || players[i].seatIndex < players[bestIndex].seatIndex) {
        bestIndex = i;
        bestCardId = aceOfSpades.id;
      }
    }
  }

  if (bestIndex === -1 && players.length > 0) {
    return { playerIndex: 0, cardId: players[0].cards[0]?.id || '' };
  }

  return { playerIndex: bestIndex, cardId: bestCardId };
}

export function canPlayCard(
  hand: Card[],
  card: Card,
  leadSuit: Suit | null,
  isFirstTrickOfGame: boolean
): { legal: boolean; reason?: string } {
  if (isFirstTrickOfGame) {
    const hasAceOfSpades = hand.some((c) => c.suit === 'spades' && c.rank === 'A');
    if (hasAceOfSpades) {
      if (card.suit === 'spades' && card.rank === 'A') {
        return { legal: true };
      }
      return { legal: false, reason: 'First trick of the game must start with the Ace of Spades (A♠)!' };
    }
  }

  if (!leadSuit) {
    return { legal: true };
  }

  const hasLeadSuit = hand.some((c) => c.suit === leadSuit);
  if (hasLeadSuit) {
    if (card.suit === leadSuit) {
      return { legal: true };
    }
    return { legal: false, reason: `You must follow suit! Play a ${leadSuit.toUpperCase()} card.` };
  }

  return { legal: true };
}

export function findHighestLeadSuitPlay(
  plays: TrickPlay[],
  leadSuit: Suit,
  tieRule: 'first' | 'last' = 'first'
): TrickPlay | null {
  const leadPlays = plays.filter((p) => p.card.suit === leadSuit);
  if (leadPlays.length === 0) return null;

  let bestPlay = leadPlays[0];

  for (let i = 1; i < leadPlays.length; i++) {
    const current = leadPlays[i];
    if (current.card.value > bestPlay.card.value) {
      bestPlay = current;
    } else if (current.card.value === bestPlay.card.value) {
      if (tieRule === 'last') {
        bestPlay = current;
      }
    }
  }

  return bestPlay;
}

export function resolveThullaOutcome(
  trick: Trick,
  tieRule: 'first' | 'last' = 'first'
): { pickerId: string; pickedCards: Card[] } {
  if (!trick.leadSuit || trick.plays.length === 0) {
    throw new Error('Cannot resolve Thulla with empty trick');
  }

  const highest = findHighestLeadSuitPlay(trick.plays, trick.leadSuit, tieRule);
  if (!highest) {
    return {
      pickerId: trick.plays[0].playerId,
      pickedCards: trick.plays.map((p) => p.card),
    };
  }

  return {
    pickerId: highest.playerId,
    pickedCards: trick.plays.map((p) => p.card),
  };
}

export function resolveCleanOutcome(
  trick: Trick,
  tieRule: 'first' | 'last' = 'first'
): { winnerId: string; discardedCards: Card[] } {
  if (!trick.leadSuit || trick.plays.length === 0) {
    throw new Error('Cannot resolve clean trick with empty trick');
  }

  const highest = findHighestLeadSuitPlay(trick.plays, trick.leadSuit, tieRule);
  const winnerId = highest ? highest.playerId : trick.plays[0].playerId;

  return {
    winnerId,
    discardedCards: trick.plays.map((p) => p.card),
  };
}

export function getNextActivePlayerIndex(players: Player[], fromIndex: number): number {
  const n = players.length;
  for (let step = 1; step <= n; step++) {
    const idx = (fromIndex + step) % n;
    if (!players[idx].isOut && players[idx].cards.length > 0) {
      return idx;
    }
  }
  return fromIndex;
}

export function updateOutStatus(
  players: Player[],
  pickerId?: string
): { updatedPlayers: Player[]; newlyOut: Player[] } {
  const alreadyOutCount = players.filter((p) => p.isOut).length;
  let nextPos = alreadyOutCount + 1;
  const newlyOut: Player[] = [];

  const updatedPlayers = players.map((p) => {
    if (!p.isOut && p.cards.length === 0) {
      if (p.id !== pickerId) {
        newlyOut.push({ ...p, isOut: true, finishPosition: nextPos });
        return { ...p, isOut: true, finishPosition: nextPos++ };
      }
    }
    return p;
  });

  return { updatedPlayers, newlyOut };
}

export function botChooseCard(
  bot: Player,
  trick: Trick,
  isFirstTrickOfGame: boolean
): Card {
  const legalCards = bot.cards.filter((c) => canPlayCard(bot.cards, c, trick.leadSuit, isFirstTrickOfGame).legal);

  if (legalCards.length === 0) {
    return bot.cards[0];
  }

  if (legalCards.length === 1) {
    return legalCards[0];
  }

  if (bot.botDifficulty === 'easy') {
    return legalCards[Math.floor(Math.random() * legalCards.length)];
  }

  const leadSuit = trick.leadSuit;

  if (!leadSuit) {
    return [...legalCards].sort((a, b) => a.value - b.value)[0];
  }

  const isFollowing = legalCards.every((c) => c.suit === leadSuit);
  if (isFollowing) {
    const highestOnTable = findHighestLeadSuitPlay(trick.plays, leadSuit);
    const tableHighestVal = highestOnTable ? highestOnTable.card.value : 0;

    const lowerCards = legalCards.filter((c) => c.value < tableHighestVal);
    if (lowerCards.length > 0) {
      return [...lowerCards].sort((a, b) => b.value - a.value)[0];
    }
    return [...legalCards].sort((a, b) => a.value - b.value)[0];
  }

  // Thulla
  const offSuitCards = legalCards.filter((c) => c.suit !== leadSuit);
  if (offSuitCards.length > 0) {
    return [...offSuitCards].sort((a, b) => b.value - a.value)[0];
  }

  return legalCards[0];
}
