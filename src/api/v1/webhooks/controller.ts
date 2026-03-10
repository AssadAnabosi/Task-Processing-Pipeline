import { type Request, type Response } from "express";
import { createJob } from "@db/queries/jobs";

import { UnauthorizedError } from "@util/responseErrors";
import { ACCEPTED } from "@util/constants/statusCodes";
import { getPipelineBySourcePath } from "@db/queries/pipelines";
import validateSignature from "@util/validateSignature";

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

    if (
        !validateSignature(signature, pipeline.secret, JSON.stringify(req.body))
    ) {
        throw new UnauthorizedError("Not Authorized");
    }

    const job = await createJob({
        pipeline_id: pipeline.id,
        payload: req.body,
    });

    return res.status(ACCEPTED).json({
        message: "Webhook received and job created successfully",
        data: job,
    });
}
