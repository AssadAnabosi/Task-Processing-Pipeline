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
