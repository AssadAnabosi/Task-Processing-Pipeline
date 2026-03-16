import { Router } from "express";
import * as controller from "./controller";

import validUUID from "@middleware/validUUID";
import validateRowExistence from "@middleware/validateRowExistence";
import { jobs } from "@db/schema";

import deliveryAttemptsRouter from "./delivery-attempts";

const router = Router({ mergeParams: true });

router.route("/").get(controller.getJobsByPipelineId);

const base = "/:jobId";
router.use(
    base,
    validUUID("jobId"),
    validateRowExistence(jobs, "jobId", "id", "job")
);

router.route(base).get(controller.getJobById);

router.use(`${base}/delivery-attempts`, deliveryAttemptsRouter);

export default router;
