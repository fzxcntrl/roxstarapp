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
      where: { status: { in: [WheelStatus.WAITING, WheelStatus.SPINNING] } }
    });

    if (existingWaiting) {
      res.status(400).json({ error: 'An active wheel already exists' });
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

    // Auto-join default players
    const defaultEmails = ['player1@roxstar.com', 'player2@roxstar.com', 'player3@roxstar.com', 'player4@roxstar.com', 'player5@roxstar.com'];
    const defaultUsers = await prisma.user.findMany({ where: { email: { in: defaultEmails } } });
    for (const u of defaultUsers) {
      try {
        await performJoin(u.id, wheel.id);
      } catch (e) {
        console.error('Failed to auto-join default user:', e);
      }
    }

    res.json(wheel);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

export const joinWheel = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const wheelId = req.params.id as string;
    const userId = req.user!.id;

async function performJoin(userId: string, wheelId: string) {
  const gameConfig = await ConfigService.getGameConfig();

  const result = await prisma.$transaction(async (tx) => {
    const wheel: any = await tx.spinWheel.findUnique({
      where: { id: wheelId },
      include: { participants: true }
    });

    if (!wheel || wheel.status !== WheelStatus.WAITING) {
      throw new Error('Wheel is not available to join');
    }

    if (wheel.participants.length >= gameConfig.maxParticipants) {
      throw new Error(`Maximum ${gameConfig.maxParticipants} participants allowed`);
    }

    const alreadyJoined = wheel.participants.some((p: any) => p.userId === userId);
    if (alreadyJoined) {
      throw new Error('Already joined');
    }

    const newBalance = await CoinService.deductEntryFee(userId, wheelId, wheel.entryFee);

    const participant = await tx.participant.create({
      data: { userId, spinWheelId: wheelId },
      include: { user: { select: { username: true } } }
    });

    const coinDistribution = await ConfigService.getCoinDistribution();
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
  return result;
}

export const joinWheel = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const wheelId = req.params.id as string;
    const userId = req.user!.id;

    const result = await performJoin(userId, wheelId);

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

export const abortWheel = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const wheelId = req.params.id as string;
    const wheel = await prisma.spinWheel.findUnique({
      where: { id: wheelId },
      include: { participants: true }
    });

    if (!wheel || (wheel.status !== WheelStatus.WAITING && wheel.status !== WheelStatus.SPINNING)) {
      res.status(400).json({ error: 'Wheel cannot be aborted' });
      return;
    }

    await prisma.spinWheel.update({
      where: { id: wheelId },
      data: { status: WheelStatus.ABORTED }
    });

    for (const p of wheel.participants) {
      if (!p.isEliminated) {
        const newBalance = await CoinService.refund(p.userId, wheelId, wheel.entryFee);
        if (newBalance !== undefined) {
          socketService.emitCoinUpdate(p.userId, { newBalance });
        }
      }
    }
    
    socketService.emitAborted(wheelId);
    res.json({ message: 'Wheel aborted and active players refunded' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};
