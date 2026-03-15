import db from "@db/index";
import { deliveryAttempts } from "@db/schema";
import { eq, asc, desc } from "drizzle-orm";

export async function getAttemptsForJob(
    jobId: string,
    sort: "asc" | "desc" = "desc"
) {
    return await db
        .select()
        .from(deliveryAttempts)
        .where(eq(deliveryAttempts.jobId, jobId))
        .orderBy(
            sort === "asc"
                ? asc(deliveryAttempts.attemptNumber)
                : desc(deliveryAttempts.attemptNumber)
        );
}

export async function getAttemptById(attemptId: string) {
    const rows = await db
        .select()
        .from(deliveryAttempts)
        .where(eq(deliveryAttempts.id, attemptId))
        .limit(1);

    return rows[0] ?? null;
}
