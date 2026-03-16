import { Router } from "express";

import pipelinesRouter from "./pipelines";
import webhooksRouter from "./webhooks";
import metricsRouter from "./metrics";

const router = Router();

router.use("/pipelines", pipelinesRouter);

router.use("/webhooks", webhooksRouter);

router.use("/metrics", metricsRouter);

export default router;
