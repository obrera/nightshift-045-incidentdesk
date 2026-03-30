import { relations, sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const incidents = sqliteTable("incidents", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  service: text("service").notNull(),
  severity: text("severity").$type<"sev1" | "sev2" | "sev3" | "sev4">().notNull(),
  status: text("status")
    .$type<"open" | "investigating" | "mitigated" | "resolved">()
    .notNull(),
  owner: text("owner").notNull(),
  summary: text("summary").notNull(),
  impact: text("impact").notNull(),
  startedAt: integer("started_at", { mode: "timestamp_ms" }).notNull(),
  slaTargetAt: integer("sla_target_at", { mode: "timestamp_ms" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(unixepoch() * 1000)`)
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .default(sql`(unixepoch() * 1000)`)
    .notNull(),
});

export const incidentTags = sqliteTable("incident_tags", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  incidentId: integer("incident_id")
    .references(() => incidents.id, { onDelete: "cascade" })
    .notNull(),
  tag: text("tag").notNull(),
});

export const incidentTimeline = sqliteTable("incident_timeline", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  incidentId: integer("incident_id")
    .references(() => incidents.id, { onDelete: "cascade" })
    .notNull(),
  kind: text("kind").$type<"comment" | "status" | "ownership" | "note">().notNull(),
  body: text("body").notNull(),
  actor: text("actor").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(unixepoch() * 1000)`)
    .notNull(),
});

export const incidentsRelations = relations(incidents, ({ many }) => ({
  tags: many(incidentTags),
  timeline: many(incidentTimeline),
}));

export const incidentTagsRelations = relations(incidentTags, ({ one }) => ({
  incident: one(incidents, {
    fields: [incidentTags.incidentId],
    references: [incidents.id],
  }),
}));

export const incidentTimelineRelations = relations(incidentTimeline, ({ one }) => ({
  incident: one(incidents, {
    fields: [incidentTimeline.incidentId],
    references: [incidents.id],
  }),
}));

export type IncidentRow = typeof incidents.$inferSelect;
export type IncidentInsert = typeof incidents.$inferInsert;
export type TimelineRow = typeof incidentTimeline.$inferSelect;
