import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "../api/client";
import { FORMAT_TYPES, type Competition, type Discipline } from "../api/types";

type SortKey = "date" | "distance" | "format";

const FORMAT_RANK = new Map(FORMAT_TYPES.map((f, i) => [f, i]));

function compareNullable<T>(a: T | null, b: T | null, cmp: (a: T, b: T) => number): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  return cmp(a, b);
}

function timeToSeconds(value: string | null): number | null {
  if (!value) return null;
  const parts = value.split(":").map(Number);
  if (parts.some(Number.isNaN)) return null;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return null;
}

function secondsToLabel(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

const COLORS = ["#2563eb", "#dc2626", "#16a34a", "#d97706", "#7c3aed", "#0891b2"];

export function ResultsPage() {
  const [results, setResults] = useState<Competition[]>([]);
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [disciplineFilter, setDisciplineFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    api.listDisciplines().then(setDisciplines).catch(console.error);
  }, []);

  useEffect(() => {
    api
      .results({
        discipline_id: disciplineFilter ? Number(disciplineFilter) : undefined,
        year: yearFilter ? Number(yearFilter) : undefined,
      })
      .then(setResults)
      .catch(console.error);
  }, [disciplineFilter, yearFilter]);

  const years = useMemo(() => {
    const set = new Set(results.map((c) => new Date(c.event_date).getFullYear()));
    return Array.from(set).sort((a, b) => b - a);
  }, [results]);

  const disciplineNames = useMemo(
    () => Array.from(new Set(results.map((r) => r.discipline.name))),
    [results]
  );

  const sortedResults = useMemo(() => {
    const sorted = [...results].sort((a, b) => {
      switch (sortKey) {
        case "distance":
          return compareNullable(a.distance_km, b.distance_km, (x, y) => x - y);
        case "format":
          return compareNullable(
            a.format_type ?? null,
            b.format_type ?? null,
            (x, y) => (FORMAT_RANK.get(x) ?? 0) - (FORMAT_RANK.get(y) ?? 0)
          );
        case "date":
        default:
          return a.event_date.localeCompare(b.event_date);
      }
    });
    return sortDir === "asc" ? sorted : sorted.reverse();
  }, [results, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function sortArrow(key: SortKey) {
    if (sortKey !== key) return "";
    return sortDir === "asc" ? " ↑" : " ↓";
  }

  const chartData = useMemo(() => {
    const sorted = [...results]
      .filter((r) => timeToSeconds(r.result_time) !== null)
      .sort((a, b) => a.event_date.localeCompare(b.event_date));
    return sorted.map((r) => ({
      date: new Date(r.event_date).toLocaleDateString("fr-FR"),
      [r.discipline.name]: timeToSeconds(r.result_time),
    }));
  }, [results]);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div className="card" style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
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
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Progression des temps</h3>
        {chartData.length === 0 ? (
          <p style={{ color: "var(--text-muted)" }}>Pas encore de résultat chronométré.</p>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" stroke="var(--text-muted)" />
              <YAxis tickFormatter={secondsToLabel} stroke="var(--text-muted)" width={80} />
              <Tooltip formatter={(value: number) => secondsToLabel(value)} />
              <Legend />
              {disciplineNames.map((name, i) => (
                <Line
                  key={name}
                  type="monotone"
                  dataKey={name}
                  stroke={COLORS[i % COLORS.length]}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="card" style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "1px solid var(--border)" }}>
              <th style={{ cursor: "pointer" }} onClick={() => toggleSort("date")}>
                Date{sortArrow("date")}
              </th>
              <th>Nom</th>
              <th>Discipline</th>
              <th style={{ cursor: "pointer" }} onClick={() => toggleSort("format")}>
                Format{sortArrow("format")}
              </th>
              <th style={{ cursor: "pointer" }} onClick={() => toggleSort("distance")}>
                Distance{sortArrow("distance")}
              </th>
              <th>Temps</th>
              <th>Général</th>
              <th>Catégorie</th>
              <th>Résultat</th>
            </tr>
          </thead>
          <tbody>
            {sortedResults.map((r) => (
              <tr key={r.id} style={{ borderBottom: "1px solid var(--border)" }}>
                <td>{new Date(r.event_date).toLocaleDateString("fr-FR")}</td>
                <td>{r.name}</td>
                <td>
                  {r.discipline.name}
                  {r.sub_discipline ? ` (${r.sub_discipline.name})` : ""}
                </td>
                <td>{r.format_type ?? "—"}</td>
                <td>{r.distance_km != null ? `${r.distance_km} km` : "—"}</td>
                <td>{r.result_time ?? "—"}</td>
                <td>{r.result_rank_overall ?? "—"}</td>
                <td>{r.result_rank_category ?? "—"}</td>
                <td>
                  {r.result_url ? (
                    <a href={r.result_url} target="_blank" rel="noreferrer">
                      Lien
                    </a>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
            {sortedResults.length === 0 && (
              <tr>
                <td colSpan={9} style={{ color: "var(--text-muted)", padding: 12 }}>
                  Aucun résultat.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
