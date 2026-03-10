import { Router } from "express";
import * as controller from "./controller";
import { validateBody } from "@middleware/validateBody";
import { createPipelineSchema, updatePipelineSchema } from "./schemas";

import jobsRouter from "./jobs";

const router = Router();

router
    .route("/")
    .get(controller.getPipelines)
    .post(validateBody(createPipelineSchema), controller.postPipeline);

const base = "/:pipelineId";

router
    .route(base)
    .get(controller.getPipelineById)
    .put(validateBody(updatePipelineSchema), controller.updatePipeline)
    .delete(controller.deletePipeline);

router.use(`${base}/jobs`, jobsRouter);

export default router;
