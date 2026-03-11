import type { Job } from "@db/schema";
import { claimJobs, markJobFailed, markJobProcessed } from "./queries";

const POLL_INTERVAL_MS = 5_000;
const BATCH_SIZE = 5;

// Boilerplate: replace with real pipeline processing logic.
async function processJob(job: Job): Promise<void> {
    await new Promise<void>((resolve) => setTimeout(resolve, 10_000));
    console.log(`[processor] processed job ${job.id}`);
}

// Guard so a slow tick does not stack up with the next interval fire.
let isRunning = false;

async function tick(): Promise<void> {
    if (isRunning) return;
    isRunning = true;

    try {
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
    } finally {
        isRunning = false;
    }
}

export function startProcessor(): void {
    console.log(
        `[processor] started — polling every ${POLL_INTERVAL_MS}ms, batch size ${BATCH_SIZE}`
    );

    // Fire immediately so the first poll doesn't wait a full interval.
    tick().catch((err) => console.error("[processor] tick error:", err));

    setInterval(() => {
        tick().catch((err) => console.error("[processor] tick error:", err));
    }, POLL_INTERVAL_MS);
}
