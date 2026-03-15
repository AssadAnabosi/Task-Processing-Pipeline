import {
    BAD_REQUEST,
    NOT_AUTHENTICATED,
    NOT_AUTHORIZED,
    NOT_FOUND,
} from "./constants/statusCodes";

export abstract class AppError extends Error {
    abstract readonly statusCode: number;
    abstract toJSON(): Record<string, unknown>;
}

export class ValidationError extends AppError {
    readonly statusCode = BAD_REQUEST;
    public readonly issues: { field: string; message: string }[];
    constructor(issues: { field: string; message: string }[]) {
        super("Validation failed");
        this.name = "ValidationError";
        this.issues = issues;
        Object.setPrototypeOf(this, ValidationError.prototype);
    }
    toJSON() {
        return { errors: this.issues };
    }
}

export class BadRequestError extends AppError {
    readonly statusCode = BAD_REQUEST;
    constructor(message: string) {
        super(message);
        this.name = "BadRequestError";
        Object.setPrototypeOf(this, BadRequestError.prototype);
    }
    toJSON() {
        return { error: this.message };
    }
}

export class UnauthorizedError extends AppError {
    readonly statusCode = NOT_AUTHENTICATED;
    constructor(message: string) {
        super(message);
        this.name = "UnauthorizedError";
        Object.setPrototypeOf(this, UnauthorizedError.prototype);
    }
    toJSON() {
        return { error: this.message };
    }
}

export class ForbiddenError extends AppError {
    readonly statusCode = NOT_AUTHORIZED;
    constructor(message: string) {
        super(message);
        this.name = "ForbiddenError";
        Object.setPrototypeOf(this, ForbiddenError.prototype);
    }
    toJSON() {
        return { error: this.message };
    }
}

export class NotFoundError extends AppError {
    readonly statusCode = NOT_FOUND;
    constructor(message: string) {
        super(message);
        this.name = "NotFoundError";
        Object.setPrototypeOf(this, NotFoundError.prototype);
    }
    toJSON() {
        return { error: this.message };
    }
}

export class TooManyRequestsError extends AppError {
    readonly statusCode = 429;
    constructor(message: string) {
        super(message);
        this.name = "TooManyRequestsError";
        Object.setPrototypeOf(this, TooManyRequestsError.prototype);
    }
    toJSON() {
        return { error: this.message };
    }
}
