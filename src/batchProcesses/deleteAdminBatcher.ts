import { inArray } from 'drizzle-orm';
import { db } from '../drizzle/db';
import { Admin } from '../drizzle/schema';
import { apiError } from '../utils/ApiError';

interface QueueItem {
    adminId: number;
    resolve: (value: any) => void;
    reject: (reason?: any) => void;
}

class DeleteAdminBatcher {
    private queue: QueueItem[] = [];
    private timer: NodeJS.Timeout | null = null;
    private readonly BATCH_SIZE = 5;
    private readonly TTL_MS = 20000;

    public add(adminId: number): Promise<any> {
        return new Promise((resolve, reject) => {
            this.queue.push({ adminId, resolve, reject });

            if (this.queue.length >= this.BATCH_SIZE) {
                const batchToProcess = this.queue.splice(0, this.BATCH_SIZE);

                if (this.queue.length === 0 && this.timer) {
                    clearTimeout(this.timer);
                    this.timer = null;
                }

                this.processBatch(batchToProcess);
            } else if (!this.timer) {
                this.timer = setTimeout(() => this.flushRemaining(), this.TTL_MS);
            }
        });
    }

    private flushRemaining() {
        this.timer = null;

        if (this.queue.length === 0) return;

        const batchToProcess = this.queue.splice(0, this.queue.length);
        this.processBatch(batchToProcess);
    }

    private async processBatch(items: QueueItem[]) {
        if (items.length === 0) return;

        const ids = items.map(i => i.adminId);

        try {
            const deletedRecords = await db.delete(Admin)
                .where(inArray(Admin.id, ids))
                .returning({ id: Admin.id });

            const deletedSet = new Set(deletedRecords.map(r => r.id));

            items.forEach(item => {
                if (deletedSet.has(item.adminId)) {
                    item.resolve({ id: item.adminId });
                } else {
                    item.reject(
                        new apiError(404, "Entry not found", `No entry with admin ID ${item.adminId} found`)
                    );
                }
            });
        } catch (error: any) {
            items.forEach(item => {
                item.reject(
                    error instanceof apiError 
                        ? error 
                        : new apiError(500, error.name || "InternalServerError", error.message)
                );
            });
        }
    }
}

export const deleteAdminBatcher = new DeleteAdminBatcher();