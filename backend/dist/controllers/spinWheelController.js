"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.abortWheel = exports.forceStartWheel = exports.getActiveWheels = exports.joinWheel = exports.createWheel = void 0;
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const gameEngine_1 = require("../services/gameEngine");
const coinService_1 = require("../services/coinService");
const socketService_1 = require("../services/socketService");
const configService_1 = require("../services/configService");
const prisma = new client_1.PrismaClient();
const createWheelSchema = zod_1.z.object({
    entryFee: zod_1.z.number().min(10)
});
const createWheel = async (req, res) => {
    try {
        const { entryFee } = createWheelSchema.parse(req.body);
        const existingWaiting = await prisma.spinWheel.findFirst({
            where: { status: { in: [client_1.WheelStatus.WAITING, client_1.WheelStatus.SPINNING] } }
        });
        if (existingWaiting) {
            res.status(400).json({ error: 'An active wheel already exists' });
            return;
        }
        const autoStartAt = new Date(Date.now() + 3 * 60 * 1000); // 3 mins
        const wheel = await prisma.spinWheel.create({
            data: {
                entryFee,
                adminUserId: req.user.id,
                autoStartAt,
            }
        });
        await gameEngine_1.gameEngine.scheduleAutoStartCheck(wheel.id);
        // Auto-join default players
        const defaultEmails = ['player1@roxstar.com', 'player2@roxstar.com', 'player3@roxstar.com', 'player4@roxstar.com', 'player5@roxstar.com'];
        const defaultUsers = await prisma.user.findMany({ where: { email: { in: defaultEmails } } });
        for (const u of defaultUsers) {
            try {
                await performJoin(u.id, wheel.id);
            }
            catch (e) {
                console.error('Failed to auto-join default user:', e);
            }
        }
        res.json(wheel);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
};
exports.createWheel = createWheel;
async function performJoin(userId, wheelId) {
    const gameConfig = await configService_1.ConfigService.getGameConfig();
    const result = await prisma.$transaction(async (tx) => {
        const wheel = await tx.spinWheel.findUnique({
            where: { id: wheelId },
            include: { participants: true }
        });
        if (!wheel || wheel.status !== client_1.WheelStatus.WAITING) {
            throw new Error('Wheel is not available to join');
        }
        if (wheel.participants.length >= gameConfig.maxParticipants) {
            throw new Error(`Maximum ${gameConfig.maxParticipants} participants allowed`);
        }
        const alreadyJoined = wheel.participants.some((p) => p.userId === userId);
        if (alreadyJoined) {
            throw new Error('Already joined');
        }
        const newBalance = await coinService_1.CoinService.deductEntryFee(userId, wheelId, wheel.entryFee);
        const participant = await tx.participant.create({
            data: { userId, spinWheelId: wheelId },
            include: { user: { select: { username: true } } }
        });
        const coinDistribution = await configService_1.ConfigService.getCoinDistribution();
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
    socketService_1.socketService.emitCoinUpdate(userId, { newBalance: result.newBalance });
    socketService_1.socketService.emitPlayerJoined(wheelId, result.participant);
    return result;
}
const joinWheel = async (req, res) => {
    try {
        const wheelId = req.params.id;
        const userId = req.user.id;
        const result = await performJoin(userId, wheelId);
        res.json(result);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
};
exports.joinWheel = joinWheel;
const getActiveWheels = async (req, res) => {
    const wheels = await prisma.spinWheel.findMany({
        where: { status: { in: [client_1.WheelStatus.WAITING, client_1.WheelStatus.SPINNING] } },
        include: { participants: { include: { user: { select: { username: true } } } } }
    });
    res.json(wheels);
};
exports.getActiveWheels = getActiveWheels;
const forceStartWheel = async (req, res) => {
    try {
        const wheelId = req.params.id;
        await gameEngine_1.gameEngine.startGame(wheelId);
        res.json({ message: 'Wheel started' });
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
};
exports.forceStartWheel = forceStartWheel;
const abortWheel = async (req, res) => {
    try {
        const wheelId = req.params.id;
        const wheel = await prisma.spinWheel.findUnique({
            where: { id: wheelId },
            include: { participants: true }
        });
        if (!wheel || (wheel.status !== client_1.WheelStatus.WAITING && wheel.status !== client_1.WheelStatus.SPINNING)) {
            res.status(400).json({ error: 'Wheel cannot be aborted' });
            return;
        }
        await prisma.spinWheel.update({
            where: { id: wheelId },
            data: { status: client_1.WheelStatus.ABORTED }
        });
        for (const p of wheel.participants) {
            if (!p.isEliminated) {
                const newBalance = await coinService_1.CoinService.refund(p.userId, wheelId, wheel.entryFee);
                if (newBalance !== undefined) {
                    socketService_1.socketService.emitCoinUpdate(p.userId, { newBalance });
                }
            }
        }
        socketService_1.socketService.emitAborted(wheelId);
        res.json({ message: 'Wheel aborted and active players refunded' });
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
};
exports.abortWheel = abortWheel;
