import db from "@db/index";
import { jobs, type JobInsert } from "@db/schema";
import { eq, asc, desc } from "drizzle-orm";

export async function getAllJobsByPipelineId(
    pipelineId: string,
    sort: "asc" | "desc" = "desc"
) {
    return await db
        .select()
        .from(jobs)
        .where(eq(jobs.pipeline_id, pipelineId))
        .orderBy(sort === "asc" ? asc(jobs.updated_at) : desc(jobs.updated_at));
}

export async function getJobById(id: string) {
    const rows = await db.select().from(jobs).where(eq(jobs.id, id)).limit(1);
    return rows[0] ?? null;
}

export function createJob(
    data: Omit<JobInsert, "id" | "created_at" | "updated_at" | "status">
) {
    return db
        .insert(jobs)
        .values({
            ...data,
            status: "pending",
        })
        .returning();
}
