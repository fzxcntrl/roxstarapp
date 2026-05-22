import { Queue } from 'bullmq';
import { redisConnection } from '../config/redis';

export const gameQueue = new Queue('game-queue', {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: true,
    removeOnFail: false
  }
});

// Job types
export interface AutoStartJob {
  type: 'autoStartCheck';
  wheelId: string;
}

export interface EliminationTickJob {
  type: 'runEliminationTick';
  wheelId: string;
}
