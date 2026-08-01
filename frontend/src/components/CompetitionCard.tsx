import { useState } from "react";
import { api } from "../api/client";
import type { Competition } from "../api/types";
import { MapPreview } from "./MapPreview";
import { StatusBadge } from "./StatusBadge";

interface Props {
  competition: Competition;
  onEdit: () => void;
  onDeleted: () => void;
}

export function CompetitionCard({ competition, onEdit, onDeleted }: Props) {
  const [showMap, setShowMap] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  async function handleDelete() {
    if (!confirm(`Supprimer "${competition.name}" ?`)) return;
    await api.deleteCompetition(competition.id);
    onDeleted();
  }

  async function handleExport() {
    setExporting(true);
    setExportError(null);
    try {
      const res = await api.exportToCalendar(competition.id);
      window.open(res.html_link, "_blank");
    } catch (err) {
      setExportError(err instanceof Error ? err.message : "Erreur export");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="card" style={{ display: "grid", gap: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 12 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16 }}>
            {competition.competition_url ? (
              <a href={competition.competition_url} target="_blank" rel="noreferrer">
                {competition.name}
              </a>
            ) : (
              competition.name
            )}
          </div>
          <div style={{ color: "var(--text-muted)", fontSize: 13 }}>
            {new Date(competition.event_date).toLocaleDateString("fr-FR")} · {competition.discipline.name}
            {competition.sub_discipline ? ` (${competition.sub_discipline.name})` : ""}
            {competition.format_type ? ` · ${competition.format_type}` : ""}
            {competition.distance_km ? ` · ${competition.distance_km} km` : ""}
          </div>
        </div>
        <StatusBadge status={competition.status} />
      </div>

      {competition.price != null && <div>Tarif : {Number(competition.price).toFixed(2)} €</div>}

      {competition.status === "termine" && (
        <div style={{ fontSize: 14 }}>
          {competition.result_time && <span>Temps : {competition.result_time} · </span>}
          {competition.result_rank_overall != null && (
            <span>Général : {competition.result_rank_overall} · </span>
          )}
          {competition.result_rank_category != null && (
            <span>Catégorie : {competition.result_rank_category} · </span>
          )}
          {competition.result_url && (
            <a href={competition.result_url} target="_blank" rel="noreferrer">
              Voir le résultat
            </a>
          )}
        </div>
      )}

      {competition.location_address && (
        <div>
          <button className="btn secondary" onClick={() => setShowMap((v) => !v)}>
            {showMap ? "Masquer la carte" : "📍 " + competition.location_address}
          </button>
          {showMap && <MapPreview address={competition.location_address} />}
        </div>
      )}

      {exportError && <div style={{ color: "var(--danger)" }}>{exportError}</div>}

      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button className="btn secondary" onClick={handleExport} disabled={exporting}>
          {exporting ? "Export..." : "📅 Google Agenda"}
        </button>
        <button className="btn secondary" onClick={onEdit}>
          Modifier
        </button>
        <button className="btn danger" onClick={handleDelete}>
          Supprimer
        </button>
      </div>
    </div>
  );
}
