from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import schemas
from app.services.db import get_db
from ..services import langgraph_agent
from ..repositories import analysis as analysis_repo

router = APIRouter(prefix="/api", tags=["analysis"])


@router.post("/analyze", response_model=schemas.AnalysisResult)
def analyze_tickets(
        body: schemas.AnalyzeRequest | None = None,
        db: Session = Depends(get_db),
):
    ticket_ids = body.ticket_ids if body else None

    run, results = langgraph_agent.run_analysis(
        db=db,
        ticket_ids=ticket_ids
    )

    return schemas.AnalysisResult(
        analysis_run=run,
        ticket_analysis=results
    )


@router.get("/analysis/latest", response_model=schemas.AnalysisResult)
def get_latest_analysis(
        db: Session = Depends(get_db),
):
    run, results = analysis_repo.get_latest_with_tickets(db)

    if not run:
        return schemas.AnalysisResult(
            analysis_run=None,
            ticket_analysis=[]
        )

    return schemas.AnalysisResult(
        analysis_run=run,
        ticket_analysis=results
    )
