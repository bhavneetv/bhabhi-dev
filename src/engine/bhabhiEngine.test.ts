import { describe, it, expect } from 'vitest';
import {
  createDeck,
  findStartingPlayerIndex,
  canPlayCard,
  resolveCleanOutcome,
  resolveThullaOutcome,
  updateOutStatus,
  getNextActivePlayerIndex,
  sortHand,
} from './bhabhiEngine';
import type { Player, Card, Trick, TrickPlay } from '../types/game';

describe('Bhabhi Dever Engine Tests', () => {
  it('creates 52 cards for 1 deck and 104 cards for 2 decks with unique IDs', () => {
    const singleDeck = createDeck(1);
    expect(singleDeck.length).toBe(52);
    const uniqueSingleIds = new Set(singleDeck.map((c) => c.id));
    expect(uniqueSingleIds.size).toBe(52);

    const doubleDeck = createDeck(2);
    expect(doubleDeck.length).toBe(104);
    const uniqueDoubleIds = new Set(doubleDeck.map((c) => c.id));
    expect(uniqueDoubleIds.size).toBe(104);
  });

  it('correctly identifies the Ace of Spades starting player', () => {
    const dummyPlayers: Player[] = [
      {
        id: 'p1',
        name: 'Player 1',
        avatar: '😎',
        isBot: false,
        cards: [
          { id: '0-hearts-K', suit: 'hearts', rank: 'K', deckIndex: 0, value: 13 },
          { id: '0-diamonds-10', suit: 'diamonds', rank: '10', deckIndex: 0, value: 10 },
        ],
        seatIndex: 0,
        isHost: true,
        isReady: true,
        isOut: false,
        finishPosition: null,
        consecutiveTimeouts: 0,
      },
      {
        id: 'p2',
        name: 'Player 2',
        avatar: '🤠',
        isBot: true,
        cards: [
          { id: '0-spades-A', suit: 'spades', rank: 'A', deckIndex: 0, value: 14 },
          { id: '0-clubs-2', suit: 'clubs', rank: '2', deckIndex: 0, value: 2 },
        ],
        seatIndex: 1,
        isHost: false,
        isReady: true,
        isOut: false,
        finishPosition: null,
        consecutiveTimeouts: 0,
      },
    ];

    const { playerIndex, cardId } = findStartingPlayerIndex(dummyPlayers);
    expect(playerIndex).toBe(1);
    expect(cardId).toBe('0-spades-A');
  });

  it('enforces follow-suit validation rules strictly', () => {
    const hand: Card[] = [
      { id: '0-hearts-5', suit: 'hearts', rank: '5', deckIndex: 0, value: 5 },
      { id: '0-hearts-A', suit: 'hearts', rank: 'A', deckIndex: 0, value: 14 },
      { id: '0-spades-K', suit: 'spades', rank: 'K', deckIndex: 0, value: 13 },
    ];

    // Must follow Hearts if lead is Hearts
    const trySpades = canPlayCard(hand, hand[2], 'hearts', false);
    expect(trySpades.legal).toBe(false);

    const tryHearts = canPlayCard(hand, hand[0], 'hearts', false);
    expect(tryHearts.legal).toBe(true);

    // If lead is Diamonds and hand has no Diamonds -> any card (Thulla) is legal
    const tryThullaSpades = canPlayCard(hand, hand[2], 'diamonds', false);
    expect(tryThullaSpades.legal).toBe(true);
  });

  it('resolves a clean trick with highest lead-suit card winning', () => {
    const plays: TrickPlay[] = [
      { playerId: 'p1', card: { id: '0-spades-9', suit: 'spades', rank: '9', deckIndex: 0, value: 9 }, isThulla: false, timestamp: 1 },
      { playerId: 'p2', card: { id: '0-spades-K', suit: 'spades', rank: 'K', deckIndex: 0, value: 13 }, isThulla: false, timestamp: 2 },
      { playerId: 'p3', card: { id: '0-spades-J', suit: 'spades', rank: 'J', deckIndex: 0, value: 11 }, isThulla: false, timestamp: 3 },
    ];

    const trick: Trick = {
      leadSuit: 'spades',
      plays,
    };

    const outcome = resolveCleanOutcome(trick, 'first');
    expect(outcome.winnerId).toBe('p2');
    expect(outcome.discardedCards.length).toBe(3);
  });

  it('resolves a Thulla cut where highest lead-suit player picks up everything', () => {
    const plays: TrickPlay[] = [
      { playerId: 'p1', card: { id: '0-spades-9', suit: 'spades', rank: '9', deckIndex: 0, value: 9 }, isThulla: false, timestamp: 1 },
      { playerId: 'p2', card: { id: '0-spades-A', suit: 'spades', rank: 'A', deckIndex: 0, value: 14 }, isThulla: false, timestamp: 2 },
      // p3 cannot follow Spades and throws 4 of Diamonds (THULLA!)
      { playerId: 'p3', card: { id: '0-diamonds-4', suit: 'diamonds', rank: '4', deckIndex: 0, value: 4 }, isThulla: true, timestamp: 3 },
    ];

    const trick: Trick = {
      leadSuit: 'spades',
      plays,
    };

    const outcome = resolveThullaOutcome(trick, 'first');
    // p2 has highest Spade (Ace), so p2 must pick up all 3 cards!
    expect(outcome.pickerId).toBe('p2');
    expect(outcome.pickedCards.length).toBe(3);
  });

  it('marks players out when hand reaches 0 cards and assigns finish positions', () => {
    const testPlayers: Player[] = [
      {
        id: 'p1',
        name: 'Player 1',
        avatar: '😎',
        isBot: false,
        cards: [], // Just shed last card!
        cardCount: 0,
        seatIndex: 0,
        isHost: true,
        isReady: true,
        isOut: false,
        finishPosition: null,
        consecutiveTimeouts: 0,
      },
      {
        id: 'p2',
        name: 'Player 2',
        avatar: '🤠',
        isBot: true,
        cards: [{ id: '0-clubs-2', suit: 'clubs', rank: '2', deckIndex: 0, value: 2 }],
        cardCount: 1,
        seatIndex: 1,
        isHost: false,
        isReady: true,
        isOut: false,
        finishPosition: null,
        consecutiveTimeouts: 0,
      },
    ];

    const { updatedPlayers, newlyOut } = updateOutStatus(testPlayers);
    expect(newlyOut.length).toBe(1);
    expect(newlyOut[0].id).toBe('p1');
    expect(newlyOut[0].finishPosition).toBe(1);
    expect(updatedPlayers[0].isOut).toBe(true);
  });

  it('auto-sorts hand by suit order (Spades, Hearts, Clubs, Diamonds) and ascending rank', () => {
    const unsortedHand: Card[] = [
      { id: '0-diamonds-4', suit: 'diamonds', rank: '4', deckIndex: 0, value: 4 },
      { id: '0-spades-10', suit: 'spades', rank: '10', deckIndex: 0, value: 10 },
      { id: '0-hearts-A', suit: 'hearts', rank: 'A', deckIndex: 0, value: 14 },
      { id: '0-spades-A', suit: 'spades', rank: 'A', deckIndex: 0, value: 14 },
      { id: '0-clubs-K', suit: 'clubs', rank: 'K', deckIndex: 0, value: 13 },
      { id: '0-hearts-5', suit: 'hearts', rank: '5', deckIndex: 0, value: 5 },
    ];

    const sorted = sortHand(unsortedHand);
    expect(sorted.map((c) => `${c.suit}-${c.rank}`)).toEqual([
      'spades-10',
      'spades-A',
      'hearts-5',
      'hearts-A',
      'clubs-K',
      'diamonds-4',
    ]);

    const sortedRankDesc = sortHand(unsortedHand, 'rank-desc');
    expect(sortedRankDesc.map((c) => `${c.suit}-${c.rank}`)).toEqual([
      'spades-A',
      'hearts-A',
      'clubs-K',
      'spades-10',
      'hearts-5',
      'diamonds-4',
    ]);

    const sortedRankAsc = sortHand(unsortedHand, 'rank-asc');
    expect(sortedRankAsc.map((c) => `${c.suit}-${c.rank}`)).toEqual([
      'diamonds-4',
      'hearts-5',
      'spades-10',
      'clubs-K',
      'spades-A',
      'hearts-A',
    ]);
  });

  it('correctly skips safe players and players with 0 cards when advancing turn', () => {
    const players: Player[] = [
      {
        id: 'p1',
        name: 'Player 1',
        avatar: '😎',
        isBot: false,
        cards: [], // Gave cards away!
        cardCount: 0,
        seatIndex: 0,
        isHost: true,
        isReady: true,
        isOut: true,
        finishPosition: 1,
        consecutiveTimeouts: 0,
      },
      {
        id: 'p2',
        name: 'Player 2',
        avatar: '🤠',
        isBot: true,
        cards: [{ id: '0-clubs-2', suit: 'clubs', rank: '2', deckIndex: 0, value: 2 }],
        cardCount: 1,
        seatIndex: 1,
        isHost: false,
        isReady: true,
        isOut: false,
        finishPosition: null,
        consecutiveTimeouts: 0,
      },
      {
        id: 'p3',
        name: 'Player 3',
        avatar: '🤖',
        isBot: true,
        cards: [{ id: '0-hearts-9', suit: 'hearts', rank: '9', deckIndex: 0, value: 9 }],
        cardCount: 1,
        seatIndex: 2,
        isHost: false,
        isReady: true,
        isOut: false,
        finishPosition: null,
        consecutiveTimeouts: 0,
      },
    ];

    // From p1 (who has 0 cards and is out), next active index must be p2 (index 1)
    const nextIdx = getNextActivePlayerIndex(players, 0);
    expect(nextIdx).toBe(1);

    // From p3 (index 2), next active index must loop back and skip p1 directly to p2 (index 1)
    const loopNextIdx = getNextActivePlayerIndex(players, 2);
    expect(loopNextIdx).toBe(1);
  });
});
