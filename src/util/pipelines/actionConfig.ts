import { z } from "zod";

export const transformActionConfigSchema = z.object({
    field_mappings: z.record(z.string(), z.string()).default({}),
    remove_fields: z.array(z.string()).default([]),
});

const filterConditionSchema = z.object({
    field: z.string().min(1),
    operator: z.enum(["eq", "neq", "gt", "gte", "lt", "lte", "contains", "in"]),
    value: z.unknown(),
});

export const filterActionConfigSchema = z.object({
    mode: z.enum(["all", "any"]).default("all"),
    conditions: z.array(filterConditionSchema).min(1),
});

export const enrichActionConfigSchema = z.object({
    fields: z.record(z.string(), z.unknown()).default({}),
    overwrite_existing: z.boolean().default(true),
});

export type TransformActionConfig = z.infer<typeof transformActionConfigSchema>;
export type FilterActionConfig = z.infer<typeof filterActionConfigSchema>;
export type EnrichActionConfig = z.infer<typeof enrichActionConfigSchema>;

export type ActionConfigByType = {
    transform: TransformActionConfig;
    filter: FilterActionConfig;
    enrich: EnrichActionConfig;
};

export type PipelineActionType = keyof ActionConfigByType;

type ActionConfigSchemaByType = {
    [K in PipelineActionType]: z.ZodType<ActionConfigByType[K]>;
};

export const actionConfigSchemaByType: ActionConfigSchemaByType = {
    transform: transformActionConfigSchema,
    filter: filterActionConfigSchema,
    enrich: enrichActionConfigSchema,
};

export function parseActionConfig<T extends PipelineActionType>(
    actionType: T,
    actionConfig: unknown
): ActionConfigByType[T] {
    return actionConfigSchemaByType[actionType].parse(actionConfig);
}
