import { Worker } from 'bullmq'
import client, { redisConnection } from '../redis.config'
import { db } from '../drizzle/db';
import { GameConfig, Group } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

// Helper function to handle a single pattern with batch unlinking
export async function clearSinglePattern(pattern: string) {
    let batch = [];
    const BATCH_SIZE = 100;

    for await (const key of client.scanIterator({ MATCH: pattern, COUNT: BATCH_SIZE })) {
        const singleKey = key as unknown as string;
        batch.push(singleKey);
        if (batch.length >= BATCH_SIZE) {
            await client.unlink(batch);
            batch = [];
        }
    }
    if (batch.length > 0) {
        await client.unlink(batch);
    }
}

export const gameWorker = new Worker('game', async (job) => {
    try {
        if (job.name === 'autoEnd') {
            Dont forget to add winston logs in this case for each group and for GameConfig;

            const duration = await client.get('game:duration')

            if (!duration) {
                throw new Error("Game duration not found in Redis")
            }

            const result = await db.transaction(async (tx) => {
                const val = await tx.update(Group)
                    .set({ timeTaken: duration })
                    .where(eq(Group.status, 'active'))
                    .returning({ id: Group.id })

                console.log(`${val.length} groups could not make it to the final level before game ended`)

                const val2 = await tx.update(GameConfig)
                    .set({ isRunning: false })
                    .returning({ duration: GameConfig.duration })

                if (val2.length == 0) throw new Error("GameConfig update failed")       // No apiError needed — workers don't deal with HTTP responses.

                return val;
            });

            const patterns: string[] = ['questionCount:domain:*', 'theme:*', 'maxLevel:*', 'hints:*', 'group:member:*', 'genre:*'];

            await client.set('game:isRunning', 'false')

            const tasks = patterns.map(pattern => clearSinglePattern(pattern));
            await Promise.all(tasks);
        }
    } catch (error: any) {
        console.error('Game auto-end failed:', error.message)
        throw error         // rethrow so BullMQ knows job failed and can retry
    }
}, { connection: redisConnection })