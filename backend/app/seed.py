from sqlalchemy.orm import Session

from . import models

DEFAULT_DISCIPLINES = {
    "Natation": ["Crawl", "Dos", "Brasse", "Papillon", "4 Nages"],
    "Triathlon": [],
    "CAP (Course à pied)": [],
    "Vélo": [],
    "Trail": [],
    "Eau libre": [],
}


def seed_disciplines(db: Session) -> None:
    if db.query(models.Discipline).count() > 0:
        return

    for name, sub_names in DEFAULT_DISCIPLINES.items():
        discipline = models.Discipline(name=name)
        db.add(discipline)
        db.flush()
        for sub_name in sub_names:
            db.add(models.SubDiscipline(name=sub_name, discipline_id=discipline.id))

    db.commit()
