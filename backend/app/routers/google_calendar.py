import os
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from google.auth.transport.requests import Request as GoogleRequest
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from sqlalchemy.orm import Session

from .. import crud
from ..database import get_db

router = APIRouter(prefix="/api", tags=["google-calendar"])

SCOPES = ["https://www.googleapis.com/auth/calendar.events"]
CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "")
CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET", "")
REDIRECT_URI = os.environ.get("GOOGLE_REDIRECT_URI", "")
FRONTEND_RETURN_URL = os.environ.get("FRONTEND_URL", "/")


def _build_flow() -> Flow:
    if not (CLIENT_ID and CLIENT_SECRET and REDIRECT_URI):
        raise HTTPException(
            status_code=503,
            detail="Google Calendar non configuré (GOOGLE_CLIENT_ID/SECRET/REDIRECT_URI manquants)",
        )
    client_config = {
        "web": {
            "client_id": CLIENT_ID,
            "client_secret": CLIENT_SECRET,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": [REDIRECT_URI],
        }
    }
    return Flow.from_client_config(client_config, scopes=SCOPES, redirect_uri=REDIRECT_URI)


@router.get("/auth/google/login")
def google_login():
    flow = _build_flow()
    authorization_url, _state = flow.authorization_url(
        access_type="offline", prompt="consent", include_granted_scopes="true"
    )
    return RedirectResponse(authorization_url)


@router.get("/auth/google/callback")
def google_callback(code: str, db: Session = Depends(get_db)):
    flow = _build_flow()
    flow.fetch_token(code=code)
    credentials = flow.credentials
    if not credentials.refresh_token:
        raise HTTPException(
            status_code=400,
            detail="Aucun refresh token reçu, révoque l'accès dans ton compte Google et réessaie",
        )
    crud.save_google_refresh_token(db, credentials.refresh_token)
    return RedirectResponse(FRONTEND_RETURN_URL)


def _get_calendar_service(db: Session):
    token = crud.get_google_token(db)
    if token is None:
        raise HTTPException(
            status_code=400,
            detail="Google Agenda non connecté, va sur /api/auth/google/login d'abord",
        )
    credentials = Credentials(
        token=None,
        refresh_token=token.refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=CLIENT_ID,
        client_secret=CLIENT_SECRET,
        scopes=SCOPES,
    )
    credentials.refresh(GoogleRequest())
    return build("calendar", "v3", credentials=credentials)


@router.post("/competitions/{competition_id}/export-calendar")
def export_calendar(competition_id: int, db: Session = Depends(get_db)):
    competition = crud.get_competition(db, competition_id)
    if competition is None:
        raise HTTPException(status_code=404, detail="Compétition introuvable")

    service = _get_calendar_service(db)

    description_parts = []
    if competition.location_address:
        description_parts.append(f"Lieu : {competition.location_address}")
    if competition.competition_url:
        description_parts.append(f"Page compétition : {competition.competition_url}")

    event_body = {
        "summary": competition.name,
        "description": "\n".join(description_parts),
        "location": competition.location_address or "",
        "start": {"date": competition.event_date.isoformat()},
        "end": {"date": (competition.event_date + timedelta(days=1)).isoformat()},
        "reminders": {
            "useDefault": False,
            "overrides": [{"method": "popup", "minutes": 24 * 60}],
        },
    }

    if competition.gcal_event_id:
        event = (
            service.events()
            .update(calendarId="primary", eventId=competition.gcal_event_id, body=event_body)
            .execute()
        )
    else:
        event = service.events().insert(calendarId="primary", body=event_body).execute()
        competition.gcal_event_id = event["id"]
        db.commit()

    return {"gcal_event_id": event["id"], "html_link": event.get("htmlLink")}
