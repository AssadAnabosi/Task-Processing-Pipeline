import { generateSignature } from "@util/webhookSignature";

const payload = {
    "firstName": "Alice",
    "lastName": "Smith",
    "debug": "should-be-removed",
    "email": "alice@example.com"
};

const secret = "secret-a";

const rawPayload = Buffer.isBuffer(payload)
    ? payload.toString("utf8")
    : JSON.stringify(payload ?? {});

const signature = generateSignature(secret, rawPayload);

console.log("Generated Signature:", signature);