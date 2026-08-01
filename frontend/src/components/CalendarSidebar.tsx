import { useMemo } from "react";
import { STATUS_COLORS } from "./StatusBadge";
import type { Competition, CompetitionStatus } from "../api/types";

const MONTH_NAMES = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

const STATUS_ORDER: CompetitionStatus[] = ["termine", "paye", "a_faire", "annule"];

interface Props {
  competitions: Competition[];
  year: number;
  month: number | null;
  day: number | null;
  onYearChange: (year: number) => void;
  onMonthChange: (month: number | null) => void;
  onDayChange: (day: number | null) => void;
}

function uniqueStatuses(items: Competition[]): CompetitionStatus[] {
  const set = new Set(items.map((c) => c.status));
  return STATUS_ORDER.filter((s) => set.has(s));
}

function cellBackground(statuses: CompetitionStatus[]): string {
  if (statuses.length === 0) return "transparent";
  if (statuses.length === 1) return STATUS_COLORS[statuses[0]];
  const step = 100 / statuses.length;
  const stops = statuses.map((s, i) => {
    const color = STATUS_COLORS[s];
    return `${color} ${i * step}%, ${color} ${(i + 1) * step}%`;
  });
  return `linear-gradient(135deg, ${stops.join(", ")})`;
}

export function CalendarSidebar({
  competitions,
  year,
  month,
  day,
  onYearChange,
  onMonthChange,
  onDayChange,
}: Props) {
  const years = useMemo(() => {
    const current = new Date().getFullYear();
    const arr: number[] = [];
    for (let y = current + 1; y >= current - 6; y--) arr.push(y);
    return arr;
  }, []);

  const byMonth = useMemo(() => {
    const map = new Map<number, Competition[]>();
    for (const c of competitions) {
      const d = new Date(c.event_date);
      const list = map.get(d.getMonth()) ?? [];
      list.push(c);
      map.set(d.getMonth(), list);
    }
    return map;
  }, [competitions]);

  const byDay = useMemo(() => {
    const map = new Map<number, Competition[]>();
    if (month === null) return map;
    for (const c of competitions) {
      const d = new Date(c.event_date);
      if (d.getMonth() !== month) continue;
      const list = map.get(d.getDate()) ?? [];
      list.push(c);
      map.set(d.getDate(), list);
    }
    return map;
  }, [competitions, month]);

  return (
    <div className="card" style={{ display: "grid", gap: 10, alignSelf: "start" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button className="btn secondary" onClick={() => onYearChange(year - 1)}>
          ‹
        </button>
        <select value={year} onChange={(e) => onYearChange(Number(e.target.value))}>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        <button className="btn secondary" onClick={() => onYearChange(year + 1)}>
          ›
        </button>
      </div>

      {month === null ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
          {MONTH_NAMES.map((name, i) => {
            const items = byMonth.get(i) ?? [];
            return (
              <button
                key={name}
                onClick={() => onMonthChange(i)}
                title={`${items.length} compétition(s)`}
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: 6,
                  padding: "10px 4px",
                  background: cellBackground(uniqueStatuses(items)),
                  color: items.length ? "#fff" : "var(--text)",
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                {name.slice(0, 3)}
              </button>
            );
          })}
        </div>
      ) : (
        <MonthGrid
          year={year}
          month={month}
          selectedDay={day}
          byDay={byDay}
          onBack={() => {
            onMonthChange(null);
            onDayChange(null);
          }}
          onDayClick={(d) => onDayChange(d === day ? null : d)}
        />
      )}
    </div>
  );
}

function MonthGrid({
  year,
  month,
  selectedDay,
  byDay,
  onBack,
  onDayClick,
}: {
  year: number;
  month: number;
  selectedDay: number | null;
  byDay: Map<number, Competition[]>;
  onBack: () => void;
  onDayClick: (day: number) => void;
}) {
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7; // lundi = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div style={{ display: "grid", gap: 6 }}>
      <button className="btn secondary" onClick={onBack} style={{ justifySelf: "start" }}>
        ‹ {MONTH_NAMES[month]}
      </button>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, fontSize: 11 }}>
        {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => (
          <div key={i} style={{ textAlign: "center", color: "var(--text-muted)" }}>
            {d}
          </div>
        ))}
        {cells.map((d, i) => {
          if (d === null) return <div key={`empty-${i}`} />;
          const items = byDay.get(d) ?? [];
          const selected = selectedDay === d;
          return (
            <button
              key={d}
              onClick={() => items.length && onDayClick(d)}
              title={`${items.length} compétition(s)`}
              style={{
                aspectRatio: "1",
                border: selected ? "2px solid var(--text)" : "1px solid var(--border)",
                borderRadius: 6,
                background: cellBackground(uniqueStatuses(items)),
                color: items.length ? "#fff" : "var(--text)",
                fontSize: 12,
                cursor: items.length ? "pointer" : "default",
              }}
            >
              {d}
            </button>
          );
        })}
      </div>
    </div>
  );
}
