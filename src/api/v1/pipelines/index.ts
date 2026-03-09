import { Router } from "express";
import * as controller from "./controller";
import { validateBody } from "@middleware/validateBody";
import { createPipelineSchema, updatePipelineSchema } from "./schemas";

const router = Router();

router
    .route("/")
    .get(controller.getPipelines)
    .post(validateBody(createPipelineSchema), controller.postPipeline);

router
    .route("/:id")
    .get(controller.getPipelineById)
    .put(validateBody(updatePipelineSchema), controller.updatePipeline)
    .delete(controller.deletePipeline);

export default router;
