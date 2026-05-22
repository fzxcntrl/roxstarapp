import { Server as SocketIOServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import { env } from '../config/env';
import { logger } from '../utils/logger';

class SocketService {
  private io: SocketIOServer | null = null;

  public init(server: HttpServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: [env.FRONTEND_URL],
        methods: ['GET', 'POST'],
        credentials: true
      }
    });

    this.io.on('connection', (socket) => {
      logger.info(`Socket connected: ${socket.id}`);

      // Users join their personal room for coin updates
      socket.on('joinUserRoom', (userId: string) => {
        socket.join(`user:${userId}`);
        logger.info(`Socket ${socket.id} joined user:${userId}`);
      });

      // Users join a specific wheel room to watch the game
      socket.on('joinWheelRoom', (wheelId: string) => {
        socket.join(`wheel:${wheelId}`);
        logger.info(`Socket ${socket.id} joined wheel:${wheelId}`);
      });

      socket.on('disconnect', () => {
        logger.info(`Socket disconnected: ${socket.id}`);
      });
    });
  }

  public getIO(): SocketIOServer {
    if (!this.io) {
      throw new Error('Socket.IO not initialized');
    }
    return this.io;
  }

  // Helper emitters
  public emitPlayerJoined(wheelId: string, payload: any) {
    this.getIO().to(`wheel:${wheelId}`).emit('wheel:playerJoined', payload);
  }

  public emitStarted(wheelId: string, payload: any) {
    this.getIO().to(`wheel:${wheelId}`).emit('wheel:started', payload);
  }

  public emitElimination(wheelId: string, payload: { eliminatedUserId: string, remainingPlayers: string[], nextEliminationIn: number }) {
    this.getIO().to(`wheel:${wheelId}`).emit('wheel:elimination', payload);
  }

  public emitWinner(wheelId: string, payload: { winnerUserId: string, prize: number }) {
    this.getIO().to(`wheel:${wheelId}`).emit('wheel:winner', payload);
  }

  public emitAborted(wheelId: string) {
    this.getIO().to(`wheel:${wheelId}`).emit('wheel:aborted');
  }

  public emitCoinUpdate(userId: string, payload: { newBalance: number }) {
    this.getIO().to(`user:${userId}`).emit('wheel:coinUpdate', payload);
  }
}

export const socketService = new SocketService();
