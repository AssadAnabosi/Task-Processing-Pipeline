// Standalone entry point for running workers independently of the API server.
//
// Usage:
//   bun src/workers/run.ts                → starts all workers
//   bun src/workers/run.ts processor      → starts the processor worker only
//   bun src/workers/run.ts delivery       → starts the delivery worker only

import { startProcessor } from "./processor";
import { startDelivery } from "./delivery";

const workers = {
    processor: startProcessor,
    delivery: startDelivery,
} as const;

type WorkerName = keyof typeof workers;

const arg = process.argv[2] as WorkerName | undefined;

if (arg) {
    if (!(arg in workers)) {
        console.error(
            `Unknown worker: "${arg}". Available: ${Object.keys(workers).join(", ")}`
        );
        process.exit(1);
    }
    workers[arg]();
} else {
    Object.values(workers).forEach((start) => start());
}
