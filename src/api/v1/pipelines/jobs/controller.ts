import { type Request, type Response } from "express";
import * as queries from "@db/queries/jobs";
import { NotFoundError } from "@util/responseErrors";

export async function getJobs(req: Request, res: Response) {
    const sort = (req.query.sort as string) === "asc" ? "asc" : "desc";
    const rows = await queries.getAllJobs(sort);
    res.json({ data: rows });
}

export async function getJobById(req: Request, res: Response) {
    const jobId = req.params.jobId as string;
    const row = await queries.getJobById(jobId);
    if (!row) throw new NotFoundError("Job not found");
    res.json({ data: row });
}
