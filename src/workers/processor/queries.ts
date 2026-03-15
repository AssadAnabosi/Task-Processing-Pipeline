import { inArray, sql, eq } from "drizzle-orm";

import { jobs, type Job } from "@db/schema";
import { workerDb } from "../db";

const MAX_RETRIES = 2;

// Claim the next batch of pending jobs atomically.
// FOR UPDATE SKIP LOCKED ensures multiple worker instances never process the same job.
export async function claimJobs(limit: number): Promise<Job[]> {
    return await workerDb.transaction(async (tx) => {
        const rows = await tx.execute(sql`
            SELECT id FROM jobs
            WHERE status = 'pending'
            ORDER BY created_at ASC
            LIMIT ${limit}
            FOR UPDATE SKIP LOCKED
        `);

        if (rows.length === 0) return [];

        const ids = rows.map((r) => r.id as string);

        return await tx
            .update(jobs)
            .set({ status: "processing", updated_at: new Date() })
            .where(inArray(jobs.id, ids))
            .returning();
    });
}

export async function markJobProcessed(id: string): Promise<void> {
    await workerDb
        .update(jobs)
        .set({
            status: "processed",
            updated_at: new Date(),
            completed_at: new Date(),
        })
        .where(eq(jobs.id, id));
}

// On failure: re-queue with incremented retry_count if retries remain,
// otherwise mark as permanently failed.
export async function markJobFailed(
    id: string,
    currentRetryCount: number
): Promise<void> {
    const nextRetryCount = currentRetryCount + 1;

    if (currentRetryCount < MAX_RETRIES) {
        await workerDb
            .update(jobs)
            .set({
                status: "pending",
                retry_count: nextRetryCount,
                updated_at: new Date(),
            })
            .where(eq(jobs.id, id));
    } else {
        await workerDb
            .update(jobs)
            .set({
                status: "processing-failed",
                retry_count: nextRetryCount,
                updated_at: new Date(),
            })
            .where(eq(jobs.id, id));
    }
}
