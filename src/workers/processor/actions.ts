import {
    parseActionConfig,
    type PipelineActionType,
} from "@util/pipelines/actionConfig";

import { EnrichActionProcessor } from "./actions/enrich";
import { FilterActionProcessor } from "./actions/filter";
import { TransformActionProcessor } from "./actions/transform";
import type {
    ActionProcessor,
    JsonRecord,
    PipelineProcessResult,
} from "./actions/types";

export type { PipelineProcessResult } from "./actions/types";

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
