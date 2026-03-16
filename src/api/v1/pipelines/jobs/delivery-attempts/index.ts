import { Router } from "express";
import * as controller from "./controller";
import validUUID from "@middleware/validUUID";

const router = Router({ mergeParams: true });

router.route("/").get(controller.getAttemptsForJob);

const base = "/:attemptId";
router.use(base, validUUID("attemptId"));

router.route(base).get(controller.getAttemptById);

export default router;
