import type { Job } from "@db/schema";
import { executePipelineAction } from "./actions";

export type JobWithAction = Job & {
    action_type: "transform" | "filter" | "enrich";
    action_config: unknown;
};

export async function processJob(
    job: JobWithAction
): Promise<Record<string, unknown>> {
    // SIMULATION: LONG RUNNING CPU-INTENSIVE TASK
    await new Promise((resolve) => setTimeout(resolve, 2500));
    // throw new Error("simulated processor failure");
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
export function processorRetryDelayMs(retryCount: number): number {
    return 1_000 * 2 ** retryCount; // 1 s, 2 s, 4 s
}
