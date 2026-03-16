import { Router } from "express";
import * as controller from "./controller";

import validUUID from "@middleware/validUUID";
import validateRowExistence from "@middleware/validateRowExistence";
import { deliveryAttempts } from "@db/schema";

const router = Router({ mergeParams: true });

router.route("/").get(controller.getAttemptsForJob);

const base = "/:attemptId";
router.use(base, validUUID("attemptId"));
router.use(
    base,
    validateRowExistence(deliveryAttempts, "attemptId", "id", "deliveryAttempt")
);

router.route(base).get(controller.getAttemptById);

export default router;
