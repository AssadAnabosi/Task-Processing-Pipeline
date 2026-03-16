import type { ActionConfigByType } from "@util/pipelines/actionConfig";

import type {
    ActionProcessor,
    JsonRecord,
    PipelineProcessResult,
} from "../types";

export class TransformActionProcessor implements ActionProcessor<"transform"> {
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
