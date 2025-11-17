# app/api/tickets.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.schemas import TicketCreate, TicketRead
from app.repositories.tickets import create_tickets
from app.services.db import get_db

router = APIRouter(prefix="/api/tickets")

@router.post("/", response_model=list[TicketRead])
def create_tickets_endpoint(
        ticket_list: list[TicketCreate],
        db: Session = Depends(get_db),
):
    return create_tickets(db, ticket_list)
