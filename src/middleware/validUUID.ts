import { BadRequestError } from "@util/responseErrors";
import { type Request, type Response, type NextFunction } from "express";

export function isValidUUID(uuid: string): boolean {
    const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
}

export default function validUUID(keys: string | string[]) {
    return (req: Request, _res: Response, next: NextFunction) => {
        const keysToCheck = Array.isArray(keys) ? keys : [keys];
        for (const key of keysToCheck) {
            const value = req.params[key] || req.query[key] || req.body[key];
            if (typeof value !== "string" || !isValidUUID(value)) {
                throw new BadRequestError(
                    `Invalid UUID format for field: ${key}`
                );
            }
        }
        next();
    };
}
