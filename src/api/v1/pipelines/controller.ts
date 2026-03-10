import { type Request, type Response } from "express";
import * as queries from "@db/queries/pipelines";
import { CREATED, NO_CONTENT } from "@util/constants/statusCodes";
import { NotFoundError } from "@util/responseErrors";
import { type CreatePipelineBody, type UpdatePipelineBody } from "./schemas";

export async function getPipelines(_req: Request, res: Response) {
    const rows = await queries.getAllPipelines();
    res.json({ data: rows });
}

export async function postPipeline(
    req: Request<{}, {}, CreatePipelineBody>,
    res: Response
) {
    const created = await queries.createPipeline(req.body);
    res.status(CREATED).json({ data: created });
}

export async function getPipelineById(req: Request, res: Response) {
    const pipelineId = req.params.pipelineId as string;
    const row = await queries.getPipelineById(pipelineId);
    if (!row) throw new NotFoundError("Pipeline not found");
    res.json({ data: row });
}

export async function updatePipeline(
    req: Request<{ pipelineId: string }, {}, UpdatePipelineBody>,
    res: Response
) {
    const { pipelineId } = req.params;
    const updated = await queries.updatePipelineById(pipelineId, req.body);
    if (!updated) throw new NotFoundError("Pipeline not found");
    res.json({ data: updated });
}

export async function deletePipeline(req: Request, res: Response) {
    const pipelineId = req.params.pipelineId as string;
    await queries.deletePipelineById(pipelineId);
    res.status(NO_CONTENT).send();
}
