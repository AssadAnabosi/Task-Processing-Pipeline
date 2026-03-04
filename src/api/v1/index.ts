import { Router } from "express";

import pipelinesRouter from "./pipelines";

const router = Router();

router.use("/pipelines", pipelinesRouter);

export default router;
