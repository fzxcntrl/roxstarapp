import { Worker, Job } from 'bullmq';
import { PrismaClient, WheelStatus } from '@prisma/client';
import { redisConnection } from '../config/redis';
import { gameQueue, AutoStartJob, EliminationTickJob } from '../queues/gameQueue';
import { logger } from '../utils/logger';
import { socketService } from './socketService';
import { CoinService } from './coinService';
import { ConfigService } from './configService';

const prisma = new PrismaClient();

export class GameEngine {
  private worker: Worker;

  constructor() {
    this.worker = new Worker('game-queue', async (job: Job) => {
      const data = job.data as AutoStartJob | EliminationTickJob;
      if (data.type === 'autoStartCheck') {
        await this.handleAutoStartCheck(data.wheelId);
      } else if (data.type === 'runEliminationTick') {
        await this.handleEliminationTick(data.wheelId);
      }
    }, { connection: redisConnection });

    this.worker.on('failed', (job, err) => {
      logger.error(`Job ${job?.id} failed with error ${err.message}`);
    });
  }

  public async scheduleAutoStartCheck(wheelId: string) {
    const gameConfig = await ConfigService.getGameConfig();
    const delayMs = gameConfig.autoStartDelayMinutes * 60 * 1000;
    
    await gameQueue.add('autoStartCheck', { type: 'autoStartCheck', wheelId }, { delay: delayMs });
    logger.info(`Scheduled autoStartCheck for wheel ${wheelId} in ${gameConfig.autoStartDelayMinutes} minutes`);
  }

  public async scheduleEliminationTick(wheelId: string) {
    const gameConfig = await ConfigService.getGameConfig();
    const delayMs = gameConfig.eliminationIntervalSeconds * 1000;
    
    await gameQueue.add('runEliminationTick', { type: 'runEliminationTick', wheelId }, { delay: delayMs });
    logger.info(`Scheduled elimination tick for wheel ${wheelId} in ${gameConfig.eliminationIntervalSeconds} seconds`);
  }

  private async handleAutoStartCheck(wheelId: string) {
    const gameConfig = await ConfigService.getGameConfig();
    
    const wheel = await prisma.spinWheel.findUnique({
      where: { id: wheelId },
      include: { participants: true }
    });

    if (!wheel || wheel.status !== WheelStatus.WAITING) return;

    if (wheel.participants.length < gameConfig.minParticipants) {
      // Abort and refund
      await prisma.spinWheel.update({
        where: { id: wheelId },
        data: { status: WheelStatus.ABORTED }
      });

      for (const p of wheel.participants) {
        const newBalance = await CoinService.refund(p.userId, wheelId, wheel.entryFee);
        if (newBalance !== undefined) {
          socketService.emitCoinUpdate(p.userId, { newBalance });
        }
      }
      
      socketService.emitAborted(wheelId);
      logger.info(`Wheel ${wheelId} aborted due to insufficient players (${wheel.participants.length} < ${gameConfig.minParticipants})`);
    } else {
      // Start game
      await this.startGame(wheelId);
    }
  }

  public async startGame(wheelId: string) {
    const wheel = await prisma.spinWheel.findUnique({
      where: { id: wheelId },
      include: { participants: true }
    });

    if (!wheel || wheel.status !== WheelStatus.WAITING) return;

    // Shuffle participants for elimination sequence
    const shuffled = wheel.participants.map(p => p.id).sort(() => Math.random() - 0.5);

    await prisma.spinWheel.update({
      where: { id: wheelId },
      data: {
        status: WheelStatus.SPINNING,
        startTime: new Date(),
        eliminationSequence: shuffled
      }
    });

    socketService.emitStarted(wheelId, { eliminationSequence: shuffled });
    logger.info(`Wheel ${wheelId} started`);

    // Queue first elimination tick
    await this.scheduleEliminationTick(wheelId);
  }

  private async handleEliminationTick(wheelId: string) {
    const wheel = await prisma.spinWheel.findUnique({
      where: { id: wheelId },
      include: { participants: true }
    });

    if (!wheel || wheel.status !== WheelStatus.SPINNING || !wheel.eliminationSequence) return;

    const seq = wheel.eliminationSequence as string[];
    const idx = wheel.currentEliminationIndex;

    if (idx >= seq.length - 1) return; // Only 1 left, should have completed

    const eliminatedParticipantId = seq[idx];
    const eliminatedParticipant = wheel.participants.find(p => p.id === eliminatedParticipantId);

    if (!eliminatedParticipant) return;

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

    const gameConfig = await ConfigService.getGameConfig();
    
    socketService.emitElimination(wheelId, {
      eliminatedUserId: eliminatedParticipant.userId,
      remainingPlayers: activeParticipants.map(p => p.userId),
      nextEliminationIn: gameConfig.eliminationIntervalSeconds
    });

    if (activeParticipants.length === 1) {
      // Game over, we have a winner
      await this.completeGame(wheelId, activeParticipants[0].userId, wheel);
    } else {
      // Schedule next tick
      await this.scheduleEliminationTick(wheelId);
    }
  }

  private async completeGame(wheelId: string, winnerUserId: string, wheel: any) {
    await prisma.spinWheel.update({
      where: { id: wheelId },
      data: {
        status: WheelStatus.COMPLETED,
        winnerUserId
      }
    });

    // Payouts
    const newWinnerBalance = await CoinService.payoutWinner(winnerUserId, wheelId, wheel.winnerPool);
    if (newWinnerBalance !== undefined) {
      socketService.emitCoinUpdate(winnerUserId, { newBalance: newWinnerBalance });
    }

    if (wheel.adminUserId && wheel.adminPool > 0) {
      const newAdminBalance = await CoinService.payoutAdmin(wheel.adminUserId, wheelId, wheel.adminPool);
      if (newAdminBalance !== undefined) {
        socketService.emitCoinUpdate(wheel.adminUserId, { newBalance: newAdminBalance });
      }
    }

    socketService.emitWinner(wheelId, { winnerUserId, prize: wheel.winnerPool });
    logger.info(`Wheel ${wheelId} completed. Winner: ${winnerUserId}`);
  }
}

export const gameEngine = new GameEngine();
