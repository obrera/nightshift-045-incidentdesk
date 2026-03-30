import { count, eq } from "drizzle-orm";
import { db, sqlite } from "./client";
import { incidents, incidentTags, incidentTimeline } from "./schema";

const createSql = `
CREATE TABLE IF NOT EXISTS incidents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  service TEXT NOT NULL,
  severity TEXT NOT NULL,
  status TEXT NOT NULL,
  owner TEXT NOT NULL,
  summary TEXT NOT NULL,
  impact TEXT NOT NULL,
  started_at INTEGER NOT NULL,
  sla_target_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
CREATE TABLE IF NOT EXISTS incident_tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  incident_id INTEGER NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  tag TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS incident_timeline (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  incident_id INTEGER NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  body TEXT NOT NULL,
  actor TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
`;

export async function initializeDatabase() {
  sqlite.exec(createSql);

  const existing = await db.select({ value: count() }).from(incidents);
  if (existing[0]?.value) {
    return;
  }

  const now = Date.now();
  const seeded = await db
    .insert(incidents)
    .values([
      {
        title: "API timeout spike in payments",
        service: "payments-api",
        severity: "sev1",
        status: "investigating",
        owner: "On-call SRE",
        summary: "Checkout errors exceed threshold in us-east.",
        impact: "Checkout completion rate is down 38% for card transactions.",
        startedAt: new Date(now - 42 * 60_000),
        slaTargetAt: new Date(now + 18 * 60_000),
      },
      {
        title: "Delayed alert fan-out for scheduled jobs",
        service: "scheduler",
        severity: "sev3",
        status: "mitigated",
        owner: "Platform Ops",
        summary: "Alerting lag introduced by queue saturation.",
        impact: "Internal job notifications were delayed by up to 14 minutes.",
        startedAt: new Date(now - 155 * 60_000),
        slaTargetAt: new Date(now - 20 * 60_000),
      },
      {
        title: "Knowledge base search relevance degraded",
        service: "support-portal",
        severity: "sev4",
        status: "open",
        owner: "Product Support",
        summary: "Ranking model regression after index refresh.",
        impact: "Agents need manual filtering to find the latest runbooks.",
        startedAt: new Date(now - 25 * 60_000),
        slaTargetAt: new Date(now + 95 * 60_000),
      },
    ])
    .returning({ id: incidents.id });

  const [payments, scheduler, portal] = seeded;

  await db.insert(incidentTags).values([
    { incidentId: payments.id, tag: "customer-impact" },
    { incidentId: payments.id, tag: "latency" },
    { incidentId: scheduler.id, tag: "internal" },
    { incidentId: scheduler.id, tag: "queue" },
    { incidentId: portal.id, tag: "search" },
    { incidentId: portal.id, tag: "regression" },
  ]);

  await db.insert(incidentTimeline).values([
    {
      incidentId: payments.id,
      kind: "status",
      body: "Incident declared and bridge opened.",
      actor: "PagerDuty",
    },
    {
      incidentId: payments.id,
      kind: "comment",
      body: "Correlation points to a connection pool depletion after deploy 2026.03.30.1.",
      actor: "Avery",
    },
    {
      incidentId: scheduler.id,
      kind: "note",
      body: "Backlog drained after workers were rescaled. Monitoring for recurrence.",
      actor: "Mina",
    },
    {
      incidentId: portal.id,
      kind: "comment",
      body: "Search relevance issue confirmed in production. No data loss observed.",
      actor: "Noah",
    },
  ]);

  await db
    .update(incidents)
    .set({ updatedAt: new Date() })
    .where(eq(incidents.id, payments.id));
}
