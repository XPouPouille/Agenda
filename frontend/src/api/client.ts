import type {
  Competition,
  CompetitionInput,
  CompetitionStatus,
  Discipline,
  Summary,
} from "./types";

const BASE = "/api";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Erreur ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export interface CompetitionFilters {
  status?: CompetitionStatus;
  discipline_id?: number;
  sub_discipline_id?: number;
  year?: number;
}

function toQuery<T extends object>(filters: T): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export const api = {
  listCompetitions: (filters: CompetitionFilters = {}) =>
    request<Competition[]>(`/competitions${toQuery(filters)}`),
  createCompetition: (data: CompetitionInput) =>
    request<Competition>("/competitions", { method: "POST", body: JSON.stringify(data) }),
  updateCompetition: (id: number, data: CompetitionInput) =>
    request<Competition>(`/competitions/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteCompetition: (id: number) =>
    request<void>(`/competitions/${id}`, { method: "DELETE" }),
  toggleFavorite: (id: number) =>
    request<Competition>(`/competitions/${id}/favorite`, { method: "PATCH" }),
  exportToCalendar: (id: number) =>
    request<{ gcal_event_id: string; html_link: string }>(
      `/competitions/${id}/export-calendar`,
      { method: "POST" }
    ),

  listDisciplines: () => request<Discipline[]>("/disciplines"),
  createDiscipline: (name: string) =>
    request<Discipline>("/disciplines", { method: "POST", body: JSON.stringify({ name }) }),
  createSubDiscipline: (disciplineId: number, name: string) =>
    request(`/disciplines/${disciplineId}/sub-disciplines`, {
      method: "POST",
      body: JSON.stringify({ name }),
    }),

  results: (filters: CompetitionFilters = {}) =>
    request<Competition[]>(`/results${toQuery(filters)}`),
  summary: (year?: number) => request<Summary>(`/stats/summary${toQuery({ year })}`),
};
