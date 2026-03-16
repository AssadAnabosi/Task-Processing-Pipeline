import type { Job } from "@db/schema";
import { startPollingWorker } from "../polling";
import { claimJobs, markJobFailed, markJobProcessed } from "./queries";
import { executePipelineAction } from "./actions";

const POLL_INTERVAL_MS = 5_000;
const BATCH_SIZE = 5;

type JobWithAction = Job & {
    action_type: "transform" | "filter" | "enrich";
    action_config: unknown;
};

async function processJob(
    job: JobWithAction
): Promise<Record<string, unknown>> {
    const actionResult = executePipelineAction(
        job.action_type,
        job.action_config,
        job.payload
    );

    console.log(
        `[processor] processed job ${job.id} with action ${job.action_type}`
    );

    return {
        action_type: job.action_type,
        ...actionResult,
    };
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
                const processingResult = await processJob(job);
                await markJobProcessed(job.id, processingResult);
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
