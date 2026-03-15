import { type Request, type Response } from "express";
import * as queries from "@db/queries/delivery-attempts";
import { NotFoundError } from "@util/responseErrors";

export async function getAttemptsForJob(req: Request, res: Response) {
    const jobId = req.params.jobId as string;
    const sort = (req.query.sort as string) === "asc" ? "asc" : "desc";
    const rows = await queries.getAttemptsForJob(jobId, sort);
    res.json({ data: rows });
}

export async function getAttemptById(req: Request, res: Response) {
    const attemptId = req.params.attemptId as string;
    const row = await queries.getAttemptById(attemptId);
    if (!row) throw new NotFoundError("Attempt not found");
    res.json({ data: row });
}
