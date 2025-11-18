# app/api/tickets.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.schemas import TicketCreate, TicketRead
from app.repositories import tickets as ticket_repo
from app.services.db import get_db

router = APIRouter(prefix="/api/tickets", tags=["tickets"])


@router.post("/", response_model=list[TicketRead])
def create_tickets_endpoint(
        ticket_list: list[TicketCreate],
        db: Session = Depends(get_db),
):
    return ticket_repo.create_many(db, ticket_list)


@router.get("/", response_model=list[TicketRead])
def list_tickets_endpoint(
        db: Session = Depends(get_db),
):
    # returns all tickets ordered by id asc
    return ticket_repo.get_by_ids_or_all(db, ids=None)
