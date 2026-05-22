import { Router } from 'express';
import { register, login, getProfile } from '../controllers/authController';
import { createWheel, joinWheel, getActiveWheels, forceStartWheel, abortWheel } from '../controllers/spinWheelController';
import { 
  getConfig, 
  updateConfig, 
  getCoinDistribution, 
  updateCoinDistribution, 
  getGameConfig, 
  updateGameConfig, 
  clearConfigCache 
} from '../controllers/configController';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

// Auth
router.post('/auth/register', register);
router.post('/auth/login', login);
router.get('/auth/profile', authenticate, getProfile);

// Spin Wheel
router.post('/wheel', authenticate, requireAdmin, createWheel);
router.get('/wheel/active', getActiveWheels);
router.post('/wheel/:id/join', authenticate, joinWheel);
router.post('/wheel/:id/start', authenticate, requireAdmin, forceStartWheel);
router.post('/wheel/:id/abort', authenticate, requireAdmin, abortWheel);

// Configuration routes (Admin only)
router.get('/config/coin-distribution', authenticate, requireAdmin, getCoinDistribution);
router.put('/config/coin-distribution', authenticate, requireAdmin, updateCoinDistribution);
router.get('/config/game', authenticate, requireAdmin, getGameConfig);
router.put('/config/game', authenticate, requireAdmin, updateGameConfig);
router.get('/config/:key', authenticate, requireAdmin, getConfig);
router.put('/config', authenticate, requireAdmin, updateConfig);
router.post('/config/clear-cache', authenticate, requireAdmin, clearConfigCache);

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

export default router;
