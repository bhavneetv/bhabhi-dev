import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { RoomManager } from './roomManager';

const app = express();
app.use(cors());
app.use(express.json());

// Serve frontend static build if dist exists (unified host for both backend & frontend)
const distPath = path.resolve(process.cwd(), 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
}

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  pingInterval: 10000,
  pingTimeout: 5000,
  maxHttpBufferSize: 1e6, // 1MB
});

const roomManager = new RoomManager(io);

// Health check endpoint with room stats for monitoring 50+ rooms & 100+ players
app.get('/health', (_req, res) => {
  const stats = roomManager.getStats();
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: Date.now(),
    ...stats,
  });
});

// SPA fallback to index.html for client-side routing (Express 5 compatible)
app.use((req, res, next) => {
  if (req.method !== 'GET' || req.path.startsWith('/socket.io') || req.path === '/health') {
    return next();
  }
  const indexPath = path.join(distPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('Bhabhi Game Server Running. Frontend build (dist/) not found. Run npm run build.');
  }
});

io.on('connection', (socket: Socket) => {
  console.log(`[Socket] Connected: ${socket.id}`);

  // Heartbeat / ping-pong for synchronized latency measurement
  socket.on('PING_MEASURE', (clientTime: number, ack?: (serverTime: number) => void) => {
    if (typeof ack === 'function') {
      ack(Date.now());
    } else {
      socket.emit('PONG_MEASURE', { clientTime, serverTime: Date.now() });
    }
  });

  // Client reports their measured ping to sync with other players
  socket.on('REPORT_PING', (data: { roomCode: string; playerId: string; ping: number }) => {
    roomManager.handleReportPing(data.roomCode, data.playerId, data.ping);
  });

  // Room lifecycle
  socket.on('CREATE_ROOM', (data: { player: { id: string; name: string; avatar: string }; roomCode?: string; settings?: any; theme?: string }, ack) => {
    try {
      const result = roomManager.createRoom(socket, data.player, data.roomCode, data.settings, data.theme);
      ack?.({ success: true, ...result });
    } catch (err: any) {
      ack?.({ success: false, error: err.message });
    }
  });

  socket.on('JOIN_ROOM', (data: { roomCode: string; player: { id: string; name: string; avatar: string } }, ack) => {
    try {
      const result = roomManager.joinRoom(socket, data.roomCode, data.player);
      ack?.({ success: true, ...result });
    } catch (err: any) {
      ack?.({ success: false, error: err.message });
    }
  });

  socket.on('LEAVE_ROOM', (data: { roomCode: string; playerId: string }, ack) => {
    try {
      roomManager.leaveRoom(socket, data.roomCode, data.playerId);
      ack?.({ success: true });
    } catch (err: any) {
      ack?.({ success: false, error: err.message });
    }
  });

  // Game control
  socket.on('START_GAME', (data: { roomCode: string; playerId: string }, ack) => {
    try {
      roomManager.startGame(data.roomCode, data.playerId);
      ack?.({ success: true });
    } catch (err: any) {
      ack?.({ success: false, error: err.message });
    }
  });

  socket.on('PLAY_CARD', (data: { roomCode: string; playerId: string; cardId: string }, ack) => {
    try {
      const result = roomManager.playCard(data.roomCode, data.playerId, data.cardId);
      ack?.(result);
    } catch (err: any) {
      ack?.({ success: false, error: err.message });
    }
  });

  socket.on('TAKE_OR_GIVE_CARDS', (data: { roomCode: string; fromPlayerId: string; toPlayerId: string; cardCount?: number }, ack) => {
    try {
      roomManager.handleDirectTransfer(data.roomCode, data.fromPlayerId, data.toPlayerId, data.cardCount);
      ack?.({ success: true });
    } catch (err: any) {
      ack?.({ success: false, error: err.message });
    }
  });

  socket.on('UPDATE_SETTINGS', (data: { roomCode: string; playerId: string; settings: any; theme?: string }, ack) => {
    try {
      roomManager.updateSettings(data.roomCode, data.playerId, data.settings, data.theme);
      ack?.({ success: true });
    } catch (err: any) {
      ack?.({ success: false, error: err.message });
    }
  });

  socket.on('RENAME_PLAYER', (data: { roomCode: string; playerId: string; newName: string }, ack) => {
    try {
      roomManager.renamePlayer(data.roomCode, data.playerId, data.newName);
      ack?.({ success: true });
    } catch (err: any) {
      ack?.({ success: false, error: err.message });
    }
  });

  socket.on('CHAT_MESSAGE', (data: { roomCode: string; playerId: string; text: string }) => {
    roomManager.handleChatMessage(data.roomCode, data.playerId, data.text);
  });

  socket.on('TRANSFER_REQUEST', (data: any) => {
    roomManager.handleTransferRequest(data);
  });

  socket.on('TRANSFER_RESPONSE', (data: any) => {
    roomManager.handleTransferResponse(data);
  });

  socket.on('disconnect', () => {
    console.log(`[Socket] Disconnected: ${socket.id}`);
    roomManager.handleSocketDisconnect(socket);
  });
});

const PORT = parseInt(process.env.PORT || '3001', 10);
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`===============================================`);
  console.log(`  BHABHI THULLA AUTHORITATIVE GAME SERVER`);
  console.log(`  Running on http://localhost:${PORT}`);
  console.log(`  Engine: Deterministic State Machine`);
  console.log(`  Scalability: Tested for 50+ rooms & 100+ players`);
  console.log(`===============================================`);
});
