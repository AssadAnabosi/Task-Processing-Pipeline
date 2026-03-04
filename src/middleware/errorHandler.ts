import { type NextFunction, type Request, type Response } from "express";
import {
    BadRequestError,
    ForbiddenError,
    NotFoundError,
    UnauthorizedError,
} from "@util/responseErrors";
import {
    BAD_REQUEST,
    NOT_AUTHENTICATED,
    NOT_FOUND,
    NOT_AUTHORIZED,
    INTERNAL_SERVER_ERROR,
} from "@util/constants/statusCodes";

export function middlewareErrorHandler(
    err: any,
    _req: Request,
    res: Response,
    _next: NextFunction
) {
    if (err instanceof BadRequestError) {
        res.status(BAD_REQUEST).json({ error: err.message });
        return;
    }

    if (err instanceof UnauthorizedError) {
        res.status(NOT_AUTHENTICATED).json({ error: err.message });
        return;
    }

    if (err instanceof ForbiddenError) {
        res.status(NOT_AUTHORIZED).json({ error: err.message });
        return;
    }

    if (err instanceof NotFoundError) {
        res.status(NOT_FOUND).json({ error: err.message });
        return;
    }

    console.error(err);
    res.status(INTERNAL_SERVER_ERROR).json({
        error: "Something went wrong on our end",
    });
}
