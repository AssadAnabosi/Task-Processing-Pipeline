import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { pipelines as pipelinesTable } from "./pipeline";

export const subscribers = pgTable("subscribers", {
    id: uuid("id")
        .default(sql`gen_random_uuid()`)
        .primaryKey(),
    pipeline_id: uuid("pipeline_id")
        .notNull()
        .references(() => pipelinesTable.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    created_at: timestamp("created_at").defaultNow(),
    updated_at: timestamp("updated_at").defaultNow(),
});

export type SubscriberInsert = typeof subscribers.$inferInsert;
export type Subscriber = typeof subscribers.$inferSelect;
