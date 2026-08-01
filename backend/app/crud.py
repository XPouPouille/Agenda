from typing import Optional

from sqlalchemy import extract, func
from sqlalchemy.orm import Session

from . import models, schemas


def list_disciplines(db: Session) -> list[models.Discipline]:
    return db.query(models.Discipline).order_by(models.Discipline.name).all()


def create_discipline(db: Session, discipline: schemas.DisciplineCreate) -> models.Discipline:
    obj = models.Discipline(name=discipline.name)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def create_sub_discipline(
    db: Session, discipline_id: int, sub: schemas.SubDisciplineCreate
) -> models.SubDiscipline:
    obj = models.SubDiscipline(name=sub.name, discipline_id=discipline_id)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def list_competitions(
    db: Session,
    status: Optional[models.CompetitionStatus] = None,
    discipline_id: Optional[int] = None,
    sub_discipline_id: Optional[int] = None,
    year: Optional[int] = None,
) -> list[models.Competition]:
    query = db.query(models.Competition)
    if status is not None:
        query = query.filter(models.Competition.status == status)
    if discipline_id is not None:
        query = query.filter(models.Competition.discipline_id == discipline_id)
    if sub_discipline_id is not None:
        query = query.filter(models.Competition.sub_discipline_id == sub_discipline_id)
    if year is not None:
        query = query.filter(extract("year", models.Competition.event_date) == year)
    return query.order_by(models.Competition.event_date.desc()).all()


def get_competition(db: Session, competition_id: int) -> Optional[models.Competition]:
    return db.query(models.Competition).filter(models.Competition.id == competition_id).first()


def create_competition(
    db: Session, competition: schemas.CompetitionCreate
) -> models.Competition:
    obj = models.Competition(**competition.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def update_competition(
    db: Session, obj: models.Competition, competition: schemas.CompetitionUpdate
) -> models.Competition:
    for key, value in competition.model_dump().items():
        setattr(obj, key, value)
    db.commit()
    db.refresh(obj)
    return obj


def delete_competition(db: Session, obj: models.Competition) -> None:
    db.delete(obj)
    db.commit()


def summary(db: Session, year: Optional[int] = None) -> schemas.SummaryOut:
    query = db.query(
        models.Competition.status,
        func.coalesce(func.sum(models.Competition.price), 0).label("total"),
        func.count(models.Competition.id).label("count"),
    )
    if year is not None:
        query = query.filter(extract("year", models.Competition.event_date) == year)
    rows = query.group_by(models.Competition.status).all()

    by_status = [
        schemas.StatusSummary(status=row.status, total=float(row.total), count=row.count)
        for row in rows
    ]
    grand_total = sum(item.total for item in by_status)
    return schemas.SummaryOut(year=year, by_status=by_status, grand_total=grand_total)


def get_google_token(db: Session) -> Optional[models.GoogleToken]:
    return db.query(models.GoogleToken).first()


def save_google_refresh_token(db: Session, refresh_token: str) -> models.GoogleToken:
    obj = get_google_token(db)
    if obj is None:
        obj = models.GoogleToken(refresh_token=refresh_token)
        db.add(obj)
    else:
        obj.refresh_token = refresh_token
    db.commit()
    db.refresh(obj)
    return obj
