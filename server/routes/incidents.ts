import { and, asc, desc, eq, inArray, like, sql } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { db } from "../db/client";
import { incidents, incidentTags, incidentTimeline } from "../db/schema";

const severityEnum = z.enum(["sev1", "sev2", "sev3", "sev4"]);
const statusEnum = z.enum(["open", "investigating", "mitigated", "resolved"]);

const incidentSchema = z.object({
  title: z.string().min(3),
  service: z.string().min(2),
  severity: severityEnum,
  status: statusEnum,
  owner: z.string().min(2),
  summary: z.string().min(8),
  impact: z.string().min(8),
  startedAt: z.string().datetime(),
  slaTargetAt: z.string().datetime(),
  tags: z.array(z.string().min(1)).max(8),
});

const timelineSchema = z.object({
  kind: z.enum(["comment", "status", "ownership", "note"]),
  body: z.string().min(3),
  actor: z.string().min(2),
});

async function enrichIncident(id: number) {
  const [incident] = await db.select().from(incidents).where(eq(incidents.id, id));
  if (!incident) {
    return null;
  }

  const tags = await db
    .select({ id: incidentTags.id, tag: incidentTags.tag })
    .from(incidentTags)
    .where(eq(incidentTags.incidentId, id))
    .orderBy(asc(incidentTags.tag));

  const timeline = await db
    .select()
    .from(incidentTimeline)
    .where(eq(incidentTimeline.incidentId, id))
    .orderBy(desc(incidentTimeline.createdAt));

  return {
    ...incident,
    tags: tags.map((tag) => tag.tag),
    timeline,
  };
}

export const incidentsRoute = new Hono()
  .get("/", async (c) => {
    const severity = c.req.query("severity");
    const status = c.req.query("status");
    const owner = c.req.query("owner");
    const tag = c.req.query("tag");
    const search = c.req.query("search");
    const overdue = c.req.query("overdue") === "true";

    const filters = [];

    if (severity) {
      filters.push(eq(incidents.severity, severity as z.infer<typeof severityEnum>));
    }
    if (status) {
      filters.push(eq(incidents.status, status as z.infer<typeof statusEnum>));
    }
    if (owner) {
      filters.push(eq(incidents.owner, owner));
    }
    if (search) {
      filters.push(like(incidents.title, `%${search}%`));
    }
    if (overdue) {
      filters.push(sql`${incidents.slaTargetAt} < ${new Date()}`);
    }

    const rows = await db
      .select()
      .from(incidents)
      .where(filters.length ? and(...filters) : undefined)
      .orderBy(desc(incidents.updatedAt));

    const ids = rows.map((row) => row.id);
    const tags = ids.length
      ? await db
          .select()
          .from(incidentTags)
          .where(inArray(incidentTags.incidentId, ids))
      : [];

    const tagMap = new Map<number, string[]>();
    for (const record of tags) {
      const next = tagMap.get(record.incidentId) ?? [];
      next.push(record.tag);
      tagMap.set(record.incidentId, next);
    }

    const filteredRows = tag
      ? rows.filter((row) => (tagMap.get(row.id) ?? []).includes(tag))
      : rows;

    return c.json(
      filteredRows.map((row) => ({
        ...row,
        tags: (tagMap.get(row.id) ?? []).sort(),
      })),
    );
  })
  .get("/:id", async (c) => {
    const id = Number(c.req.param("id"));
    const incident = await enrichIncident(id);

    if (!incident) {
      return c.json({ error: "Incident not found" }, 404);
    }

    return c.json(incident);
  })
  .post("/", async (c) => {
    const payload = incidentSchema.parse(await c.req.json());
    const inserted = await db
      .insert(incidents)
      .values({
        ...payload,
        startedAt: new Date(payload.startedAt),
        slaTargetAt: new Date(payload.slaTargetAt),
      })
      .returning({ id: incidents.id });

    const incidentId = inserted[0].id;

    if (payload.tags.length) {
      await db.insert(incidentTags).values(
        payload.tags.map((tag) => ({
          incidentId,
          tag,
        })),
      );
    }

    await db.insert(incidentTimeline).values({
      incidentId,
      kind: "status",
      body: `Incident created with status ${payload.status}.`,
      actor: payload.owner,
    });

    return c.json(await enrichIncident(incidentId), 201);
  })
  .put("/:id", async (c) => {
    const id = Number(c.req.param("id"));
    const payload = incidentSchema.parse(await c.req.json());
    const current = await enrichIncident(id);

    if (!current) {
      return c.json({ error: "Incident not found" }, 404);
    }

    await db
      .update(incidents)
      .set({
        ...payload,
        startedAt: new Date(payload.startedAt),
        slaTargetAt: new Date(payload.slaTargetAt),
        updatedAt: new Date(),
      })
      .where(eq(incidents.id, id));

    await db.delete(incidentTags).where(eq(incidentTags.incidentId, id));
    if (payload.tags.length) {
      await db.insert(incidentTags).values(
        payload.tags.map((tag) => ({
          incidentId: id,
          tag,
        })),
      );
    }

    const timelineEntries = [];
    if (current.status !== payload.status) {
      timelineEntries.push({
        incidentId: id,
        kind: "status" as const,
        body: `Status changed from ${current.status} to ${payload.status}.`,
        actor: payload.owner,
      });
    }
    if (current.owner !== payload.owner) {
      timelineEntries.push({
        incidentId: id,
        kind: "ownership" as const,
        body: `Ownership changed from ${current.owner} to ${payload.owner}.`,
        actor: payload.owner,
      });
    }
    timelineEntries.push({
      incidentId: id,
      kind: "note" as const,
      body: "Incident details updated.",
      actor: payload.owner,
    });

    await db.insert(incidentTimeline).values(timelineEntries);

    return c.json(await enrichIncident(id));
  })
  .post("/:id/timeline", async (c) => {
    const id = Number(c.req.param("id"));
    const payload = timelineSchema.parse(await c.req.json());
    const current = await enrichIncident(id);

    if (!current) {
      return c.json({ error: "Incident not found" }, 404);
    }

    await db.insert(incidentTimeline).values({
      incidentId: id,
      ...payload,
    });

    await db.update(incidents).set({ updatedAt: new Date() }).where(eq(incidents.id, id));

    return c.json(await enrichIncident(id), 201);
  });
