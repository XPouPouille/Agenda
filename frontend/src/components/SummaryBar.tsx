import { useEffect, useState } from "react";
import { api } from "../api/client";
import { STATUS_LABELS, type Summary } from "../api/types";

function yearOptions(): number[] {
  const current = new Date().getFullYear();
  const years: number[] = [];
  for (let y = current + 1; y >= current - 6; y--) years.push(y);
  return years;
}

export function SummaryBar() {
  const [year, setYear] = useState<string>("global");
  const [summary, setSummary] = useState<Summary | null>(null);

  useEffect(() => {
    api.summary(year === "global" ? undefined : Number(year)).then(setSummary).catch(console.error);
  }, [year]);

  return (
    <div className="card" style={{ display: "flex", gap: 24, alignItems: "center", flexWrap: "wrap" }}>
      <div>
        <label>
          Période :{" "}
          <select value={year} onChange={(e) => setYear(e.target.value)}>
            <option value="global">Global</option>
            {yearOptions().map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>
      </div>
      {summary && (
        <>
          {summary.by_status.map((s) => (
            <div key={s.status}>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                {STATUS_LABELS[s.status]} ({s.count})
              </div>
              <div style={{ fontWeight: 700 }}>{s.total.toFixed(2)} €</div>
            </div>
          ))}
          <div style={{ marginLeft: "auto" }}>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Total</div>
            <div style={{ fontWeight: 700, fontSize: 18 }}>{summary.grand_total.toFixed(2)} €</div>
          </div>
        </>
      )}
    </div>
  );
}
