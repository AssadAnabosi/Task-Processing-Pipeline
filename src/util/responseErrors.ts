export abstract class AppError extends Error {
    abstract readonly statusCode: number;
    abstract toJSON(): Record<string, unknown>;
}

export class ValidationError extends AppError {
    readonly statusCode = 400;
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
    readonly statusCode = 400;
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
    readonly statusCode = 401;
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
    readonly statusCode = 403;
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
    readonly statusCode = 404;
    constructor(message: string) {
        super(message);
        this.name = "NotFoundError";
        Object.setPrototypeOf(this, NotFoundError.prototype);
    }
    toJSON() {
        return { error: this.message };
    }
}

