import type { ActionConfigByType } from "@util/pipelines/actionConfig";

import type {
    ActionProcessor,
    JsonRecord,
    PipelineProcessResult,
} from "../types";

export class EnrichActionProcessor implements ActionProcessor<"enrich"> {
    readonly actionType = "enrich" as const;

    execute(
        payload: JsonRecord,
        config: ActionConfigByType["enrich"]
    ): PipelineProcessResult {
        const enriched: JsonRecord = { ...payload };

        for (const [key, value] of Object.entries(config.fields ?? {})) {
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
