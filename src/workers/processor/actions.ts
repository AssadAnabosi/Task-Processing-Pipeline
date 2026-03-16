import {
    parseActionConfig,
    type ActionConfigByType,
    type PipelineActionType,
} from "@util/pipelines/actionConfig";

type JsonRecord = Record<string, unknown>;

export type PipelineProcessResult = {
    output_payload: JsonRecord;
    metadata: JsonRecord;
};

interface ActionProcessor<TActionType extends PipelineActionType> {
    readonly actionType: TActionType;
    execute(
        payload: JsonRecord,
        config: ActionConfigByType[TActionType]
    ): PipelineProcessResult;
}

class TransformActionProcessor implements ActionProcessor<"transform"> {
    readonly actionType = "transform" as const;

    execute(
        payload: JsonRecord,
        config: ActionConfigByType["transform"]
    ): PipelineProcessResult {
        const transformed: JsonRecord = { ...payload };

        for (const [from, to] of Object.entries(config.field_mappings)) {
            if (Object.hasOwn(transformed, from)) {
                transformed[to] = transformed[from];
                delete transformed[from];
            }
        }

        for (const field of config.remove_fields) {
            delete transformed[field];
        }

        return {
            output_payload: transformed,
            metadata: {
                action_type: this.actionType,
                mapped_fields: Object.keys(config.field_mappings).length,
                removed_fields: config.remove_fields.length,
            },
        };
    }
}

class FilterActionProcessor implements ActionProcessor<"filter"> {
    readonly actionType = "filter" as const;

    execute(
        payload: JsonRecord,
        config: ActionConfigByType["filter"]
    ): PipelineProcessResult {
        const evaluations = config.conditions.map((condition) =>
            this.evaluateCondition(payload[condition.field], condition)
        );
        const passed =
            config.mode === "all"
                ? evaluations.every((result) => result)
                : evaluations.some((result) => result);

        return {
            output_payload: payload,
            metadata: {
                action_type: this.actionType,
                mode: config.mode,
                conditions_count: config.conditions.length,
                passed,
            },
        };
    }

    private evaluateCondition(
        currentValue: unknown,
        condition: ActionConfigByType["filter"]["conditions"][number]
    ): boolean {
        switch (condition.operator) {
            case "eq":
                return currentValue === condition.value;
            case "neq":
                return currentValue !== condition.value;
            case "gt":
                return Number(currentValue) > Number(condition.value);
            case "gte":
                return Number(currentValue) >= Number(condition.value);
            case "lt":
                return Number(currentValue) < Number(condition.value);
            case "lte":
                return Number(currentValue) <= Number(condition.value);
            case "contains": {
                if (Array.isArray(currentValue)) {
                    return currentValue.includes(condition.value);
                }

                if (typeof currentValue === "string") {
                    return currentValue.includes(String(condition.value));
                }

                return false;
            }
            case "in": {
                if (!Array.isArray(condition.value)) return false;
                return condition.value.includes(currentValue);
            }
            default:
                return false;
        }
    }
}

class EnrichActionProcessor implements ActionProcessor<"enrich"> {
    readonly actionType = "enrich" as const;

    execute(
        payload: JsonRecord,
        config: ActionConfigByType["enrich"]
    ): PipelineProcessResult {
        const enriched: JsonRecord = { ...payload };

        for (const [key, value] of Object.entries(config.fields)) {
            if (!config.overwrite_existing && Object.hasOwn(enriched, key)) {
                continue;
            }
            enriched[key] = value;
        }

        return {
            output_payload: enriched,
            metadata: {
                action_type: this.actionType,
                fields_added: Object.keys(config.fields).length,
                overwrite_existing: config.overwrite_existing,
            },
        };
    }
}

const processorMap: {
    [K in PipelineActionType]: ActionProcessor<K>;
} = {
    transform: new TransformActionProcessor(),
    filter: new FilterActionProcessor(),
    enrich: new EnrichActionProcessor(),
};

function normalizePayload(payload: unknown): JsonRecord {
    if (payload && typeof payload === "object" && !Array.isArray(payload)) {
        return { ...(payload as JsonRecord) };
    }

    return { value: payload };
}

export function executePipelineAction<TActionType extends PipelineActionType>(
    actionType: TActionType,
    actionConfig: unknown,
    payload: unknown
): PipelineProcessResult {
    const processor = processorMap[actionType];
    const config = parseActionConfig(actionType, actionConfig);
    const normalizedPayload = normalizePayload(payload);

    return processor.execute(normalizedPayload, config);
}
