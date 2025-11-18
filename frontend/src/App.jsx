import { useEffect, useState } from "react";

// Backend base URL (can override with Vite env if you want)
const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

function App() {
  const [tickets, setTickets] = useState([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isSavingTicket, setIsSavingTicket] = useState(false);

  const [selectedIds, setSelectedIds] = useState(new Set());

  const [analysis, setAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const [error, setError] = useState("");

  // -------- helpers --------
  const asArray = (value) => Array.isArray(value) ? value : [];

  const toggleSelected = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // -------- load initial data --------
  useEffect(() => {
    const loadInitial = async () => {
      try {
        setError("");

        // 1) Load tickets
        const tRes = await fetch(`${API_BASE}/api/tickets`);
        if (tRes.ok) {
          const tData = await tRes.json();
          setTickets(asArray(tData));
        }

        // 2) Load latest analysis (optional, fine if none yet)
        const aRes = await fetch(`${API_BASE}/api/analysis/latest`);
        if (aRes.ok) {
          const aData = await aRes.json();
          if (aData && aData.analysis_run) {
            setAnalysis(aData);
          }
        }
      } catch (e) {
        console.error(e);
        setError("Failed to load initial data.");
      }
    };

    loadInitial();
  }, []);

  // -------- create ticket --------
  const handleAddTicket = async (e) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setError("Title and description are required.");
      return;
    }

    setError("");
    setIsSavingTicket(true);
    try {
      const payload = [{ title: title.trim(), description: description.trim() }];

      const res = await fetch(`${API_BASE}/api/tickets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`Create failed: ${res.status}`);
      }

      const data = await res.json();
      const created = asArray(data);

      setTickets((prev) => [...prev, ...created]);
      setTitle("");
      setDescription("");
    } catch (e) {
      console.error(e);
      setError("Failed to create ticket.");
    } finally {
      setIsSavingTicket(false);
    }
  };

  // -------- run analysis --------
  const handleAnalyze = async () => {
    setError("");
    setIsAnalyzing(true);
    try {
      const idsArray = Array.from(selectedIds);
      const hasSelection = idsArray.length > 0;

      const body = hasSelection ? { ticketIds: idsArray } : {};

      const res = await fetch(`${API_BASE}/api/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // If no selection, still send {}, FastAPI will treat as optional body
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        throw new Error(`Analyze failed: ${res.status}`);
      }

      const data = await res.json();
      setAnalysis(data);
    } catch (e) {
      console.error(e);
      setError("Failed to run analysis.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // -------- UI pieces --------
  const renderTicketList = () => {
    if (!tickets.length) {
      return <p className="muted">No tickets yet.</p>;
    }

    return (
      <ul className="ticket-list">
        {tickets.map((t) => {
          const shortDesc =
            t.description.length > 80
              ? t.description.slice(0, 80) + "..."
              : t.description;

          const checked = selectedIds.has(t.id);

          return (
            <li key={t.id} className="ticket-row">
              <label className="ticket-checkbox">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleSelected(t.id)}
                />
                <span className="ticket-title">{t.title}</span>
              </label>
              <span className="ticket-desc">{shortDesc}</span>
            </li>
          );
        })}
      </ul>
    );
  };

  const renderAnalysis = () => {
    if (!analysis || !analysis.analysis_run) {
      return <p className="muted">No analysis has been run yet.</p>;
    }

    const run = analysis.analysis_run;
    const items = asArray(analysis.ticket_analysis);

    return (
      <div className="analysis-panel">
        <h3>Latest analysis</h3>
        <p className="muted">
          Run #{run.id} •{" "}
          {new Date(run.created_at).toLocaleString(undefined, {
            dateStyle: "short",
            timeStyle: "short",
          })}
        </p>
        {run.summary && <p className="summary">{run.summary}</p>}

        <h4>Per-ticket results</h4>
        {items.length === 0 && (
          <p className="muted">No per-ticket results found.</p>
        )}
        <ul className="analysis-list">
          {items.map((row) => (
            <li key={row.id} className="analysis-row">
              <div className="analysis-header">
                <strong>{row.ticket?.title ?? `Ticket #${row.ticket_id}`}</strong>
              </div>
              <div className="analysis-meta">
                <span className="pill pill-category">{row.category}</span>
                <span className="pill pill-priority">{row.priority}</span>
              </div>
              {row.notes && <p className="notes">{row.notes}</p>}
            </li>
          ))}
        </ul>
      </div>
    );
  };

  // -------- render root --------
  return (
    <div className="page">
      <header>
        <h1>Support Ticket Analyzer</h1>
      </header>

      {error && <div className="error">{error}</div>}

      <main className="layout">
        {/* Left: create + list tickets */}
        <section className="card">
          <h2>Create tickets</h2>
          <form onSubmit={handleAddTicket} className="ticket-form">
            <label>
              Title
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Login issue"
              />
            </label>

            <label>
              Description
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="User cannot log in with correct credentials"
                rows={3}
              />
            </label>

            <button type="submit" disabled={isSavingTicket}>
              {isSavingTicket ? "Adding..." : "Add ticket"}
            </button>
          </form>

          <h3>Existing tickets</h3>
          <p className="muted small">
            Select specific tickets to analyze, or leave all unchecked to
            analyze everything.
          </p>
          {renderTicketList()}
        </section>

        {/* Right: analyze + show results */}
        <section className="card">
          <h2>Analysis</h2>
          <button onClick={handleAnalyze} disabled={isAnalyzing || !tickets.length}>
            {isAnalyzing ? "Analyzing..." : "Analyze tickets"}
          </button>
          {isAnalyzing && (
            <p className="muted small">Running LangGraph analysis…</p>
          )}

          <div className="divider" />

          {renderAnalysis()}
        </section>
      </main>

      {/* Extremely light inline style so you don't have to touch CSS if you don't want */}
      <style>{`
        .page {
          max-width: 1100px;
          margin: 0 auto;
          padding: 1.5rem;
          font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }
        header h1 {
          margin-bottom: 1rem;
        }
        .layout {
          display: grid;
          grid-template-columns: 1.1fr 1.2fr;
          gap: 1.5rem;
        }
        .card {
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 1rem 1.25rem;
          background: #fafafa;
        }
        .ticket-form label {
          display: block;
          margin-bottom: 0.75rem;
        }
        .ticket-form input,
        .ticket-form textarea {
          width: 100%;
          box-sizing: border-box;
          margin-top: 0.25rem;
          padding: 0.4rem 0.5rem;
        }
        .ticket-form button {
          margin-top: 0.5rem;
        }
        .ticket-list {
          list-style: none;
          padding: 0;
          margin: 0.5rem 0 0;
        }
        .ticket-row {
          border-bottom: 1px solid #e3e3e3;
          padding: 0.5rem 0;
        }
        .ticket-checkbox {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-weight: 500;
        }
        .ticket-desc {
          display: block;
          font-size: 0.85rem;
          color: #555;
          margin-left: 1.5rem;
        }
        .analysis-panel {
          margin-top: 1rem;
        }
        .summary {
          margin: 0.5rem 0 1rem;
        }
        .analysis-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }
        .analysis-row {
          border-bottom: 1px solid #e3e3e3;
          padding: 0.6rem 0;
        }
        .analysis-meta {
          display: flex;
          gap: 0.5rem;
          margin: 0.25rem 0;
        }
        .pill {
          display: inline-block;
          padding: 0.1rem 0.5rem;
          border-radius: 999px;
          font-size: 0.75rem;
        }
        .pill-category {
          background: #e0f2fe;
          color: #075985;
        }
        .pill-priority {
          background: #fee2e2;
          color: #b91c1c;
        }
        .notes {
          font-size: 0.9rem;
          color: #333;
        }
        .muted {
          color: #666;
        }
        .small {
          font-size: 0.8rem;
        }
        .divider {
          height: 1px;
          background: #e1e1e1;
          margin: 1rem 0;
        }
        .error {
          background: #fee2e2;
          border: 1px solid #fecaca;
          color: #b91c1c;
          padding: 0.5rem 0.75rem;
          border-radius: 6px;
          margin-bottom: 1rem;
        }
        @media (max-width: 800px) {
          .layout {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}

export default App;
