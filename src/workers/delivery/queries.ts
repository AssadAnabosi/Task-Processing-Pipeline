import { eq, inArray, sql } from "drizzle-orm";

import {
    deliveryAttempts,
    jobs,
    subscribers,
    type Job,
    type Subscriber,
} from "@db/schema";
import { workerDb } from "../db";

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
