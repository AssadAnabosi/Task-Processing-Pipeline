import { Router } from "express";
import * as controller from "./controller";
import { validateBody } from "@middleware/validateBody";
import validUUID from "@middleware/validUUID";
import { createPipelineSchema, updatePipelineSchema } from "./schemas";

import jobsRouter from "./jobs";
import subscribersRouter from "./subscribers";

const router = Router();

router
    .route("/")
    .get(controller.getPipelines)
    .post(validateBody(createPipelineSchema), controller.postPipeline);

const base = "/:pipelineId";
router.use(base, validUUID("pipelineId")); // Validate pipelineId for all routes that include it

router
    .route(base)
    .get(controller.getPipelineById)
    .put(validateBody(updatePipelineSchema), controller.updatePipeline)
    .delete(controller.deletePipeline);

router.use(`${base}/jobs`, jobsRouter);
router.use(`${base}/subscribers`, subscribersRouter);

export default router;
