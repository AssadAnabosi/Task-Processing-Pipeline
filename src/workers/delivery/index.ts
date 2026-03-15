import type { Job, Subscriber } from "@db/schema";
import { startPollingWorker } from "../polling";
import { generateSignature } from "@util/webhookSignature";

import {
    claimJobsForDelivery,
    getSubscribersByPipelineId,
    incrementJobTotalDeliveries,
    logDeliveryAttempt,
    markJobCompleted,
    markJobDeliveryFailed,
    updateJobSubscriberCount,
} from "./queries";

const POLL_INTERVAL_MS = 5_000;
const BATCH_SIZE = 5;
const DELIVERY_SIGNATURE_HEADER = "x-delivery-sign";
const MAX_DELIVERY_ATTEMPTS = 5;
const RETRY_BASE_DELAY_MS = 500;
const RETRY_MAX_JITTER_MS = 750;

function buildDeliveryPayload(job: Job) {
    return {
        status: job.status,
        jobId: job.id,
        payload: job.payload,
        result: job.result,
    };
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function getRetryDelayMs(attemptNumber: number): number {
    const exponentialBackoff = RETRY_BASE_DELAY_MS * 2 ** (attemptNumber - 1);
    const jitter = Math.floor(Math.random() * RETRY_MAX_JITTER_MS);
    return exponentialBackoff + jitter;
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

async function deliverToSubscriber(
    job: Job,
    subscriber: Subscriber
): Promise<void> {
    for (
        let attemptNumber = 1;
        attemptNumber <= MAX_DELIVERY_ATTEMPTS;
        attemptNumber++
    ) {
        if (attemptNumber > 1) {
            const delayMs = getRetryDelayMs(attemptNumber - 1);
            await sleep(delayMs);
        }

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

        if (attempt.ok) {
            return;
        }
    }

    throw new Error(
        `subscriber ${subscriber.id} failed delivery after ${MAX_DELIVERY_ATTEMPTS} attempts`
    );
}

async function deliverToSubscribers(
    job: Job,
    subscribers: Subscriber[]
): Promise<void> {
    for (const subscriber of subscribers) {
        await deliverToSubscriber(job, subscriber);
    }
}

async function deliverJob(job: Job): Promise<void> {
    const subscribers = await getSubscribersByPipelineId(job.pipeline_id);

    await updateJobSubscriberCount(job.id, subscribers.length);

    if (subscribers.length === 0) {
        console.log(
            `[delivery] no subscribers for pipeline ${job.pipeline_id}`
        );
        await markJobCompleted(job.id);
        return;
    }

    await deliverToSubscribers(job, subscribers);

    await markJobCompleted(job.id);
}

async function runBatch(): Promise<void> {
    const claimed = await claimJobsForDelivery(BATCH_SIZE);
    if (claimed.length === 0) return;

    console.log(`[delivery] claimed ${claimed.length} job(s)`);

    await Promise.allSettled(
        claimed.map(async (job) => {
            try {
                await deliverJob(job);
                console.log(`[delivery] delivered job ${job.id}`);
            } catch (err) {
                console.error(`[delivery] job ${job.id} delivery failed:`, err);
                await markJobDeliveryFailed(job.id);
            }
        })
    );
}

export function startDelivery(): void {
    startPollingWorker({
        workerName: "delivery",
        pollIntervalMs: POLL_INTERVAL_MS,
        batchSize: BATCH_SIZE,
        runBatch,
    });
}
