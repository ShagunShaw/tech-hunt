import { Queue } from 'bullmq'
import { redisConnection } from './redis.config'

export const gameQueue = new Queue('game', { connection: redisConnection })