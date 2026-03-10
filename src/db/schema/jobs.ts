import {
    pgTable,
    uuid,
    text,
    timestamp,
    jsonb,
    check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { pipelines as pipelinesTable } from "./pipeline";

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
            enum: [
                "pending",
                "processing",
                "processing-failed",
                "delivery-failed",
                "delivered",
            ],
        }).notNull(),
        payload: jsonb("payload").notNull(),
        result: jsonb("result")
            .notNull()
            .default(sql`'{}'::jsonb`),
        completed_at: timestamp("completed_at"),
        created_at: timestamp("created_at").defaultNow(),
        updated_at: timestamp("updated_at").defaultNow(),
    },
    (table) => [
        check(
            "valid_status",
            sql`${table.status} IN ('pending', 'processing', 'processing-failed', 'delivery-failed', 'delivered')`
        ),
    ]
);

export type JobInsert = typeof jobs.$inferInsert;
export type Job = typeof jobs.$inferSelect;
