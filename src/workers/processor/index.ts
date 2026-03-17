import { Worker } from "bullmq";
import type { Job } from "@db/schema";
import {
    connection,
    processorQueue,
    deliveryQueue,
    PROCESSOR_QUEUE_NAME,
    DELIVERY_MAX_ATTEMPTS,
    DELIVERY_RETRY_BASE_DELAY_MS,
} from "../queues";
import {
    claimJobById,
    getPendingJobIds,
    markJobFailed,
    markJobProcessed,
    MAX_RETRIES,
} from "./queries";
import { createJob } from "@db/queries/jobs";
import { executePipelineAction } from "./actions";

type JobWithAction = Job & {
    action_type: "transform" | "filter" | "enrich";
    action_config: unknown;
};

async function processJob(
    job: JobWithAction
): Promise<Record<string, unknown>> {
    // SIMULATION: LONG RUNNING CPU-INTENSIVE TASK
    await new Promise((resolve) => setTimeout(resolve, 2500));

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

// How long to wait before retrying a failed processor job (exponential, in ms).
function processorRetryDelayMs(retryCount: number): number {
    return 1_000 * 2 ** retryCount; // 1 s, 2 s, 4 s
}

export function startProcessor(): Worker {
    const worker = new Worker(
        PROCESSOR_QUEUE_NAME,
        async (bqJob) => {
            const jobId = bqJob.data.jobId as string;

            // Atomically claim the DB row. Returns null when another worker
            // already claimed it (SKIP LOCKED) or the status is wrong — both
            // are safe to skip.
            const job = await claimJobById(jobId);
            if (!job) return;

            try {
                const res = await processJob(job);
                const followUp = await markJobProcessed(job.id, res);
                // If processor indicated a follow-up pipeline, create the job and enqueue it.
                if (followUp) {
                    console.log(
                        "[processor] follow-up pipeline indicated, creating job:",
                        followUp
                    );
                    const [created] = await createJob({
                        pipeline_id: followUp.nextPipelineId,
                        payload: followUp.outputPayload,
                    });
                    console.log("[processor] created follow-up job:", created);
                    if (created) {
                        await processorQueue.add(
                            "process",
                            { jobId: created.id },
                            { jobId: `process-${created.id}` }
                        );
                    }
                }

                // Hand off to the delivery queue. The jobId option makes this
                // idempotent: a duplicate enqueue attempt is silently ignored.
                await deliveryQueue.add(
                    "deliver",
                    { jobId: job.id },
                    {
                        jobId: `deliver-seed-${job.id}`,
                        attempts: DELIVERY_MAX_ATTEMPTS,
                        backoff: {
                            type: "exponential",
                            delay: DELIVERY_RETRY_BASE_DELAY_MS,
                        },
                    }
                );
            } catch (err) {
                console.error(
                    `[processor] job ${job.id} failed (retry_count=${job.retry_count}):`,
                    err
                );

                await markJobFailed(job.id, job.retry_count);

                // If the DB still has retries budget, re-enqueue with backoff.
                // markJobFailed already reset the status to 'pending'.
                if (job.retry_count < MAX_RETRIES) {
                    await processorQueue.add(
                        "process",
                        { jobId: job.id },
                        {
                            delay: processorRetryDelayMs(job.retry_count),
                            // Unique ID per retry attempt prevents duplicate
                            // entries if this code runs more than once.
                            jobId: `process-${job.id}-retry-${job.retry_count + 1}`,
                        }
                    );
                }
            }
            // We never throw here — retries are managed explicitly above so
            // BullMQ treats every invocation as a successful completion.
        },
        { connection, concurrency: 5 }
    );

    worker.on("error", (err) => {
        console.error("[processor] worker error:", err.message);
    });

    // Recover any jobs that are 'pending' in the DB but absent from the queue.
    // Runs in the background so worker startup is not blocked.
    // add() is idempotent on jobId — already-queued jobs are silently ignored.
    getPendingJobIds()
        .then((ids) => {
            if (ids.length === 0) return;
            console.log(
                `[processor] recovering ${ids.length} pending job(s) missed from queue`
            );
            return Promise.all(
                ids.map((id) =>
                    processorQueue.add(
                        "process",
                        { jobId: id },
                        { jobId: `process-${id}` }
                    )
                )
            );
        })
        .catch((err) =>
            console.error("[processor] startup recovery failed:", err)
        );

    console.log("[processor] started — listening for jobs via BullMQ");
    return worker;
}
