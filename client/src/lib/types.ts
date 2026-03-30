export type Severity = "sev1" | "sev2" | "sev3" | "sev4";
export type Status = "open" | "investigating" | "mitigated" | "resolved";
export type TimelineKind = "comment" | "status" | "ownership" | "note";

export interface IncidentPayload {
  title: string;
  service: string;
  severity: Severity;
  status: Status;
  owner: string;
  summary: string;
  impact: string;
  startedAt: string;
  slaTargetAt: string;
  tags: string[];
}

export interface TimelinePayload {
  kind: TimelineKind;
  body: string;
  actor: string;
}

export interface IncidentSummary {
  id: number;
  title: string;
  service: string;
  severity: Severity;
  status: Status;
  owner: string;
  summary: string;
  impact: string;
  startedAt: string;
  slaTargetAt: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
}

export interface TimelineEntry {
  id: number;
  incidentId: number;
  kind: TimelineKind;
  body: string;
  actor: string;
  createdAt: string;
}

export interface IncidentDetail extends IncidentSummary {
  timeline: TimelineEntry[];
}

export interface DashboardData {
  metrics: {
    total: number;
    open: number;
    overdue: number;
    sev1: number;
    resolved: number;
  };
  owners: Array<{ owner: string; count: number }>;
  hot: Array<{
    id: number;
    title: string;
    owner: string;
    status: Status;
    severity: Severity;
    msRemaining: number;
  }>;
}
