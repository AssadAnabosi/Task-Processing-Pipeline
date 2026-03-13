import { eq, inArray, sql } from "drizzle-orm";

import { jobs, subscribers, type Job, type Subscriber } from "@db/schema";
import { workerDb } from "../db";

// Claim the next batch of processed jobs atomically for delivery.
export async function claimProcessedJobs(limit: number): Promise<Job[]> {
    return await workerDb.transaction(async (tx) => {
        const rows = await tx.execute(sql`
            SELECT id FROM jobs
            WHERE status = 'processed'
            ORDER BY updated_at ASC
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

export async function getSubscribersByPipelineId(
    pipelineId: string
): Promise<Subscriber[]> {
    return await workerDb
        .select()
        .from(subscribers)
        .where(eq(subscribers.pipeline_id, pipelineId));
}

export async function markJobCompleted(id: string): Promise<void> {
    await workerDb
        .update(jobs)
        .set({
            status: "completed",
            updated_at: new Date(),
            completed_at: new Date(),
        })
        .where(eq(jobs.id, id));
}

export async function markJobDeliveryFailed(id: string): Promise<void> {
    await workerDb
        .update(jobs)
        .set({
            status: "delivery-failed",
            updated_at: new Date(),
        })
        .where(eq(jobs.id, id));
}
