import { Router } from "express";

import pipelinesRouter from "./pipelines";
import webhooksRouter from "./webhooks";

const router = Router();

router.use("/pipelines", pipelinesRouter);

router.use("/webhooks", webhooksRouter);

export default router;
