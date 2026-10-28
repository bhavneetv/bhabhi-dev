import { Server, Socket } from 'socket.io';
import type {
  Player,
  Card,
  Trick,
  RoomSettings,
  Theme,
  ChatMessage,
} from './engine';
import {
  dealCards,
  findStartingPlayerIndex,
  canPlayCard,
  resolveCleanOutcome,
  resolveThullaOutcome,
  getNextActivePlayerIndex,
  updateOutStatus,
  determineNextLeaderAfterCleanTrick,
  botChooseCard,
  sortHand,
} from './engine';

export interface RoomState {
  code: string;
  players: Player[];
  currentTurnPlayerId: string;
  currentTrick: Trick;
  deadPile: Card[];
  gamePhase: 'LOBBY' | 'PLAYING' | 'THULLA_RESOLVE' | 'CLEAN_RESOLVE' | 'GAME_OVER';
  isFirstTrick: boolean;
  settings: RoomSettings;
  theme: Theme;
  bhabhiPlayer: Player | null;
  turnTimeLeft: number;
  sequenceNumber: number;
  createdAt: number;
  socketMap: Map<string, string>; // playerId -> socketId
  reverseSocketMap: Map<string, string>; // socketId -> playerId
  botTimer: NodeJS.Timeout | null;
  turnTimer: NodeJS.Timeout | null;
  resolutionTimer: NodeJS.Timeout | null;
  transferRequests: Map<string, any>;
  lastMovePerPlayer: Map<string, string>; // playerId -> cardId played in current trick
}

const DEFAULT_SETTINGS: RoomSettings = {
  deckCount: 1,
  tieRule: 'first',
  turnTimerSeconds: 15,
  equalHands: true,
  pickupMode: 'auto',
  neutralNames: false,
  cardTracker: true,
  voiceEnabled: false,
  maxPlayers: 8,
  fourColorSuits: true,
  animationSpeed: 'normal',
};

const DEFAULT_BOTS: Player[] = [
  {
    id: 'bot-1',
    name: 'Bot Vicky',
    avatar: '🤠',
    isBot: true,
    botDifficulty: 'medium',
    cards: [],
    seatIndex: 1,
    isHost: false,
    isReady: true,
    isOut: false,
    finishPosition: null,
    consecutiveTimeouts: 0,
    isOnline: true,
    ping: 8,
  },
  {
    id: 'bot-2',
    name: 'Bot Sunny',
    avatar: '🦁',
    isBot: true,
    botDifficulty: 'medium',
    cards: [],
    seatIndex: 2,
    isHost: false,
    isReady: true,
    isOut: false,
    finishPosition: null,
    consecutiveTimeouts: 0,
    isOnline: true,
    ping: 12,
  },
  {
    id: 'bot-3',
    name: 'Bot Simran',
    avatar: '🦊',
    isBot: true,
    botDifficulty: 'hard',
    cards: [],
    seatIndex: 3,
    isHost: false,
    isReady: true,
    isOut: false,
    finishPosition: null,
    consecutiveTimeouts: 0,
    isOnline: true,
    ping: 5,
  },
];

export class RoomManager {
  private io: Server;
  private rooms: Map<string, RoomState> = new Map();
  private socketToRoom: Map<string, string> = new Map(); // socketId -> roomCode
  private lobbyDisconnectTimers: Map<string, NodeJS.Timeout> = new Map(); // roomCode:playerId -> timer

  constructor(io: Server) {
    this.io = io;
  }

  public getStats() {
    let totalPlayers = 0;
    let playingRooms = 0;
    for (const room of this.rooms.values()) {
      totalPlayers += room.players.length;
      if (room.gamePhase === 'PLAYING') playingRooms++;
    }
    return {
      activeRooms: this.rooms.size,
      totalPlayers,
      playingRooms,
    };
  }

  /**
   * Collision-free room code generation
   */
  private generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No O, 0, I, 1 to prevent confusion
    let code = '';
    let attempts = 0;
    do {
      code = '';
      for (let i = 0; i < 5; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      attempts++;
    } while (this.rooms.has(code) && attempts < 1000);
    return code;
  }

  public createRoom(
    socket: Socket,
    creator: { id: string; name: string; avatar: string },
    customRoomCode?: string,
    customSettings?: Partial<RoomSettings>,
    theme: Theme = 'emerald'
  ) {
    const roomCode = (customRoomCode && customRoomCode.trim())
      ? customRoomCode.toUpperCase().trim()
      : this.generateRoomCode();

    const existing = this.rooms.get(roomCode);
    if (existing) {
      this.clearRoomTimers(existing);
    }

    const hostPlayer: Player = {
      id: creator.id,
      name: creator.name || 'Player (Host)',
      avatar: creator.avatar || '😎',
      isBot: false,
      cards: [],
      seatIndex: 0,
      isHost: true,
      isReady: true,
      isOut: false,
      finishPosition: null,
      consecutiveTimeouts: 0,
      isOnline: true,
      ping: 20,
    };

    const room: RoomState = {
      code: roomCode,
      players: [hostPlayer],
      currentTurnPlayerId: hostPlayer.id,
      currentTrick: { leadSuit: null, plays: [] },
      deadPile: [],
      gamePhase: 'LOBBY',
      isFirstTrick: true,
      settings: { ...DEFAULT_SETTINGS, ...customSettings },
      theme: theme || 'emerald',
      bhabhiPlayer: null,
      turnTimeLeft: customSettings?.turnTimerSeconds || 15,
      sequenceNumber: 1,
      createdAt: Date.now(),
      socketMap: new Map([[hostPlayer.id, socket.id]]),
      reverseSocketMap: new Map([[socket.id, hostPlayer.id]]),
      botTimer: null,
      turnTimer: null,
      resolutionTimer: null,
      transferRequests: new Map(),
      lastMovePerPlayer: new Map(),
    };

    this.rooms.set(roomCode, room);
    this.socketToRoom.set(socket.id, roomCode);
    socket.join(roomCode);

    return {
      roomCode,
      player: hostPlayer,
      state: this.getPlayerView(room, hostPlayer.id),
    };
  }

  public joinRoom(
    socket: Socket,
    roomCode: string,
    playerData: { id: string; name: string; avatar: string }
  ) {
    const cleanCode = roomCode.toUpperCase().trim();
    let room = this.rooms.get(cleanCode);

    // Auto-provision room if it does not exist on server!
    // Ensures page refresh, direct room link, or server reload never results in "Room not found".
    if (!room) {
      const hostPlayer: Player = {
        id: playerData.id,
        name: playerData.name || 'Player (Host)',
        avatar: playerData.avatar || '😎',
        isBot: false,
        cards: [],
        seatIndex: 0,
        isHost: true,
        isReady: true,
        isOut: false,
        finishPosition: null,
        consecutiveTimeouts: 0,
        isOnline: true,
        ping: 25,
      };

      room = {
        code: cleanCode,
        players: [hostPlayer],
        currentTurnPlayerId: hostPlayer.id,
        currentTrick: { leadSuit: null, plays: [] },
        deadPile: [],
        gamePhase: 'LOBBY',
        isFirstTrick: true,
        settings: { ...DEFAULT_SETTINGS },
        theme: 'emerald',
        bhabhiPlayer: null,
        turnTimeLeft: 15,
        sequenceNumber: 1,
        createdAt: Date.now(),
        socketMap: new Map([[hostPlayer.id, socket.id]]),
        reverseSocketMap: new Map([[socket.id, hostPlayer.id]]),
        botTimer: null,
        turnTimer: null,
        resolutionTimer: null,
        transferRequests: new Map(),
        lastMovePerPlayer: new Map(),
      };

      this.rooms.set(cleanCode, room);
      this.socketToRoom.set(socket.id, cleanCode);
      socket.join(cleanCode);

      return {
        roomCode: cleanCode,
        player: hostPlayer,
        state: this.getPlayerView(room, hostPlayer.id),
        isReconnecting: false,
      };
    }

    // Cancel any pending lobby disconnect grace timer for this player
    const timerKey = `${cleanCode}:${playerData.id}`;
    const pendingTimer = this.lobbyDisconnectTimers.get(timerKey);
    if (pendingTimer) {
      clearTimeout(pendingTimer);
      this.lobbyDisconnectTimers.delete(timerKey);
    }

    // Check if player is reconnecting
    const existingIndex = room.players.findIndex((p) => p.id === playerData.id);
    if (existingIndex !== -1) {
      // Reconnection
      const p = room.players[existingIndex];
      p.isOnline = true;
      p.name = playerData.name || p.name;
      p.avatar = playerData.avatar || p.avatar;

      // Cancel any pending bot timer so AI does not steal the reconnected player's turn
      if (room.botTimer && room.currentTurnPlayerId === p.id) {
        clearTimeout(room.botTimer);
        room.botTimer = null;
      }

      // Clean stale socket mappings if player reconnected on a new socket
      const oldSocketId = room.socketMap.get(p.id);
      if (oldSocketId && oldSocketId !== socket.id) {
        room.reverseSocketMap.delete(oldSocketId);
        this.socketToRoom.delete(oldSocketId);
      }

      room.socketMap.set(p.id, socket.id);
      room.reverseSocketMap.set(socket.id, p.id);
      this.socketToRoom.set(socket.id, cleanCode);
      socket.join(cleanCode);

      this.broadcastRoomState(room, `🔄 ${p.name} reconnected`);
      return {
        roomCode: cleanCode,
        player: p,
        state: this.getPlayerView(room, p.id),
        isReconnecting: true,
      };
    }

    // If game is in progress and an offline human player exists, reconnect to that seat
    if (room.gamePhase !== 'LOBBY') {
      const offlineHuman = room.players.find((p) => !p.isBot && !p.isOnline);
      if (offlineHuman) {
        offlineHuman.isOnline = true;
        offlineHuman.name = playerData.name || offlineHuman.name;
        offlineHuman.avatar = playerData.avatar || offlineHuman.avatar;

        // Cancel any pending bot timer so AI does not steal the reconnected player's turn
        if (room.botTimer && room.currentTurnPlayerId === offlineHuman.id) {
          clearTimeout(room.botTimer);
          room.botTimer = null;
        }

        const oldSocketId = room.socketMap.get(offlineHuman.id);
        if (oldSocketId && oldSocketId !== socket.id) {
          room.reverseSocketMap.delete(oldSocketId);
          this.socketToRoom.delete(oldSocketId);
        }

        room.socketMap.set(offlineHuman.id, socket.id);
        room.reverseSocketMap.set(socket.id, offlineHuman.id);
        this.socketToRoom.set(socket.id, cleanCode);
        socket.join(cleanCode);

        this.broadcastRoomState(room, `🔄 ${offlineHuman.name} reconnected to game`);
        return {
          roomCode: cleanCode,
          player: offlineHuman,
          state: this.getPlayerView(room, offlineHuman.id),
          isReconnecting: true,
        };
      }
    }

    if (room.players.length >= (room.settings.maxPlayers || 8)) {
      throw new Error(`Room ${cleanCode} is full (max ${room.settings.maxPlayers || 8} players)`);
    }

    const newPlayer: Player = {
      id: playerData.id,
      name: playerData.name || `Player ${room.players.length + 1}`,
      avatar: playerData.avatar || '🤠',
      isBot: false,
      cards: [],
      seatIndex: room.players.length,
      isHost: false,
      isReady: true,
      isOut: false,
      finishPosition: null,
      consecutiveTimeouts: 0,
      isOnline: true,
      ping: 30,
    };

    room.players.push(newPlayer);
    room.socketMap.set(newPlayer.id, socket.id);
    room.reverseSocketMap.set(socket.id, newPlayer.id);
    this.socketToRoom.set(socket.id, cleanCode);
    socket.join(cleanCode);

    this.broadcastRoomState(room, `🎉 ${newPlayer.name} joined the room!`);

    return {
      roomCode: cleanCode,
      player: newPlayer,
      state: this.getPlayerView(room, newPlayer.id),
      isReconnecting: false,
    };
  }

  public leaveRoom(socket: Socket, roomCode: string, playerId: string, isExplicit: boolean = true) {
    const cleanCode = roomCode.toUpperCase().trim();
    const room = this.rooms.get(cleanCode);
    if (!room) return;

    const player = room.players.find((p) => p.id === playerId);
    if (!player) return;

    const timerKey = `${cleanCode}:${playerId}`;
    const pendingTimer = this.lobbyDisconnectTimers.get(timerKey);
    if (pendingTimer) {
      clearTimeout(pendingTimer);
      this.lobbyDisconnectTimers.delete(timerKey);
    }

    if (room.gamePhase === 'LOBBY') {
      if (isExplicit) {
        // Player explicitly clicked leave room
        room.players = room.players.filter((p) => p.id !== playerId);
        room.socketMap.delete(playerId);
        room.reverseSocketMap.delete(socket.id);
        this.socketToRoom.delete(socket.id);
        socket.leave(cleanCode);

        if (room.players.length === 0) {
          this.clearRoomTimers(room);
          this.rooms.delete(cleanCode);
          return;
        }

        // If host left, promote next human player
        if (player.isHost && room.players.length > 0) {
          room.players[0].isHost = true;
        }

        this.broadcastRoomState(room, `👋 ${player.name} left the room`);
      } else {
        // Socket disconnected (e.g. mobile tab switch / brief blip) -> Give 20s grace period
        player.isOnline = false;
        room.reverseSocketMap.delete(socket.id);
        this.socketToRoom.delete(socket.id);
        this.broadcastRoomState(room);

        const timeout = setTimeout(() => {
          this.lobbyDisconnectTimers.delete(timerKey);
          const currentRoom = this.rooms.get(cleanCode);
          if (!currentRoom || currentRoom.gamePhase !== 'LOBBY') return;
          const p = currentRoom.players.find((pl) => pl.id === playerId);
          if (p && !p.isOnline) {
            currentRoom.players = currentRoom.players.filter((pl) => pl.id !== playerId);
            currentRoom.socketMap.delete(playerId);
            if (currentRoom.players.length === 0) {
              this.clearRoomTimers(currentRoom);
              this.rooms.delete(cleanCode);
            } else {
              if (p.isHost && currentRoom.players.length > 0) {
                currentRoom.players[0].isHost = true;
              }
              this.broadcastRoomState(currentRoom, `👋 ${p.name} timed out from lobby`);
            }
          }
        }, 20000);

        this.lobbyDisconnectTimers.set(timerKey, timeout);
      }
    } else {
      // In game: Mark offline, DO NOT kick or end game prematurely
      player.isOnline = false;
      this.broadcastRoomState(room, `⚠️ ${player.name} disconnected (AI bot taking over)`);

      // If it is their turn, trigger bot move so match does not stall
      if (room.currentTurnPlayerId === playerId && room.gamePhase === 'PLAYING') {
        this.scheduleBotMove(room, 1000);
      }
    }
  }

  public handleSocketDisconnect(socket: Socket) {
    const roomCode = this.socketToRoom.get(socket.id);
    if (!roomCode) return;

    const room = this.rooms.get(roomCode);
    if (!room) {
      this.socketToRoom.delete(socket.id);
      return;
    }

    const playerId = room.reverseSocketMap.get(socket.id);
    if (!playerId) return;

    this.leaveRoom(socket, roomCode, playerId, false); // isExplicit = false
  }

  public startGame(roomCode: string, requesterId?: string) {
    const cleanCode = roomCode.toUpperCase().trim();
    let room = this.rooms.get(cleanCode);
    if (!room) {
      const hostId = requesterId || 'p1';
      const hostPlayer: Player = {
        id: hostId,
        name: 'Player (Host)',
        avatar: '😎',
        isBot: false,
        cards: [],
        seatIndex: 0,
        isHost: true,
        isReady: true,
        isOut: false,
        finishPosition: null,
        consecutiveTimeouts: 0,
        isOnline: true,
        ping: 25,
      };

      room = {
        code: cleanCode,
        players: [hostPlayer],
        currentTurnPlayerId: hostPlayer.id,
        currentTrick: { leadSuit: null, plays: [] },
        deadPile: [],
        gamePhase: 'LOBBY',
        isFirstTrick: true,
        settings: { ...DEFAULT_SETTINGS },
        theme: 'emerald',
        bhabhiPlayer: null,
        turnTimeLeft: 15,
        sequenceNumber: 1,
        createdAt: Date.now(),
        socketMap: new Map(),
        reverseSocketMap: new Map(),
        botTimer: null,
        turnTimer: null,
        resolutionTimer: null,
        transferRequests: new Map(),
        lastMovePerPlayer: new Map(),
      };
      this.rooms.set(cleanCode, room);
    }

    // Fill with bots if less than 3 players (for fun gameplay)
    if (room.players.length < 3) {
      const botsToAdd = DEFAULT_BOTS.slice(0, 3 - room.players.length);
      botsToAdd.forEach((b) => {
        room.players.push({
          ...b,
          seatIndex: room.players.length,
        });
      });
    }

    const { dealtPlayers } = dealCards(
      room.players,
      room.settings.deckCount || 1,
      room.settings.equalHands !== false
    );

    room.players = dealtPlayers;
    const { playerIndex } = findStartingPlayerIndex(room.players);
    const startingPlayer = room.players[playerIndex] || room.players[0];

    room.gamePhase = 'PLAYING';
    room.isFirstTrick = true;
    room.currentTurnPlayerId = startingPlayer.id;
    room.currentTrick = { leadSuit: null, plays: [] };
    room.deadPile = [];
    room.bhabhiPlayer = null;
    room.lastMovePerPlayer = new Map();
    room.sequenceNumber++;

    this.broadcastRoomState(room, `Game started! ${startingPlayer.name} holds Ace of Spades (A♠) and leads!`);

    // Reset turn timer
    this.startTurnTimer(room);

    // If starting player is bot, trigger bot play
    if (startingPlayer.isBot || !startingPlayer.isOnline) {
      this.scheduleBotMove(room, 1200);
    }
  }

  public playCard(roomCode: string, playerId: string, cardId: string, socketId?: string) {
    const cleanCode = roomCode.toUpperCase().trim();
    const room = this.rooms.get(cleanCode);
    if (!room) return { success: true };

    if (room.gamePhase !== 'PLAYING') {
      return { success: true };
    }

    // Resolve effective playerId using socket mapping if provided or if playerId was desynced
    let resolvedPlayerId = playerId;
    if (socketId && room.reverseSocketMap.has(socketId)) {
      const mappedId = room.reverseSocketMap.get(socketId)!;
      const mappedPlayer = room.players.find((p) => p.id === mappedId);
      if (mappedPlayer && (mappedId === room.currentTurnPlayerId || mappedPlayer.cards.some((c) => c.id === cardId))) {
        resolvedPlayerId = mappedId;
      }
    }

    // Idempotency: if this exact card was already played in current trick by this player, succeed silently
    const alreadyPlayedInTrick = room.currentTrick.plays.some(
      (p) => p.playerId === resolvedPlayerId && p.card.id === cardId
    );
    if (alreadyPlayedInTrick) {
      return { success: true };
    }

    if (room.currentTurnPlayerId !== resolvedPlayerId) {
      return { success: false, error: 'Not your turn!' };
    }

    // Move deduplication: prevent double card drops in the same trick
    if (room.lastMovePerPlayer.has(resolvedPlayerId)) {
      return { success: false, error: 'You have already played in this trick!' };
    }

    const player = room.players.find((p) => p.id === resolvedPlayerId);
    if (!player) return { success: true };

    const card = player.cards.find((c) => c.id === cardId);
    if (!card) return { success: false, error: 'Card not in player hand' };

    const validation = canPlayCard(player.cards, card, room.currentTrick.leadSuit, room.isFirstTrick);
    if (!validation.legal) {
      return { success: false, error: validation.reason || 'Illegal move!' };
    }

    // Card is valid: remove from hand
    player.cards = player.cards.filter((c) => c.id !== cardId);
    player.cardCount = player.cards.length;
    room.lastMovePerPlayer.set(resolvedPlayerId, cardId);

    const isLead = !room.currentTrick.leadSuit;
    // User requirement: First round Thullas are ignored / passed cleanly without penalty
    const isThulla = !isLead && card.suit !== room.currentTrick.leadSuit && !room.isFirstTrick;

    const newPlay = {
      playerId: resolvedPlayerId,
      card,
      isThulla,
      timestamp: Date.now(),
    };

    room.currentTrick = {
      leadSuit: room.currentTrick.leadSuit || card.suit,
      plays: [...room.currentTrick.plays, newPlay],
    };

    room.sequenceNumber++;

    // Broadcast instant card play event to all clients for animation sync
    this.io.to(room.code).emit('CARD_PLAYED', {
      playerId: resolvedPlayerId,
      card,
      isThulla,
      isLead,
      trick: room.currentTrick,
      remainingCards: player.cards.length,
      sequenceNumber: room.sequenceNumber,
    });

    // Clear any active turn timer
    if (room.turnTimer) clearInterval(room.turnTimer);

    // ==========================================
    // CASE 1: THULLA RESOLUTION (Well-paced for smooth cinematic animations)
    // ==========================================
    if (isThulla) {
      room.gamePhase = 'THULLA_RESOLVE';
      const { pickerId, pickedCards, highestLeadCard } = resolveThullaOutcome(room.currentTrick, room.settings.tieRule);
      const picker = room.players.find((p) => p.id === pickerId);

      this.io.to(room.code).emit('THULLA_EVENT', {
        cutterId: resolvedPlayerId,
        cutterName: player.name,
        cutCard: card,
        highestLeadCard,
        pickerId,
        pickerName: picker?.name || 'Picker',
        pickedCount: pickedCards.length,
        leadSuit: room.currentTrick.leadSuit,
      });

      room.resolutionTimer = setTimeout(() => {
        // Give cards to picker
        const pickerIdx = room.players.findIndex((p) => p.id === pickerId);
        if (pickerIdx !== -1) {
          room.players[pickerIdx].cards = [...room.players[pickerIdx].cards, ...pickedCards];
          room.players[pickerIdx].cardCount = room.players[pickerIdx].cards.length;
        }

        // Reset trick
        room.currentTrick = { leadSuit: null, plays: [] };
        room.isFirstTrick = false;
        room.lastMovePerPlayer.clear();

        // Check who got out
        const { updatedPlayers, newlyOut } = updateOutStatus(room.players, pickerId);
        room.players = updatedPlayers;

        if (newlyOut.length > 0) {
          this.io.to(room.code).emit('PLAYERS_OUT_EVENT', { newlyOut });
        }

        // Check Game Over
        const remainingWithCards = room.players.filter((p) => !p.isOut && p.cards.length > 0);
        if (remainingWithCards.length <= 1) {
          const loser = remainingWithCards[0] || room.players[0];
          room.bhabhiPlayer = loser;
          room.gamePhase = 'GAME_OVER';
          this.broadcastRoomState(room, `🏁 GAME OVER! ${loser.name} is the BHABHI!`);
          return;
        }

        // Next leader is picker
        room.currentTurnPlayerId = pickerId;
        room.gamePhase = 'PLAYING';
        this.broadcastRoomState(room);
        this.startTurnTimer(room);

        // Check if next player is bot
        const nextPlayer = room.players.find((p) => p.id === pickerId);
        if (nextPlayer && (nextPlayer.isBot || !nextPlayer.isOnline)) {
          this.scheduleBotMove(room, 1000);
        }
      }, 3600);

      return { success: true };
    }

    // ==========================================
    // CASE 2: CLEAN TRICK OR ADVANCE TURN
    // ==========================================
    const activePlayers = room.players.filter((p) => !p.isOut || p.cards.length > 0);
    const allActivePlayed = room.currentTrick.plays.length >= activePlayers.length;

    if (allActivePlayed) {
      room.gamePhase = 'CLEAN_RESOLVE';
      const { winnerId, discardedCards } = resolveCleanOutcome(room.currentTrick, room.settings.tieRule);
      const winnerObj = room.players.find((p) => p.id === winnerId);

      this.io.to(room.code).emit('CLEAN_TRICK_EVENT', {
        winnerId,
        winnerName: winnerObj?.name || 'Winner',
        discardedCount: discardedCards.length,
      });

      room.resolutionTimer = setTimeout(() => {
        // Discard to dead pile
        room.deadPile.push(...discardedCards);
        const resolvedTrick = room.currentTrick;
        room.currentTrick = { leadSuit: null, plays: [] };
        room.isFirstTrick = false;
        room.lastMovePerPlayer.clear();

        // Check who got out
        const { updatedPlayers, newlyOut } = updateOutStatus(room.players);
        room.players = updatedPlayers;

        if (newlyOut.length > 0) {
          this.io.to(room.code).emit('PLAYERS_OUT_EVENT', { newlyOut });
        }

        // Check Game Over
        const remainingWithCards = room.players.filter((p) => !p.isOut && p.cards.length > 0);
        if (remainingWithCards.length <= 1) {
          const loser = remainingWithCards[0] || room.players[0];
          room.bhabhiPlayer = loser;
          room.gamePhase = 'GAME_OVER';
          this.broadcastRoomState(room, `🏁 GAME OVER! ${loser.name} is the BHABHI!`);
          return;
        }

        // Winner leads next trick, or next highest card if winner has no cards left!
        const nextLeaderId = determineNextLeaderAfterCleanTrick(
          resolvedTrick,
          room.players,
          winnerId,
          room.settings.tieRule
        );

        room.currentTurnPlayerId = nextLeaderId;
        room.gamePhase = 'PLAYING';
        this.broadcastRoomState(room);
        this.startTurnTimer(room);

        const nextPlayer = room.players.find((p) => p.id === nextLeaderId);
        if (nextPlayer && (nextPlayer.isBot || !nextPlayer.isOnline)) {
          this.scheduleBotMove(room, 1000);
        }
      }, 2200);

      return { success: true };
    }

    // Trick not finished: Advance turn to next active player
    const currentIdx = room.players.findIndex((p) => p.id === resolvedPlayerId);
    const nextIdx = getNextActivePlayerIndex(room.players, currentIdx);
    const nextPlayer = room.players[nextIdx];

    room.currentTurnPlayerId = nextPlayer.id;
    this.broadcastRoomState(room);
    this.startTurnTimer(room);

    if (nextPlayer.isBot || !nextPlayer.isOnline) {
      this.scheduleBotMove(room, 900);
    }

    return { success: true };
  }

  public returnToLobby(roomCode: string, _playerId?: string) {
    const cleanCode = roomCode.toUpperCase().trim();
    const room = this.rooms.get(cleanCode);
    if (!room) return { success: true };

    this.clearRoomTimers(room);

    room.gamePhase = 'LOBBY';
    room.currentTrick = { leadSuit: null, plays: [] };
    room.deadPile = [];
    room.bhabhiPlayer = null;
    room.isFirstTrick = true;
    room.lastMovePerPlayer.clear();
    room.transferRequests.clear();

    // Reset player hands & game statuses for next match
    room.players = room.players.map((p) => ({
      ...p,
      cards: [],
      cardCount: 0,
      isOut: false,
      finishPosition: null,
      consecutiveTimeouts: 0,
      isReady: true,
    }));

    if (room.players.length > 0) {
      room.currentTurnPlayerId = room.players[0].id;
    }

    this.broadcastRoomState(room, 'Returned to Lobby');
    return { success: true };
  }

  private scheduleBotMove(room: RoomState, delayMs: number = 800) {
    if (room.botTimer) clearTimeout(room.botTimer);

    room.botTimer = setTimeout(() => {
      if (room.gamePhase !== 'PLAYING') return;

      const player = room.players.find((p) => p.id === room.currentTurnPlayerId);
      if (!player) return;
      if (!player.isBot && player.isOnline) return;

      const chosenCard = botChooseCard(player, room.currentTrick, room.isFirstTrick);
      if (chosenCard) {
        this.playCard(room.code, player.id, chosenCard.id);
      }
    }, delayMs);
  }

  private startTurnTimer(room: RoomState) {
    if (room.turnTimer) clearInterval(room.turnTimer);

    const seconds = room.settings.turnTimerSeconds || 15;
    if (seconds <= 0) return;

    room.turnTimeLeft = seconds;

    room.turnTimer = setInterval(() => {
      room.turnTimeLeft--;
      this.io.to(room.code).emit('TURN_TIMER_TICK', {
        turnTimeLeft: room.turnTimeLeft,
        currentTurnPlayerId: room.currentTurnPlayerId,
      });

      if (room.turnTimeLeft <= 0) {
        if (room.turnTimer) clearInterval(room.turnTimer);

        // Player timed out: Auto play or bot take over move
        const player = room.players.find((p) => p.id === room.currentTurnPlayerId);
        if (player) {
          player.consecutiveTimeouts = (player.consecutiveTimeouts || 0) + 1;
          const chosenCard = botChooseCard(player, room.currentTrick, room.isFirstTrick);
          if (chosenCard) {
            this.playCard(room.code, player.id, chosenCard.id);
          }
        }
      }
    }, 1000);
  }

  public handleReportPing(roomCode: string, playerId: string, ping: number) {
    const room = this.rooms.get(roomCode.toUpperCase().trim());
    if (!room) return;

    const player = room.players.find((p) => p.id === playerId);
    if (!player) return;

    const newPing = Math.max(1, Math.round(ping));
    const oldPing = player.ping || 0;
    player.ping = newPing;

    // Only broadcast if ping changed significantly (>= 15ms) or first report to prevent network saturation
    if (Math.abs(newPing - oldPing) >= 15 || oldPing === 0) {
      this.io.to(room.code).emit('PLAYERS_PING_UPDATE', {
        playerId,
        ping: player.ping,
      });
    }
  }

  public handleChatMessage(roomCode: string, senderId: string, text: string) {
    const room = this.rooms.get(roomCode.toUpperCase().trim());
    if (!room) return;

    const sender = room.players.find((p) => p.id === senderId);
    if (!sender) return;

    const msg: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      senderId: sender.id,
      senderName: sender.name,
      text,
      timestamp: Date.now(),
    };

    this.io.to(room.code).emit('CHAT_MESSAGE_EVENT', msg);
  }

  public handleDirectTransfer(roomCode: string, fromPlayerId: string, toPlayerId: string, cardCount?: number) {
    const room = this.rooms.get(roomCode.toUpperCase().trim());
    if (!room) return;

    const fromP = room.players.find((p) => p.id === fromPlayerId);
    const toP = room.players.find((p) => p.id === toPlayerId);
    if (!fromP || !toP || fromP.cards.length === 0) return;

    // If cardCount not specified or greater than available, transfer all fromP cards
    const count = cardCount && cardCount > 0 ? Math.min(cardCount, fromP.cards.length) : fromP.cards.length;
    const cardsToMove = fromP.cards.slice(0, count);
    fromP.cards = fromP.cards.slice(count);
    toP.cards = sortHand([...toP.cards, ...cardsToMove]);

    fromP.cardCount = fromP.cards.length;
    toP.cardCount = toP.cards.length;

    // Receiver now has cards, so they cannot be out
    toP.isOut = false;
    toP.finishPosition = null;

    // Update safe status for players who shed all cards
    const { updatedPlayers, newlyOut } = updateOutStatus(room.players);
    room.players = updatedPlayers;

    if (newlyOut.length > 0) {
      this.io.to(room.code).emit('PLAYERS_OUT_EVENT', { newlyOut });
    }

    // Check if only 1 player remains with cards -> GAME OVER
    const remainingWithCards = room.players.filter((p) => !p.isOut && p.cards.length > 0);
    if (remainingWithCards.length <= 1 && room.players.length > 1) {
      const loser = remainingWithCards[0] || toP;
      room.bhabhiPlayer = loser;
      room.gamePhase = 'GAME_OVER';
      this.clearRoomTimers(room);
      this.broadcastRoomState(room, `🏁 GAME OVER! ${loser.name} is the BHABHI!`);
      return;
    }

    // CRITICAL USER REQUIREMENT:
    // If it was the giver's turn (or currentTurnPlayerId now has 0 cards / is out),
    // immediately skip their turn and advance to the next active player with cards!
    const currentTurnP = room.players.find((p) => p.id === room.currentTurnPlayerId);
    if (!currentTurnP || currentTurnP.isOut || currentTurnP.cards.length === 0) {
      const giverIdx = room.players.findIndex((p) => p.id === fromPlayerId);
      const nextIdx = getNextActivePlayerIndex(room.players, giverIdx >= 0 ? giverIdx : 0);
      const nextP = room.players[nextIdx];
      if (nextP) {
        room.currentTurnPlayerId = nextP.id;
        this.startTurnTimer(room);

        if (nextP.isBot || !nextP.isOnline) {
          this.scheduleBotMove(room, 900);
        }
      }
    }

    this.broadcastRoomState(room, `🔄 ${fromP.name} transferred ${count} card(s) to ${toP.name}`);
  }

  public handleTransferRequest(data: any) {
    const room = this.rooms.get(data.roomCode?.toUpperCase()?.trim());
    if (!room) return;
    const targetSocketId = room.socketMap.get(data.toPlayerId);
    if (targetSocketId) {
      this.io.to(targetSocketId).emit('TRANSFER_REQUEST_EVENT', data);
    }
  }

  public handleTransferResponse(data: any) {
    const room = this.rooms.get(data.roomCode?.toUpperCase()?.trim());
    if (!room) return;
    const sourceSocketId = room.socketMap.get(data.fromPlayerId);
    if (sourceSocketId) {
      this.io.to(sourceSocketId).emit('TRANSFER_RESPONSE_EVENT', data);
    }
  }

  public updateSettings(roomCode: string, playerId: string, newSettings: Partial<RoomSettings>, theme?: Theme) {
    const room = this.rooms.get(roomCode.toUpperCase().trim());
    if (!room) return;
    const p = room.players.find((pl) => pl.id === playerId);
    if (!p?.isHost) return;

    if (newSettings) room.settings = { ...room.settings, ...newSettings };
    if (theme) room.theme = theme;

    this.broadcastRoomState(room);
  }

  public renamePlayer(roomCode: string, playerId: string, newName: string) {
    const room = this.rooms.get(roomCode.toUpperCase().trim());
    if (!room) return;
    const p = room.players.find((pl) => pl.id === playerId);
    if (!p) return;
    p.name = newName.trim();
    this.broadcastRoomState(room, `✏️ ${p.name} updated name`);
  }

  public addBot(roomCode: string, _requesterId: string, difficulty: 'easy' | 'medium' | 'hard' = 'medium') {
    const cleanCode = roomCode.toUpperCase().trim();
    const room = this.rooms.get(cleanCode);
    if (!room || room.gamePhase !== 'LOBBY') return;
    if (room.players.length >= (room.settings.maxPlayers || 8)) {
      throw new Error(`Room is full (max ${room.settings.maxPlayers || 8} players)`);
    }

    const botNames = ['Bot Vicky', 'Bot Sunny', 'Bot Simran', 'Bot Bunty', 'Bot Preet', 'Bot Rocky', 'Bot Priya', 'Bot Kabir'];
    const botAvatars = ['🤠', '🦁', '🦊', '🐼', '🤖', '👑', '🐯', '⚡'];
    const botNum = room.players.filter((p) => p.isBot).length + 1;
    const name = botNames[(botNum - 1) % botNames.length] || `Bot ${botNum}`;
    const avatar = botAvatars[(botNum - 1) % botAvatars.length] || '🤖';

    const newBot: Player = {
      id: `bot-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: `${name} (${difficulty})`,
      avatar,
      isBot: true,
      botDifficulty: difficulty,
      cards: [],
      seatIndex: room.players.length,
      isHost: false,
      isReady: true,
      isOut: false,
      finishPosition: null,
      consecutiveTimeouts: 0,
      isOnline: true,
      ping: Math.floor(Math.random() * 10) + 5,
    };

    room.players.push(newBot);
    this.broadcastRoomState(room, `🤖 Added ${newBot.name} to room`);
  }

  public removePlayer(roomCode: string, _requesterId: string, targetPlayerId: string) {
    const cleanCode = roomCode.toUpperCase().trim();
    const room = this.rooms.get(cleanCode);
    if (!room || room.gamePhase !== 'LOBBY') return;
    if (room.players.length <= 2) {
      throw new Error('Minimum 2 players required');
    }
    const idx = room.players.findIndex((p) => p.id === targetPlayerId);
    if (idx === -1) return;
    const removed = room.players.splice(idx, 1)[0];
    room.players.forEach((p, i) => (p.seatIndex = i));
    this.broadcastRoomState(room, `Removed ${removed.name}`);
  }

  private clearRoomTimers(room: RoomState) {
    if (room.botTimer) clearTimeout(room.botTimer);
    if (room.turnTimer) clearInterval(room.turnTimer);
    if (room.resolutionTimer) clearTimeout(room.resolutionTimer);
  }

  public getPlayerView(room: RoomState, forPlayerId?: string) {
    return {
      code: room.code,
      players: room.players.map((p) => ({
        ...p,
        // Only disclose full cards array to the owner player!
        cards: p.id === forPlayerId ? p.cards : [],
        // cardCount is always public so all players see opponents' hand sizes
        cardCount: p.cards.length,
      })),
      currentTurnPlayerId: room.currentTurnPlayerId,
      currentTrick: room.currentTrick,
      deadPileCount: room.deadPile.length,
      deadPile: room.deadPile,
      gamePhase: room.gamePhase,
      isFirstTrick: room.isFirstTrick,
      settings: room.settings,
      theme: room.theme,
      bhabhiPlayer: room.bhabhiPlayer,
      turnTimeLeft: room.turnTimeLeft,
      sequenceNumber: room.sequenceNumber,
    };
  }

  public getPublicRoomState(room: RoomState, forPlayerId?: string) {
    return this.getPlayerView(room, forPlayerId);
  }

  private broadcastRoomState(room: RoomState, toastMsg?: string) {
    room.sequenceNumber++;

    // 1. Send personalized view to each connected player (only their own cards visible)
    for (const [playerId, socketId] of room.socketMap.entries()) {
      const playerView = this.getPlayerView(room, playerId);
      this.io.to(socketId).emit('ROOM_STATE_UPDATED', {
        state: playerView,
        toast: toastMsg,
        sequenceNumber: room.sequenceNumber,
      });
    }

    // 2. Also emit spectator view (all cards hidden) to the room code
    const spectatorView = this.getPlayerView(room);
    this.io.to(room.code).emit('ROOM_STATE_UPDATED_PUBLIC', {
      state: spectatorView,
      toast: toastMsg,
      sequenceNumber: room.sequenceNumber,
    });
  }
}
