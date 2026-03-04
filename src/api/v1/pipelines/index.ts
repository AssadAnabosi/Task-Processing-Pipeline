import { Router } from "express";
import * as controller from "./controller";

const router = Router();

router.route("/")
    .get(controller.getPipelines)
    .post(controller.postPipeline);

router.route("/:id")
    .get(controller.getPipelineById)
    .put(controller.updatePipeline)
    .delete(controller.deletePipeline);

export default router;
