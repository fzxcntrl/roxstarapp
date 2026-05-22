import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('4000'),
  DATABASE_URL: z.string(),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  JWT_SECRET: z.string(),
  JWT_EXPIRES_IN: z.string().default('1d'),
  FRONTEND_URL: z.string().default('http://localhost:3000'),
});

const envParse = envSchema.safeParse(process.env);

if (!envParse.success) {
  console.error('Invalid environment variables:', envParse.error.format());
  process.exit(1);
}

export const env = envParse.data;
