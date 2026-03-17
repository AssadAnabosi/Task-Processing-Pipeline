/**
 * @deprecated Replaced by BullMQ workers that listen for new jobs instead of polling.
 * Kept for reference but not currently used.
 */
type PollingWorkerOptions = {
    workerName: string;
    pollIntervalMs: number;
    batchSize: number;
    runBatch: () => Promise<void>;
};

// Returns a handle with `stop()` so callers can cleanly shut down the poller.
export function startPollingWorker(options: PollingWorkerOptions): {
    stop: () => void;
} {
    let isRunning = false;
    let intervalId: NodeJS.Timeout | null = null;

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
        console.error(
            `[${options.workerName}] tick error:`,
            err instanceof Error ? err.message : String(err)
        )
    );

    intervalId = setInterval(() => {
        tick().catch((err) =>
            console.error(
                `[${options.workerName}] tick error:`,
                err instanceof Error ? err.message : String(err)
            )
        );
    }, options.pollIntervalMs);

    return {
        stop() {
            if (intervalId) {
                clearInterval(intervalId);
                intervalId = null;
            }
        },
    };
}
