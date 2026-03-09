import { type Request, type Response, type NextFunction } from "express";
import { type ZodType } from "zod";
import { ValidationError } from "@util/responseErrors";

export function validateBody(schema: ZodType) {
    return (req: Request, _res: Response, next: NextFunction) => {
        const result = schema.safeParse(req.body);
        if (!result.success) {
            throw new ValidationError(
                result.error.issues.map((e) => ({
                    field: e.path.join("."),
                    message: e.message,
                }))
            );
        }
        req.body = result.data;
        next();
    };
}
