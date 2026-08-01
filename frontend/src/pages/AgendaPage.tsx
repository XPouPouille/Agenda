import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import type { Competition, CompetitionStatus, Discipline } from "../api/types";
import { STATUS_LABELS } from "../api/types";
import { CalendarSidebar } from "../components/CalendarSidebar";
import { CompetitionCard } from "../components/CompetitionCard";
import { CompetitionForm } from "../components/CompetitionForm";
import { SummaryBar } from "../components/SummaryBar";

export function AgendaPage() {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [statusFilter, setStatusFilter] = useState<CompetitionStatus | "">("");
  const [disciplineFilter, setDisciplineFilter] = useState<string>("");
  const [editing, setEditing] = useState<Competition | "new" | null>(null);
  const [newDisciplineName, setNewDisciplineName] = useState("");

  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [calendarMonth, setCalendarMonth] = useState<number | null>(null);
  const [calendarDay, setCalendarDay] = useState<number | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  async function reload() {
    const [comps, discs] = await Promise.all([
      api.listCompetitions({
        status: statusFilter || undefined,
        discipline_id: disciplineFilter ? Number(disciplineFilter) : undefined,
        year: calendarYear,
      }),
      api.listDisciplines(),
    ]);
    setCompetitions(comps);
    setDisciplines(discs);
  }

  useEffect(() => {
    reload().catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, disciplineFilter, calendarYear]);

  const visibleCompetitions = useMemo(() => {
    const filtered = competitions.filter((c) => {
      const d = new Date(c.event_date);
      if (calendarMonth !== null && d.getMonth() !== calendarMonth) return false;
      if (calendarDay !== null && d.getDate() !== calendarDay) return false;
      return true;
    });
    const sorted = [...filtered].sort((a, b) => a.event_date.localeCompare(b.event_date));
    return sortOrder === "asc" ? sorted : sorted.reverse();
  }, [competitions, calendarMonth, calendarDay, sortOrder]);

  function handleYearChange(year: number) {
    setCalendarYear(year);
    setCalendarMonth(null);
    setCalendarDay(null);
  }

  function handleMonthChange(month: number | null) {
    setCalendarMonth(month);
    setCalendarDay(null);
  }

  async function handleAddDiscipline() {
    if (!newDisciplineName.trim()) return;
    await api.createDiscipline(newDisciplineName.trim());
    setNewDisciplineName("");
    reload();
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 16, alignItems: "start" }}>
      <div style={{ display: "grid", gap: 16 }}>
        <SummaryBar />

        <div className="card" style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as CompetitionStatus | "")}>
            <option value="">Tous les statuts</option>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <select value={disciplineFilter} onChange={(e) => setDisciplineFilter(e.target.value)}>
            <option value="">Toutes disciplines</option>
            {disciplines.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <button
            className="btn secondary"
            onClick={() => setSortOrder((o) => (o === "asc" ? "desc" : "asc"))}
            title="Trier par date"
          >
            Date {sortOrder === "asc" ? "↑" : "↓"}
          </button>

          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <input
              placeholder="Nouvelle discipline"
              value={newDisciplineName}
              onChange={(e) => setNewDisciplineName(e.target.value)}
            />
            <button className="btn secondary" onClick={handleAddDiscipline}>
              + Discipline
            </button>
            <button className="btn" onClick={() => setEditing("new")}>
              + Compétition
            </button>
          </div>
        </div>

        {editing && (
          <CompetitionForm
            disciplines={disciplines}
            initial={editing === "new" ? undefined : editing}
            onCancel={() => setEditing(null)}
            onSaved={() => {
              setEditing(null);
              reload();
            }}
          />
        )}

        <div style={{ display: "grid", gap: 12 }}>
          {visibleCompetitions.map((c) => (
            <CompetitionCard
              key={c.id}
              competition={c}
              onEdit={() => setEditing(c)}
              onDeleted={reload}
            />
          ))}
          {visibleCompetitions.length === 0 && (
            <p style={{ color: "var(--text-muted)" }}>Aucune compétition.</p>
          )}
        </div>
      </div>

      <CalendarSidebar
        competitions={competitions}
        year={calendarYear}
        month={calendarMonth}
        day={calendarDay}
        onYearChange={handleYearChange}
        onMonthChange={handleMonthChange}
        onDayChange={setCalendarDay}
      />
    </div>
  );
}
