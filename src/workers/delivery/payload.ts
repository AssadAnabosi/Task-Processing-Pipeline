import type { Job, Subscriber } from "@db/schema";
import { generateSignature } from "@util/webhookSignature";

export const DELIVERY_SIGNATURE_HEADER = "x-delivery-sign";

export function buildDeliveryPayload(job: Job): {
    status: Job["status"];
    jobId: string;
    payload: unknown;
    result: unknown;
} {
    return {
        status: job.status,
        jobId: job.id,
        payload: job.payload,
        result: job.result,
    };
}

export async function readResponseBody(
    response: Response
): Promise<string | undefined> {
    const bodyText = await response.text();
    if (!bodyText) return undefined;

    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
        try {
            return JSON.stringify(JSON.parse(bodyText));
        } catch {
            return bodyText;
        }
    }

    return bodyText;
}

export type DeliveryResponse = {
    ok: boolean;
    responseStatus?: number;
    responseBody?: string;
    error?: string;
};

export async function sendDeliveryRequest(
    job: Job,
    subscriber: Subscriber
): Promise<DeliveryResponse> {
    const deliveryPayload = buildDeliveryPayload(job);
    const body = JSON.stringify(deliveryPayload);
    const signature = generateSignature(subscriber.secret, body);

    try {
        const response = await fetch(subscriber.url, {
            method: "POST",
            headers: {
                "content-type": "application/json",
                [DELIVERY_SIGNATURE_HEADER]: signature,
            },
            body,
        });

        const responseBody = await readResponseBody(response);
        if (!response.ok) {
            return {
                ok: false,
                responseStatus: response.status,
                responseBody,
                error: `subscriber ${subscriber.id} responded with HTTP ${response.status}`,
            };
        }

        return {
            ok: true,
            responseStatus: response.status,
            responseBody,
        };
    } catch (err) {
        return {
            ok: false,
            error: err instanceof Error ? err.message : String(err),
        };
    }
}
