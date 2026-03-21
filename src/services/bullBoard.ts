import { Router } from "express";
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";
import { processorQueue, deliveryQueue } from "@workers/queues";

// Expose a router that serves the Bull Board UI. Mount at `/queues`.
const router = Router();

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath("/queues");

createBullBoard({
    queues: [
        new BullMQAdapter(processorQueue),
        new BullMQAdapter(deliveryQueue),
    ],
    serverAdapter,
});

router.use("/", serverAdapter.getRouter());

export default router;
