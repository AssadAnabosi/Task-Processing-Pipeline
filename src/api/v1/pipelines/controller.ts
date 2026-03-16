import { type Request, type Response } from "express";
import * as queries from "@db/queries/pipelines";
import { CREATED, NO_CONTENT } from "@util/constants/statusCodes";
import { NotFoundError } from "@util/responseErrors";
import { type CreatePipelineBody, type UpdatePipelineBody } from "./schemas";

export async function getPipelines(req: Request, res: Response) {
    const sort = (req.query.sort as string) === "desc" ? "desc" : "asc";
    const rows = await queries.getAllPipelines(sort);
    res.json({ data: rows });
}

export async function postPipeline(
    req: Request<Record<string, never>, unknown, CreatePipelineBody>,
    res: Response
) {
    const created = await queries.createPipeline(req.body);
    res.status(CREATED).json({ data: created });
}

export async function getPipelineById(_req: Request, res: Response) {
    res.json({ data: res.locals.pipeline });
}

export async function updatePipeline(
    req: Request<{ pipelineId: string }, unknown, UpdatePipelineBody>,
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
