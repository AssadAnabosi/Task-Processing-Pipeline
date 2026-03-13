import type { Job } from "@db/schema";
import { startPollingWorker } from "../polling";
import { claimJobs, markJobFailed, markJobProcessed } from "./queries";

const POLL_INTERVAL_MS = 5_000;
const BATCH_SIZE = 5;

// Boilerplate: replace with real pipeline processing logic.
async function processJob(job: Job): Promise<void> {
    await new Promise<void>((resolve) => setTimeout(resolve, 10_000));
    console.log(`[processor] processed job ${job.id}`);
}

async function runBatch(): Promise<void> {
    const claimed = await claimJobs(BATCH_SIZE);
    if (claimed.length === 0) return;

    console.log(`[processor] claimed ${claimed.length} job(s)`);

    // Process the batch concurrently. allSettled ensures one job's
    // failure never prevents the rest of the batch from completing.
    await Promise.allSettled(
        claimed.map(async (job) => {
            try {
                await processJob(job);
                await markJobProcessed(job.id);
            } catch (err) {
                console.error(
                    `[processor] job ${job.id} failed (retry_count=${job.retry_count}):`,
                    err
                );
                await markJobFailed(job.id, job.retry_count);
            }
        })
    );
}

export function startProcessor(): void {
    startPollingWorker({
        workerName: "processor",
        pollIntervalMs: POLL_INTERVAL_MS,
        batchSize: BATCH_SIZE,
        runBatch,
    });
}
