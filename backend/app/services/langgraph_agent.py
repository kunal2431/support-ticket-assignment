from typing import Any, Dict, List, Optional, Tuple

from langgraph.graph import END, StateGraph
from sqlalchemy.orm import Session

from .. import models
from ..repositories import tickets as ticket_repo
from ..repositories import analysis as analysis_repo


def classify_ticket(ticket: models.Ticket) -> Dict[str, Any]:
    text = (ticket.title + " " + ticket.description).lower()

    if any(word in text for word in ["billing", "invoice", "charge"]):
        category = "billing"
    elif any(word in text for word in ["bug", "error", "crash"]):
        category = "bug"
    elif "feature" in text or "request" in text:
        category = "feature_request"
    else:
        category = "other"

    if any(word in text for word in ["urgent", "asap", "down"]):
        priority = "high"
    elif any(word in text for word in ["slow", "annoying"]):
        priority = "medium"
    else:
        priority = "low"

    return {
        "category": category,
        "priority": priority,
        "notes": f"Rule-based classification: {category}, {priority}",
    }


def summarize(tickets: List[models.Ticket]) -> str:
    if not tickets:
        return "No tickets to analyze."

    titles = ", ".join(t.title for t in tickets[:5])
    suffix = "" if len(tickets) <= 5 else f" (+{len(tickets) - 5} more)"
    return f"Analyzed {len(tickets)} tickets. Example titles: {titles}{suffix}."


def build_graph(db: Session):
    def fetch_tickets(state: Dict[str, Any]) -> Dict[str, Any]:
        ticket_ids = state.get("ticket_ids")
        found = ticket_repo.get_by_ids_or_all(db, ticket_ids)
        return {**state, "tickets": found}

    def analyze_tickets(state: Dict[str, Any]) -> Dict[str, Any]:
        tickets: List[models.Ticket] = state["tickets"]
        analyses = []

        for ticket in tickets:
            info = classify_ticket(ticket)
            info["ticket"] = ticket
            analyses.append(info)

        return {**state, "analyses": analyses}

    def write_results(state: Dict[str, Any]) -> Dict[str, Any]:
        analyses = state["analyses"]
        tickets = [a["ticket"] for a in analyses]
        summary = summarize(tickets)

        run, results = analysis_repo.create_run_with_results(
            db=db,
            summary=summary,
            tickets=tickets,
            analyses=analyses,
        )

        return {**state, "run": run, "results": results}

    graph = StateGraph(dict)
    graph.add_node("fetch_tickets", fetch_tickets)
    graph.add_node("analyze_tickets", analyze_tickets)
    graph.add_node("write_results", write_results)

    graph.set_entry_point("fetch_tickets")
    graph.add_edge("fetch_tickets", "analyze_tickets")
    graph.add_edge("analyze_tickets", "write_results")
    graph.add_edge("write_results", END)

    return graph.compile()


def run_analysis(
        db: Session,
        ticket_ids: Optional[List[int]] = None,
):
    compiled = build_graph(db)
    state = {"ticket_ids": ticket_ids}
    final = compiled.invoke(state)
    return final["run"], final["results"]
