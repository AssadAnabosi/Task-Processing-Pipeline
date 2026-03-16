import { Router, raw } from "express";
import * as controller from "./controller";
import limiter from "@middleware/rateLimiter";

const router = Router();

router.use("/", raw({ type: "application/json", limit: "256kb" }));

router.post("/pipelines/:slug", limiter, controller.handlePipelineWebhook);

export default router;
