import type { Job, Subscriber } from "@db/schema";
import { deliveryQueue, buildDiscoveryQueueOpts } from "../queues";

import {
    getSubscribersByPipelineId,
    updateJobSubscriberCount,
    getSubscriberById,
    logDeliveryAttempt,
    incrementJobTotalDeliveries,
    markJobCompleted,
} from "./queries";

import { sendDeliveryRequest, type DeliveryResponse } from "./payload";

// Attempt delivery to a single subscriber once. Throws on failure so BullMQ
// can schedule the next retry — no sleep() required in application code.
export async function deliverToSubscriber(
    job: Job,
    subscriber: Subscriber,
    attemptNumber: number
): Promise<void> {
    const scheduledFor = new Date();
    const attempt: DeliveryResponse = await sendDeliveryRequest(
        job,
        subscriber
    );

    await logDeliveryAttempt({
        jobId: job.id,
        subscriberId: subscriber.id,
        attemptNumber,
        status: attempt.ok ? "delivered" : "failed",
        responseStatus: attempt.responseStatus,
        responseBody: attempt.responseBody,
        error: attempt.error,
        scheduledFor,
    });

    await incrementJobTotalDeliveries(job.id);

    if (!attempt.ok || attempt.responseStatus !== 200) {
        const msg = `subscriber ${subscriber.id} failed delivery: ${attempt.error}`;
        throw new Error(msg);
    }
}

export type DeliveryQueuePayload = {
    jobId: string;
    subscriberId?: string;
};

export async function enqueueSubscriberDeliveryJobs(job: Job): Promise<void> {
    // SIMULATION: LONG RUNNING CPU-INTENSIVE TASK
    // TODO: remove simulation sleep in production; keep for local testing.
    await new Promise((resolve) => setTimeout(resolve, 2500));

    const subscribers = await getSubscribersByPipelineId(job.pipeline_id);

    await updateJobSubscriberCount(job.id, subscribers.length);

    if (subscribers.length === 0) {
        console.log(
            `[delivery] no subscribers for pipeline ${job.pipeline_id}`
        );
        await markJobCompleted(job.id);
        return;
    }

    await Promise.all(
        subscribers.map((subscriber) =>
            deliveryQueue.add(
                "deliver",
                { jobId: job.id, subscriberId: subscriber.id },
                buildDiscoveryQueueOpts(job.id, subscriber.id)
            )
        )
    );
}

export async function resolveSubscriberForJob(
    jobId: string,
    subscriberId?: string
) {
    if (!subscriberId) return null;
    const subscriber = await getSubscriberById(subscriberId);
    return subscriber ?? null;
}
