"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.forceStartWheel = exports.getActiveWheels = exports.joinWheel = exports.createWheel = void 0;
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
            where: { status: client_1.WheelStatus.WAITING }
        });
        if (existingWaiting) {
            res.status(400).json({ error: 'A wheel is already waiting' });
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
        res.json(wheel);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
};
exports.createWheel = createWheel;
const joinWheel = async (req, res) => {
    try {
        const wheelId = req.params.id;
        const userId = req.user.id;
        // Get game configuration
        const gameConfig = await configService_1.ConfigService.getGameConfig();
        // Use a transaction to safely check and add participant
        const result = await prisma.$transaction(async (tx) => {
            const wheel = await tx.spinWheel.findUnique({
                where: { id: wheelId },
                include: { participants: true }
            });
            if (!wheel || wheel.status !== client_1.WheelStatus.WAITING) {
                throw new Error('Wheel is not available to join');
            }
            // Check maximum participants limit
            if (wheel.participants.length >= gameConfig.maxParticipants) {
                throw new Error(`Maximum ${gameConfig.maxParticipants} participants allowed`);
            }
            const alreadyJoined = wheel.participants.some((p) => p.userId === userId);
            if (alreadyJoined) {
                throw new Error('Already joined');
            }
            // Deduct fee atomically
            const newBalance = await coinService_1.CoinService.deductEntryFee(userId, wheelId, wheel.entryFee);
            // Create participant
            const participant = await tx.participant.create({
                data: {
                    userId,
                    spinWheelId: wheelId
                },
                include: { user: { select: { username: true } } }
            });
            // Get coin distribution configuration
            const coinDistribution = await configService_1.ConfigService.getCoinDistribution();
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
        socketService_1.socketService.emitCoinUpdate(userId, { newBalance: result.newBalance });
        socketService_1.socketService.emitPlayerJoined(wheelId, result.participant);
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
