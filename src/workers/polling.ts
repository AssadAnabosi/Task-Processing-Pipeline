type PollingWorkerOptions = {
    workerName: string;
    pollIntervalMs: number;
    batchSize: number;
    runBatch: () => Promise<void>;
};

export function startPollingWorker(options: PollingWorkerOptions): void {
    let isRunning = false;

    const tick = async (): Promise<void> => {
        if (isRunning) return;
        isRunning = true;

        try {
            await options.runBatch();
        } finally {
            isRunning = false;
        }
    };

    console.log(
        `[${options.workerName}] started - polling every ${options.pollIntervalMs}ms, batch size ${options.batchSize}`
    );

    // Fire immediately so the first poll does not wait a full interval.
    tick().catch((err) =>
        console.error(`[${options.workerName}] tick error:`, err)
    );

    setInterval(() => {
        tick().catch((err) =>
            console.error(`[${options.workerName}] tick error:`, err)
        );
    }, options.pollIntervalMs);
}
