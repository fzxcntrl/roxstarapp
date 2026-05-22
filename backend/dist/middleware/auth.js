"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAdmin = exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../config/env");
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const authenticate = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    const token = authHeader.split(' ')[1];
    try {
        const payload = jsonwebtoken_1.default.verify(token, env_1.env.JWT_SECRET);
        const user = await prisma.user.findUnique({ where: { id: payload.id } });
        if (!user) {
            res.status(401).json({ error: 'User not found' });
            return;
        }
        req.user = { id: user.id, role: user.role, username: user.username };
        next();
    }
    catch (err) {
        res.status(401).json({ error: 'Invalid token' });
        return;
    }
};
exports.authenticate = authenticate;
const requireAdmin = (req, res, next) => {
    if (req.user?.role !== client_1.Role.ADMIN) {
        res.status(403).json({ error: 'Forbidden: Admins only' });
        return;
    }
    next();
};
exports.requireAdmin = requireAdmin;
