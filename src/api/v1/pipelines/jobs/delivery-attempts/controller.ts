import { type Request, type Response } from "express";
import * as queries from "@db/queries/delivery-attempts";

export async function getAttemptsForJob(req: Request, res: Response) {
    const jobId = req.params.jobId as string;
    const sort = (req.query.sort as string) === "asc" ? "asc" : "desc";
    const rows = await queries.getAttemptsForJob(jobId, sort);
    res.json({ data: rows });
}

export async function getAttemptById(_req: Request, res: Response) {
    res.json({ data: res.locals.deliveryAttempt });
}
