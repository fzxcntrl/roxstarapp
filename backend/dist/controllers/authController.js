"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProfile = exports.login = exports.register = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const env_1 = require("../config/env");
const prisma = new client_1.PrismaClient();
const registerSchema = zod_1.z.object({
    username: zod_1.z.string().min(3),
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(6),
});
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string(),
});
const register = async (req, res) => {
    try {
        const { username, email, password } = registerSchema.parse(req.body);
        const existingUser = await prisma.user.findFirst({
            where: { OR: [{ email }, { username }] }
        });
        if (existingUser) {
            res.status(400).json({ error: 'User already exists' });
            return;
        }
        // First user is admin for testing convenience
        const isFirstUser = await prisma.user.count() === 0;
        const passwordHash = await bcryptjs_1.default.hash(password, 10);
        const user = await prisma.user.create({
            data: {
                username,
                email,
                passwordHash,
                role: isFirstUser ? client_1.Role.ADMIN : client_1.Role.USER,
                coinBalance: 1000, // Give some starting coins for testing
            }
        });
        const token = jsonwebtoken_1.default.sign({ id: user.id }, env_1.env.JWT_SECRET, { expiresIn: env_1.env.JWT_EXPIRES_IN });
        res.json({ token, user: { id: user.id, username, email, role: user.role, coinBalance: user.coinBalance } });
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
};
exports.register = register;
const login = async (req, res) => {
    try {
        const { email, password } = loginSchema.parse(req.body);
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !(await bcryptjs_1.default.compare(password, user.passwordHash))) {
            res.status(401).json({ error: 'Invalid credentials' });
            return;
        }
        const token = jsonwebtoken_1.default.sign({ id: user.id }, env_1.env.JWT_SECRET, { expiresIn: env_1.env.JWT_EXPIRES_IN });
        res.json({ token, user: { id: user.id, username: user.username, email: user.email, role: user.role, coinBalance: user.coinBalance } });
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
};
exports.login = login;
const getProfile = async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    res.json({ user: { id: user?.id, username: user?.username, email: user?.email, role: user?.role, coinBalance: user?.coinBalance } });
};
exports.getProfile = getProfile;
