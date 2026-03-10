// Handle Relations here to avoid circular dependencies between schema files.

import { relations } from "drizzle-orm";
import { pipelines } from "./pipeline";
import { jobs } from "./jobs";

export const pipelinesRelations = relations(pipelines, ({ many }) => ({
    jobs: many(jobs),
}));


export const jobsRelations = relations(jobs, ({ one }) => ({
    pipeline: one(pipelines, {
        fields: [jobs.pipeline_id],
        references: [pipelines.id],
    }),
}));