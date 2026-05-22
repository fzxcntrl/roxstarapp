"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gameEngine = exports.GameEngine = void 0;
const bullmq_1 = require("bullmq");
const client_1 = require("@prisma/client");
const redis_1 = require("../config/redis");
const gameQueue_1 = require("../queues/gameQueue");
const logger_1 = require("../utils/logger");
const socketService_1 = require("./socketService");
const coinService_1 = require("./coinService");
const configService_1 = require("./configService");
const prisma = new client_1.PrismaClient();
class GameEngine {
    worker;
    constructor() {
        this.worker = new bullmq_1.Worker('game-queue', async (job) => {
            const data = job.data;
            if (data.type === 'autoStartCheck') {
                await this.handleAutoStartCheck(data.wheelId);
            }
            else if (data.type === 'runEliminationTick') {
                await this.handleEliminationTick(data.wheelId);
            }
        }, { connection: redis_1.redisConnection });
        this.worker.on('failed', (job, err) => {
            logger_1.logger.error(`Job ${job?.id} failed with error ${err.message}`);
        });
    }
    async scheduleAutoStartCheck(wheelId) {
        const gameConfig = await configService_1.ConfigService.getGameConfig();
        const delayMs = gameConfig.autoStartDelayMinutes * 60 * 1000;
        await gameQueue_1.gameQueue.add('autoStartCheck', { type: 'autoStartCheck', wheelId }, { delay: delayMs });
        logger_1.logger.info(`Scheduled autoStartCheck for wheel ${wheelId} in ${gameConfig.autoStartDelayMinutes} minutes`);
    }
    async scheduleEliminationTick(wheelId) {
        const gameConfig = await configService_1.ConfigService.getGameConfig();
        const delayMs = gameConfig.eliminationIntervalSeconds * 1000;
        await gameQueue_1.gameQueue.add('runEliminationTick', { type: 'runEliminationTick', wheelId }, { delay: delayMs });
        logger_1.logger.info(`Scheduled elimination tick for wheel ${wheelId} in ${gameConfig.eliminationIntervalSeconds} seconds`);
    }
    async handleAutoStartCheck(wheelId) {
        const gameConfig = await configService_1.ConfigService.getGameConfig();
        const wheel = await prisma.spinWheel.findUnique({
            where: { id: wheelId },
            include: { participants: true }
        });
        if (!wheel || wheel.status !== client_1.WheelStatus.WAITING)
            return;
        if (wheel.participants.length < gameConfig.minParticipants) {
            // Abort and refund
            await prisma.spinWheel.update({
                where: { id: wheelId },
                data: { status: client_1.WheelStatus.ABORTED }
            });
            for (const p of wheel.participants) {
                const newBalance = await coinService_1.CoinService.refund(p.userId, wheelId, wheel.entryFee);
                if (newBalance !== undefined) {
                    socketService_1.socketService.emitCoinUpdate(p.userId, { newBalance });
                }
            }
            socketService_1.socketService.emitAborted(wheelId);
            logger_1.logger.info(`Wheel ${wheelId} aborted due to insufficient players (${wheel.participants.length} < ${gameConfig.minParticipants})`);
        }
        else {
            // Start game
            await this.startGame(wheelId);
        }
    }
    async startGame(wheelId) {
        const wheel = await prisma.spinWheel.findUnique({
            where: { id: wheelId },
            include: { participants: true }
        });
        if (!wheel || wheel.status !== client_1.WheelStatus.WAITING)
            return;
        // Shuffle participants for elimination sequence
        const shuffled = wheel.participants.map(p => p.id).sort(() => Math.random() - 0.5);
        await prisma.spinWheel.update({
            where: { id: wheelId },
            data: {
                status: client_1.WheelStatus.SPINNING,
                startTime: new Date(),
                eliminationSequence: shuffled
            }
        });
        socketService_1.socketService.emitStarted(wheelId, { eliminationSequence: shuffled });
        logger_1.logger.info(`Wheel ${wheelId} started`);
        // Queue first elimination tick
        await this.scheduleEliminationTick(wheelId);
    }
    async handleEliminationTick(wheelId) {
        const wheel = await prisma.spinWheel.findUnique({
            where: { id: wheelId },
            include: { participants: true }
        });
        if (!wheel || wheel.status !== client_1.WheelStatus.SPINNING || !wheel.eliminationSequence)
            return;
        const seq = wheel.eliminationSequence;
        const idx = wheel.currentEliminationIndex;
        if (idx >= seq.length - 1)
            return; // Only 1 left, should have completed
        const eliminatedParticipantId = seq[idx];
        const eliminatedParticipant = wheel.participants.find(p => p.id === eliminatedParticipantId);
        if (!eliminatedParticipant)
            return;
        // Mark eliminated
        await prisma.participant.update({
            where: { id: eliminatedParticipantId },
            data: { isEliminated: true, eliminatedAt: new Date() }
        });
        await prisma.spinWheel.update({
            where: { id: wheelId },
            data: { currentEliminationIndex: idx + 1 }
        });
        const activeParticipants = wheel.participants.filter(p => !p.isEliminated && p.id !== eliminatedParticipantId);
        const gameConfig = await configService_1.ConfigService.getGameConfig();
        socketService_1.socketService.emitElimination(wheelId, {
            eliminatedUserId: eliminatedParticipant.userId,
            remainingPlayers: activeParticipants.map(p => p.userId),
            nextEliminationIn: gameConfig.eliminationIntervalSeconds
        });
        if (activeParticipants.length === 1) {
            // Game over, we have a winner
            await this.completeGame(wheelId, activeParticipants[0].userId, wheel);
        }
        else {
            // Schedule next tick
            await this.scheduleEliminationTick(wheelId);
        }
    }
    async completeGame(wheelId, winnerUserId, wheel) {
        await prisma.spinWheel.update({
            where: { id: wheelId },
            data: {
                status: client_1.WheelStatus.COMPLETED,
                winnerUserId
            }
        });
        // Payouts
        const newWinnerBalance = await coinService_1.CoinService.payoutWinner(winnerUserId, wheelId, wheel.winnerPool);
        if (newWinnerBalance !== undefined) {
            socketService_1.socketService.emitCoinUpdate(winnerUserId, { newBalance: newWinnerBalance });
        }
        if (wheel.adminUserId && wheel.adminPool > 0) {
            const newAdminBalance = await coinService_1.CoinService.payoutAdmin(wheel.adminUserId, wheelId, wheel.adminPool);
            if (newAdminBalance !== undefined) {
                socketService_1.socketService.emitCoinUpdate(wheel.adminUserId, { newBalance: newAdminBalance });
            }
        }
        socketService_1.socketService.emitWinner(wheelId, { winnerUserId, prize: wheel.winnerPool });
        logger_1.logger.info(`Wheel ${wheelId} completed. Winner: ${winnerUserId}`);
    }
}
exports.GameEngine = GameEngine;
exports.gameEngine = new GameEngine();
