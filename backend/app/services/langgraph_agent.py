# app/services/langgraph_agent.py

import json
import os
from typing import Any, Dict, List, Optional, Tuple

from dotenv import load_dotenv
from langgraph.graph import END, StateGraph
from sqlalchemy.orm import Session

from .. import models
from ..repositories import tickets as ticket_repo
from ..repositories import analysis as analysis_repo

load_dotenv()

ANALYSIS_MODE = os.getenv("ANALYSIS_MODE", "rules").lower()
USE_LLM = ANALYSIS_MODE == "llm"

gemini_model = None
if USE_LLM:
    try:
        import google.generativeai as genai  # type: ignore

        GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
        GEMINI_MODEL_NAME = os.getenv("GEMINI_MODEL_NAME", "gemini-1.5-pro")

        if not GEMINI_API_KEY:
            print("[LangGraph] No GEMINI_API_KEY set, falling back to rules.")
            USE_LLM = False
        else:
            genai.configure(api_key=GEMINI_API_KEY)
            gemini_model = genai.GenerativeModel(GEMINI_MODEL_NAME)
            print(f"[LangGraph] Using Gemini model: {GEMINI_MODEL_NAME}")
    except Exception as e:  # pragma: no cover
        # Any import/configuration issue => we silently fall back to rules
        print("[LangGraph] Failed to initialize Gemini, falling back to rules:", e)
        USE_LLM = False


# ---------- Rule-based helpers ----------

def classify_ticket(ticket: models.Ticket) -> Dict[str, Any]:
    """Simple keyword-based classifier used as fallback or in rules mode."""
    text = (ticket.title + " " + ticket.description).lower()

    if any(word in text for word in ["billing", "invoice", "charge", "payment"]):
        category = "billing"
    elif any(word in text for word in ["bug", "error", "crash", "issue", "failure"]):
        category = "bug"
    elif "feature" in text or "request" in text:
        category = "feature_request"
    else:
        category = "other"

    if any(word in text for word in ["urgent", "asap", "down", "critical"]):
        priority = "high"
    elif any(word in text for word in ["slow", "annoying", "degraded"]):
        priority = "medium"
    else:
        priority = "low"

    return {
        "category": category,
        "priority": priority,
        "notes": f"Rule-based classification: {category}, {priority}",
    }


def summarize(tickets: List[models.Ticket], used_llm: bool) -> str:
    if not tickets:
        return "No tickets to analyze."

    titles = ", ".join(t.title for t in tickets[:5])
    suffix = "" if len(tickets) <= 5 else f" (+{len(tickets) - 5} more)"
    mode_str = "LLM mode" if used_llm else "rule mode"
    return f"Analyzed {len(tickets)} tickets using {mode_str}. Example titles: {titles}{suffix}."


# ---------- LLM helper (with internal fallback) ----------

def llm_classify_tickets(tickets: List[models.Ticket]) -> Optional[List[Dict[str, Any]]]:
    """
    Try to classify tickets with Gemini.
    Returns:
        - list[dict] on success (one dict per ticket, with 'ticket' attached)
        - None on any error -> caller should fall back to rules.
    """
    if not USE_LLM or not gemini_model or not tickets:
        return None

    try:
        prompt = """
You are a support ticket triage assistant.

For each ticket, assign:
- category: one of "bug", "billing", "feature_request", "other"
- priority: one of "low", "medium", "high"
- notes: a short explanation (1–2 sentences).

Return ONLY valid JSON (no markdown fences), as a list of objects:
[
  {
    "ticket_id": 1,
    "category": "bug",
    "priority": "high",
    "notes": "..."
  },
  ...
]
"""

        ticket_payload = [
            {
                "ticket_id": t.id,
                "title": t.title,
                "description": t.description,
            }
            for t in tickets
        ]

        input_text = prompt + "\n\nTICKETS_JSON =\n" + json.dumps(ticket_payload, ensure_ascii=False)

        resp = gemini_model.generate_content(input_text)  # type: ignore[attr-defined]
        raw = resp.text.strip()  # type: ignore[assignment]

        # Strip ```json fences if Gemini adds them
        if raw.startswith("```"):
            first_nl = raw.find("\n")
            last_fence = raw.rfind("```")
            if first_nl != -1 and last_fence != -1:
                raw = raw[first_nl + 1:last_fence].strip()

        print("=== GEMINI RAW RESPONSE ===")
        print(raw)

        data = json.loads(raw)
        if not isinstance(data, list):
            print("[LangGraph] LLM returned non-list JSON, falling back to rules.")
            return None

        results: List[Dict[str, Any]] = []

        for ticket in tickets:
            # Find matching entry by ticket_id
            match = next((item for item in data if item.get("ticket_id") == ticket.id), None)

            if not match:
                # No result for this ticket -> per-ticket fallback
                rb = classify_ticket(ticket)
                rb["notes"] += " (LLM missing result; rule-based fallback)"
                rb["ticket"] = ticket
                results.append(rb)
                continue

            category = str(match.get("category", "")).strip().lower()
            priority = str(match.get("priority", "")).strip().lower()
            notes = str(match.get("notes", "")).strip() or "LLM classification."

            if category not in {"bug", "billing", "feature_request", "other"} or \
                    priority not in {"low", "medium", "high"}:
                # Invalid labels -> per-ticket fallback
                rb = classify_ticket(ticket)
                rb["notes"] += " (LLM invalid result; rule-based fallback)"
                rb["ticket"] = ticket
                results.append(rb)
                continue

            results.append(
                {
                    "category": category,
                    "priority": priority,
                    "notes": notes,
                    "ticket": ticket,
                }
            )

        return results

    except Exception as e:  # pragma: no cover
        # Any error -> signal caller to use rules for all tickets
        print("[LangGraph] LLM error, falling back to rules for all tickets:", e)
        return None


# ---------- LangGraph wiring ----------

def build_graph(db: Session):
    def fetch_tickets(state: Dict[str, Any]) -> Dict[str, Any]:
        ticket_ids = state.get("ticket_ids")
        found = ticket_repo.get_by_ids_or_all(db, ticket_ids)
        return {**state, "tickets": found}

    def analyze_tickets_node(state: Dict[str, Any]) -> Dict[str, Any]:
        tickets: List[models.Ticket] = state["tickets"]
        analyses: List[Dict[str, Any]] = []
        used_llm = False

        if USE_LLM:
            llm_results = llm_classify_tickets(tickets)
            if llm_results is not None:
                analyses = llm_results
                used_llm = True
            else:
                # Global fallback: all tickets via rules
                for t in tickets:
                    info = classify_ticket(t)
                    info["notes"] += " (LLM unavailable; rule-based fallback)"
                    info["ticket"] = t
                    analyses.append(info)
        else:
            # Pure rules mode
            for t in tickets:
                info = classify_ticket(t)
                info["ticket"] = t
                analyses.append(info)

        return {**state, "analyses": analyses, "used_llm": used_llm}

    def write_results(state: Dict[str, Any]) -> Dict[str, Any]:
        analyses: List[Dict[str, Any]] = state["analyses"]
        tickets = [a["ticket"] for a in analyses]
        used_llm: bool = state.get("used_llm", False)

        summary = summarize(tickets, used_llm)

        run, results = analysis_repo.create_run_with_results(
            db=db,
            summary=summary,
            tickets=tickets,
            analyses=analyses,
        )

        return {**state, "run": run, "results": results}

    graph = StateGraph(dict)
    graph.add_node("fetch_tickets", fetch_tickets)
    graph.add_node("analyze_tickets", analyze_tickets_node)
    graph.add_node("write_results", write_results)

    graph.set_entry_point("fetch_tickets")
    graph.add_edge("fetch_tickets", "analyze_tickets")
    graph.add_edge("analyze_tickets", "write_results")
    graph.add_edge("write_results", END)

    return graph.compile()


def run_analysis(
        db: Session,
        ticket_ids: Optional[List[int]] = None,
) -> Tuple[models.AnalysisRun, List[models.TicketAnalysis]]:
    compiled = build_graph(db)
    state = {"ticket_ids": ticket_ids}
    final = compiled.invoke(state)
    return final["run"], final["results"]
