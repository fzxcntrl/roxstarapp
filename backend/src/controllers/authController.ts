import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient, Role } from '@prisma/client';
import { z } from 'zod';
import { env } from '../config/env';
import { AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();

const registerSchema = z.object({
  username: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(6),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const register = async (req: Request, res: Response): Promise<void> => {
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
    const passwordHash = await bcrypt.hash(password, 10);
    
    const user = await prisma.user.create({
      data: {
        username,
        email,
        passwordHash,
        role: isFirstUser ? Role.ADMIN : Role.USER,
        coinBalance: 1000, // Give some starting coins for testing
      }
    });

    const token = jwt.sign({ id: user.id }, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN as any });
    res.json({ token, user: { id: user.id, username, email, role: user.role, coinBalance: user.coinBalance } });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const token = jwt.sign({ id: user.id }, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN as any });
    res.json({ token, user: { id: user.id, username: user.username, email: user.email, role: user.role, coinBalance: user.coinBalance } });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

export const getProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  res.json({ user: { id: user?.id, username: user?.username, email: user?.email, role: user?.role, coinBalance: user?.coinBalance } });
};
