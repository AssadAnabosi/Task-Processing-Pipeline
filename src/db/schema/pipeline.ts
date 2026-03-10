import {
    pgTable,
    uuid,
    text,
    timestamp,
    jsonb,
    check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const pipelines = pgTable(
    "pipelines",
    {
        id: uuid("id")
            .default(sql`gen_random_uuid()`)
            .primaryKey(),
        name: text("name").notNull(),
        source_path: text("source_path").notNull().unique(),
        secret: text("secret").notNull(),
        action_type: text("action_type", {
            enum: ["transform", "filter", "enrich"],
        }).notNull(),
        action_config: jsonb("action_config")
            .notNull()
            .default(sql`'{}'::jsonb`),
        description: text("description"),
        created_at: timestamp("created_at").defaultNow(),
        updated_at: timestamp("updated_at").defaultNow(),
    },
    (table) => [
        check(
            "valid_action_type",
            sql`${table.action_type} IN ('transform', 'filter', 'enrich')`
        ),
    ]
);

export type PipelineInsert = typeof pipelines.$inferInsert;
export type Pipeline = typeof pipelines.$inferSelect;
