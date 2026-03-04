import db from "@db/index";
import { pipelines } from "@db/schema";
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

export async function createPipeline(data: {
    name: string;
    description?: string | null;
    source_path: string;
    secret?: string | null;
    action_type: string;
    action_config?: unknown;
}) {
    const [row] = await db
        .insert(pipelines)
        .values({
            name: data.name,
            description: data.description ?? null,
            source_path: data.source_path,
            secret: data.secret ?? null,
            action_type: data.action_type,
            action_config: data.action_config ?? {},
        })
        .returning();

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

export async function updatePipelineById(
    id: string,
    updates: Partial<Record<string, unknown>>
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
