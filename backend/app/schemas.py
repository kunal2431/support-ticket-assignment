from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


class TicketBase(BaseModel):
    title: str
    description: str


class TicketCreate(TicketBase):
    pass


class TicketRead(TicketBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AnalysisRunRead(BaseModel):
    id: int
    created_at: datetime
    summary: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class TicketAnalysisRead(BaseModel):
    id: int
    analysis_run_id: int
    ticket_id: int
    category: str
    priority: str
    notes: Optional[str] = None
    ticket: TicketRead

    model_config = ConfigDict(from_attributes=True)


class AnalyzeRequest(BaseModel):
    ticket_ids: Optional[list[int]] = Field(default=None, alias="ticketIds")

    model_config = ConfigDict(populate_by_name=True)


class AnalysisResult(BaseModel):
    analysis_run: Optional[AnalysisRunRead]
    ticket_analysis: List[TicketAnalysisRead]
