import { type Request, type Response } from "express";
import * as queries from "@db/queries/jobs";
import { NotFoundError } from "@util/responseErrors";

export async function getJobs(_req: Request, res: Response) {
    const rows = await queries.getAllJobs();
    res.json({ data: rows });
}

export async function getJobById(req: Request, res: Response) {
    const jobId = req.params.jobId as string;
    const row = await queries.getJobById(jobId);
    if (!row) throw new NotFoundError("Job not found");
    res.json({ data: row });
}
