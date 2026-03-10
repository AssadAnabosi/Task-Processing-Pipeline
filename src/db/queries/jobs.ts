import db from "@db/index";
import { jobs } from "@db/schema";
import { eq, asc, desc } from "drizzle-orm";

export async function getAllJobs(sort: "asc" | "desc" = "asc") {
    return await db
        .select()
        .from(jobs)
        .orderBy(sort === "asc" ? asc(jobs.updated_at) : desc(jobs.updated_at));
}

export async function getJobById(id: string) {
    const rows = await db.select().from(jobs).where(eq(jobs.id, id)).limit(1);
    return rows[0] ?? null;
}
