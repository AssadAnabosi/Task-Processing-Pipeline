import {
    pgTable,
    uuid,
    text,
    timestamp,
    jsonb,
    integer,
    check,
    index,
    boolean,
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

export type JobStatus = (typeof allowedStatuses)[number];

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
        subscriber_count: integer("subscriber_count"),
        processed: boolean("processed").notNull().default(false),
        total_deliveries: integer("total_deliveries").notNull().default(0),
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
        // Partial indexes for high-frequency status-based lookups
        index("idx_jobs_pending")
            .on(table.created_at)
            .where(sql`${table.status} = 'pending'`),
        index("idx_jobs_processed")
            .on(table.updated_at)
            .where(sql`${table.status} = 'processed'`),
        index("idx_jobs_processing_failed")
            .on(table.updated_at)
            .where(sql`${table.status} = 'processing-failed'`),
    ]
);

export type JobInsert = typeof jobs.$inferInsert;
export type Job = typeof jobs.$inferSelect;
