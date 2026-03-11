import { type Request, type Response } from "express";
import { AppError } from "@util/responseErrors";
import { INTERNAL_SERVER_ERROR } from "@util/constants/statusCodes";

export function middlewareErrorHandler(
    err: unknown,
    _req: Request,
    res: Response
) {
    if (err instanceof AppError) {
        res.status(err.statusCode).json(err.toJSON());
        return;
    }

    console.error(err);
    res.status(INTERNAL_SERVER_ERROR).json({
        error: "Something went wrong on our end",
    });
}
