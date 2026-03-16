import db from "@db/index";
import { eq } from "drizzle-orm";
import type { AnyPgTable } from "drizzle-orm/pg-core";
import { getTableColumns } from "drizzle-orm";

import { BadRequestError, NotFoundError } from "@util/responseErrors";
import { type Request, type Response, type NextFunction } from "express";

export default function validateRowExistence(
    table: AnyPgTable,
    key: string,
    idField = "id",
    localsKey = "validatedRow"
) {
    return async (req: Request, res: Response, next: NextFunction) => {
        const lookupValue = req.params[key];
        if (!lookupValue) {
            throw new BadRequestError(`Missing route param '${key}'`);
        }

        const columns = getTableColumns(table);
        const column = columns[idField]!;

        const [row] = await db
            .select()
            .from(table)
            .where(eq(column, lookupValue))
            .limit(1);

        if (!row) {
            throw new NotFoundError(
                `Row with ${idField} '${lookupValue}' does not exist`
            );
        }

        res.locals[localsKey] = row;
        next();
    };
}
