import type { Job, Subscriber } from "@db/schema";
import { Worker } from "bullmq";
import {
    connection,
    DELIVERY_QUEUE_NAME,
    deliveryQueue,
    DELIVERY_MAX_ATTEMPTS,
    DELIVERY_RETRY_BASE_DELAY_MS,
} from "../queues";
import { generateSignature } from "@util/webhookSignature";

import {
    claimJobForDeliveryById,
    completeJobIfAllSubscribersDelivered,
    getDeliveryReadyJobIds,
    getSubscriberById,
    getSubscribersByPipelineId,
    incrementJobTotalDeliveries,
    logDeliveryAttempt,
    markJobCompleted,
    markJobDeliveryFailed,
    updateJobSubscriberCount,
} from "./queries";

const DELIVERY_SIGNATURE_HEADER = "x-delivery-sign";

function buildDeliveryPayload(job: Job) {
    return {
        status: job.status,
        jobId: job.id,
        payload: job.payload,
        result: job.result,
    };
}

async function readResponseBody(
    response: Response
): Promise<string | undefined> {
    const bodyText = await response.text();
    if (!bodyText) return undefined;

    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
        try {
            return JSON.stringify(JSON.parse(bodyText));
        } catch {
            return bodyText;
        }
    }

    return bodyText;
}

type DeliveryResponse = {
    ok: boolean;
    responseStatus?: number;
    responseBody?: string;
    error?: string;
};

async function sendDeliveryRequest(
    job: Job,
    subscriber: Subscriber
): Promise<DeliveryResponse> {
    const deliveryPayload = buildDeliveryPayload(job);
    const body = JSON.stringify(deliveryPayload);
    const signature = generateSignature(subscriber.secret, body);

    try {
        const response = await fetch(subscriber.url, {
            method: "POST",
            headers: {
                "content-type": "application/json",
                [DELIVERY_SIGNATURE_HEADER]: signature,
            },
            body,
        });

        const responseBody = await readResponseBody(response);
        if (!response.ok) {
            return {
                ok: false,
                responseStatus: response.status,
                responseBody,
                error: `subscriber ${subscriber.id} responded with HTTP ${response.status}`,
            };
        }

        return {
            ok: true,
            responseStatus: response.status,
            responseBody,
        };
    } catch (err) {
        return {
            ok: false,
            error: err instanceof Error ? err.message : String(err),
        };
    }
}

// Attempt delivery to a single subscriber once. Throws on failure so BullMQ
// can schedule the next retry — no sleep() required in application code.
async function deliverToSubscriber(
    job: Job,
    subscriber: Subscriber,
    attemptNumber: number
): Promise<void> {
    const scheduledFor = new Date();
    const attempt = await sendDeliveryRequest(job, subscriber);

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

type DeliveryQueuePayload = {
    jobId: string;
    subscriberId?: string;
};

async function enqueueSubscriberDeliveryJobs(job: Job): Promise<void> {
    // SIMULATION: LONG RUNNING CPU-INTENSIVE TASK
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
                {
                    jobId: `deliver-${job.id}-${subscriber.id}`,
                    attempts: DELIVERY_MAX_ATTEMPTS,
                    backoff: {
                        type: "exponential",
                        delay: DELIVERY_RETRY_BASE_DELAY_MS,
                    },
                }
            )
        )
    );
}

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

            const subscriber = await getSubscriberById(subscriberId);
            if (!subscriber || subscriber.pipeline_id !== job.pipeline_id) {
                throw new Error(
                    `subscriber ${subscriberId} not found for pipeline ${job.pipeline_id}`
                );
            }

            // Throws on failure → BullMQ retries THIS subscriber job only.
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
                err.message
            );
            await markJobDeliveryFailed(bqJob.data.jobId as string);
        } else {
            console.warn(
                `[delivery] job ${bqJob.data.jobId} attempt ${bqJob.attemptsMade} failed, will retry:`,
                err.message
            );
        }
    });

    worker.on("error", (err) => {
        console.error("[delivery] worker error:", err.message);
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
