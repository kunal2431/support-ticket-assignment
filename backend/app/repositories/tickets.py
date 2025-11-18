# app/repositories/tickets.py
from typing import Iterable, List, Optional

from sqlalchemy.orm import Session
from app import models, schemas


def create_tickets(
        db: Session,
        items: List[schemas.TicketCreate],
) -> List[models.Ticket]:
    records: List[models.Ticket] = []

    for item in items:
        ticket = models.Ticket(
            title=item.title,
            description=item.description,
        )
        db.add(ticket)
        records.append(ticket)

    db.commit()
    for r in records:
        db.refresh(r)

    return records


def get_by_ids_or_all(
        db: Session,
        ids: Optional[Iterable[int]],
) -> List[models.Ticket]:
    query = db.query(models.Ticket)

    if ids:
        query = query.filter(models.Ticket.id.in_(ids))

    return query.order_by(models.Ticket.id.asc()).all()
