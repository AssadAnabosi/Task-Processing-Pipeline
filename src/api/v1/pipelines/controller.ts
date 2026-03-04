import { type Request, type Response } from "express";

export function getPipelines(req: Request, res: Response) {
    res.json({ message: "Retrieved pipelines data" });
}

export function postPipeline(req: Request, res: Response) {
    res.json({ message: "Pipeline created", data: req.body });
}

export function getPipelineById(req: Request, res: Response) {
    const { id } = req.params;
    res.json({ message: `Retrieved pipeline with ID: ${id}` });
}

export function updatePipeline(req: Request, res: Response) {
    const { id } = req.params;
    res.json({ message: `Updated pipeline with ID: ${id}`, data: req.body });
}

export function deletePipeline(req: Request, res: Response) {
    const { id } = req.params;
    res.json({ message: `Deleted pipeline with ID: ${id}` });
}