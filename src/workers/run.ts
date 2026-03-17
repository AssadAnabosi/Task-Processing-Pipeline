// Standalone entry point for running workers independently of the API server.
//
// Usage:
//   bun src/workers/run.ts                → starts all workers
//   bun src/workers/run.ts processor      → starts the processor worker only
//   bun src/workers/run.ts delivery       → starts the delivery worker only

import type { Worker } from "bullmq";
import { startProcessor } from "./processor";
import { startDelivery } from "./delivery";

const workers = {
    processor: startProcessor,
    delivery: startDelivery,
} as const;

type WorkerName = keyof typeof workers;

const arg = process.argv[2] as WorkerName | undefined;

const activeWorkers: Worker[] = [];

if (arg) {
    if (!(arg in workers)) {
        console.error(
            `Unknown worker: "${arg}". Available: ${Object.keys(workers).join(", ")}`
        );
        process.exit(1);
    }
    activeWorkers.push(workers[arg]());
} else {
    Object.values(workers).forEach((start) => activeWorkers.push(start()));
}

async function shutdown(signal: string): Promise<void> {
    console.log(`[workers] received ${signal}, shutting down gracefully…`);
    try {
        await Promise.allSettled(activeWorkers.map((w) => w.close()));
    } catch (err) {
        console.error(
            "[workers] error during shutdown:",
            err instanceof Error ? err.message : String(err)
        );
    } finally {
        process.exit(0);
    }
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
