import { Router } from "express";
import * as controller from "./controller";

const router = Router({ mergeParams: true });

router.route("/").get(controller.getAttemptsForJob);

const base = "/:attemptId";

router.route(base).get(controller.getAttemptById);

export default router;
