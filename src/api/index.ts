import { Router } from "express";
import * as controller from "./controller";

const router = Router();

router.get("/health", controller.healthCheck);

export default router;
