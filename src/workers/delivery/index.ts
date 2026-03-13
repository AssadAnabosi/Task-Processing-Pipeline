import type { Job, Subscriber } from "@db/schema";
import { startPollingWorker } from "../polling";
import { generateSignature } from "@util/webhookSignature";

import {
    claimProcessedJobs,
    getSubscribersByPipelineId,
    markJobCompleted,
    markJobDeliveryFailed,
} from "./queries";

const POLL_INTERVAL_MS = 5_000;
const BATCH_SIZE = 5;
const DELIVERY_SIGNATURE_HEADER = "x-delivery-sign";

function buildDeliveryPayload(job: Job) {
    return {
        status: job.status,
        jobId: job.id,
        payload: job.payload,
        result: job.result,
    };
}

async function deliverToSubscriber(
    job: Job,
    subscriber: Subscriber
): Promise<void> {
    const deliveryPayload = buildDeliveryPayload(job);
    const body = JSON.stringify(deliveryPayload);
    const signature = generateSignature(subscriber.secret, body);

    const response = await fetch(subscriber.url, {
        method: "POST",
        headers: {
            "content-type": "application/json",
            [DELIVERY_SIGNATURE_HEADER]: signature,
        },
        body,
    });

    if (!response.ok) {
        throw new Error(
            `subscriber ${subscriber.id} responded with HTTP ${response.status}`
        );
    }
}

async function deliverJob(job: Job): Promise<void> {
    const subscribers = await getSubscribersByPipelineId(job.pipeline_id);

    if (subscribers.length === 0) {
        console.log(
            `[delivery] no subscribers for pipeline ${job.pipeline_id}`
        );
        await markJobCompleted(job.id);
        return;
    }

    await Promise.all(
        subscribers.map((subscriber) => deliverToSubscriber(job, subscriber))
    );

    await markJobCompleted(job.id);
}

async function runBatch(): Promise<void> {
    const claimed = await claimProcessedJobs(BATCH_SIZE);
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
