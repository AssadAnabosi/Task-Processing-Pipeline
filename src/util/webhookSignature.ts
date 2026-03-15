import crypto from "crypto";

function escapeSlashes(str: string) {
    return str.replace(/\//g, "\\/");
}

export function generateSignature(secret: string, stringifiedPayload: string) {
    const escapedPayload = escapeSlashes(stringifiedPayload);
    return crypto
        .createHmac("sha256", secret)
        .update(escapedPayload)
        .digest("hex");
}

export function validateSignature(
    receivedSignature: string,
    secret: string,
    payload: Record<string, unknown>
) {
    const stringifiedPayload = JSON.stringify(payload);
    const expectedSignature = generateSignature(secret, stringifiedPayload);
    return receivedSignature === expectedSignature;
}
