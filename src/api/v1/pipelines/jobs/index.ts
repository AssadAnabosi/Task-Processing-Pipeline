import { Router } from "express";
import * as controller from "./controller";

import deliveryAttemptsRouter from "./delivery-attempts";

const router = Router({ mergeParams: true });

router.route("/").get(controller.getJobsByPipelineId);

const base = "/:jobId";

router.route(base).get(controller.getJobById);

router.use(`${base}/delivery-attempts`, deliveryAttemptsRouter);

export default router;
