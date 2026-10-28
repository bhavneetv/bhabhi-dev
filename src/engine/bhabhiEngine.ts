import type { Card, Rank, Suit, Player, Trick, TrickPlay, SortMode } from '../types/game';

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

/**
 * Creates 1 or 2 standard 52-card decks with unique IDs
 */
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

/**
 * Fisher-Yates cryptographically-fair shuffle
 */
export function shuffleDeck(cards: Card[]): Card[] {
  const shuffled = [...cards];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Deals cards to active players.
 * If equalHands is true, removes extra cards (never A♠) so each player gets the same count.
 */
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
    // Ensure we NEVER remove an Ace of Spades (crucial for game start!)
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

/**
 * Sorts cards by suit priority (Spades, Hearts, Clubs, Diamonds) or rank
 */
export function sortHand(cards: Card[], mode: SortMode = 'suit'): Card[] {
  if (mode === 'none') return [...cards];
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
    // Default: 'suit' priority, then rank descending (A down to 2)
    if (suitOrder[a.suit] !== suitOrder[b.suit]) {
      return suitOrder[a.suit] - suitOrder[b.suit];
    }
    return b.value - a.value;
  });
}

/**
 * Finds the starting player who holds the Ace of Spades (A♠).
 * If 2 decks and different players hold A♠, lowest seat index starts.
 */
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

  // Fallback if no A♠ found (should never happen)
  if (bestIndex === -1 && players.length > 0) {
    return { playerIndex: 0, cardId: players[0].cards[0]?.id || '' };
  }

  return { playerIndex: bestIndex, cardId: bestCardId };
}

/**
 * Validates if a card is legally playable
 */
export function canPlayCard(
  hand: Card[],
  card: Card,
  leadSuit: Suit | null,
  isFirstTrickOfGame: boolean
): { legal: boolean; reason?: string } {
  // If first trick of the game, MUST play Ace of Spades
  if (isFirstTrickOfGame) {
    const hasAceOfSpades = hand.some((c) => c.suit === 'spades' && c.rank === 'A');
    if (hasAceOfSpades) {
      if (card.suit === 'spades' && card.rank === 'A') {
        return { legal: true };
      }
      return { legal: false, reason: 'First trick of the game must start with the Ace of Spades (A♠)!' };
    }
  }

  // If no lead suit yet (leader's turn), any card is legal
  if (!leadSuit) {
    return { legal: true };
  }

  // If following, must follow lead suit if holding any card of that suit
  const hasLeadSuit = hand.some((c) => c.suit === leadSuit);
  if (hasLeadSuit) {
    if (card.suit === leadSuit) {
      return { legal: true };
    }
    return { legal: false, reason: `You must follow suit! Play a ${leadSuit.toUpperCase()} card.` };
  }

  // Has no cards of lead suit -> can play any card (Thulla!)
  return { legal: true };
}

/**
 * Finds the player with the highest lead-suit card in the trick.
 * Handles duplicate cards via settings.tieRule ('first' | 'last').
 */
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

/**
 * Resolves a Thulla: trick ends immediately.
 * The player who played the highest lead-suit card picks up ALL cards in the trick.
 */
export function resolveThullaOutcome(
  trick: Trick,
  tieRule: 'first' | 'last' = 'first'
): { pickerId: string; pickedCards: Card[]; highestLeadCard?: Card | null } {
  if (!trick.leadSuit || trick.plays.length === 0) {
    throw new Error('Cannot resolve Thulla with empty trick');
  }

  const highest = findHighestLeadSuitPlay(trick.plays, trick.leadSuit, tieRule);
  if (!highest) {
    return {
      pickerId: trick.plays[0].playerId,
      pickedCards: trick.plays.map((p) => p.card),
      highestLeadCard: null,
    };
  }

  return {
    pickerId: highest.playerId,
    pickedCards: trick.plays.map((p) => p.card),
    highestLeadCard: highest.card,
  };
}

/**
 * Resolves a Clean Trick: everyone followed suit.
 * Highest lead-suit card wins and discards all cards to the dead pile.
 */
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

/**
 * When a trick ends cleanly:
 * - The player who played the highest card of the lead suit wins and leads next.
 * - CRITICAL BHABHI RULE: If the winner has NO cards left (sheds all cards and goes safe),
 *   the lead shifts to the player who played the 2nd highest card of the lead suit (or 3rd, etc.)
 *   who still has cards remaining!
 */
export function determineNextLeaderAfterCleanTrick(
  trick: Trick,
  players: Player[],
  winnerId: string,
  tieRule: 'first' | 'last' = 'first'
): string {
  const winner = players.find((p) => p.id === winnerId);
  if (winner && !winner.isOut && winner.cards.length > 0) {
    return winnerId;
  }

  // Winner has no cards left! Shift lead to the player with the second highest card in the trick.
  const leadPlays = trick.plays.filter((p) => p.card.suit === trick.leadSuit);

  leadPlays.sort((a, b) => {
    if (b.card.value !== a.card.value) {
      return b.card.value - a.card.value;
    }
    const idxA = trick.plays.indexOf(a);
    const idxB = trick.plays.indexOf(b);
    return tieRule === 'last' ? idxB - idxA : idxA - idxB;
  });

  const nextEligiblePlay = leadPlays.find((play) => {
    const pl = players.find((p) => p.id === play.playerId);
    return pl && !pl.isOut && pl.cards.length > 0;
  });

  if (nextEligiblePlay) {
    return nextEligiblePlay.playerId;
  }

  // Fallback to next active player in seat order
  const winnerIndex = players.findIndex((p) => p.id === winnerId);
  const fallbackIdx = getNextActivePlayerIndex(players, winnerIndex >= 0 ? winnerIndex : 0);
  return players[fallbackIdx]?.id || winnerId;
}

/**
 * Calculates the next active (not out) player in clockwise order
 */
export function getNextActivePlayerIndex(players: Player[], fromIndex: number): number {
  const n = players.length;
  for (let step = 1; step <= n; step++) {
    const idx = (fromIndex + step) % n;
    const p = players[idx];
    const hasCards = p.cards.length > 0 || (typeof p.cardCount === 'number' && p.cardCount > 0);
    if (!p.isOut && hasCards) {
      return idx;
    }
  }
  return fromIndex;
}

/**
 * Checks which players are out after trick resolution.
 */
export function updateOutStatus(
  players: Player[],
  pickerId?: string
): { updatedPlayers: Player[]; newlyOut: Player[] } {
  const alreadyOutCount = players.filter((p) => p.isOut).length;
  let nextPos = alreadyOutCount + 1;
  const newlyOut: Player[] = [];

  const updatedPlayers = players.map((p) => {
    const hasCards = p.cards.length > 0 || (typeof p.cardCount === 'number' && p.cardCount > 0);
    if (!p.isOut && !hasCards) {
      if (p.id !== pickerId) {
        newlyOut.push({ ...p, isOut: true, finishPosition: nextPos });
        return { ...p, isOut: true, finishPosition: nextPos++ };
      }
    }
    return p;
  });

  return { updatedPlayers, newlyOut };
}

/**
 * Smart Bot AI Decision Maker (Easy, Medium, Master)
 */
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

  // Case 1: Bot is leading the trick
  if (!leadSuit) {
    return [...legalCards].sort((a, b) => a.value - b.value)[0];
  }

  // Case 2: Bot is following lead suit
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

  // Case 3: THULLA!
  const offSuitCards = legalCards.filter((c) => c.suit !== leadSuit);
  if (offSuitCards.length > 0) {
    return [...offSuitCards].sort((a, b) => b.value - a.value)[0];
  }

  return legalCards[0];
}
