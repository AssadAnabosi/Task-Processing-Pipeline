import db from "@db/index";
import { subscribers, type SubscriberInsert } from "@db/schema";
import { eq, asc, desc } from "drizzle-orm";

export async function getSubscribersByPipelineId(
    pipelineId: string,
    sort: "asc" | "desc" = "asc"
) {
    return await db
        .select()
        .from(subscribers)
        .where(eq(subscribers.pipeline_id, pipelineId))
        .orderBy(
            sort === "asc"
                ? asc(subscribers.updated_at)
                : desc(subscribers.updated_at)
        );
}

export async function createSubscriber(
    data: Omit<SubscriberInsert, "id" | "created_at" | "updated_at">
) {
    const [row] = await db.insert(subscribers).values(data).returning();

    return row;
}

export async function getSubscriberById(id: string) {
    const rows = await db
        .select()
        .from(subscribers)
        .where(eq(subscribers.id, id))
        .limit(1);
    return rows[0] ?? null;
}

export async function updateSubscriber(
    id: string,
    updates: Partial<Omit<SubscriberInsert, "id" | "created_at" | "updated_at">>
) {
    const [row] = await db
        .update(subscribers)
        .set(updates)
        .where(eq(subscribers.id, id))
        .returning();
    return row ?? null;
}

export async function deleteSubscriber(id: string) {
    await db.delete(subscribers).where(eq(subscribers.id, id));
    return true;
}
