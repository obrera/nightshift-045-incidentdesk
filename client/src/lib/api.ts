import type { DashboardData, IncidentDetail, IncidentPayload, IncidentSummary, TimelinePayload } from "./types";

async function request<T>(input: string, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!response.ok) {
    throw new Error(`Request failed with ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export function getIncidents(query = "") {
  return request<IncidentSummary[]>(`/api/incidents${query}`);
}

export function getIncident(id: number) {
  return request<IncidentDetail>(`/api/incidents/${id}`);
}

export function createIncident(payload: IncidentPayload) {
  return request<IncidentDetail>("/api/incidents", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateIncident(id: number, payload: IncidentPayload) {
  return request<IncidentDetail>(`/api/incidents/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function addTimelineEntry(id: number, payload: TimelinePayload) {
  return request<IncidentDetail>(`/api/incidents/${id}/timeline`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getDashboard() {
  return request<DashboardData>("/api/dashboard");
}
