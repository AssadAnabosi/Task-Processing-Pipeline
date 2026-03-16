import { createInsertSchema } from "drizzle-zod";
import { pipelines } from "@db/schema";
import { z } from "zod";
import {
    enrichActionConfigSchema,
    filterActionConfigSchema,
    parseActionConfig,
    transformActionConfigSchema,
    type PipelineActionType,
} from "@root/util/pipelines/actionConfig";

// Derived directly from the Drizzle table — no duplication.
// Strips server-managed fields (id, created_at, updated_at).
const baseCreatePipelineSchema = createInsertSchema(pipelines).omit({
    id: true,
    created_at: true,
    updated_at: true,
});

const commonCreatePipelineSchema = baseCreatePipelineSchema.omit({
    action_type: true,
    action_config: true,
});

const actionSpecificCreatePipelineSchema = z.discriminatedUnion("action_type", [
    z.object({
        action_type: z.literal("transform"),
        action_config: transformActionConfigSchema,
    }),
    z.object({
        action_type: z.literal("filter"),
        action_config: filterActionConfigSchema,
    }),
    z.object({
        action_type: z.literal("enrich"),
        action_config: enrichActionConfigSchema,
    }),
]);

export const createPipelineSchema = commonCreatePipelineSchema.and(
    actionSpecificCreatePipelineSchema
);

// For PATCH/PUT — every field becomes optional.
// If action config is updated, require action_type to ensure deterministic validation.
export const updatePipelineSchema = baseCreatePipelineSchema
    .partial()
    .superRefine((value, ctx) => {
        if (
            value.action_type === undefined &&
            value.action_config === undefined
        ) {
            return;
        }

        if (
            value.action_type === undefined ||
            value.action_config === undefined
        ) {
            ctx.addIssue({
                code: "custom",
                path: ["action_config"],
                message:
                    "action_type and action_config must be provided together",
            });
            return;
        }

        const actionTypeResult = z
            .enum(["transform", "filter", "enrich"])
            .safeParse(value.action_type);

        if (!actionTypeResult.success) {
            ctx.addIssue({
                code: "custom",
                path: ["action_type"],
                message: "Unsupported action_type",
            });
            return;
        }

        try {
            parseActionConfig(
                actionTypeResult.data as PipelineActionType,
                value.action_config
            );
        } catch (error) {
            if (error instanceof z.ZodError) {
                for (const issue of error.issues) {
                    ctx.addIssue({
                        ...issue,
                        path: ["action_config", ...issue.path],
                    });
                }
                return;
            }

            ctx.addIssue({
                code: "custom",
                path: ["action_config"],
                message: "Invalid action_config",
            });
        }
    });

export type CreatePipelineBody = z.infer<typeof createPipelineSchema>;
export type UpdatePipelineBody = z.infer<typeof updatePipelineSchema>;
