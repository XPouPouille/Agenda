import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import type { Competition, CompetitionStatus, Discipline } from "../api/types";
import { STATUS_LABELS } from "../api/types";
import { CompetitionCard } from "../components/CompetitionCard";
import { CompetitionForm } from "../components/CompetitionForm";
import { SummaryBar } from "../components/SummaryBar";

export function AgendaPage() {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [statusFilter, setStatusFilter] = useState<CompetitionStatus | "">("");
  const [disciplineFilter, setDisciplineFilter] = useState<string>("");
  const [yearFilter, setYearFilter] = useState<string>("");
  const [editing, setEditing] = useState<Competition | "new" | null>(null);
  const [newDisciplineName, setNewDisciplineName] = useState("");

  async function reload() {
    const [comps, discs] = await Promise.all([
      api.listCompetitions({
        status: statusFilter || undefined,
        discipline_id: disciplineFilter ? Number(disciplineFilter) : undefined,
        year: yearFilter ? Number(yearFilter) : undefined,
      }),
      api.listDisciplines(),
    ]);
    setCompetitions(comps);
    setDisciplines(discs);
  }

  useEffect(() => {
    reload().catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, disciplineFilter, yearFilter]);

  const years = useMemo(() => {
    const set = new Set(competitions.map((c) => new Date(c.event_date).getFullYear()));
    return Array.from(set).sort((a, b) => b - a);
  }, [competitions]);

  async function handleAddDiscipline() {
    if (!newDisciplineName.trim()) return;
    await api.createDiscipline(newDisciplineName.trim());
    setNewDisciplineName("");
    reload();
  }

  return (
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
        <select value={yearFilter} onChange={(e) => setYearFilter(e.target.value)}>
          <option value="">Toutes années</option>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>

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
        {competitions.map((c) => (
          <CompetitionCard
            key={c.id}
            competition={c}
            onEdit={() => setEditing(c)}
            onDeleted={reload}
          />
        ))}
        {competitions.length === 0 && <p style={{ color: "var(--text-muted)" }}>Aucune compétition.</p>}
      </div>
    </div>
  );
}
