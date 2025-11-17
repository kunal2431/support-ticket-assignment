from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import schemas
from ..services.db import get_db
from ..repositories import tickets as ticket_repo

router = APIRouter(prefix="/api", tags=["tickets"])


@router.post("/tickets", response_model=List[schemas.TicketRead])
def create_tickets(
        payload: List[schemas.TicketCreate],
        db: Session = Depends(get_db),
):
    created = ticket_repo.create_many(db, payload)
    return created
