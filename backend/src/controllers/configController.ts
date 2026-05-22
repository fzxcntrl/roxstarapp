import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth';
import { ConfigService } from '../services/configService';

const updateConfigSchema = z.object({
  key: z.string().min(1),
  value: z.any()
});

const coinDistributionSchema = z.object({
  winnerPercentage: z.number().min(0).max(1),
  adminPercentage: z.number().min(0).max(1),
  appPercentage: z.number().min(0).max(1)
}).refine(data => {
  const sum = data.winnerPercentage + data.adminPercentage + data.appPercentage;
  return Math.abs(sum - 1) < 0.001; // Allow for floating point precision
}, {
  message: "Percentages must sum to 1.0"
});

const gameConfigSchema = z.object({
  autoStartDelayMinutes: z.number().min(1).max(60),
  eliminationIntervalSeconds: z.number().min(1).max(60),
  minParticipants: z.number().min(2).max(100),
  maxParticipants: z.number().min(2).max(1000)
}).refine(data => data.minParticipants <= data.maxParticipants, {
  message: "minParticipants must be <= maxParticipants"
});

export const getConfig = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const key = req.params.key as string;
    const value = await ConfigService.get(key);
    res.json({ key, value });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

export const updateConfig = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { key, value } = updateConfigSchema.parse(req.body);
    await ConfigService.set(key, value);
    res.json({ message: 'Configuration updated successfully', key, value });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

export const getCoinDistribution = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const distribution = await ConfigService.getCoinDistribution();
    res.json(distribution);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

export const updateCoinDistribution = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const distribution = coinDistributionSchema.parse(req.body);
    
    await Promise.all([
      ConfigService.set('winner_pool_percentage', distribution.winnerPercentage),
      ConfigService.set('admin_pool_percentage', distribution.adminPercentage),
      ConfigService.set('app_pool_percentage', distribution.appPercentage)
    ]);

    res.json({ message: 'Coin distribution updated successfully', distribution });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

export const getGameConfig = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const config = await ConfigService.getGameConfig();
    res.json(config);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

export const updateGameConfig = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const config = gameConfigSchema.parse(req.body);
    
    await Promise.all([
      ConfigService.set('auto_start_delay_minutes', config.autoStartDelayMinutes),
      ConfigService.set('elimination_interval_seconds', config.eliminationIntervalSeconds),
      ConfigService.set('min_participants', config.minParticipants),
      ConfigService.set('max_participants', config.maxParticipants)
    ]);

    res.json({ message: 'Game configuration updated successfully', config });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

export const clearConfigCache = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    ConfigService.clearCache();
    res.json({ message: 'Configuration cache cleared successfully' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};