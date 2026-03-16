import type { ActionConfigByType } from "@util/pipelines/actionConfig";

import type {
    ActionProcessor,
    JsonRecord,
    PipelineProcessResult,
} from "../types";

export class FilterActionProcessor implements ActionProcessor<"filter"> {
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
