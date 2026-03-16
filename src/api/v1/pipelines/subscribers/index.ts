import { Router } from "express";
import * as controller from "./controller";

import validUUID from "@middleware/validUUID";
import validateRowExistence from "@middleware/validateRowExistence";

import { validateBody } from "@middleware/validateBody";
import { createSubscriberSchema, updateSubscriberSchema } from "./schemas";

import { subscribers } from "@db/schema";

const router = Router({ mergeParams: true });

router
    .route("/")
    .get(controller.getSubscribersByPipelineId)
    .post(validateBody(createSubscriberSchema), controller.postSubscriber);

const base = "/:subscriberId";
router.use(base, validUUID("subscriberId"));
router.use(
    base,
    validateRowExistence(subscribers, "subscriberId", "id", "subscriber")
);

router
    .route(base)
    .get(controller.getSubscriberById)
    .patch(validateBody(updateSubscriberSchema), controller.updateSubscriber)
    .delete(controller.deleteSubscriber);

export default router;
