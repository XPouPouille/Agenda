import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import {
  FORMAT_TYPES,
  STATUS_LABELS,
  type Competition,
  type CompetitionInput,
  type Discipline,
} from "../api/types";

const EMPTY: CompetitionInput = {
  name: "",
  is_favorite: false,
  status: "a_faire",
  competition_url: "",
  price: null,
  location_address: "",
  discipline_id: 0,
  sub_discipline_id: null,
  format_type: null,
  distance_km: null,
  event_date: new Date().toISOString().slice(0, 10),
  result_time: "",
  result_rank_overall: null,
  result_rank_category: null,
  result_url: "",
  notes: "",
};

interface Props {
  disciplines: Discipline[];
  initial?: Competition;
  onSaved: () => void;
  onCancel: () => void;
}

export function CompetitionForm({ disciplines, initial, onSaved, onCancel }: Props) {
  const [form, setForm] = useState<CompetitionInput>(
    initial
      ? {
          ...EMPTY,
          ...initial,
        }
      : { ...EMPTY, discipline_id: disciplines[0]?.id ?? 0 }
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const currentDiscipline = useMemo(
    () => disciplines.find((d) => d.id === form.discipline_id),
    [disciplines, form.discipline_id]
  );

  useEffect(() => {
    if (
      form.sub_discipline_id &&
      !currentDiscipline?.sub_disciplines.some((s) => s.id === form.sub_discipline_id)
    ) {
      setForm((f) => ({ ...f, sub_discipline_id: null }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.discipline_id]);

  function update<K extends keyof CompetitionInput>(key: K, value: CompetitionInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const payload: CompetitionInput = {
        ...form,
        price: form.price === null || (form.price as unknown as string) === "" ? null : Number(form.price),
        distance_km:
          form.distance_km === null || (form.distance_km as unknown as string) === ""
            ? null
            : Number(form.distance_km),
      };
      if (initial) {
        await api.updateCompetition(initial.id, payload);
      } else {
        await api.createCompetition(payload);
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="card" onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
      <h3 style={{ margin: 0 }}>{initial ? "Modifier" : "Nouvelle"} compétition</h3>
      {error && <div style={{ color: "var(--danger)" }}>{error}</div>}

      <label>
        Nom
        <input required value={form.name} onChange={(e) => update("name", e.target.value)} />
      </label>

      <div style={{ display: "flex", gap: 12 }}>
        <label style={{ flex: 1 }}>
          Statut
          <select value={form.status} onChange={(e) => update("status", e.target.value as CompetitionInput["status"])}>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label style={{ flex: 1 }}>
          Date
          <input
            type="date"
            required
            value={form.event_date}
            onChange={(e) => update("event_date", e.target.value)}
          />
        </label>
      </div>

      <div style={{ display: "flex", gap: 12 }}>
        <label style={{ flex: 1 }}>
          Discipline
          <select
            value={form.discipline_id}
            onChange={(e) => update("discipline_id", Number(e.target.value))}
          >
            {disciplines.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </label>
        <label style={{ flex: 1 }}>
          Sous-catégorie
          <select
            value={form.sub_discipline_id ?? ""}
            onChange={(e) =>
              update("sub_discipline_id", e.target.value ? Number(e.target.value) : null)
            }
          >
            <option value="">—</option>
            {currentDiscipline?.sub_disciplines.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div style={{ display: "flex", gap: 12 }}>
        <label style={{ flex: 1 }}>
          Format
          <select
            value={form.format_type ?? ""}
            onChange={(e) => update("format_type", (e.target.value || null) as CompetitionInput["format_type"])}
          >
            <option value="">—</option>
            {FORMAT_TYPES.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </label>
        <label style={{ flex: 1 }}>
          Distance (km)
          <input
            type="number"
            step="0.1"
            value={form.distance_km ?? ""}
            onChange={(e) => update("distance_km", e.target.value === "" ? null : Number(e.target.value))}
          />
        </label>
      </div>

      <label>
        Lien page compétition
        <input
          type="url"
          value={form.competition_url ?? ""}
          onChange={(e) => update("competition_url", e.target.value)}
        />
      </label>

      <div style={{ display: "flex", gap: 12 }}>
        <label style={{ flex: 1 }}>
          Tarif (€)
          <input
            type="number"
            step="0.01"
            value={form.price ?? ""}
            onChange={(e) => update("price", e.target.value === "" ? null : Number(e.target.value))}
          />
        </label>
        <label style={{ flex: 2 }}>
          Lieu / adresse
          <input
            value={form.location_address ?? ""}
            onChange={(e) => update("location_address", e.target.value)}
          />
        </label>
      </div>

      <fieldset style={{ border: "1px solid var(--border)", borderRadius: 8 }}>
        <legend>Résultat</legend>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <label style={{ flex: 1 }}>
            Temps (hh:mm:ss)
            <input
              value={form.result_time ?? ""}
              onChange={(e) => update("result_time", e.target.value)}
            />
          </label>
          <label style={{ flex: 1 }}>
            Classement général
            <input
              type="number"
              value={form.result_rank_overall ?? ""}
              onChange={(e) =>
                update("result_rank_overall", e.target.value === "" ? null : Number(e.target.value))
              }
            />
          </label>
          <label style={{ flex: 1 }}>
            Classement catégorie
            <input
              type="number"
              value={form.result_rank_category ?? ""}
              onChange={(e) =>
                update("result_rank_category", e.target.value === "" ? null : Number(e.target.value))
              }
            />
          </label>
        </div>
        <label>
          Lien résultats
          <input
            type="url"
            value={form.result_url ?? ""}
            onChange={(e) => update("result_url", e.target.value)}
          />
        </label>
      </fieldset>

      <label>
        Notes
        <textarea value={form.notes ?? ""} onChange={(e) => update("notes", e.target.value)} />
      </label>

      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button type="button" className="btn secondary" onClick={onCancel}>
          Annuler
        </button>
        <button type="submit" className="btn" disabled={saving}>
          {saving ? "Enregistrement..." : "Enregistrer"}
        </button>
      </div>
    </form>
  );
}
