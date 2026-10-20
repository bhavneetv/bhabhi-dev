import { Server, Socket } from 'socket.io';
import {
  Player,
  Card,
  Trick,
  RoomSettings,
  Theme,
  ChatMessage,
  dealCards,
  findStartingPlayerIndex,
  canPlayCard,
  resolveCleanOutcome,
  resolveThullaOutcome,
  getNextActivePlayerIndex,
  updateOutStatus,
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
  maxPlayers: 6,
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
    };

    this.rooms.set(roomCode, room);
    this.socketToRoom.set(socket.id, roomCode);
    socket.join(roomCode);

    return {
      roomCode,
      player: hostPlayer,
      state: this.getPublicRoomState(room),
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
      };

      this.rooms.set(cleanCode, room);
      this.socketToRoom.set(socket.id, cleanCode);
      socket.join(cleanCode);

      return {
        roomCode: cleanCode,
        player: hostPlayer,
        state: this.getPublicRoomState(room),
        isReconnecting: false,
      };
    }

    // Check if player is reconnecting
    const existingIndex = room.players.findIndex((p) => p.id === playerData.id);
    if (existingIndex !== -1) {
      // Reconnection
      const p = room.players[existingIndex];
      p.isOnline = true;
      p.name = playerData.name || p.name;
      p.avatar = playerData.avatar || p.avatar;

      room.socketMap.set(p.id, socket.id);
      room.reverseSocketMap.set(socket.id, p.id);
      this.socketToRoom.set(socket.id, cleanCode);
      socket.join(cleanCode);

      this.broadcastRoomState(room, `🔄 ${p.name} reconnected`);
      return {
        roomCode: cleanCode,
        player: p,
        state: this.getPublicRoomState(room),
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
        room.socketMap.set(offlineHuman.id, socket.id);
        room.reverseSocketMap.set(socket.id, offlineHuman.id);
        this.socketToRoom.set(socket.id, cleanCode);
        socket.join(cleanCode);

        this.broadcastRoomState(room, `🔄 ${offlineHuman.name} reconnected to game`);
        return {
          roomCode: cleanCode,
          player: offlineHuman,
          state: this.getPublicRoomState(room),
          isReconnecting: true,
        };
      }
    }

    if (room.players.length >= (room.settings.maxPlayers || 6)) {
      throw new Error(`Room ${cleanCode} is full (max ${room.settings.maxPlayers} players)`);
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
      state: this.getPublicRoomState(room),
      isReconnecting: false,
    };
  }

  public leaveRoom(socket: Socket, roomCode: string, playerId: string) {
    const cleanCode = roomCode.toUpperCase().trim();
    const room = this.rooms.get(cleanCode);
    if (!room) return;

    const player = room.players.find((p) => p.id === playerId);
    if (!player) return;

    if (room.gamePhase === 'LOBBY') {
      // Remove player completely
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

    this.leaveRoom(socket, roomCode, playerId);
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
    const { playerIndex, cardId } = findStartingPlayerIndex(room.players);
    const startingPlayer = room.players[playerIndex] || room.players[0];

    room.gamePhase = 'PLAYING';
    room.isFirstTrick = true;
    room.currentTurnPlayerId = startingPlayer.id;
    room.currentTrick = { leadSuit: null, plays: [] };
    room.deadPile = [];
    room.bhabhiPlayer = null;
    room.sequenceNumber++;

    this.broadcastRoomState(room, `Game started! ${startingPlayer.name} holds Ace of Spades (A♠) and leads!`);

    // Reset turn timer
    this.startTurnTimer(room);

    // If starting player is bot, trigger bot play
    if (startingPlayer.isBot || !startingPlayer.isOnline) {
      this.scheduleBotMove(room, 1200);
    }
  }

  public playCard(roomCode: string, playerId: string, cardId: string) {
    const cleanCode = roomCode.toUpperCase().trim();
    const room = this.rooms.get(cleanCode);
    if (!room) return { success: true };

    if (room.gamePhase !== 'PLAYING') {
      return { success: true };
    }

    if (room.currentTurnPlayerId !== playerId) {
      // Idempotency: if this exact card was just played by this player in current trick, succeed silently
      const lastPlay = room.currentTrick.plays[room.currentTrick.plays.length - 1];
      if (lastPlay && lastPlay.playerId === playerId && lastPlay.card.id === cardId) {
        return { success: true };
      }
      return { success: false, error: 'Not your turn!' };
    }

    const player = room.players.find((p) => p.id === playerId);
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

    const isLead = !room.currentTrick.leadSuit;
    const isThulla = !isLead && card.suit !== room.currentTrick.leadSuit;

    const newPlay = {
      playerId,
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
      playerId,
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
      const { pickerId, pickedCards } = resolveThullaOutcome(room.currentTrick, room.settings.tieRule);
      const picker = room.players.find((p) => p.id === pickerId);

      this.io.to(room.code).emit('THULLA_EVENT', {
        cutterId: playerId,
        cutterName: player.name,
        cutCard: card,
        pickerId,
        pickerName: picker?.name || 'Picker',
        pickedCount: pickedCards.length,
        leadSuit: room.currentTrick.leadSuit,
      });

      room.resolutionTimer = setTimeout(() => {
        // Give cards to picker
        const pickerIdx = room.players.findIndex((p) => p.id === pickerId);
        if (pickerIdx !== -1) {
          room.players[pickerIdx].cards = sortHand([...room.players[pickerIdx].cards, ...pickedCards]);
          room.players[pickerIdx].cardCount = room.players[pickerIdx].cards.length;
        }

        // Reset trick
        room.currentTrick = { leadSuit: null, plays: [] };
        room.isFirstTrick = false;

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
        room.currentTrick = { leadSuit: null, plays: [] };
        room.isFirstTrick = false;

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

        // Winner leads next trick, or next active player if winner went out
        const currentWinner = room.players.find((p) => p.id === winnerId);
        let nextLeaderId = winnerId;
        if (!currentWinner || currentWinner.isOut || currentWinner.cards.length === 0) {
          const winnerIndex = room.players.findIndex((p) => p.id === winnerId);
          const nextActiveIdx = getNextActivePlayerIndex(room.players, winnerIndex);
          nextLeaderId = room.players[nextActiveIdx].id;
        }

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
    const currentIdx = room.players.findIndex((p) => p.id === playerId);
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

    player.ping = Math.round(ping);

    // Broadcast ping updates to all room participants
    this.io.to(room.code).emit('PLAYERS_PING_UPDATE', {
      playerId,
      ping: player.ping,
    });
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

    const count = cardCount || 1;
    const cardsToMove = fromP.cards.slice(0, count);
    fromP.cards = fromP.cards.slice(count);
    toP.cards = sortHand([...toP.cards, ...cardsToMove]);

    fromP.cardCount = fromP.cards.length;
    toP.cardCount = toP.cards.length;

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

  private clearRoomTimers(room: RoomState) {
    if (room.botTimer) clearTimeout(room.botTimer);
    if (room.turnTimer) clearInterval(room.turnTimer);
    if (room.resolutionTimer) clearTimeout(room.resolutionTimer);
  }

  private getPublicRoomState(room: RoomState) {
    return {
      code: room.code,
      players: room.players.map((p) => ({
        ...p,
        // cardCount is always public
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

  private broadcastRoomState(room: RoomState, toastMsg?: string) {
    room.sequenceNumber++;
    const publicState = this.getPublicRoomState(room);

    this.io.to(room.code).emit('ROOM_STATE_UPDATED', {
      state: publicState,
      toast: toastMsg,
      sequenceNumber: room.sequenceNumber,
    });
  }
}
