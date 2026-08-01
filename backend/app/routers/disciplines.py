from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import crud, models, schemas
from ..database import get_db

router = APIRouter(prefix="/api/disciplines", tags=["disciplines"])


@router.get("", response_model=list[schemas.DisciplineOut])
def get_disciplines(db: Session = Depends(get_db)):
    return crud.list_disciplines(db)


@router.post("", response_model=schemas.DisciplineOut, status_code=201)
def post_discipline(discipline: schemas.DisciplineCreate, db: Session = Depends(get_db)):
    existing = db.query(models.Discipline).filter(models.Discipline.name == discipline.name).first()
    if existing:
        raise HTTPException(status_code=409, detail="Discipline déjà existante")
    return crud.create_discipline(db, discipline)


@router.post(
    "/{discipline_id}/sub-disciplines",
    response_model=schemas.SubDisciplineOut,
    status_code=201,
)
def post_sub_discipline(
    discipline_id: int, sub: schemas.SubDisciplineCreate, db: Session = Depends(get_db)
):
    discipline = db.query(models.Discipline).filter(models.Discipline.id == discipline_id).first()
    if discipline is None:
        raise HTTPException(status_code=404, detail="Discipline introuvable")
    return crud.create_sub_discipline(db, discipline_id, sub)
