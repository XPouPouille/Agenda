from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import crud, models, schemas
from ..database import get_db

router = APIRouter(prefix="/api", tags=["competitions"])


def _validate_discipline_pair(db: Session, discipline_id: int, sub_discipline_id: Optional[int]):
    discipline = db.query(models.Discipline).filter(models.Discipline.id == discipline_id).first()
    if discipline is None:
        raise HTTPException(status_code=400, detail="Discipline invalide")
    if sub_discipline_id is not None:
        sub = (
            db.query(models.SubDiscipline)
            .filter(
                models.SubDiscipline.id == sub_discipline_id,
                models.SubDiscipline.discipline_id == discipline_id,
            )
            .first()
        )
        if sub is None:
            raise HTTPException(
                status_code=400,
                detail="La sous-discipline ne correspond pas à la discipline sélectionnée",
            )


@router.get("/competitions", response_model=list[schemas.CompetitionOut])
def get_competitions(
    status: Optional[models.CompetitionStatus] = None,
    discipline_id: Optional[int] = None,
    sub_discipline_id: Optional[int] = None,
    year: Optional[int] = None,
    db: Session = Depends(get_db),
):
    return crud.list_competitions(db, status, discipline_id, sub_discipline_id, year)


@router.get("/results", response_model=list[schemas.CompetitionOut])
def get_results(
    discipline_id: Optional[int] = None,
    sub_discipline_id: Optional[int] = None,
    year: Optional[int] = None,
    db: Session = Depends(get_db),
):
    return crud.list_competitions(
        db,
        status=models.CompetitionStatus.termine,
        discipline_id=discipline_id,
        sub_discipline_id=sub_discipline_id,
        year=year,
    )


@router.get("/stats/summary", response_model=schemas.SummaryOut)
def get_summary(year: Optional[int] = None, db: Session = Depends(get_db)):
    return crud.summary(db, year)


@router.post("/competitions", response_model=schemas.CompetitionOut, status_code=201)
def post_competition(competition: schemas.CompetitionCreate, db: Session = Depends(get_db)):
    _validate_discipline_pair(db, competition.discipline_id, competition.sub_discipline_id)
    return crud.create_competition(db, competition)


@router.put("/competitions/{competition_id}", response_model=schemas.CompetitionOut)
def put_competition(
    competition_id: int, competition: schemas.CompetitionUpdate, db: Session = Depends(get_db)
):
    obj = crud.get_competition(db, competition_id)
    if obj is None:
        raise HTTPException(status_code=404, detail="Compétition introuvable")
    _validate_discipline_pair(db, competition.discipline_id, competition.sub_discipline_id)
    return crud.update_competition(db, obj, competition)


@router.delete("/competitions/{competition_id}", status_code=204)
def delete_competition(competition_id: int, db: Session = Depends(get_db)):
    obj = crud.get_competition(db, competition_id)
    if obj is None:
        raise HTTPException(status_code=404, detail="Compétition introuvable")
    crud.delete_competition(db, obj)
