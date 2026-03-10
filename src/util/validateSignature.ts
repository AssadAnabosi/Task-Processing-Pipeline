import crypto from "crypto";

function escapeSlashes(str: string) {
    return str.replace(/\//g, "\\/");
}

function generateSignature(secret: string, payload: string) {
    return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

function validateSignature(
    receivedSignature: string,
    secret: string,
    stringifiedPayload: string
) {
    const escapedBody = escapeSlashes(stringifiedPayload);
    const expectedSignature = generateSignature(secret, escapedBody);
    return receivedSignature === expectedSignature;
}

export default validateSignature;
