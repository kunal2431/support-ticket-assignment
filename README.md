# Support Ticket Analyzer

Hello!! I'm **Kunal Sangurmath**, with **3+ years of software engineering experience** and a **Master of Science in Computer Science**.

I am really interested in the **Founding Engineer role at Flowtel**, and this project demonstrates my ability to design, architect, and deliver full-stack, AI-powered systems with strong reliability, clean abstractions, and production-ready Docker infrastructure.

**LinkedIn:** https://www.linkedin.com/in/kunalsangurmath  
**GitHub:** https://github.com/kunal2431  

---

# Support Ticket Analyzer — Full Stack AI Application

A fully containerized support ticket management and analysis system using:

- **FastAPI (Python)**  
- **React + Vite (Frontend)**  
- **PostgreSQL (Database)**  
- **LangGraph + Google Gemini** for LLM-powered classification  
- **Docker Compose** for unified orchestration  

Users can:

- Create tickets  
- Select specific tickets to analyze  
- Run either **Rule-Based** or **LLM-Based** analysis  
- View structured results in a clean UI  
- See analysis metadata including: category, priority, notes, and analysis mode  

---

## 1. Quickstart

### **Prerequisites**
You need the following installed:

- **Docker** (20.x or higher)
- **Docker Compose** (v2 or higher)

(Optional for local non-Docker development):
- Python 3.12  
- Node.js 18+  

---

### **Run the Entire Project**

From project root:

```bash
docker compose up --build
```

This will:

- Start PostgreSQL  
- Start the backend (FastAPI + LangGraph)  
- Start the frontend (React + Vite)  
- Automatically create all database tables  
- Wait for the DB before backend starts  

---

### **Default Ports**

| Service   | URL / Port |
|-----------|------------|
| Frontend  | http://localhost:3000 |
| Backend   | http://localhost:8000 |
| PostgreSQL | localhost:5432 |

---

## 2. Configuration

### **Environment Variables**

The backend loads environment variables from:

```
backend/.env
```

Update the values:

```env
DATABASE_URL=postgresql+psycopg2://app:app@db:5432/support_tickets
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
GEMINI_MODEL_NAME=gemini-2.5-flash
ANALYSIS_MODE=llm
```

---

### **Backend → Postgres Connection**

SQLAlchemy initializes the DB via:

```python
engine = create_engine(DATABASE_URL)
Base.metadata.create_all(bind=engine)
```

Tables:

- `tickets`
- `analysis_runs`
- `ticket_analysis`

These are created automatically at container startup.

---

### **LangGraph + LLM Configuration**

The backend supports two modes:

### **Mode: LLM-Based**
When `ANALYSIS_MODE=llm` and the API key is valid:

- LangGraph uses **Gemini 2.5 Flash**  
- A structured agent graph runs:  
  1. `fetch_tickets`  
  2. `analyze_tickets` (LLM node → JSON output)  
  3. `write_results` (stores to DB)  

### **Mode: Rule-Based**
Fallback when:

- No API key  
- Invalid key  
- LLM error  
- `ANALYSIS_MODE=rule`

Uses deterministic keyword classification.

The UI clearly displays:

```
Mode: RULE-BASED
or
Mode: LLM-BASED
```

---

## 3. API Overview

### **POST `/api/tickets`**

Create one or more tickets.

**Request**
```json
[
  { "title": "Booking issue", "description": "Unable to book 2 bedroom rooms" }
]
```

**Response**
```json
[
  {
    "id": 1,
    "title": "Booking issue",
    "description": "Unable to book 2 bedroom rooms",
    "created_at": "2025-01-01T12:00:00"
  }
]
```

---

### **POST `/api/analyze`**

Optional:

```json
{ "ticketIds": [1, 3, 7] }
```

If omitted → analyze all tickets.

Response includes:

- Analysis run metadata
- Each ticket's category, priority, and notes
- Whether **LLM** or **Rule-Based** was used

---

### **GET `/api/analysis/latest`**

Gets the newest full analysis, including:

```json
{
  "analysis_run": { "id": 8, "summary": "...", "created_at": "..." },
  "ticket_analysis": [
    {
      "ticket_id": 2,
      "category": "payment",
      "priority": "high",
      "notes": "LLM classification: payment failure",
      "ticket": {
        "title": "Payment issue",
        "description": "Unable to pay by debit card"
      }
    }
  ]
}
```

---

## 4. Architecture Notes

### **Tech Choices**

#### Backend
- **FastAPI** → modern async Python API framework  
- **SQLAlchemy ORM** → safe, structured DB interaction  
- **LangGraph** → multi-step agent pipeline  
- **Gemini 1.5 Pro** → powerful LLM classification  
- **Docker** → reproducible, portable setup  

#### Frontend
- **React + Vite** → fast dev environment  
- Shows ticket details, analysis mode, categories, and priorities  
- Calls 3 APIs:
  - `/api/tickets`
  - `/api/analyze`
  - `/api/analysis/latest`

#### Infra
- Docker Compose runs everything:
  - `db`
  - `backend`
  - `frontend`
- Backend waits for Postgres before starting

---

### **Directory Structure**

```
support-ticket-analyzer/
│
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── models/
│   │   ├── services/
│   │   ├── repositories/
│   │   ├── main.py
│   │   └── db.py
│   ├── Dockerfile
│   ├── entrypoint.sh
│   ├── requirements.txt
│   └── .env.example
│
├── frontend/
│   ├── src/
│   ├── Dockerfile
│   └── package.json
│
└── docker-compose.yml
```

---

### **LangGraph ↔ Postgres Wiring**

- **fetch_tickets** loads from DB  
- **analyze_tickets** runs Gemini or rule-based  
- **write_results** persists analysis  
- Entire pipeline runs inside the FastAPI container  

---

### **Tradeoffs / Shortcuts**

- Skipped Alembic migrations for speed  
- Rule-based logic kept intentionally simple  
- Minimal UI styling to focus on functionality  
- No authentication  
- Lightweight error handling  

---

## 5. Future Improvements

- Full Alembic migration system  
- Add OpenTelemetry tracing  
- Comprehensive unit and integration tests  
- UI improvements + animations  
- Retry logic for LLM parsing  
- Batch LLM calls for efficiency  
- Add embeddings + semantic search  
- Deploy to GCP/AWS with CI/CD  

---

## 6. Time Spent & Next Steps

I spent **3–4 hours** building this solution end-to-end, including:

- Designing backend models  
- FastAPI REST implementation  
- React frontend with UI panels  
- Docker Compose orchestration  
- LangGraph workflow + LLM integration  
- Rule-based fallback  
- Debugging and containerizing everything  
- Writing documentation  

With more time, I would focus on:

- Observability (logs/metrics)
- Robust LLM error handling  
- Production deployment  
- Better UI/UX polish  
- Maintaining multi-tenant support  

---

Thank you for reviewing my submission!  
I'm excited about the opportunity to contribute as a **Founding Engineer at Flowtel**.
