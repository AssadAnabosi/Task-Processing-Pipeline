import { type Request, type Response } from "express";
import * as queries from "@db/queries/pipelines.js";
import { CREATED, NO_CONTENT } from "@util/constants/statusCodes";
import { BadRequestError, NotFoundError } from "@util/responseErrors";

export async function getPipelines(_req: Request, res: Response) {
    const rows = await queries.getAllPipelines();
    res.json({ data: rows });
}

export async function postPipeline(req: Request, res: Response) {
    const {
        name,
        description,
        source_path,
        secret,
        action_type,
        action_config,
    } = req.body;
    if (!name || !source_path || !action_type) {
        throw new BadRequestError(
            "name, source_path and action_type are required"
        );
    }

    const created = await queries.createPipeline({
        name,
        description,
        source_path,
        secret,
        action_type,
        action_config,
    });

    res.status(CREATED).json({ data: created });
}

export async function getPipelineById(req: Request, res: Response) {
    const id = req.params.id as string;
    const row = await queries.getPipelineById(id);
    if (!row) throw new NotFoundError("Pipeline not found");
    res.json({ data: row });
}

export async function updatePipeline(req: Request, res: Response) {
    const id = req.params.id as string;
    const updates = req.body;
    const updated = await queries.updatePipelineById(id, updates);
    if (!updated) throw new NotFoundError("Pipeline not found");
    res.json({ data: updated });
}

export async function deletePipeline(req: Request, res: Response) {
    const id = req.params.id as string;
    await queries.deletePipelineById(id);
    res.status(NO_CONTENT).send();
}
