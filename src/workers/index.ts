import type { Worker } from "bullmq";
import { startProcessor } from "./processor";
import { startDelivery } from "./delivery";
export { processorQueue, deliveryQueue } from "./queues";

export { startProcessor, startDelivery };

export function startAllWorkers(): Worker[] {
    return [startProcessor(), startDelivery()];
}
