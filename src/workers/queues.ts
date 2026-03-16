import { Queue } from "bullmq";
import config from "@root/config";

// Shared ioredis connection options used by all BullMQ Queues and Workers.
// BullMQ manages its own ioredis connection separately from the node-redis
// client used by the rest of the app.
export const connection = { url: config.redis.url };

export const PROCESSOR_QUEUE_NAME = "tpp-processor";
export const DELIVERY_QUEUE_NAME = "tpp-delivery";
export const DELIVERY_MAX_ATTEMPTS = 5;
export const DELIVERY_RETRY_BASE_DELAY_MS = 500;

// Jobs enter here after a webhook is received. The processor worker consumes
// this queue, runs the pipeline action, then hands off to deliveryQueue.
export const processorQueue = new Queue(PROCESSOR_QUEUE_NAME, { connection });

// Jobs enter here after processing succeeds. The delivery worker consumes this
// queue and fans out to each pipeline subscriber.
// Retry policy (attempts + backoff) is set when enqueuing, not here.
export const deliveryQueue = new Queue(DELIVERY_QUEUE_NAME, { connection });
