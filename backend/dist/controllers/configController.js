"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearConfigCache = exports.updateGameConfig = exports.getGameConfig = exports.updateCoinDistribution = exports.getCoinDistribution = exports.updateConfig = exports.getConfig = void 0;
const zod_1 = require("zod");
const configService_1 = require("../services/configService");
const updateConfigSchema = zod_1.z.object({
    key: zod_1.z.string().min(1),
    value: zod_1.z.any()
});
const coinDistributionSchema = zod_1.z.object({
    winnerPercentage: zod_1.z.number().min(0).max(1),
    adminPercentage: zod_1.z.number().min(0).max(1),
    appPercentage: zod_1.z.number().min(0).max(1)
}).refine(data => {
    const sum = data.winnerPercentage + data.adminPercentage + data.appPercentage;
    return Math.abs(sum - 1) < 0.001; // Allow for floating point precision
}, {
    message: "Percentages must sum to 1.0"
});
const gameConfigSchema = zod_1.z.object({
    autoStartDelayMinutes: zod_1.z.number().min(1).max(60),
    eliminationIntervalSeconds: zod_1.z.number().min(1).max(60),
    minParticipants: zod_1.z.number().min(2).max(100),
    maxParticipants: zod_1.z.number().min(2).max(1000)
}).refine(data => data.minParticipants <= data.maxParticipants, {
    message: "minParticipants must be <= maxParticipants"
});
const getConfig = async (req, res) => {
    try {
        const key = req.params.key;
        const value = await configService_1.ConfigService.get(key);
        res.json({ key, value });
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
};
exports.getConfig = getConfig;
const updateConfig = async (req, res) => {
    try {
        const { key, value } = updateConfigSchema.parse(req.body);
        await configService_1.ConfigService.set(key, value);
        res.json({ message: 'Configuration updated successfully', key, value });
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
};
exports.updateConfig = updateConfig;
const getCoinDistribution = async (req, res) => {
    try {
        const distribution = await configService_1.ConfigService.getCoinDistribution();
        res.json(distribution);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
};
exports.getCoinDistribution = getCoinDistribution;
const updateCoinDistribution = async (req, res) => {
    try {
        const distribution = coinDistributionSchema.parse(req.body);
        await Promise.all([
            configService_1.ConfigService.set('winner_pool_percentage', distribution.winnerPercentage),
            configService_1.ConfigService.set('admin_pool_percentage', distribution.adminPercentage),
            configService_1.ConfigService.set('app_pool_percentage', distribution.appPercentage)
        ]);
        res.json({ message: 'Coin distribution updated successfully', distribution });
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
};
exports.updateCoinDistribution = updateCoinDistribution;
const getGameConfig = async (req, res) => {
    try {
        const config = await configService_1.ConfigService.getGameConfig();
        res.json(config);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
};
exports.getGameConfig = getGameConfig;
const updateGameConfig = async (req, res) => {
    try {
        const config = gameConfigSchema.parse(req.body);
        await Promise.all([
            configService_1.ConfigService.set('auto_start_delay_minutes', config.autoStartDelayMinutes),
            configService_1.ConfigService.set('elimination_interval_seconds', config.eliminationIntervalSeconds),
            configService_1.ConfigService.set('min_participants', config.minParticipants),
            configService_1.ConfigService.set('max_participants', config.maxParticipants)
        ]);
        res.json({ message: 'Game configuration updated successfully', config });
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
};
exports.updateGameConfig = updateGameConfig;
const clearConfigCache = async (req, res) => {
    try {
        configService_1.ConfigService.clearCache();
        res.json({ message: 'Configuration cache cleared successfully' });
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
};
exports.clearConfigCache = clearConfigCache;
