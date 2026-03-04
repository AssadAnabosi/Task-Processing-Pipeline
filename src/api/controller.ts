import { type Request, type Response } from "express";

export function healthCheck(_req: Request, res: Response) {
    res.sendStatus(200);
}
