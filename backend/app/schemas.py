from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict

from .models import CompetitionStatus, FormatType


class SubDisciplineBase(BaseModel):
    name: str


class SubDisciplineCreate(SubDisciplineBase):
    pass


class SubDisciplineOut(SubDisciplineBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    discipline_id: int


class DisciplineBase(BaseModel):
    name: str


class DisciplineCreate(DisciplineBase):
    pass


class DisciplineOut(DisciplineBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    sub_disciplines: list[SubDisciplineOut] = []


class CompetitionBase(BaseModel):
    name: str
    status: CompetitionStatus = CompetitionStatus.a_faire
    competition_url: Optional[str] = None
    price: Optional[float] = None
    location_address: Optional[str] = None
    discipline_id: int
    sub_discipline_id: Optional[int] = None
    format_type: Optional[FormatType] = None
    distance_km: Optional[float] = None
    event_date: date
    result_time: Optional[str] = None
    result_rank_overall: Optional[int] = None
    result_rank_category: Optional[int] = None
    result_url: Optional[str] = None
    notes: Optional[str] = None


class CompetitionCreate(CompetitionBase):
    pass


class CompetitionUpdate(CompetitionBase):
    pass


class CompetitionOut(CompetitionBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    gcal_event_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    discipline: DisciplineOut
    sub_discipline: Optional[SubDisciplineOut] = None


class StatusSummary(BaseModel):
    status: CompetitionStatus
    total: float
    count: int


class SummaryOut(BaseModel):
    year: Optional[int] = None
    by_status: list[StatusSummary]
    grand_total: float
