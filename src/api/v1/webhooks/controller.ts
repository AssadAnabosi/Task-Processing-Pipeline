import { type Request, type Response } from "express";
import { createJob } from "@db/queries/jobs";
import { processorQueue } from "@workers/queues";

import { BadRequestError, UnauthorizedError } from "@util/responseErrors";
import { ACCEPTED } from "@util/constants/statusCodes";
import { getPipelineBySourcePath } from "@db/queries/pipelines";
import { validateSignature } from "@util/webhookSignature";

export async function handlePipelineWebhook(req: Request, res: Response) {
    const signature = req.headers["x-pipeline-signature"] as string | undefined;

    if (!signature) {
        // Don't overshare information about missing headers
        throw new UnauthorizedError("Not Authorized");
    }

    const pipeline = await getPipelineBySourcePath(req.params.slug as string);
    if (!pipeline) {
        // Don't overshare information about missing pipelines
        throw new UnauthorizedError("Not Authorized");
    }

    const rawPayload = Buffer.isBuffer(req.body)
        ? req.body.toString("utf8")
        : JSON.stringify(req.body ?? {});

    if (!validateSignature(signature, pipeline.secret, rawPayload)) {
        throw new UnauthorizedError("Not Authorized");
    }

    let parsedPayload: unknown;
    try {
        parsedPayload = JSON.parse(rawPayload);
    } catch {
        throw new BadRequestError("Invalid JSON payload");
    }

    const job = await createJob({
        pipeline_id: pipeline.id,
        payload: parsedPayload,
    });

    const createdJob = job[0];
    if (createdJob) {
        // Push the job ID into the BullMQ processor queue so the worker wakes up
        // immediately instead of waiting for the next poll interval.
        // jobId makes this idempotent — a duplicate enqueue is silently ignored.
        await processorQueue.add(
            "process",
            { jobId: createdJob.id },
            { jobId: `process-${createdJob.id}` }
        );
    }

    return res.status(ACCEPTED).json({
        message: "Webhook received and job created successfully",
        data: job,
    });
}
