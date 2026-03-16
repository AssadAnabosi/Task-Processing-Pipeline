import type {
    ActionConfigByType,
    PipelineActionType,
} from "@util/pipelines/actionConfig";

export type JsonRecord = Record<string, unknown>;

export type PipelineProcessResult = {
    output_payload: JsonRecord;
    metadata: JsonRecord;
};

export interface ActionProcessor<TActionType extends PipelineActionType> {
    readonly actionType: TActionType;
    execute(
        payload: JsonRecord,
        config: ActionConfigByType[TActionType]
    ): PipelineProcessResult;
}
