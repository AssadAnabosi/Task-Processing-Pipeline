import { type Request, type Response } from "express";
import * as queries from "@db/queries/pipelines.js";
import { CREATED, NO_CONTENT } from "@util/constants/statusCodes";
import { NotFoundError } from "@util/responseErrors";
import { type CreatePipelineBody, type UpdatePipelineBody } from "./schemas";

export async function getPipelines(_req: Request, res: Response) {
    const rows = await queries.getAllPipelines();
    res.json({ data: rows });
}

export async function postPipeline(req: Request<{}, {}, CreatePipelineBody>, res: Response) {
    const created = await queries.createPipeline(req.body);
    res.status(CREATED).json({ data: created });
}

export async function getPipelineById(req: Request, res: Response) {
    const id = req.params.id as string;
    const row = await queries.getPipelineById(id);
    if (!row) throw new NotFoundError("Pipeline not found");
    res.json({ data: row });
}

export async function updatePipeline(req: Request<{ id: string }, {}, UpdatePipelineBody>, res: Response) {
    const { id } = req.params;
    const updated = await queries.updatePipelineById(id, req.body);
    if (!updated) throw new NotFoundError("Pipeline not found");
    res.json({ data: updated });
}

export async function deletePipeline(req: Request, res: Response) {
    const id = req.params.id as string;
    await queries.deletePipelineById(id);
    res.status(NO_CONTENT).send();
}
