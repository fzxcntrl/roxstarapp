"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gameQueue = void 0;
const bullmq_1 = require("bullmq");
const redis_1 = require("../config/redis");
exports.gameQueue = new bullmq_1.Queue('game-queue', {
    connection: redis_1.redisConnection,
    defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: false
    }
});
