import { Router } from "express";
import * as controller from "./controller";

import validUUID from "@middleware/validUUID";
import validateRowExistence from "@middleware/validateRowExistence";
import { pipelines } from "@db/schema";

import { validateBody } from "@middleware/validateBody";
import { createPipelineSchema, updatePipelineSchema } from "./schemas";

import jobsRouter from "./jobs";
import subscribersRouter from "./subscribers";

const router = Router();

router
    .route("/")
    .get(controller.getPipelines)
    .post(validateBody(createPipelineSchema), controller.postPipeline);

const base = "/:pipelineId";
// Validate pipelineId for all routes that include it
router.use(base, validUUID("pipelineId"));
router.use(
    base,
    validateRowExistence(pipelines, "pipelineId", "id", "pipeline")
);

router
    .route(base)
    // Moved pipeline existence validation to the route level to ensure it's applied to all relevant routes
    // If used as ".use" rather than ".all", it will apply to all HTTP methods, but we want to ensure it runs before any method handler
    // .all(validateRowExistence(pipelines, "pipelineId", "id", "pipeline"))
    .get(controller.getPipelineById)
    .put(validateBody(updatePipelineSchema), controller.updatePipeline)
    .delete(controller.deletePipeline);

router.use(`${base}/jobs`, jobsRouter);
router.use(`${base}/subscribers`, subscribersRouter);

export default router;
