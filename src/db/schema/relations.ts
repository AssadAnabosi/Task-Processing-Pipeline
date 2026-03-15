// Handle Relations here to avoid circular dependencies between schema files.

import { relations } from "drizzle-orm";
import { pipelines } from "./pipeline";
import { jobs } from "./jobs";
import { subscribers } from "./subscribers";
import { deliveryAttempts } from "./delivery-attempts";

export const pipelinesRelations = relations(pipelines, ({ many }) => ({
    jobs: many(jobs),
    subscribers: many(subscribers),
}));

export const jobsRelations = relations(jobs, ({ one, many }) => ({
    pipeline: one(pipelines, {
        fields: [jobs.pipeline_id],
        references: [pipelines.id],
    }),
    deliveryAttempts: many(deliveryAttempts),
}));

export const subscribersRelations = relations(subscribers, ({ one }) => ({
    pipeline: one(pipelines, {
        fields: [subscribers.pipeline_id],
        references: [pipelines.id],
    }),
}));

export const deliveryAttemptsRelations = relations(
    deliveryAttempts,
    ({ one }) => ({
        job: one(jobs, {
            fields: [deliveryAttempts.jobId],
            references: [jobs.id],
        }),
        subscriber: one(subscribers, {
            fields: [deliveryAttempts.subscriberId],
            references: [subscribers.id],
        }),
    })
);
