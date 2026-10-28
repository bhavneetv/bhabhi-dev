import { describe, it, expect } from 'vitest';
import {
  createDeck,
  dealCards,
  findStartingPlayerIndex,
  canPlayCard,
  resolveCleanOutcome,
  resolveThullaOutcome,
  determineNextLeaderAfterCleanTrick,
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

  it('auto-sorts hand by suit order (Spades, Hearts, Clubs, Diamonds) and descending rank', () => {
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
      'spades-A',
      'spades-10',
      'hearts-A',
      'hearts-5',
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

  it('resolveThullaOutcome identifies the highest lead-suit card and the picker correctly', () => {
    const plays: TrickPlay[] = [
      { playerId: 'p1', card: { id: '0-hearts-9', suit: 'hearts', rank: '9', deckIndex: 0, value: 9 }, isThulla: false, timestamp: 1 },
      { playerId: 'p2', card: { id: '0-hearts-K', suit: 'hearts', rank: 'K', deckIndex: 0, value: 13 }, isThulla: false, timestamp: 2 },
      { playerId: 'p3', card: { id: '0-spades-A', suit: 'spades', rank: 'A', deckIndex: 0, value: 14 }, isThulla: true, timestamp: 3 }, // Thulla cut!
    ];

    const trick: Trick = {
      leadSuit: 'hearts',
      plays,
    };

    const outcome = resolveThullaOutcome(trick, 'first');
    expect(outcome.pickerId).toBe('p2');
    expect(outcome.pickedCards.length).toBe(3);
    expect(outcome.highestLeadCard).toBeDefined();
    expect(outcome.highestLeadCard?.rank).toBe('K');
    expect(outcome.highestLeadCard?.suit).toBe('hearts');
  });

  it('determineNextLeaderAfterCleanTrick shifts lead to second highest card when winner goes safe with 0 cards left', () => {
    // 3 players scenario described by user:
    // Player 1 plays 5♠ (their last card, now 0 cards left, safe)
    // Player 2 plays 4♠ (has cards left)
    // Player 3 plays 3♠ (has cards left)
    const plays: TrickPlay[] = [
      { playerId: 'p1', card: { id: '0-spades-5', suit: 'spades', rank: '5', deckIndex: 0, value: 5 }, isThulla: false, timestamp: 1 },
      { playerId: 'p2', card: { id: '0-spades-4', suit: 'spades', rank: '4', deckIndex: 0, value: 4 }, isThulla: false, timestamp: 2 },
      { playerId: 'p3', card: { id: '0-spades-3', suit: 'spades', rank: '3', deckIndex: 0, value: 3 }, isThulla: false, timestamp: 3 },
    ];

    const trick: Trick = {
      leadSuit: 'spades',
      plays,
    };

    const players: Player[] = [
      {
        id: 'p1',
        name: 'Player 1',
        avatar: '😎',
        isBot: false,
        cards: [], // 0 cards left, safe!
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
        cards: [{ id: '0-hearts-10', suit: 'hearts', rank: '10', deckIndex: 0, value: 10 }],
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
        cards: [{ id: '0-clubs-8', suit: 'clubs', rank: '8', deckIndex: 0, value: 8 }],
        cardCount: 1,
        seatIndex: 2,
        isHost: false,
        isReady: true,
        isOut: false,
        finishPosition: null,
        consecutiveTimeouts: 0,
      },
    ];

    // p1 won the clean trick with 5♠, but has 0 cards left
    // Next leader MUST be p2 who played the second highest card (4♠), NOT p3
    const nextLeader = determineNextLeaderAfterCleanTrick(trick, players, 'p1', 'first');
    expect(nextLeader).toBe('p2');
  });

  describe('7 Players Full Game Scenarios', () => {
    const make7Players = (): Player[] =>
      Array.from({ length: 7 }, (_, i) => ({
        id: `player-${i + 1}`,
        name: `Player ${i + 1}`,
        avatar: ['😎', '🤠', '🦁', '🦊', '🐼', '🤖', '👑'][i],
        isBot: i > 0,
        cards: [],
        seatIndex: i,
        isHost: i === 0,
        isReady: true,
        isOut: false,
        finishPosition: null,
        consecutiveTimeouts: 0,
        isOnline: true,
        ping: 20 + i * 5,
      }));

    it('deals to 7 players with 1 deck: 7 cards each (equal hands), removes 3 cards without losing Ace of Spades', () => {
      const players = make7Players();
      const { dealtPlayers, removedCards } = dealCards(players, 1, true);

      expect(dealtPlayers.length).toBe(7);
      // 52 / 7 = 7 cards each, 3 excess cards removed
      dealtPlayers.forEach((p) => {
        expect(p.cards.length).toBe(7);
      });
      expect(removedCards.length).toBe(3);

      // Verify Ace of Spades was NOT removed and is in someone's hand
      const aceInRemoved = removedCards.some((c) => c.suit === 'spades' && c.rank === 'A');
      expect(aceInRemoved).toBe(false);

      const starting = findStartingPlayerIndex(dealtPlayers);
      expect(starting.playerIndex).toBeGreaterThanOrEqual(0);
      expect(starting.playerIndex).toBeLessThan(7);
      const startingPlayer = dealtPlayers[starting.playerIndex];
      expect(startingPlayer.cards.some((c) => c.suit === 'spades' && c.rank === 'A')).toBe(true);
    });

    it('deals to 7 players with 2 decks: 14 cards each (equal hands), removes 6 cards', () => {
      const players = make7Players();
      const { dealtPlayers, removedCards } = dealCards(players, 2, true);

      expect(dealtPlayers.length).toBe(7);
      // 104 / 7 = 14 cards each, 6 excess cards removed
      dealtPlayers.forEach((p) => {
        expect(p.cards.length).toBe(14);
      });
      expect(removedCards.length).toBe(6);

      const starting = findStartingPlayerIndex(dealtPlayers);
      expect(starting.playerIndex).toBeGreaterThanOrEqual(0);
      expect(starting.playerIndex).toBeLessThan(7);
    });

    it('resolves a 7-player clean trick where all 7 players follow suit', () => {
      // 7 players play Spades: 2, 4, 7, 10, J, Q, K
      const plays: TrickPlay[] = [
        { playerId: 'player-1', card: { id: '0-spades-2', suit: 'spades', rank: '2', deckIndex: 0, value: 2 }, isThulla: false, timestamp: 1 },
        { playerId: 'player-2', card: { id: '0-spades-4', suit: 'spades', rank: '4', deckIndex: 0, value: 4 }, isThulla: false, timestamp: 2 },
        { playerId: 'player-3', card: { id: '0-spades-7', suit: 'spades', rank: '7', deckIndex: 0, value: 7 }, isThulla: false, timestamp: 3 },
        { playerId: 'player-4', card: { id: '0-spades-10', suit: 'spades', rank: '10', deckIndex: 0, value: 10 }, isThulla: false, timestamp: 4 },
        { playerId: 'player-5', card: { id: '0-spades-J', suit: 'spades', rank: 'J', deckIndex: 0, value: 11 }, isThulla: false, timestamp: 5 },
        { playerId: 'player-6', card: { id: '0-spades-Q', suit: 'spades', rank: 'Q', deckIndex: 0, value: 12 }, isThulla: false, timestamp: 6 },
        { playerId: 'player-7', card: { id: '0-spades-K', suit: 'spades', rank: 'K', deckIndex: 0, value: 13 }, isThulla: false, timestamp: 7 },
      ];

      const trick: Trick = {
        leadSuit: 'spades',
        plays,
      };

      const outcome = resolveCleanOutcome(trick, 'first');
      expect(outcome.winnerId).toBe('player-7'); // K is highest
      expect(outcome.discardedCards.length).toBe(7);
    });

    it('resolves a 7-player Thulla trick where Player 7 cuts and Player 4 with highest lead card takes all 7 cards', () => {
      // Players 1 to 6 follow Hearts, but Player 7 cuts with Spades Ace
      const plays: TrickPlay[] = [
        { playerId: 'player-1', card: { id: '0-hearts-3', suit: 'hearts', rank: '3', deckIndex: 0, value: 3 }, isThulla: false, timestamp: 1 },
        { playerId: 'player-2', card: { id: '0-hearts-6', suit: 'hearts', rank: '6', deckIndex: 0, value: 6 }, isThulla: false, timestamp: 2 },
        { playerId: 'player-3', card: { id: '0-hearts-8', suit: 'hearts', rank: '8', deckIndex: 0, value: 8 }, isThulla: false, timestamp: 3 },
        { playerId: 'player-4', card: { id: '0-hearts-A', suit: 'hearts', rank: 'A', deckIndex: 0, value: 14 }, isThulla: false, timestamp: 4 }, // Highest lead!
        { playerId: 'player-5', card: { id: '0-hearts-10', suit: 'hearts', rank: '10', deckIndex: 0, value: 10 }, isThulla: false, timestamp: 5 },
        { playerId: 'player-6', card: { id: '0-hearts-J', suit: 'hearts', rank: 'J', deckIndex: 0, value: 11 }, isThulla: false, timestamp: 6 },
        { playerId: 'player-7', card: { id: '0-spades-K', suit: 'spades', rank: 'K', deckIndex: 0, value: 13 }, isThulla: true, timestamp: 7 }, // Thulla cut!
      ];

      const trick: Trick = {
        leadSuit: 'hearts',
        plays,
      };

      const outcome = resolveThullaOutcome(trick, 'first');
      expect(outcome.pickerId).toBe('player-4'); // Player 4 had Hearts Ace
      expect(outcome.pickedCards.length).toBe(7); // Must take all 7 cards
      expect(outcome.highestLeadCard?.rank).toBe('A');
      expect(outcome.highestLeadCard?.suit).toBe('hearts');
    });

    it('calculates 6 opponent arc angles for 7-player layout without overlap', () => {
      const oppCount = 6; // 7 players total: 1 local + 6 opponents
      const arcStart = 200;
      const arcEnd = -20;
      const step = (arcStart - arcEnd) / (oppCount - 1); // 220 / 5 = 44 deg
      expect(step).toBe(44);

      const angles = Array.from({ length: oppCount }, (_, i) => arcStart - i * step);
      expect(angles).toEqual([200, 156, 112, 68, 24, -20]);

      // Verify each opponent has at least 40 degrees clearance from neighbors
      for (let i = 1; i < angles.length; i++) {
        expect(angles[i - 1] - angles[i]).toBeGreaterThanOrEqual(40);
      }
    });

    it('first round Thulla skip: off-suit play in round 1 completes cleanly and highest spade wins lead', () => {
      // 4 players in round 1 (A♠ led by p1)
      const round1Plays: TrickPlay[] = [
        { playerId: 'p1', card: { id: '0-spades-A', suit: 'spades', rank: 'A', deckIndex: 0, value: 14 }, isThulla: false, timestamp: 1 },
        { playerId: 'p2', card: { id: '0-spades-10', suit: 'spades', rank: '10', deckIndex: 0, value: 10 }, isThulla: false, timestamp: 2 },
        // p3 has no spades, plays off-suit hearts K -> in round 1, isThulla is bypassed
        { playerId: 'p3', card: { id: '0-hearts-K', suit: 'hearts', rank: 'K', deckIndex: 0, value: 13 }, isThulla: false, timestamp: 3 },
        { playerId: 'p4', card: { id: '0-spades-7', suit: 'spades', rank: '7', deckIndex: 0, value: 7 }, isThulla: false, timestamp: 4 },
      ];

      const round1Trick: Trick = {
        leadSuit: 'spades',
        plays: round1Plays,
      };

      // Clean outcome resolves: all 4 cards discarded, highest spade (p1 with A♠) wins lead
      const outcome = resolveCleanOutcome(round1Trick);
      expect(outcome.winnerId).toBe('p1');
      expect(outcome.discardedCards.length).toBe(4);
    });

    it('turn skip on card transfer: advances past player with 0 cards to next active player', () => {
      // 4 players: p1, p2, p3, p4
      // p3 has 0 cards (cards taken by p2). It was p3's turn.
      const players: Player[] = [
        { id: 'p1', name: 'P1', avatar: '😎', isBot: false, cards: [{ id: 'c1', suit: 'clubs', rank: '5', deckIndex: 0, value: 5 }], seatIndex: 0, isHost: true, isReady: true, isOut: false, finishPosition: null, consecutiveTimeouts: 0 },
        { id: 'p2', name: 'P2', avatar: '🤠', isBot: false, cards: [{ id: 'c2', suit: 'clubs', rank: '6', deckIndex: 0, value: 6 }], seatIndex: 1, isHost: false, isReady: true, isOut: false, finishPosition: null, consecutiveTimeouts: 0 },
        { id: 'p3', name: 'P3', avatar: '🦁', isBot: false, cards: [], cardCount: 0, seatIndex: 2, isHost: false, isReady: true, isOut: true, finishPosition: 1, consecutiveTimeouts: 0 },
        { id: 'p4', name: 'P4', avatar: '🤖', isBot: true, cards: [{ id: 'c3', suit: 'clubs', rank: '7', deckIndex: 0, value: 7 }], seatIndex: 3, isHost: false, isReady: true, isOut: false, finishPosition: null, consecutiveTimeouts: 0 },
      ];

      // Giver was p3 (index 2). Next active player must skip p3 and go to p4 (index 3).
      const nextIdx = getNextActivePlayerIndex(players, 2);
      expect(nextIdx).toBe(3);
      expect(players[nextIdx].id).toBe('p4');
    });
  });
});

