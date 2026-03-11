import {
    pgTable,
    uuid,
    text,
    timestamp,
    jsonb,
    integer,
    check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { pipelines as pipelinesTable } from "./pipeline";

const allowedStatuses = [
    "pending",
    "processing",
    "processing-failed",
    "processed",
    "delivery-failed",
    "completed",
] as const;

export type AllowedStatus = (typeof allowedStatuses)[number];

export const jobs = pgTable(
    "jobs",
    {
        id: uuid("id")
            .default(sql`gen_random_uuid()`)
            .primaryKey(),
        pipeline_id: uuid("pipeline_id")
            .notNull()
            .references(() => pipelinesTable.id, { onDelete: "cascade" }),
        status: text("status", {
            enum: allowedStatuses,
        }).notNull(),
        payload: jsonb("payload").notNull(),
        result: jsonb("result")
            .notNull()
            .default(sql`'{}'::jsonb`),
        retry_count: integer("retry_count").notNull().default(0),
        completed_at: timestamp("completed_at"),
        created_at: timestamp("created_at").defaultNow(),
        updated_at: timestamp("updated_at").defaultNow(),
    },
    (table) => [
        check(
            "valid_status",
            sql`${table.status} IN (${sql.raw(
                allowedStatuses.map((s) => `'${s}'`).join(", ")
            )})`
        ),
    ]
);

export type JobInsert = typeof jobs.$inferInsert;
export type Job = typeof jobs.$inferSelect;
