import { inArray, sql, eq } from "drizzle-orm";

import { jobs, pipelines, type Job, type Pipeline } from "@db/schema";
import { workerDb } from "../db";

export const MAX_RETRIES = 2;

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

// Return IDs of every job that is still 'pending' in the DB.
// Used at worker startup to re-enqueue jobs that were written to the DB but
// never made it into BullMQ (e.g. crash between createJob and queue.add).
export async function getPendingJobIds(): Promise<string[]> {
    const rows = await workerDb
        .select({ id: jobs.id })
        .from(jobs)
        .where(sql`${jobs.status} = 'pending'`);
    return rows.map((r) => r.id);
}

// Claim a single pending job by ID — used by the BullMQ worker which already
// knows the exact job ID from the queue payload.
export async function claimJobById(
    id: string
): Promise<ClaimedProcessorJob | null> {
    return await workerDb.transaction(async (tx) => {
        const rows = await tx.execute(sql`
            SELECT id FROM jobs
            WHERE id = ${id} AND status = 'pending'
            FOR UPDATE SKIP LOCKED
        `);

        if (rows.length === 0) return null;

        const updatedRows = await tx
            .update(jobs)
            .set({ status: "processing", updated_at: new Date() })
            .where(eq(jobs.id, id))
            .returning();

        const updated = updatedRows[0];
        if (!updated) return null;

        const pipelineRows = await tx
            .select({
                id: pipelines.id,
                action_type: pipelines.action_type,
                action_config: pipelines.action_config,
            })
            .from(pipelines)
            .where(eq(pipelines.id, updated.pipeline_id))
            .limit(1);

        const pipeline = pipelineRows[0];
        if (!pipeline) {
            throw new Error(
                `[processor] Pipeline ${updated.pipeline_id} not found for job ${id}`
            );
        }

        return {
            ...updated,
            action_type: pipeline.action_type,
            action_config: pipeline.action_config,
        };
    });
}

export async function markJobProcessed(
    id: string,
    result: Record<string, unknown>
): Promise<{ nextPipelineId: string; outputPayload: unknown } | undefined> {
    return await workerDb.transaction(async (tx) => {
        const jobRows = await tx
            .select({ pipeline_id: jobs.pipeline_id })
            .from(jobs)
            .where(eq(jobs.id, id))
            .limit(1);

        const job = jobRows[0];
        if (!job) return undefined;

        const pipelineRows = await tx
            .select({ next_pipeline_id: pipelines.next_pipeline_id })
            .from(pipelines)
            .where(eq(pipelines.id, job.pipeline_id))
            .limit(1);

        const nextPipelineId = pipelineRows[0]?.next_pipeline_id as
            | string
            | undefined;

        const outputPayload = (result as { output_payload?: unknown })
            ?.output_payload;

        await tx
            .update(jobs)
            .set({
                status: "processed",
                result,
                updated_at: new Date(),
                completed_at: new Date(),
                // completed_at:
                //     finalStatus === "completed" ? new Date() : undefined,
            })
            .where(eq(jobs.id, id));

        if (nextPipelineId && outputPayload !== undefined) {
            return { nextPipelineId, outputPayload };
        }

        return undefined;
    });
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
