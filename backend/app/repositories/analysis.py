from typing import Dict, List, Optional, Tuple

from sqlalchemy.orm import Session, joinedload

from .. import models


def create_run_with_results(
        db: Session,
        summary: str,
        tickets: List[models.Ticket],
        analyses: List[Dict],
) -> Tuple[models.AnalysisRun, List[models.TicketAnalysis]]:
    run = models.AnalysisRun(summary=summary)
    db.add(run)
    db.flush()

    created: List[models.TicketAnalysis] = []
    for ticket, data in zip(tickets, analyses, strict=False):
        row = models.TicketAnalysis(
            analysis_run_id=run.id,
            ticket_id=ticket.id,
            category=data["category"],
            priority=data["priority"],
            notes=data.get("notes"),
        )
        db.add(row)
        created.append(row)

    db.commit()
    db.refresh(run)
    for r in created:
        db.refresh(r)

    return run, created


def get_latest_with_tickets(
        db: Session,
):
    run = (
        db.query(models.AnalysisRun)
        .order_by(models.AnalysisRun.created_at.desc())
        .first()
    )
    if not run:
        return None, []

    items = (
        db.query(models.TicketAnalysis)
        .options(joinedload(models.TicketAnalysis.ticket))
        .filter(models.TicketAnalysis.analysis_run_id == run.id)
        .order_by(models.TicketAnalysis.id.asc())
        .all()
    )

    return run, items
