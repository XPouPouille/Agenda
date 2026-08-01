import enum

from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    func,
)
from sqlalchemy.orm import relationship

from .database import Base


class CompetitionStatus(str, enum.Enum):
    a_faire = "a_faire"
    paye = "paye"
    annule = "annule"
    termine = "termine"


class FormatType(str, enum.Enum):
    XS = "XS"
    S = "S"
    M = "M"
    L = "L"
    XL = "XL"
    XXL = "XXL"


class Discipline(Base):
    __tablename__ = "disciplines"

    id = Column(Integer, primary_key=True)
    name = Column(String(100), unique=True, nullable=False)

    sub_disciplines = relationship(
        "SubDiscipline", back_populates="discipline", cascade="all, delete-orphan"
    )


class SubDiscipline(Base):
    __tablename__ = "sub_disciplines"

    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)
    discipline_id = Column(Integer, ForeignKey("disciplines.id"), nullable=False)

    discipline = relationship("Discipline", back_populates="sub_disciplines")


class Competition(Base):
    __tablename__ = "competitions"

    id = Column(Integer, primary_key=True)
    name = Column(String(200), nullable=False)
    is_favorite = Column(Boolean, nullable=False, default=False, server_default="false")
    status = Column(Enum(CompetitionStatus), nullable=False, default=CompetitionStatus.a_faire)
    competition_url = Column(String(500), nullable=True)
    price = Column(Numeric(10, 2), nullable=True)
    location_address = Column(String(300), nullable=True)

    discipline_id = Column(Integer, ForeignKey("disciplines.id"), nullable=False)
    sub_discipline_id = Column(Integer, ForeignKey("sub_disciplines.id"), nullable=True)

    format_type = Column(Enum(FormatType), nullable=True)
    distance_km = Column(Float, nullable=True)

    event_date = Column(Date, nullable=False)

    result_time = Column(String(50), nullable=True)
    result_rank_overall = Column(Integer, nullable=True)
    result_rank_category = Column(Integer, nullable=True)
    result_url = Column(String(500), nullable=True)

    gcal_event_id = Column(String(200), nullable=True)

    notes = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    discipline = relationship("Discipline")
    sub_discipline = relationship("SubDiscipline")


class GoogleToken(Base):
    __tablename__ = "google_tokens"

    id = Column(Integer, primary_key=True)
    refresh_token = Column(String(500), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
