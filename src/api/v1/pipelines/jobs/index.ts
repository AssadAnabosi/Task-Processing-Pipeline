import { Router } from "express";
import * as controller from "./controller";

const router = Router({ mergeParams: true });

router.route("/").get(controller.getJobs);

const base = "/:jobId";

router.route(base).get(controller.getJobById);

export default router;
