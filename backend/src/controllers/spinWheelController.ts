import { Response, Request } from 'express';
import { PrismaClient, WheelStatus } from '@prisma/client';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth';
import { gameEngine } from '../services/gameEngine';
import { CoinService } from '../services/coinService';
import { socketService } from '../services/socketService';
import { ConfigService } from '../services/configService';

const prisma = new PrismaClient();

const createWheelSchema = z.object({
  entryFee: z.number().min(10)
});

export const createWheel = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { entryFee } = createWheelSchema.parse(req.body);

    const existingWaiting = await prisma.spinWheel.findFirst({
      where: { status: WheelStatus.WAITING }
    });

    if (existingWaiting) {
      res.status(400).json({ error: 'A wheel is already waiting' });
      return;
    }

    const autoStartAt = new Date(Date.now() + 3 * 60 * 1000); // 3 mins

    const wheel = await prisma.spinWheel.create({
      data: {
        entryFee,
        adminUserId: req.user!.id,
        autoStartAt,
      }
    });

    await gameEngine.scheduleAutoStartCheck(wheel.id);

    res.json(wheel);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

export const joinWheel = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const wheelId = req.params.id as string;
    const userId = req.user!.id;

    // Get game configuration
    const gameConfig = await ConfigService.getGameConfig();

    // Use a transaction to safely check and add participant
    const result = await prisma.$transaction(async (tx) => {
      const wheel: any = await tx.spinWheel.findUnique({
        where: { id: wheelId },
        include: { participants: true }
      });

      if (!wheel || wheel.status !== WheelStatus.WAITING) {
        throw new Error('Wheel is not available to join');
      }

      // Check maximum participants limit
      if (wheel.participants.length >= gameConfig.maxParticipants) {
        throw new Error(`Maximum ${gameConfig.maxParticipants} participants allowed`);
      }

      const alreadyJoined = wheel.participants.some((p: any) => p.userId === userId);
      if (alreadyJoined) {
        throw new Error('Already joined');
      }

      // Deduct fee atomically
      const newBalance = await CoinService.deductEntryFee(userId, wheelId, wheel.entryFee);

      // Create participant
      const participant = await tx.participant.create({
        data: {
          userId,
          spinWheelId: wheelId
        },
        include: { user: { select: { username: true } } }
      });

      // Get coin distribution configuration
      const coinDistribution = await ConfigService.getCoinDistribution();
      
      // Update pools based on database configuration
      const totalFee = wheel.entryFee;
      const winnerCut = totalFee * coinDistribution.winnerPercentage;
      const adminCut = totalFee * coinDistribution.adminPercentage;
      const appCut = totalFee * coinDistribution.appPercentage;

      await tx.spinWheel.update({
        where: { id: wheelId },
        data: {
          winnerPool: { increment: winnerCut },
          adminPool: { increment: adminCut },
          appPool: { increment: appCut },
        }
      });

      return { participant, newBalance };
    });

    socketService.emitCoinUpdate(userId, { newBalance: result.newBalance });
    socketService.emitPlayerJoined(wheelId, result.participant);

    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

export const getActiveWheels = async (req: Request, res: Response): Promise<void> => {
  const wheels = await prisma.spinWheel.findMany({
    where: { status: { in: [WheelStatus.WAITING, WheelStatus.SPINNING] } },
    include: { participants: { include: { user: { select: { username: true } } } } }
  });
  res.json(wheels);
};

export const forceStartWheel = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const wheelId = req.params.id as string;
    await gameEngine.startGame(wheelId);
    res.json({ message: 'Wheel started' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};
