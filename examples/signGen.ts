import { generateSignature } from "@util/webhookSignature";

const payload = {
    "status": "queued",
    "attempts": 2,
    "tags": ["billing", "priority"]
};

const secret = "filter";

const rawPayload = Buffer.isBuffer(payload)
    ? payload.toString("utf8")
    : JSON.stringify(payload ?? {});

const signature = generateSignature(secret, rawPayload);

console.log("Generated Signature:", signature);