"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.socketService = void 0;
const socket_io_1 = require("socket.io");
const env_1 = require("../config/env");
const logger_1 = require("../utils/logger");
class SocketService {
    io = null;
    init(server) {
        this.io = new socket_io_1.Server(server, {
            cors: {
                origin: [env_1.env.FRONTEND_URL],
                methods: ['GET', 'POST'],
                credentials: true
            }
        });
        this.io.on('connection', (socket) => {
            logger_1.logger.info(`Socket connected: ${socket.id}`);
            // Users join their personal room for coin updates
            socket.on('joinUserRoom', (userId) => {
                socket.join(`user:${userId}`);
                logger_1.logger.info(`Socket ${socket.id} joined user:${userId}`);
            });
            // Users join a specific wheel room to watch the game
            socket.on('joinWheelRoom', (wheelId) => {
                socket.join(`wheel:${wheelId}`);
                logger_1.logger.info(`Socket ${socket.id} joined wheel:${wheelId}`);
            });
            socket.on('disconnect', () => {
                logger_1.logger.info(`Socket disconnected: ${socket.id}`);
            });
        });
    }
    getIO() {
        if (!this.io) {
            throw new Error('Socket.IO not initialized');
        }
        return this.io;
    }
    // Helper emitters
    emitPlayerJoined(wheelId, payload) {
        this.getIO().to(`wheel:${wheelId}`).emit('wheel:playerJoined', payload);
    }
    emitStarted(wheelId, payload) {
        this.getIO().to(`wheel:${wheelId}`).emit('wheel:started', payload);
    }
    emitElimination(wheelId, payload) {
        this.getIO().to(`wheel:${wheelId}`).emit('wheel:elimination', payload);
    }
    emitWinner(wheelId, payload) {
        this.getIO().to(`wheel:${wheelId}`).emit('wheel:winner', payload);
    }
    emitAborted(wheelId) {
        this.getIO().to(`wheel:${wheelId}`).emit('wheel:aborted');
    }
    emitCoinUpdate(userId, payload) {
        this.getIO().to(`user:${userId}`).emit('wheel:coinUpdate', payload);
    }
}
exports.socketService = new SocketService();
