import { Router } from "express";
import * as controller from "./controller";

const router = Router();

router.route("/jobs").get(controller.getMetrics);

export default router;
