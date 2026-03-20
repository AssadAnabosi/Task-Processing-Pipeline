import { deliveryQueue, buildDiscoveryQueueOpts } from "../queues";

export default async function sendDeliveryMessage(jobId: string) {
    await deliveryQueue.add(
        "deliver",
        { jobId: jobId },
        buildDiscoveryQueueOpts(jobId)
    );
}
