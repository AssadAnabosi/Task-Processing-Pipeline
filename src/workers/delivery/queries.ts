import { eq, inArray, sql } from "drizzle-orm";

import {
    deliveryAttempts,
    jobs,
    subscribers,
    type Job,
    type Subscriber,
} from "@db/schema";
import { workerDb } from "../db";

// Return IDs of every job that is ready for delivery but not yet in BullMQ.
// 'processed' = pipeline action succeeded; 'processing-failed' = processor
// exhausted retries but the job still needs to be delivered.
// Used at worker startup to recover jobs missed due to a crash.
export async function getDeliveryReadyJobIds(): Promise<string[]> {
    const rows = await workerDb
        .select({ id: jobs.id })
        .from(jobs)
        .where(sql`${jobs.status} IN ('processed', 'processing-failed')`);
    return rows.map((r) => r.id);
}

// Fetch a single job that is ready for delivery.
// Returns null when the job is no longer in a deliverable status.
export async function claimJobForDeliveryById(id: string): Promise<Job | null> {
    const rows = await workerDb
        .select()
        .from(jobs)
        .where(
            sql`${jobs.id} = ${id} AND ${jobs.status} IN ('processed', 'processing-failed')`
        )
        .limit(1);
    return rows[0] ?? null;
}

export async function getSubscriberById(
    id: string
): Promise<Subscriber | null> {
    const rows = await workerDb
        .select()
        .from(subscribers)
        .where(eq(subscribers.id, id))
        .limit(1);
    return rows[0] ?? null;
}

// Claim the next batch of jobs ready for delivery atomically.
// This includes both 'processed' jobs and 'processing-failed' jobs that need redelivery.
export async function claimJobsForDelivery(limit: number): Promise<Job[]> {
    return await workerDb.transaction(async (tx) => {
        const rows = await tx.execute(sql`
            SELECT id FROM jobs
            WHERE status IN ('processed', 'processing-failed')
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

export async function updateJobSubscriberCount(
    id: string,
    subscriberCount: number
): Promise<void> {
    await workerDb
        .update(jobs)
        .set({ subscriber_count: subscriberCount, updated_at: new Date() })
        .where(eq(jobs.id, id));
}

export async function incrementJobTotalDeliveries(id: string): Promise<void> {
    await workerDb
        .update(jobs)
        .set({
            total_deliveries: sql`${jobs.total_deliveries} + 1`,
            updated_at: new Date(),
        })
        .where(eq(jobs.id, id));
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

export async function completeJobIfAllSubscribersDelivered(
    jobId: string
): Promise<void> {
    await workerDb.transaction(async (tx) => {
        const jobRows = await tx
            .select({
                id: jobs.id,
                status: jobs.status,
                subscriber_count: jobs.subscriber_count,
            })
            .from(jobs)
            .where(eq(jobs.id, jobId))
            .limit(1);

        const job = jobRows[0];
        if (!job) return;

        // Terminal states should never be modified here.
        if (job.status === "completed" || job.status === "delivery-failed") {
            return;
        }

        // If subscriber count was not initialized yet, we cannot finalize.
        if (job.subscriber_count == null) return;

        const deliveredRows = await tx
            .select({
                delivered_count: sql<number>`count(distinct ${deliveryAttempts.subscriberId})`,
            })
            .from(deliveryAttempts)
            .where(
                sql`${deliveryAttempts.jobId} = ${jobId} AND ${deliveryAttempts.status} = 'delivered'`
            );

        const deliveredCount = deliveredRows[0]?.delivered_count ?? 0;
        if (deliveredCount < job.subscriber_count) return;

        await tx
            .update(jobs)
            .set({
                status: "completed",
                updated_at: new Date(),
                completed_at: new Date(),
            })
            .where(eq(jobs.id, jobId));
    });
}

type DeliveryAttemptLogInput = {
    jobId: string;
    subscriberId: string;
    attemptNumber: number;
    status: "delivered" | "failed";
    responseStatus?: number;
    responseBody?: string;
    error?: string;
    scheduledFor?: Date;
};

export async function logDeliveryAttempt(
    input: DeliveryAttemptLogInput
): Promise<void> {
    await workerDb.insert(deliveryAttempts).values({
        jobId: input.jobId,
        subscriberId: input.subscriberId,
        attemptNumber: input.attemptNumber,
        status: input.status,
        responseStatus: input.responseStatus,
        responseBody: input.responseBody,
        error: input.error,
        scheduledFor: input.scheduledFor ?? new Date(),
        deliveredAt: input.status === "delivered" ? new Date() : undefined,
        updated_at: new Date(),
    });
}
