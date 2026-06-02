import db from "@db/index";
import { pipelines, type PipelineInsert } from "@db/schema";
import { eq, asc, desc } from "drizzle-orm";

export async function getAllPipelines(sort: "asc" | "desc" = "asc") {
    return await db
        .select()
        .from(pipelines)
        .orderBy(
            sort === "asc"
                ? asc(pipelines.updated_at)
                : desc(pipelines.updated_at)
        );
}

export async function createPipeline(
    data: Omit<PipelineInsert, "id" | "created_at" | "updated_at">
) {
    const [row] = await db.insert(pipelines).values(data).returning();

    return row;
}

export async function getPipelineById(id: string) {
    const rows = await db
        .select()
        .from(pipelines)
        .where(eq(pipelines.id, id))
        .limit(1);
    return rows[0] ?? null;
}

export async function getPipelineBySourcePath(sourcePath: string) {
    const rows = await db
        .select()
        .from(pipelines)
        .where(eq(pipelines.source_path, sourcePath))
        .limit(1);
    return rows[0] ?? null;
}

export async function updatePipelineById(
    id: string,
    updates: Partial<Omit<PipelineInsert, "id" | "created_at" | "updated_at">>
) {
    const [row] = await db
        .update(pipelines)
        .set(updates)
        .where(eq(pipelines.id, id))
        .returning();
    return row ?? null;
}

export async function deletePipelineById(id: string) {
    await db.delete(pipelines).where(eq(pipelines.id, id));
    return true;
}

/**
 * Check if following a pipeline chain from startId leads to a cycle.
 * Returns true if a cycle is detected, false if the chain terminates safely.
 * @param startId - The pipeline ID to start checking from
 * @param maxDepth - Maximum chain depth to prevent runaway checks (default: 100)
 */
export async function hasPipelineCycle(
    startId: string,
    maxDepth: number = 100
): Promise<boolean> {
    const visited = new Set<string>();
    let currentId: string | null = startId;
    let depth = 0;

    while (currentId && depth < maxDepth) {
        if (visited.has(currentId)) {
            // Cycle detected
            return true;
        }

        visited.add(currentId);
        const pipeline = await getPipelineById(currentId);

        if (!pipeline?.next_pipeline_id) {
            // Chain terminates - no cycle
            return false;
        }

        currentId = pipeline.next_pipeline_id;
        depth++;
    }

    // If we hit maxDepth, treat as a potential issue (very long chain)
    return depth >= maxDepth;
}
