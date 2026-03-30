import { desc, eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import { db } from "../db/client";
import { incidents } from "../db/schema";

export const dashboardRoute = new Hono().get("/", async (c) => {
  const rows = await db.select().from(incidents).orderBy(desc(incidents.updatedAt));
  const now = Date.now();

  const metrics = {
    total: rows.length,
    open: rows.filter((row) => row.status !== "resolved").length,
    overdue: rows.filter((row) => row.slaTargetAt.getTime() < now && row.status !== "resolved").length,
    sev1: rows.filter((row) => row.severity === "sev1").length,
    resolved: rows.filter((row) => row.status === "resolved").length,
  };

  const owners = await db
    .select({
      owner: incidents.owner,
      count: sql<number>`count(*)`,
    })
    .from(incidents)
    .groupBy(incidents.owner);

  const hot = rows.slice(0, 5).map((row) => ({
    id: row.id,
    title: row.title,
    owner: row.owner,
    status: row.status,
    severity: row.severity,
    msRemaining: row.slaTargetAt.getTime() - now,
  }));

  return c.json({
    metrics,
    owners,
    hot,
  });
});
