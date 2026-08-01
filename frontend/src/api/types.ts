export type CompetitionStatus = "a_faire" | "paye" | "annule" | "termine";

export const STATUS_LABELS: Record<CompetitionStatus, string> = {
  a_faire: "Faire inscription",
  paye: "Payé",
  annule: "Annulé",
  termine: "Terminé",
};

export type FormatType = "XS" | "S" | "M" | "L" | "XL" | "XXL";

export const FORMAT_TYPES: FormatType[] = ["XS", "S", "M", "L", "XL", "XXL"];

export interface SubDiscipline {
  id: number;
  name: string;
  discipline_id: number;
}

export interface Discipline {
  id: number;
  name: string;
  sub_disciplines: SubDiscipline[];
}

export interface Competition {
  id: number;
  name: string;
  status: CompetitionStatus;
  competition_url: string | null;
  price: number | null;
  location_address: string | null;
  discipline_id: number;
  sub_discipline_id: number | null;
  format_type: FormatType | null;
  distance_km: number | null;
  event_date: string;
  result_time: string | null;
  result_rank_overall: number | null;
  result_rank_category: number | null;
  result_url: string | null;
  notes: string | null;
  gcal_event_id: string | null;
  created_at: string;
  updated_at: string;
  discipline: Discipline;
  sub_discipline: SubDiscipline | null;
}

export type CompetitionInput = Omit<
  Competition,
  "id" | "gcal_event_id" | "created_at" | "updated_at" | "discipline" | "sub_discipline"
>;

export interface StatusSummary {
  status: CompetitionStatus;
  total: number;
  count: number;
}

export interface Summary {
  year: number | null;
  by_status: StatusSummary[];
  grand_total: number;
}
