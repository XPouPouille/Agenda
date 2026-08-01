"""Import de l'historique Excel "Organisation competitions.xlsx" vers la base.

Le classeur est un suivi manuel (dates/statuts/disciplines/formats saisis à la
main, non normalisés). Ce script tente une conversion best-effort et laisse
une trace (dans `notes`) de tout ce qu'il n'a pas pu interpréter avec
certitude, plutôt que de perdre l'info silencieusement.

Usage (à exécuter dans le container backend, qui a accès à DATABASE_URL) :
    python -m app.scripts.import_excel /chemin/vers/fichier.xlsx           # dry-run (rien n'est écrit)
    python -m app.scripts.import_excel /chemin/vers/fichier.xlsx --commit  # écrit en base

Idempotent : une compétition existante avec le même (nom, date) est ignorée.
"""

import argparse
import re
import sys
from datetime import date, datetime, time, timedelta
from typing import Optional

import openpyxl

from ..database import Base, SessionLocal, engine
from ..models import Competition, CompetitionStatus, Discipline, FormatType

MONTH_NAMES = {
    "janvier", "fevrier", "février", "mars", "avril", "mai", "juin", "juillet",
    "aout", "août", "septembre", "octobre", "novembre", "decembre", "décembre",
}

DISCIPLINE_MAP = {
    "triathlon": "Triathlon",
    "natation": "Natation",
    "cap": "CAP (Course à pied)",
    "trail": "Trail",
    "eau libre": "Eau libre",
    "swimrun": "Swimrun",
    "aquathlon": "Aquathlon",
    "eau glacee": "Eau glacée",
    "eau glacée": "Eau glacée",
    "eau glac�": "Eau glacée",
}

STATUS_MAP = {
    "fait": (CompetitionStatus.termine, None),
    "inscription fait": (CompetitionStatus.paye, None),
    "faire inscription": (CompetitionStatus.a_faire, None),
    "annule": (CompetitionStatus.annule, None),
    "annulé": (CompetitionStatus.annule, None),
    "annul�": (CompetitionStatus.annule, None),
    "ne pas participer": (CompetitionStatus.annule, "Statut original : ne pas participer"),
    "obligatoire": (CompetitionStatus.a_faire, "Statut original : Obligatoire"),
}

FORMAT_VALUES = {f.value for f in FormatType}


def clean_str(value) -> Optional[str]:
    if value is None:
        return None
    s = str(value).strip()
    return s or None


def norm_key(value) -> Optional[str]:
    s = clean_str(value)
    return s.lower().replace("�", "e") if s else None


def is_aggregate_row(row) -> bool:
    """Lignes de sous-total/section ('total', 'la formule est OK' sur une ligne sans nom)."""
    name = clean_str(row[1])
    discipline = clean_str(row[2])
    lieu = norm_key(row[3])
    return name is None and discipline is None and (lieu == "total" or lieu == "total inscription")


def is_section_marker(row) -> bool:
    """Lignes 'année' (2023.0) ou 'mois' (Octobre) qui structurent le tableau sans être des items."""
    date_cell = row[0]
    name = clean_str(row[1])
    if name is not None:
        return False
    if isinstance(date_cell, float) and date_cell == int(date_cell) and 2000 < date_cell < 2100:
        return True
    key = norm_key(date_cell)
    if key in MONTH_NAMES:
        return True
    if date_cell is None and all(clean_str(c) is None for c in row):
        return True
    return False


DATE_RANGE_RE = re.compile(
    r"^(\d{1,2})(?:-\d{1,2}){0,2}/(\d{1,2})(?:/(\d{4}))?$"
)

YEAR_MARKER_RE = re.compile(r"^\d{4}$")


def parse_date(value, current_year: Optional[int]) -> tuple[Optional[date], Optional[str]]:
    """Retourne (date, note) — note si la date a dû être devinée/approximée.

    `current_year` sert de repère pour les dates saisies sans année (le
    classeur regroupe les lignes par année via des lignes-séparateur type
    "2024"), et pour les plages de jours ("16-17/11") dont on ne garde que
    le premier jour.
    """
    if isinstance(value, datetime):
        return value.date(), None
    if isinstance(value, date):
        return value, None
    s = clean_str(value)
    if not s:
        return None, None
    raw = s
    s = s.replace("?", "").strip()
    m = DATE_RANGE_RE.match(s)
    if m:
        day, month, year = m.groups()
        year = year or current_year
        if year is None:
            return None, None
        try:
            return date(int(year), int(month), int(day)), f"Date approximative (source : \"{raw}\")"
        except ValueError:
            return None, None
    return None, None


def parse_discipline_name(value) -> tuple[Optional[str], Optional[str]]:
    key = norm_key(value)
    if not key:
        return None, None
    if key in DISCIPLINE_MAP:
        return DISCIPLINE_MAP[key], None
    return "Autre", f"Discipline brute non reconnue : \"{value}\""


def parse_status(value) -> tuple[CompetitionStatus, Optional[str]]:
    key = norm_key(value)
    if not key:
        return CompetitionStatus.a_faire, None
    if key in STATUS_MAP:
        return STATUS_MAP[key]
    return CompetitionStatus.a_faire, f"Statut brut non reconnu : \"{value}\""


DISTANCE_RE = re.compile(r"^(\d+(?:[.,]\d+)?)\s*k(?:m)?$", re.IGNORECASE)


def parse_format_or_distance(value) -> tuple[Optional[str], Optional[float], Optional[str]]:
    """Retourne (format_type, distance_km, note)."""
    if value is None:
        return None, None, None
    if isinstance(value, (int, float)):
        return None, float(value), None
    if isinstance(value, (datetime, date)):
        return None, None, f"Type brut ambigu (date Excel accidentelle) : {value}"
    s = clean_str(value)
    if not s:
        return None, None, None
    upper = s.upper().strip()
    if upper in FORMAT_VALUES:
        return upper, None, None
    m = DISTANCE_RE.match(s.replace(",", "."))
    if m:
        return None, float(m.group(1)), None
    try:
        return None, float(s.replace(",", ".")), None
    except ValueError:
        return None, None, f"Format/distance brut non interprété : \"{value}\""


def parse_price(value) -> tuple[Optional[float], Optional[str]]:
    if value is None:
        return None, None
    if isinstance(value, (int, float)):
        return float(value), None
    s = clean_str(value)
    if not s:
        return None, None
    try:
        return float(s.replace(",", ".").replace("€", "").strip()), None
    except ValueError:
        return None, f"Tarif brut non interprété : \"{value}\""


def parse_result_time(value) -> tuple[Optional[str], Optional[str]]:
    if value is None:
        return None, None
    if isinstance(value, time):
        return f"{value.hour}:{value.minute:02d}:{value.second:02d}", None
    if isinstance(value, timedelta):
        total = int(value.total_seconds())
        note = None
        if total >= 24 * 3600:
            note = f"Temps à vérifier, valeur brute incohérente : {value}"
        h, rem = divmod(total, 3600)
        m, s = divmod(rem, 60)
        return f"{h}:{m:02d}:{s:02d}", note
    s = clean_str(value)
    if not s:
        return None, None
    m = re.match(r"(\d+)h(\d+)'(\d+)\"?", s)
    if m:
        h, mn, sec = m.groups()
        return f"{int(h)}:{int(mn):02d}:{int(sec):02d}", None
    m = re.match(r"(\d+):(\d+):(\d+)", s)
    if m:
        h, mn, sec = m.groups()
        return f"{int(h)}:{int(mn):02d}:{int(sec):02d}", None
    return s, None


RANK_PAIR_RE = re.compile(r"(\d+)\s*/\s*(\d+)")


def parse_result_ranks(value) -> tuple[Optional[int], Optional[int]]:
    """Best-effort : cherche un rang 'général' et un rang 'catégorie' dans le texte libre."""
    s = clean_str(value)
    if not s:
        return None, None
    segments = re.split(r"[-,]", s)
    overall = None
    category = None
    for seg in segments:
        match = RANK_PAIR_RE.search(seg)
        if not match:
            continue
        rank = int(match.group(1))
        seg_lower = seg.lower()
        if "gen" in seg_lower or "gén" in seg_lower or "g�n" in seg_lower:
            overall = rank
        elif overall is None:
            overall = rank
        else:
            category = rank
    return overall, category


def build_notes(*parts: Optional[str]) -> Optional[str]:
    filtered = [p for p in parts if p]
    return "\n".join(filtered) if filtered else None


class ImportReport:
    def __init__(self):
        self.imported = 0
        self.skipped_duplicate = 0
        self.skipped_no_date: list[str] = []
        self.skipped_no_name: list[str] = []
        self.flagged: list[str] = []

    def print_summary(self):
        print(f"\nImportées : {self.imported}")
        print(f"Doublons ignorés (déjà en base) : {self.skipped_duplicate}")
        print(f"Ignorées (pas de date exploitable) : {len(self.skipped_no_date)}")
        for item in self.skipped_no_date:
            print(f"  - {item}")
        print(f"Ignorées (pas de nom) : {len(self.skipped_no_name)}")
        for item in self.skipped_no_name:
            print(f"  - {item}")
        print(f"\nLignes importées avec une info à vérifier manuellement : {len(self.flagged)}")
        for item in self.flagged:
            print(f"  - {item}")


def get_or_create_discipline(db, name: str) -> Discipline:
    obj = db.query(Discipline).filter(Discipline.name == name).first()
    if obj is None:
        obj = Discipline(name=name)
        db.add(obj)
        db.flush()
    return obj


def run(path: str, commit: bool) -> ImportReport:
    wb = openpyxl.load_workbook(path, data_only=True)
    ws = wb.active
    rows = list(ws.iter_rows(min_row=2, values_only=True))

    report = ImportReport()
    db = SessionLocal()
    Base.metadata.create_all(bind=engine)

    current_year: Optional[int] = None
    try:
        for row in rows:
            row = list(row) + [None] * (11 - len(row))

            date_cell = row[0]
            if isinstance(date_cell, float) and date_cell == int(date_cell) and 2000 < date_cell < 2100:
                current_year = int(date_cell)

            if is_section_marker(row) or is_aggregate_row(row):
                continue

            name = clean_str(row[1])
            event_date, date_note = parse_date(row[0], current_year)

            if not name:
                report.skipped_no_name.append(f"{row}")
                continue
            if not event_date:
                report.skipped_no_date.append(f"{name!r} (date brute : {row[0]!r})")
                continue

            existing = (
                db.query(Competition)
                .filter(Competition.name == name, Competition.event_date == event_date)
                .first()
            )
            if existing:
                report.skipped_duplicate += 1
                continue

            discipline_name, discipline_note = parse_discipline_name(row[2])
            discipline_name = discipline_name or "Autre"
            status, status_note = parse_status(row[6])
            format_type, distance_km, format_note = parse_format_or_distance(row[4])
            price, price_note = parse_price(row[5])
            result_time, time_note = parse_result_time(row[7])
            result_rank_overall, result_rank_category = parse_result_ranks(row[8])

            raw_link = clean_str(row[9]) or clean_str(row[10])
            competition_url = raw_link if status != CompetitionStatus.termine else None
            result_url = raw_link if status == CompetitionStatus.termine else None

            notes = build_notes(
                date_note,
                discipline_note,
                status_note,
                format_note,
                price_note,
                time_note,
                f"Résultat brut : {row[8]}" if row[8] else None,
            )
            if notes:
                report.flagged.append(f"{name} ({event_date}) : {notes.splitlines()[0]}")

            if commit:
                discipline = get_or_create_discipline(db, discipline_name)
                competition = Competition(
                    name=name,
                    status=status,
                    competition_url=competition_url,
                    price=price,
                    location_address=clean_str(row[3]),
                    discipline_id=discipline.id,
                    format_type=FormatType(format_type) if format_type else None,
                    distance_km=distance_km,
                    event_date=event_date,
                    result_time=result_time,
                    result_rank_overall=result_rank_overall,
                    result_rank_category=result_rank_category,
                    result_url=result_url,
                    notes=notes,
                )
                db.add(competition)

            report.imported += 1

        if commit:
            db.commit()
        else:
            db.rollback()
    finally:
        db.close()

    return report


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("xlsx_path")
    parser.add_argument("--commit", action="store_true", help="Écrit réellement en base (sinon dry-run)")
    args = parser.parse_args()

    report = run(args.xlsx_path, commit=args.commit)
    mode = "COMMIT" if args.commit else "DRY-RUN (rien n'a été écrit, relancer avec --commit)"
    print(f"Mode : {mode}")
    report.print_summary()
    sys.exit(0)
