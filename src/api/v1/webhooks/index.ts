import { Router } from "express";
import * as controller from "./controller";

const router = Router();

router.post("/pipelines/:slug", controller.handlePipelineWebhook);

export default router;
