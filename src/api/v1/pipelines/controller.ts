import { type Request, type Response } from "express";
import * as queries from "@db/queries/pipelines";
import { CREATED, NO_CONTENT } from "@util/constants/statusCodes";
import { ConflictError, NotFoundError } from "@util/responseErrors";
import { type CreatePipelineBody, type UpdatePipelineBody } from "./schemas";

type PostgresConstraintError = {
    code?: string;
    // postgres drivers and wrappers use different names for the constraint field
    constraint_name?: string;
    constraint?: string;
    constraintName?: string;
};

function rethrowSourcePathConflict(error: unknown): never {
    // unwrap common wrappers (Drizzle wraps the original error)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const e = (error as any)?.cause ?? (error as any)?.originalError ?? error;
    const postgresError = e as PostgresConstraintError;

    const code = postgresError.code;
    const constraint =
        postgresError.constraint_name ??
        postgresError.constraint ??
        postgresError.constraintName;

    // 23505 is the code for unique violation in Postgres
    if (code === "23505" && constraint === "pipelines_source_path_unique") {
        throw new ConflictError("source_path is already taken");
    }

    throw error;
}

export async function getPipelines(req: Request, res: Response) {
    const sort = (req.query.sort as string) === "desc" ? "desc" : "asc";
    const rows = await queries.getAllPipelines(sort);
    res.json({ data: rows });
}

export async function postPipeline(
    req: Request<Record<string, never>, unknown, CreatePipelineBody>,
    res: Response
) {
    let created;

    // Validate pipeline chain if next_pipeline_id is provided
    if (req.body.next_pipeline_id) {
        const hasCycle = await queries.hasPipelineCycle(
            req.body.next_pipeline_id
        );
        if (hasCycle) {
            throw new ConflictError(
                "Pipeline chain contains a cycle. Please remove the cycle before proceeding."
            );
        }
    }

    try {
        created = await queries.createPipeline(req.body);
    } catch (error) {
        rethrowSourcePathConflict(error);
    }

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
    let updated;

    // Validate pipeline chain if next_pipeline_id is provided in update
    if (req.body.next_pipeline_id) {
        // Cannot update to point to itself
        if (req.body.next_pipeline_id === pipelineId) {
            throw new ConflictError("A pipeline cannot point to itself");
        }
        const hasCycle = await queries.hasPipelineCycle(
            req.body.next_pipeline_id
        );
        if (hasCycle) {
            throw new ConflictError(
                "Pipeline chain contains a cycle. Please remove the cycle before proceeding."
            );
        }
    }

    try {
        updated = await queries.updatePipelineById(pipelineId, req.body);
    } catch (error) {
        rethrowSourcePathConflict(error);
    }

    if (!updated) throw new NotFoundError("Pipeline not found");
    res.json({ data: updated });
}

export async function deletePipeline(req: Request, res: Response) {
    const pipelineId = req.params.pipelineId as string;
    await queries.deletePipelineById(pipelineId);
    res.status(NO_CONTENT).send();
}
