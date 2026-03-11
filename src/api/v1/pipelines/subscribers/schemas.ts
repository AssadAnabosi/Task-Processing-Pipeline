import { createInsertSchema } from "drizzle-zod";
import { subscribers } from "@db/schema";
import { z } from "zod";

export const createSubscriberSchema = createInsertSchema(subscribers).omit({
    id: true,
    created_at: true,
    updated_at: true,
    pipeline_id: true,
});

export const updateSubscriberSchema = createSubscriberSchema;

export type CreateSubscriberBody = z.infer<typeof createSubscriberSchema>;
export type UpdateSubscriberBody = z.infer<typeof updateSubscriberSchema>;
