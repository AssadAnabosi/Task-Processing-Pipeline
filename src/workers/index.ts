import { startProcessor } from "./processor";
import { startDelivery } from "./delivery";

export { startProcessor, startDelivery };

export function startAllWorkers(): void {
    startProcessor();
    startDelivery();
}
