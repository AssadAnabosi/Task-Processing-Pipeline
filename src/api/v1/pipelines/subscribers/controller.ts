import { type Request, type Response } from "express";
import * as queries from "@db/queries/subscribers";
import { CREATED, NO_CONTENT } from "@util/constants/statusCodes";
import { NotFoundError } from "@util/responseErrors";
import {
    type CreateSubscriberBody,
    type UpdateSubscriberBody,
} from "./schemas";

export async function getSubscribers(
    req: Request<{ pipelineId: string }, unknown, unknown>,
    res: Response
) {
    const pipelineId = req.params.pipelineId as string;
    const rows = await queries.getSubscribersByPipelineId(pipelineId);
    res.json({ data: rows });
}

export async function postSubscriber(
    req: Request<{ pipelineId: string }, unknown, CreateSubscriberBody>,
    res: Response
) {
    const pipelineId = req.params.pipelineId as string;
    const created = await queries.createSubscriber({
        pipeline_id: pipelineId,
        ...req.body,
    });
    res.status(CREATED).json({ data: created });
}

export async function getSubscriberById(
    req: Request<{ subscriberId: string }, unknown, unknown>,
    res: Response
) {
    const subscriberId = req.params.subscriberId as string;
    const row = await queries.getSubscriberById(subscriberId);
    if (!row) {
        throw new NotFoundError("Subscriber not found");
    }
    res.json({ data: row });
}

export async function updateSubscriber(
    req: Request<{ subscriberId: string }, unknown, UpdateSubscriberBody>,
    res: Response
) {
    const subscriberId = req.params.subscriberId as string;
    const updated = await queries.updateSubscriber(subscriberId, req.body);
    res.json({ data: updated });
}

export async function deleteSubscriber(
    req: Request<{ subscriberId: string }, unknown, unknown>,
    res: Response
) {
    const subscriberId = req.params.subscriberId as string;
    await queries.deleteSubscriber(subscriberId);
    res.status(NO_CONTENT).end();
}
