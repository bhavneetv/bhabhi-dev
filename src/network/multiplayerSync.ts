import { io, Socket } from 'socket.io-client';
import type { Player, Card, Trick, RoomSettings, Theme, ChatMessage, GamePhase } from '../types/game';

export type NetworkEvent =
  | { type: 'PLAYER_JOIN'; player: Player }
  | { type: 'PLAYER_LEAVE'; playerId: string }
  | { type: 'PLAYER_RENAME'; playerId: string; newName: string; renamedBy: string }
  | { type: 'PLAYER_RECONNECT'; playerId: string }
  | { type: 'GAME_START'; players: Player[]; startingPlayerId: string; trick: Trick }
  | { type: 'PLAY_CARD'; playerId: string; card: Card }
  | {
      type: 'CARD_PLAYED_ANIMATION';
      playerId: string;
      card: Card;
      isThulla: boolean;
      isLead: boolean;
      trick: Trick;
      remainingCards: number;
    }
  | {
      type: 'THULLA_ALERT';
      cutterId: string;
      cutterName: string;
      cutCard: Card;
      pickerId: string;
      pickerName: string;
      pickedCount: number;
      leadSuit: string | null;
    }
  | {
      type: 'CLEAN_TRICK_ALERT';
      winnerId: string;
      winnerName: string;
      discardedCount: number;
    }
  | {
      type: 'PLAYERS_OUT_ALERT';
      newlyOut: Player[];
    }
  | {
      type: 'TAKE_OR_GIVE_CARDS';
      fromPlayerId: string;
      toPlayerId: string;
      cards: Card[];
      nextTurnPlayerId?: string;
      gameOver?: boolean;
      bhabhiPlayerId?: string;
    }
  | { type: 'REQUEST_SYNC'; requesterId: string }
  | {
      type: 'SYNC_FULL_STATE';
      state: {
        players: Player[];
        currentTurnPlayerId: string;
        currentTrick: Trick;
        deadPile: Card[];
        gamePhase: GamePhase;
        isFirstTrick: boolean;
        settings: RoomSettings;
        theme: Theme;
      };
      targetPlayerId?: string;
      toast?: string;
    }
  | { type: 'ROOM_SETTINGS_UPDATE'; settings: RoomSettings; theme?: Theme }
  | { type: 'CHAT_MESSAGE'; message: ChatMessage }
  | { type: 'HEARTBEAT'; playerId: string }
  | { type: 'PING_UPDATE'; playerId: string; ping: number }
  | { type: 'TURN_TIMER_TICK'; turnTimeLeft: number; currentTurnPlayerId: string }
  | {
      type: 'TRANSFER_REQUEST';
      requestId: string;
      fromPlayerId: string;
      fromPlayerName: string;
      fromPlayerAvatar?: string;
      toPlayerId: string;
      toPlayerName: string;
      action: 'GIVE' | 'TAKE';
      cardCount: number;
    }
  | {
      type: 'TRANSFER_RESPONSE';
      requestId: string;
      accepted: boolean;
      fromPlayerId: string;
      fromPlayerName: string;
      toPlayerId: string;
      toPlayerName: string;
      action: 'GIVE' | 'TAKE';
    }
  | {
      type: 'VOICE_SIGNAL';
      fromPlayerId: string;
      toPlayerId: string;
      signal: any;
    }
  | {
      type: 'VOICE_STATUS';
      playerId: string;
      isSpeaking: boolean;
      volume?: number;
    }
  | {
      type: 'VOICE_READY';
      fromPlayerId: string;
    };

function getServerUrl(): string {
  if (typeof window !== 'undefined') {
    const envUrl = (import.meta as any).env?.VITE_SERVER_URL;
    if (envUrl) return envUrl;

    // In local Vite dev mode, connect to backend on port 3001
    if (window.location.port === '5173' || window.location.port === '5174') {
      const host = window.location.hostname || 'localhost';
      return `http://${host}:3001`;
    }

    // In public deployment, unified server, tunnel, or LAN, use current origin directly
    return window.location.origin;
  }
  return 'http://localhost:3001';
}

export class MultiplayerService {
  private socket: Socket | null = null;
  private currentRoomCode: string | null = null;
  private localPlayerId: string | null = null;
  private broadcastChannel: BroadcastChannel | null = null;
  private onEventHandler: ((event: NetworkEvent) => void) | null = null;
  private onConnectionChangeHandler: ((connected: boolean) => void) | null = null;
  private onConnectCallbacks: Set<() => void> = new Set();
  private pingCallbacks: Set<(ping: number) => void> = new Set();
  private currentPing: number = 25;
  private pingInterval: ReturnType<typeof setInterval> | null = null;

  public getPing(): number {
    return this.currentPing;
  }

  public isServerConnected(): boolean {
    return Boolean(this.socket?.connected);
  }

  public onPingChange(cb: (ping: number) => void): () => void {
    this.pingCallbacks.add(cb);
    cb(this.currentPing);
    return () => this.pingCallbacks.delete(cb);
  }

  public onConnect(cb: () => void): () => void {
    this.onConnectCallbacks.add(cb);
    if (this.socket?.connected) {
      cb();
    }
    return () => this.onConnectCallbacks.delete(cb);
  }

  public connect(
    roomCode: string,
    onEvent: (event: NetworkEvent) => void,
    onConnectionChange?: (connected: boolean) => void
  ) {
    const cleanRoomCode = roomCode.toUpperCase().trim();
    this.currentRoomCode = cleanRoomCode;
    this.onEventHandler = onEvent;
    this.onConnectionChangeHandler = onConnectionChange || null;

    // 1. Setup local BroadcastChannel for zero-latency local tab sync
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        if (this.broadcastChannel) this.broadcastChannel.close();
        this.broadcastChannel = new BroadcastChannel(`bhabhi_bc_${this.currentRoomCode}`);
        this.broadcastChannel.onmessage = (e) => {
          if (e.data && this.onEventHandler) {
            this.onEventHandler(e.data);
          }
        };
      } catch (err) {
        console.warn('[Multiplayer] BroadcastChannel init error:', err);
      }
    }

    // 2. Connect to Socket.IO authoritative server
    this.initSocket();
  }

  private initSocket() {
    if (this.socket) {
      if (this.socket.connected) return;
      this.socket.connect();
      return;
    }

    const serverUrl = getServerUrl();
    console.log(`[Multiplayer] Connecting to Game Server at ${serverUrl}`);

    this.socket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
    });

    this.socket.on('connect', () => {
      console.log(`[Multiplayer] Connected to server (Socket ID: ${this.socket?.id})`);
      this.onConnectionChangeHandler?.(true);
      this.onConnectCallbacks.forEach((cb) => cb());
      this.startPingMeasurement();
    });

    this.socket.on('disconnect', (reason) => {
      console.warn(`[Multiplayer] Disconnected from server: ${reason}`);
      this.onConnectionChangeHandler?.(false);
      this.updatePing(999);
    });

    this.socket.on('connect_error', (err) => {
      console.warn(`[Multiplayer] Server connection error:`, err.message);
      this.onConnectionChangeHandler?.(false);
      this.updatePing(999);
    });

    // Authoritative Server Event Listeners
    this.socket.on('ROOM_STATE_UPDATED', (data: { state: any; toast?: string; sequenceNumber: number }) => {
      if (!this.onEventHandler) return;
      this.onEventHandler({
        type: 'SYNC_FULL_STATE',
        state: {
          players: data.state.players,
          currentTurnPlayerId: data.state.currentTurnPlayerId,
          currentTrick: data.state.currentTrick,
          deadPile: data.state.deadPile || [],
          gamePhase: data.state.gamePhase,
          isFirstTrick: data.state.isFirstTrick,
          settings: data.state.settings,
          theme: data.state.theme,
        },
        toast: data.toast,
      });
    });

    this.socket.on('CARD_PLAYED', (data: any) => {
      if (!this.onEventHandler) return;
      this.onEventHandler({
        type: 'CARD_PLAYED_ANIMATION',
        playerId: data.playerId,
        card: data.card,
        isThulla: data.isThulla,
        isLead: data.isLead,
        trick: data.trick,
        remainingCards: data.remainingCards,
      });
    });

    this.socket.on('THULLA_EVENT', (data: any) => {
      if (!this.onEventHandler) return;
      this.onEventHandler({
        type: 'THULLA_ALERT',
        cutterId: data.cutterId,
        cutterName: data.cutterName,
        cutCard: data.cutCard,
        pickerId: data.pickerId,
        pickerName: data.pickerName,
        pickedCount: data.pickedCount,
        leadSuit: data.leadSuit,
      });
    });

    this.socket.on('CLEAN_TRICK_EVENT', (data: any) => {
      if (!this.onEventHandler) return;
      this.onEventHandler({
        type: 'CLEAN_TRICK_ALERT',
        winnerId: data.winnerId,
        winnerName: data.winnerName,
        discardedCount: data.discardedCount,
      });
    });

    this.socket.on('PLAYERS_OUT_EVENT', (data: any) => {
      if (!this.onEventHandler) return;
      this.onEventHandler({
        type: 'PLAYERS_OUT_ALERT',
        newlyOut: data.newlyOut,
      });
    });

    this.socket.on('TURN_TIMER_TICK', (data: any) => {
      if (!this.onEventHandler) return;
      this.onEventHandler({
        type: 'TURN_TIMER_TICK',
        turnTimeLeft: data.turnTimeLeft,
        currentTurnPlayerId: data.currentTurnPlayerId,
      });
    });

    this.socket.on('PLAYERS_PING_UPDATE', (data: { playerId: string; ping: number }) => {
      if (!this.onEventHandler) return;
      this.onEventHandler({
        type: 'PING_UPDATE',
        playerId: data.playerId,
        ping: data.ping,
      });
    });

    this.socket.on('CHAT_MESSAGE_EVENT', (data: ChatMessage) => {
      if (!this.onEventHandler) return;
      this.onEventHandler({
        type: 'CHAT_MESSAGE',
        message: data,
      });
    });

    this.socket.on('TRANSFER_REQUEST_EVENT', (data: any) => {
      if (!this.onEventHandler) return;
      this.onEventHandler({
        type: 'TRANSFER_REQUEST',
        ...data,
      });
    });

    this.socket.on('TRANSFER_RESPONSE_EVENT', (data: any) => {
      if (!this.onEventHandler) return;
      this.onEventHandler({
        type: 'TRANSFER_RESPONSE',
        ...data,
      });
    });

    // Voice signaling pass-through
    this.socket.on('VOICE_SIGNAL', (data: any) => {
      if (!this.onEventHandler) return;
      this.onEventHandler({
        type: 'VOICE_SIGNAL',
        fromPlayerId: data.fromPlayerId,
        toPlayerId: data.toPlayerId,
        signal: data.signal,
      });
    });

    this.socket.on('VOICE_STATUS', (data: any) => {
      if (!this.onEventHandler) return;
      this.onEventHandler({
        type: 'VOICE_STATUS',
        playerId: data.playerId,
        isSpeaking: data.isSpeaking,
        volume: data.volume,
      });
    });

    this.socket.on('VOICE_READY', (data: any) => {
      if (!this.onEventHandler) return;
      this.onEventHandler({
        type: 'VOICE_READY',
        fromPlayerId: data.fromPlayerId,
      });
    });
  }

  private startPingMeasurement() {
    if (this.pingInterval) clearInterval(this.pingInterval);

    this.pingInterval = setInterval(() => {
      if (!this.socket?.connected) return;

      const startTime = Date.now();
      this.socket.emit('PING_MEASURE', startTime, () => {
        const rtt = Math.max(1, Date.now() - startTime);
        this.updatePing(rtt);

        // Report ping to server so peers know
        if (this.currentRoomCode && this.localPlayerId) {
          this.socket?.emit('REPORT_PING', {
            roomCode: this.currentRoomCode,
            playerId: this.localPlayerId,
            ping: rtt,
          });
        }
      });
    }, 2500);
  }

  private updatePing(ping: number) {
    this.currentPing = ping;
    this.pingCallbacks.forEach((cb) => cb(ping));
  }

  public startHeartbeat(playerId: string) {
    this.localPlayerId = playerId;
    this.startPingMeasurement();
  }

  public broadcast(event: NetworkEvent) {
    // 1. Broadcast locally across tabs ONLY if not connected to server (offline fallback)
    if (!this.socket?.connected && this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage(event);
      } catch (err) {
        console.warn('[Multiplayer] BroadcastChannel send error:', err);
      }
      return;
    }

    if (!this.socket?.connected || !this.currentRoomCode) return;

    // 2. Send events to authoritative server (card plays are sent via playCardOnServer exclusively)
    switch (event.type) {
      case 'GAME_START':
        this.socket.emit('START_GAME', {
          roomCode: this.currentRoomCode,
          playerId: this.localPlayerId || event.startingPlayerId,
        });
        break;

      case 'PLAYER_RENAME':
        this.socket.emit('RENAME_PLAYER', {
          roomCode: this.currentRoomCode,
          playerId: event.playerId,
          newName: event.newName,
        });
        break;

      case 'CHAT_MESSAGE':
        this.socket.emit('CHAT_MESSAGE', {
          roomCode: this.currentRoomCode,
          playerId: event.message.senderId,
          text: event.message.text,
        });
        break;

      case 'ROOM_SETTINGS_UPDATE':
        this.socket.emit('UPDATE_SETTINGS', {
          roomCode: this.currentRoomCode,
          playerId: this.localPlayerId,
          settings: event.settings,
          theme: event.theme,
        });
        break;

      case 'PLAYER_LEAVE':
        this.socket.emit('LEAVE_ROOM', {
          roomCode: this.currentRoomCode,
          playerId: event.playerId,
        });
        break;

      case 'TRANSFER_REQUEST':
        this.socket.emit('TRANSFER_REQUEST', {
          roomCode: this.currentRoomCode,
          ...event,
        });
        break;

      case 'TRANSFER_RESPONSE':
        this.socket.emit('TRANSFER_RESPONSE', {
          roomCode: this.currentRoomCode,
          ...event,
        });
        break;

      case 'TAKE_OR_GIVE_CARDS':
        this.socket.emit('TAKE_OR_GIVE_CARDS', {
          roomCode: this.currentRoomCode,
          fromPlayerId: event.fromPlayerId,
          toPlayerId: event.toPlayerId,
          cardCount: event.cards.length,
        });
        break;

      case 'VOICE_SIGNAL':
      case 'VOICE_STATUS':
      case 'VOICE_READY':
        this.socket.emit(event.type, event);
        break;
    }
  }

  public createRoomOnServer(
    player: { id: string; name: string; avatar: string },
    roomCode: string | undefined,
    settings: RoomSettings,
    theme: Theme,
    ack?: (res: { success: boolean; roomCode?: string; state?: any; error?: string }) => void
  ) {
    this.initSocket();
    this.localPlayerId = player.id;
    if (roomCode) {
      this.currentRoomCode = roomCode.toUpperCase().trim();
    }
    this.socket?.emit('CREATE_ROOM', { player, roomCode: this.currentRoomCode, settings, theme }, (res: any) => {
      if (res?.roomCode) {
        this.currentRoomCode = res.roomCode;
      }
      ack?.(res);
    });
  }

  public joinRoomOnServer(
    roomCode: string,
    player: { id: string; name: string; avatar: string },
    ack?: (res: { success: boolean; roomCode?: string; state?: any; isReconnecting?: boolean; error?: string }) => void
  ) {
    this.initSocket();
    this.localPlayerId = player.id;
    this.currentRoomCode = roomCode.toUpperCase().trim();
    this.socket?.emit('JOIN_ROOM', { roomCode: this.currentRoomCode, player }, ack);
  }

  public playCardOnServer(cardId: string, ack?: (res: { success: boolean; error?: string }) => void) {
    if (!this.currentRoomCode || !this.localPlayerId) return;
    this.socket?.emit('PLAY_CARD', {
      roomCode: this.currentRoomCode,
      playerId: this.localPlayerId,
      cardId,
    }, ack);
  }

  public reconnect() {
    if (!this.socket || !this.socket.connected) {
      this.initSocket();
    }
  }

  public disconnect() {
    if (this.pingInterval) clearInterval(this.pingInterval);
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.close();
      } catch {}
      this.broadcastChannel = null;
    }
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.currentRoomCode = null;
    this.onEventHandler = null;
    this.onConnectionChangeHandler = null;
  }
}

export const multiplayerService = new MultiplayerService();
