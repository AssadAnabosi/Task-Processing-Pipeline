import { Router } from "express";
import * as controller from "./controller";

import v1Router from "./v1";

const router = Router();

router.get("/health", controller.healthCheck);

router.use("/v1", v1Router);

export default router;
