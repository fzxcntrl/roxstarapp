import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

export interface AuthRequest extends Request {
  user?: { id: string; role: Role; username: string };
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as { id: string };
    const user = await prisma.user.findUnique({ where: { id: payload.id } });
    
    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    req.user = { id: user.id, role: user.role, username: user.username };
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
    return;
  }
};

export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (req.user?.role !== Role.ADMIN) {
    res.status(403).json({ error: 'Forbidden: Admins only' });
    return;
  }
  next();
};
