import { Worker } from "bullmq";
import {
    connection,
    DELIVERY_QUEUE_NAME,
    deliveryQueue,
    DELIVERY_MAX_ATTEMPTS,
    DELIVERY_RETRY_BASE_DELAY_MS,
} from "../queues";
import {
    claimJobForDeliveryById,
    completeJobIfAllSubscribersDelivered,
    getDeliveryReadyJobIds,
    markJobDeliveryFailed,
} from "./queries";

import {
    deliverToSubscriber,
    enqueueSubscriberDeliveryJobs,
    type DeliveryQueuePayload,
} from "./deliver";

// payload helpers are in ./payload.ts

export function startDelivery(): Worker {
    const worker = new Worker(
        DELIVERY_QUEUE_NAME,
        async (bqJob: { data: DeliveryQueuePayload; attemptsMade: number }) => {
            const { jobId, subscriberId } = bqJob.data;
            // BullMQ is 0-indexed; map to 1-indexed for human-readable logs.
            const attemptNumber = bqJob.attemptsMade + 1;

            // Verify the parent job is still deliverable.
            const job = await claimJobForDeliveryById(jobId);

            // Job already moved to a terminal state (completed/failed), safe to skip.
            if (!job) return;

            // Seed job: fan out one queue job per subscriber.
            if (!subscriberId) {
                await enqueueSubscriberDeliveryJobs(job);
                return;
            }

            // Resolve subscriber and perform delivery (deliverToSubscriber
            // will throw on failure to let BullMQ handle retries).
            // Note: deliverToSubscriber will log attempts and increment counters.
            // We fetch the subscriber inside deliverToSubscriber caller chain to
            // keep this worker function focused.
            // (deliverToSubscriber expects a Subscriber object; fetch here.)
            const subscriber = await (async () => {
                // Lazy-import to avoid cyclic dependencies in smaller modules.
                const { getSubscriberById } = await import("./queries");
                return getSubscriberById(subscriberId);
            })();

            if (!subscriber || subscriber.pipeline_id !== job.pipeline_id) {
                throw new Error(
                    `subscriber ${subscriberId} not found for pipeline ${job.pipeline_id}`
                );
            }

            await deliverToSubscriber(job, subscriber, attemptNumber);
            await completeJobIfAllSubscribersDelivered(job.id);
            console.log(
                `[delivery] delivered job ${job.id} to subscriber ${subscriber.id} (attempt ${attemptNumber})`
            );
        },
        { connection, concurrency: 5 }
    );

    // 'failed' fires after EVERY failed attempt, including intermediate ones.
    // We only write to the DB when all attempts are exhausted.
    worker.on("failed", async (bqJob, err) => {
        if (!bqJob) return;

        const maxAttempts = bqJob.opts.attempts ?? 1;
        const exhausted = bqJob.attemptsMade >= maxAttempts;

        if (exhausted) {
            console.error(
                `[delivery] job ${bqJob.data.jobId} permanently failed after ${bqJob.attemptsMade} attempt(s):`,
                err?.message ?? String(err)
            );
            await markJobDeliveryFailed(bqJob.data.jobId as string);
        } else {
            console.warn(
                `[delivery] job ${bqJob.data.jobId} attempt ${bqJob.attemptsMade} failed, will retry:`,
                err?.message ?? String(err)
            );
        }
    });

    worker.on("error", (err) => {
        console.error("[delivery] worker error:", err?.message ?? String(err));
    });

    // Recover 'processed' and 'processing-failed' jobs that are in the DB but
    // absent from the delivery queue (e.g. crash between markJobProcessed and
    // the deliveryQueue.add call in the processor worker).
    // Already-queued jobs are silently ignored thanks to the idempotent jobId.
    getDeliveryReadyJobIds()
        .then((ids) => {
            if (ids.length === 0) return;
            console.log(
                `[delivery] recovering ${ids.length} job(s) missed from delivery queue`
            );
            return Promise.all(
                ids.map((id) =>
                    deliveryQueue.add(
                        "deliver",
                        { jobId: id },
                        {
                            // Seed jobs fan out to subscriber-level jobs.
                            jobId: `deliver-seed-${id}`,
                        }
                    )
                )
            );
        })
        .catch((err) =>
            console.error("[delivery] startup recovery failed:", err)
        );

    console.log(
        `[delivery] started — listening for jobs via BullMQ (max ${DELIVERY_MAX_ATTEMPTS} attempts, exponential backoff from ${DELIVERY_RETRY_BASE_DELAY_MS}ms)`
    );
    return worker;
}
