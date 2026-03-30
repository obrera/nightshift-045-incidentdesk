import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { Activity, Clock3, Flame, Search, ShieldAlert } from "lucide-react";
import { addTimelineEntry, createIncident, getDashboard, getIncident, getIncidents, updateIncident } from "./lib/api";
import type {
  DashboardData,
  IncidentDetail,
  IncidentPayload,
  IncidentSummary,
  TimelinePayload,
} from "./lib/types";
import { formatDate, formatDuration } from "./lib/utils";
import { Badge } from "./components/Badge";
import { IncidentForm } from "./components/IncidentForm";
import { MetricCard } from "./components/MetricCard";
import { TimelineComposer } from "./components/TimelineComposer";

type Filters = {
  search: string;
  severity: string;
  status: string;
  overdue: boolean;
};

const defaultFilters: Filters = {
  search: "",
  severity: "",
  status: "",
  overdue: false,
};

export function App() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [incidents, setIncidents] = useState<IncidentSummary[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedIncident, setSelectedIncident] = useState<IncidentDetail | null>(null);
  const [filters, setFilters] = useState(defaultFilters);
  const [mode, setMode] = useState<"create" | "edit">("create");

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (filters.search) params.set("search", filters.search);
    if (filters.severity) params.set("severity", filters.severity);
    if (filters.status) params.set("status", filters.status);
    if (filters.overdue) params.set("overdue", "true");
    const next = params.toString();
    return next ? `?${next}` : "";
  }, [filters]);

  async function refreshList() {
    const [dashboardData, incidentsData] = await Promise.all([getDashboard(), getIncidents(query)]);
    setDashboard(dashboardData);
    setIncidents(incidentsData);

    const activeId = selectedId ?? incidentsData[0]?.id ?? null;
    setSelectedId(activeId);
    if (activeId) {
      setSelectedIncident(await getIncident(activeId));
    } else {
      setSelectedIncident(null);
    }
  }

  useEffect(() => {
    void refreshList();
  }, [query]);

  async function selectIncident(id: number) {
    setSelectedId(id);
    setSelectedIncident(await getIncident(id));
    setMode("edit");
  }

  async function handleCreate(values: IncidentPayload) {
    const incident = await createIncident(values);
    setSelectedId(incident.id);
    setMode("edit");
    await refreshList();
  }

  async function handleUpdate(values: IncidentPayload) {
    if (!selectedId) return;
    await updateIncident(selectedId, values);
    await refreshList();
  }

  async function handleTimelineSubmit(payload: TimelinePayload) {
    if (!selectedId) return;
    await addTimelineEntry(selectedId, payload);
    setSelectedIncident(await getIncident(selectedId));
    setDashboard(await getDashboard());
  }

  return (
    <div className="min-h-screen bg-canvas bg-grid [background-size:26px_26px] text-ink">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="rounded-[32px] border border-white/10 bg-gradient-to-br from-slate-900 via-slate-950 to-emerald-950/60 p-8 shadow-glow">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-sm uppercase tracking-[0.35em] text-emerald-300">Nightshift Build 045</p>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white sm:text-5xl">IncidentDesk</h1>
              <p className="mt-4 max-w-2xl text-base text-slate-300">
                Backend-first incident command with lifecycle tracking, timeline updates, SLA visibility, and a dark
                ops dashboard for live triage.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Chip icon={<ShieldAlert size={16} />} label={`${dashboard?.metrics.open ?? 0} active`} />
              <Chip icon={<Clock3 size={16} />} label={`${dashboard?.metrics.overdue ?? 0} overdue`} />
              <Chip icon={<Flame size={16} />} label={`${dashboard?.metrics.sev1 ?? 0} sev1`} />
              <Chip icon={<Activity size={16} />} label={`${dashboard?.metrics.resolved ?? 0} resolved`} />
            </div>
          </div>
        </header>

        <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Incidents" value={dashboard?.metrics.total ?? 0} note="Tracked from SQLite-backed state." />
          <MetricCard label="Active" value={dashboard?.metrics.open ?? 0} note="Open, investigating, or mitigated." />
          <MetricCard label="Overdue" value={dashboard?.metrics.overdue ?? 0} note="SLA target breached before resolution." />
          <MetricCard label="Ownership" value={dashboard?.owners.length ?? 0} note="Distinct owners on the board." />
        </section>

        <section className="mt-8 grid gap-8 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-6">
            <div className="rounded-[28px] border border-white/10 bg-slate-950/70 p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-white">Ops dashboard</h2>
                  <p className="text-sm text-slate-400">Filter by search, severity, status, or SLA breach.</p>
                </div>
                <button
                  className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-200 transition hover:border-accent hover:text-accent"
                  onClick={() => {
                    setMode("create");
                    setSelectedIncident(null);
                  }}
                  type="button"
                >
                  New incident
                </button>
              </div>
              <div className="mt-5 grid gap-3 lg:grid-cols-[1.4fr_0.8fr_0.8fr_auto]">
                <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <Search size={16} className="text-slate-500" />
                  <input
                    className="w-full bg-transparent text-sm text-white outline-none"
                    onChange={(event) => setFilters({ ...filters, search: event.target.value })}
                    placeholder="Search title"
                    value={filters.search}
                  />
                </label>
                <SelectFilter
                  value={filters.severity}
                  onChange={(value) => setFilters({ ...filters, severity: value })}
                  options={["", "sev1", "sev2", "sev3", "sev4"]}
                />
                <SelectFilter
                  value={filters.status}
                  onChange={(value) => setFilters({ ...filters, status: value })}
                  options={["", "open", "investigating", "mitigated", "resolved"]}
                />
                <label className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
                  <input
                    checked={filters.overdue}
                    onChange={(event) => setFilters({ ...filters, overdue: event.target.checked })}
                    type="checkbox"
                  />
                  Overdue only
                </label>
              </div>
              <div className="mt-5 space-y-3">
                {incidents.map((incident) => {
                  const remaining = new Date(incident.slaTargetAt).getTime() - Date.now();
                  const overdue = remaining < 0 && incident.status !== "resolved";
                  return (
                    <button
                      key={incident.id}
                      className={`w-full rounded-3xl border p-4 text-left transition ${
                        selectedId === incident.id
                          ? "border-accent/50 bg-emerald-500/10 shadow-glow"
                          : "border-white/10 bg-white/5 hover:border-white/25"
                      }`}
                      onClick={() => void selectIncident(incident.id)}
                      type="button"
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge tone={incident.severity}>{incident.severity}</Badge>
                            <Badge tone={incident.status}>{incident.status}</Badge>
                            {overdue ? <Badge tone="overdue">overdue</Badge> : <Badge tone="healthy">on clock</Badge>}
                          </div>
                          <h3 className="mt-3 text-lg font-semibold text-white">{incident.title}</h3>
                          <p className="mt-1 text-sm text-slate-400">
                            {incident.service} · owner {incident.owner} · started {formatDate(incident.startedAt)}
                          </p>
                          <p className="mt-3 text-sm text-slate-300">{incident.summary}</p>
                        </div>
                        <div className="min-w-44">
                          <p className={`text-sm font-semibold ${overdue ? "text-red-300" : "text-emerald-300"}`}>
                            SLA {overdue ? "overdue" : "remaining"} {formatDuration(remaining)}
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {incident.tags.map((tag) => (
                              <span
                                key={tag}
                                className="rounded-full bg-slate-800/90 px-3 py-1 text-xs uppercase tracking-[0.18em] text-slate-300"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-[28px] border border-white/10 bg-slate-950/70 p-5">
              <h2 className="text-xl font-semibold text-white">{mode === "create" ? "Create incident" : "Edit incident"}</h2>
              <p className="mb-5 text-sm text-slate-400">
                Manage severity, owner, tags, status lifecycle, and SLA targets from one form.
              </p>
              <IncidentForm
                incident={mode === "edit" ? selectedIncident : null}
                onCancel={
                  mode === "edit"
                    ? () => {
                        setMode("create");
                        setSelectedIncident(null);
                      }
                    : undefined
                }
                onSubmit={mode === "create" ? handleCreate : handleUpdate}
              />
            </div>

            {selectedIncident ? (
              <div className="rounded-[28px] border border-white/10 bg-slate-950/70 p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={selectedIncident.severity}>{selectedIncident.severity}</Badge>
                  <Badge tone={selectedIncident.status}>{selectedIncident.status}</Badge>
                </div>
                <h2 className="mt-3 text-2xl font-semibold text-white">{selectedIncident.title}</h2>
                <p className="mt-2 text-sm text-slate-300">{selectedIncident.impact}</p>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <InfoCell label="Owner" value={selectedIncident.owner} />
                  <InfoCell label="SLA target" value={formatDate(selectedIncident.slaTargetAt)} />
                  <InfoCell label="Started" value={formatDate(selectedIncident.startedAt)} />
                  <InfoCell label="Updated" value={formatDate(selectedIncident.updatedAt)} />
                </div>
                <div className="mt-6">
                  <h3 className="text-lg font-semibold text-white">Timeline</h3>
                  <p className="text-sm text-slate-400">Timestamped comments and status history for the incident.</p>
                  <div className="mt-4 space-y-3">
                    <TimelineComposer onSubmit={handleTimelineSubmit} />
                    {selectedIncident.timeline.map((entry) => (
                      <article key={entry.id} className="rounded-3xl border border-white/10 bg-white/5 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <Badge tone={entry.kind === "status" ? "investigating" : entry.kind === "ownership" ? "healthy" : "open"}>
                            {entry.kind}
                          </Badge>
                          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{formatDate(entry.createdAt)}</p>
                        </div>
                        <p className="mt-3 text-sm text-slate-100">{entry.body}</p>
                        <p className="mt-2 text-xs uppercase tracking-[0.22em] text-slate-500">{entry.actor}</p>
                      </article>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}

function Chip({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
      {icon}
      <span>{label}</span>
    </div>
  );
}

function SelectFilter({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <select
      className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-accent"
      onChange={(event) => onChange(event.target.value)}
      value={value}
    >
      {options.map((option) => (
        <option key={option || "all"} value={option}>
          {option || "all"}
        </option>
      ))}
    </select>
  );
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="text-xs uppercase tracking-[0.22em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm text-slate-100">{value}</p>
    </div>
  );
}
