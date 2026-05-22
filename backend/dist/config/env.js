"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const zod_1 = require("zod");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const envSchema = zod_1.z.object({
    PORT: zod_1.z.string().default('4000'),
    DATABASE_URL: zod_1.z.string(),
    REDIS_URL: zod_1.z.string().default('redis://localhost:6379'),
    JWT_SECRET: zod_1.z.string(),
    JWT_EXPIRES_IN: zod_1.z.string().default('1d'),
    FRONTEND_URL: zod_1.z.string().default('http://localhost:3000'),
});
const envParse = envSchema.safeParse(process.env);
if (!envParse.success) {
    console.error('Invalid environment variables:', envParse.error.format());
    process.exit(1);
}
exports.env = envParse.data;
