import mqtt from 'mqtt';
import type { Player, Card, Trick, RoomSettings, Theme, ChatMessage, GamePhase } from '../types/game';

export type NetworkEvent =
  | { type: 'PLAYER_JOIN'; player: Player }
  | { type: 'PLAYER_LEAVE'; playerId: string }
  | { type: 'PLAYER_RENAME'; playerId: string; newName: string; renamedBy: string }
  | { type: 'PLAYER_RECONNECT'; playerId: string }
  | { type: 'GAME_START'; players: Player[]; startingPlayerId: string; trick: Trick }
  | { type: 'PLAY_CARD'; playerId: string; card: Card }
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
    }
  | { type: 'ROOM_SETTINGS_UPDATE'; settings: RoomSettings; theme?: Theme }
  | { type: 'CHAT_MESSAGE'; message: ChatMessage }
  | { type: 'HEARTBEAT'; playerId: string }
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

interface Envelope {
  _id: string;
  senderId?: string;
  timestamp: number;
  payload: NetworkEvent;
}

const PRIMARY_BROKER_URL = 'wss://broker.hivemq.com:8884/mqtt';

export class MultiplayerService {
  private client: mqtt.MqttClient | null = null;
  private currentRoomCode: string | null = null;
  private currentTopic: string | null = null;
  private broadcastChannel: BroadcastChannel | null = null;
  private onEventHandler: ((event: NetworkEvent) => void) | null = null;
  private onConnectionChangeHandler: ((connected: boolean) => void) | null = null;
  private onConnectCallbacks: Set<() => void> = new Set();
  private isConnecting = false;
  private isSubscribed = false;
  private pendingOutbox: Envelope[] = [];
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private seenMessageIds: Set<string> = new Set();

  public onConnect(cb: () => void): () => void {
    this.onConnectCallbacks.add(cb);
    if (this.isSubscribed) {
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
    if (this.currentRoomCode === cleanRoomCode && (this.client?.connected || this.broadcastChannel)) {
      this.onEventHandler = onEvent;
      return;
    }

    this.disconnect();

    this.currentRoomCode = cleanRoomCode;
    this.currentTopic = `bhabhidever/v5/room/${this.currentRoomCode.toLowerCase()}`;
    this.onEventHandler = onEvent;
    this.onConnectionChangeHandler = onConnectionChange || null;

    // 1. Initialize local BroadcastChannel (instant in-browser cross-tab & cross-window sync)
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.broadcastChannel = new BroadcastChannel(`bhabhi_bc_${this.currentRoomCode}`);
        this.broadcastChannel.onmessage = (e) => {
          this.processEnvelope(e.data);
        };
        console.log(`[Multiplayer] BroadcastChannel initialized for room ${this.currentRoomCode}`);
      } catch (err) {
        console.warn('[Multiplayer] BroadcastChannel failed to init:', err);
      }
    }

    // 2. Connect to remote WSS MQTT cloud broker (cross-network / internet sync)
    this.attemptConnection();
  }

  public reconnect() {
    if (!this.client || (!this.client.connected && !this.isConnecting)) {
      this.attemptConnection();
    } else if (this.client && this.client.connected && this.currentTopic && !this.isSubscribed) {
      this.client.subscribe(this.currentTopic, { qos: 0 }, (err) => {
        if (!err) {
          this.isSubscribed = true;
          this.flushOutbox();
          this.onConnectCallbacks.forEach((cb) => {
            try { cb(); } catch (e) { console.warn(e); }
          });
        }
      });
    }
  }

  private attemptConnection() {
    if (this.isConnecting) return;
    this.isConnecting = true;
    this.isSubscribed = false;

    console.log(`[Multiplayer] Connecting to unified cloud relay: ${PRIMARY_BROKER_URL} for topic ${this.currentTopic}`);

    try {
      const clientId = `bhabhi_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
      this.client = mqtt.connect(PRIMARY_BROKER_URL, {
        clientId,
        reconnectPeriod: 2000,
        connectTimeout: 8000,
        clean: true,
        keepalive: 30,
      });

      this.client.on('connect', () => {
        this.isConnecting = false;
        console.log(`[Multiplayer] Connected to cloud relay ${PRIMARY_BROKER_URL}`);
        if (this.onConnectionChangeHandler) this.onConnectionChangeHandler(true);

        if (this.currentTopic && this.client) {
          this.client.subscribe(this.currentTopic, { qos: 0 }, (err) => {
            if (err) {
              console.error('[Multiplayer] Subscription error:', err);
            } else {
              this.isSubscribed = true;
              console.log(`[Multiplayer] Subscribed to cloud topic: ${this.currentTopic}`);
              this.flushOutbox();
              this.onConnectCallbacks.forEach((cb) => {
                try {
                  cb();
                } catch (e) {
                  console.warn('[Multiplayer] Error in onConnect callback:', e);
                }
              });
            }
          });
        }
      });

      this.client.on('reconnect', () => {
        console.log('[Multiplayer] Reconnecting to cloud relay...');
        this.isSubscribed = false;
      });

      this.client.on('message', (_topic, payload) => {
        try {
          const parsed = JSON.parse(payload.toString()) as Envelope;
          this.processEnvelope(parsed);
        } catch (e) {
          console.warn('[Multiplayer] Error parsing message payload:', e);
        }
      });

      this.client.on('error', (err) => {
        console.warn(`[Multiplayer] Cloud relay error on ${PRIMARY_BROKER_URL}:`, err);
        // Do not switch brokers! MQTT client will automatically attempt reconnect to PRIMARY_BROKER_URL
      });

      this.client.on('offline', () => {
        this.isSubscribed = false;
        if (!this.broadcastChannel && this.onConnectionChangeHandler) {
          this.onConnectionChangeHandler(false);
        }
      });

      this.client.on('close', () => {
        this.isSubscribed = false;
        if (!this.broadcastChannel && this.onConnectionChangeHandler) {
          this.onConnectionChangeHandler(false);
        }
      });
    } catch (err) {
      console.error('[Multiplayer] Connection attempt failed:', err);
      this.isConnecting = false;
    }
  }

  private processEnvelope(envelope: Envelope) {
    if (!envelope || !envelope._id || !envelope.payload) return;

    // Deduplicate so messages delivered across both BroadcastChannel and Cloud Relay run exactly once
    if (this.seenMessageIds.has(envelope._id)) {
      return;
    }
    this.seenMessageIds.add(envelope._id);

    // Limit cache size
    if (this.seenMessageIds.size > 200) {
      const iter = this.seenMessageIds.values();
      for (let i = 0; i < 50; i++) {
        const next = iter.next();
        if (!next.done) this.seenMessageIds.delete(next.value);
      }
    }

    if (this.onEventHandler) {
      this.onEventHandler(envelope.payload);
    }
  }

  private flushOutbox() {
    if (!this.client || !this.client.connected || !this.currentTopic || !this.isSubscribed) return;
    while (this.pendingOutbox.length > 0) {
      const envelope = this.pendingOutbox.shift();
      if (envelope) {
        try {
          this.client.publish(this.currentTopic, JSON.stringify(envelope), { qos: 0 });
          console.log(`[Multiplayer] Flushed queued event to cloud relay:`, envelope.payload.type);
        } catch (err) {
          console.warn('[Multiplayer] Error flushing envelope:', err);
        }
      }
    }
  }

  public broadcast(event: NetworkEvent) {
    const envelope: Envelope = {
      _id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      timestamp: Date.now(),
      payload: event,
    };

    // Mark as seen so self doesn't re-trigger from echo
    this.seenMessageIds.add(envelope._id);

    // 1. Post to local BroadcastChannel (instant for any other tab/window on this device)
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage(envelope);
      } catch (err) {
        console.warn('[Multiplayer] BroadcastChannel post failed:', err);
      }
    }

    // 2. Publish to Cloud Relay (or queue until connection & subscription are ready)
    if (this.client && this.client.connected && this.isSubscribed && this.currentTopic) {
      try {
        this.client.publish(this.currentTopic, JSON.stringify(envelope), { qos: 0 });
      } catch (e) {
        console.error('[Multiplayer] Cloud relay publish failed:', e);
      }
    } else {
      this.pendingOutbox.push(envelope);
    }
  }

  public startHeartbeat(playerId: string) {
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    this.heartbeatInterval = setInterval(() => {
      this.broadcast({ type: 'HEARTBEAT', playerId });
    }, 10000);
  }

  public disconnect() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.close();
      } catch {
        // ignore
      }
      this.broadcastChannel = null;
    }
    if (this.client) {
      try {
        this.client.end(true);
      } catch {
        // ignore
      }
      this.client = null;
    }
    this.currentRoomCode = null;
    this.currentTopic = null;
    this.isConnecting = false;
    this.isSubscribed = false;
    this.pendingOutbox = [];
    this.seenMessageIds.clear();
    if (this.onConnectionChangeHandler) this.onConnectionChangeHandler(false);
  }

  public isConnected(): boolean {
    return !!(this.broadcastChannel || (this.client && this.client.connected));
  }
}

export const multiplayerService = new MultiplayerService();
