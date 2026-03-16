import { Router } from "express";
import * as controller from "./controller";
import { validateBody } from "@middleware/validateBody";
import validUUID from "@middleware/validUUID";
import { createSubscriberSchema, updateSubscriberSchema } from "./schemas";

const router = Router({ mergeParams: true });

router
    .route("/")
    .get(controller.getSubscribersByPipelineId)
    .post(validateBody(createSubscriberSchema), controller.postSubscriber);

const base = "/:subscriberId";

router.use(base, validUUID("subscriberId"));
router
    .route(base)
    .get(controller.getSubscriberById)
    .patch(validateBody(updateSubscriberSchema), controller.updateSubscriber)
    .delete(controller.deleteSubscriber);

export default router;
