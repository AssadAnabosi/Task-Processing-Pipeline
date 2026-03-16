import type { Request, Response } from "express";
import db from "@db/index";
import { sql } from "drizzle-orm";

export async function getMetrics(_req: Request, res: Response) {
    const rows = await db.execute(sql`
		SELECT
			jsonb_agg(row_to_json(t) ORDER BY t.count DESC) AS grouped_counts,
			COALESCE(SUM(CASE WHEN t.status = 'completed' THEN t.mismatch ELSE 0 END), 0) AS mismatched_completed,
			COALESCE(SUM(CASE WHEN t.status = 'delivery-failed' THEN t.mismatch ELSE 0 END), 0) AS mismatched_delivery_failed
		FROM (
			SELECT
				status,
				COUNT(*) AS count,
				SUM(CASE WHEN (total_deliveries IS DISTINCT FROM subscriber_count) THEN 1 ELSE 0 END) AS mismatch
			FROM jobs
			GROUP BY status
		) t
	`);

    const row = rows[0] ?? {
        grouped_counts: null,
        mismatched_completed: 0,
        mismatched_delivery_failed: 0,
    };

    const groupedCounts = row.grouped_counts ?? [];
    const mismatchedDeliveryCounts = {
        completed: Number(row.mismatched_completed) || 0,
        "delivery-failed": Number(row.mismatched_delivery_failed) || 0,
    };

    res.json({ data: { groupedCounts, mismatchedDeliveryCounts } });
}
