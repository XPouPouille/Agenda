import { STATUS_LABELS, type CompetitionStatus } from "../api/types";

const COLORS: Record<CompetitionStatus, string> = {
  a_faire: "var(--warning)",
  paye: "var(--info)",
  annule: "var(--danger)",
  termine: "var(--success)",
};

export function StatusBadge({ status }: { status: CompetitionStatus }) {
  return (
    <span
      style={{
        background: COLORS[status],
        color: "#fff",
        borderRadius: 999,
        padding: "2px 10px",
        fontSize: 12,
        fontWeight: 600,
        whiteSpace: "nowrap",
      }}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
