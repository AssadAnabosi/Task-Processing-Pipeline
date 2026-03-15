import { Router } from "express";
import * as controller from "./controller";
import limiter from "@middleware/rateLimiter";

const router = Router();

router.post("/pipelines/:slug", limiter, controller.handlePipelineWebhook);

export default router;
