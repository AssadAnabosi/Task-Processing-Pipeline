import { createInsertSchema } from "drizzle-zod";
import { pipelines } from "@db/schema";
import { z } from "zod";

// Derived directly from the Drizzle table — no duplication.
// Strips server-managed fields (id, created_at, updated_at) and
// narrows action_type to the same values as the DB check constraint.
export const createPipelineSchema = createInsertSchema(pipelines).omit({
    id: true,
    created_at: true,
    updated_at: true,
});

// For PATCH/PUT — every field becomes optional.
export const updatePipelineSchema = createPipelineSchema.partial();

export type CreatePipelineBody = z.infer<typeof createPipelineSchema>;
export type UpdatePipelineBody = z.infer<typeof updatePipelineSchema>;
