import { inArray, sql, eq } from "drizzle-orm";

import { jobs, pipelines, type Job, type Pipeline } from "@db/schema";
import { workerDb } from "../db";

const MAX_RETRIES = 2;

export type ClaimedProcessorJob = Job & {
    action_type: Pipeline["action_type"];
    action_config: Pipeline["action_config"];
};

// Claim the next batch of pending jobs atomically.
// FOR UPDATE SKIP LOCKED ensures multiple worker instances never process the same job.
export async function claimJobs(limit: number): Promise<ClaimedProcessorJob[]> {
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

        const claimedJobs = await tx
            .update(jobs)
            .set({ status: "processing", updated_at: new Date() })
            .where(inArray(jobs.id, ids))
            .returning();

        const pipelineIds = [
            ...new Set(claimedJobs.map((job) => job.pipeline_id)),
        ];
        const pipelineRows = await tx
            .select({
                id: pipelines.id,
                action_type: pipelines.action_type,
                action_config: pipelines.action_config,
            })
            .from(pipelines)
            .where(inArray(pipelines.id, pipelineIds));

        const pipelineById = new Map(pipelineRows.map((row) => [row.id, row]));

        return claimedJobs.map((job) => {
            const pipeline = pipelineById.get(job.pipeline_id);

            if (!pipeline) {
                throw new Error(
                    `[processor] Pipeline ${job.pipeline_id} not found for job ${job.id}`
                );
            }

            return {
                ...job,
                action_type: pipeline.action_type,
                action_config: pipeline.action_config,
            };
        });
    });
}

export async function markJobProcessed(
    id: string,
    result: Record<string, unknown>
): Promise<void> {
    await workerDb
        .update(jobs)
        .set({
            status: "processed",
            result,
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
