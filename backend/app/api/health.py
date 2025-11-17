# app/api/health.py
from fastapi import APIRouter
from sqlalchemy import text

from app.services.db import SessionLocal

router = APIRouter()


@router.get("/health")
def health():
    return {"status": "ok"}


@router.get("/health/db")
def db_health():
    try:
        with SessionLocal() as session:
            session.execute(text("SELECT 1;"))

        return {"status": "ok", "db": "connected"}

    except Exception as e:
        return {"status": "error", "db": str(e)}
