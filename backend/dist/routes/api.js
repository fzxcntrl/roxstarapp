"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authController_1 = require("../controllers/authController");
const spinWheelController_1 = require("../controllers/spinWheelController");
const configController_1 = require("../controllers/configController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Auth
router.post('/auth/register', authController_1.register);
router.post('/auth/login', authController_1.login);
router.get('/auth/profile', auth_1.authenticate, authController_1.getProfile);
// Spin Wheel
router.post('/wheel', auth_1.authenticate, auth_1.requireAdmin, spinWheelController_1.createWheel);
router.get('/wheel/active', spinWheelController_1.getActiveWheels);
router.post('/wheel/:id/join', auth_1.authenticate, spinWheelController_1.joinWheel);
router.post('/wheel/:id/start', auth_1.authenticate, auth_1.requireAdmin, spinWheelController_1.forceStartWheel);
// Configuration routes (Admin only)
router.get('/config/coin-distribution', auth_1.authenticate, auth_1.requireAdmin, configController_1.getCoinDistribution);
router.put('/config/coin-distribution', auth_1.authenticate, auth_1.requireAdmin, configController_1.updateCoinDistribution);
router.get('/config/game', auth_1.authenticate, auth_1.requireAdmin, configController_1.getGameConfig);
router.put('/config/game', auth_1.authenticate, auth_1.requireAdmin, configController_1.updateGameConfig);
router.get('/config/:key', auth_1.authenticate, auth_1.requireAdmin, configController_1.getConfig);
router.put('/config', auth_1.authenticate, auth_1.requireAdmin, configController_1.updateConfig);
router.post('/config/clear-cache', auth_1.authenticate, auth_1.requireAdmin, configController_1.clearConfigCache);
// Health check endpoint
router.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0'
    });
});
exports.default = router;
