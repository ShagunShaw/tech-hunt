import { inArray } from 'drizzle-orm';
import { db } from '../drizzle/db'; 
import { Admin } from '../drizzle/schema'; 
import { apiError } from '../utils/ApiError'; 

interface QueueItem {
    adminId: number;
    status: 'approved' | 'rejected';
    resolve: (value: any) => void;
    reject: (reason?: any) => void;
}

class AdminApprovalBatcher {
    private queue: QueueItem[] = [];
    private timer: NodeJS.Timeout | null = null;
    private readonly BATCH_SIZE = 5;
    private readonly TTL_MS = 20000; // Time to wait (e.g., 20 seconds) before flushing incomplete batches

    // Firstly my batch processing will wait for the batch size to exceed and then go for TTL, if batch size criteria does not match
    public add(adminId: number, status: 'approved' | 'rejected'): Promise<any> {
        return new Promise((resolve, reject) => {
            this.queue.push({ adminId, status, resolve, reject });

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

        const approvedItems = items.filter(i => i.status === 'approved');
        const rejectedItems = items.filter(i => i.status === 'rejected');

        await Promise.all([
            this.executeUpdate(approvedItems, 'approved'),
            this.executeUpdate(rejectedItems, 'rejected')
        ]);
    }

    private async executeUpdate(items: QueueItem[], status: 'approved' | 'rejected') {
        if (items.length === 0) return;

        const ids = items.map(i => i.adminId);

        try {
            const updatedRecords = await db.update(Admin)
                .set({ status })
                .where(inArray(Admin.id, ids))
                .returning({ id: Admin.id });

            const updatedSet = new Set(updatedRecords.map(r => r.id));

            items.forEach(item => {
                if (updatedSet.has(item.adminId)) {
                    item.resolve({ id: item.adminId, status });
                } else {
                    item.reject(
                        new apiError(404, "Entry not found", `Admin with ID ${item.adminId} not found`)
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

export const adminBatcher = new AdminApprovalBatcher();