import { pgTable, uuid, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const pipelines = pgTable("pipelines", {
    id: uuid("id")
        .default(sql`gen_random_uuid()`)
        .primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    source_path: text("source_path").notNull(),
    secret: text("secret"),
    action_type: text("action_type").notNull(),
    action_config: jsonb("action_config")
        .notNull()
        .default(sql`'{}'::jsonb`),
    created_at: timestamp("created_at").defaultNow(),
    updated_at: timestamp("updated_at").defaultNow(),
});
