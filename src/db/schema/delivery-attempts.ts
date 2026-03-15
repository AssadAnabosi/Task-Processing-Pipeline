import {
    pgTable,
    uuid,
    text,
    timestamp,
    integer,
    check,
} from "drizzle-orm/pg-core";
import { jobs as jobsTable } from "./jobs";
import { subscribers as subscribersTable } from "./subscribers";
import { sql } from "drizzle-orm";

const allowedStatuses = ["pending", "delivered", "failed"] as const;

export type DeliveryAttemptStatus = (typeof allowedStatuses)[number];

export const deliveryAttempts = pgTable(
    "delivery_attempts",
    {
        id: uuid("id")
            .default(sql`gen_random_uuid()`)
            .primaryKey(),
        jobId: uuid("job_id")
            .notNull()
            .references(() => jobsTable.id, { onDelete: "cascade" }),
        subscriberId: uuid("subscriber_id")
            .notNull()
            .references(() => subscribersTable.id, { onDelete: "cascade" }),
        attemptNumber: integer("attempt_number").notNull().default(1),
        responseStatus: integer("response_status"),
        responseBody: text("response_body"),
        error: text("error"),
        status: text("status", {
            enum: allowedStatuses,
        })
            .notNull()
            .default("pending"),
        scheduledFor: timestamp("scheduled_for").defaultNow().notNull(),
        deliveredAt: timestamp("delivered_at"),
        created_at: timestamp("created_at").defaultNow(),
        updated_at: timestamp("updated_at").defaultNow(),
    },
    (table) => [
        check(
            "delivery_attempt_status_check",
            sql`${table.status} IN (${sql.raw(
                allowedStatuses.map((s) => `'${s}'`).join(", ")
            )})`
        ),
    ]
);

export type DeliveryAttemptInsert = typeof deliveryAttempts.$inferInsert;
export type DeliveryAttempt = typeof deliveryAttempts.$inferSelect;
