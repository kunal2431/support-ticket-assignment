import { useEffect, useMemo, useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

function App() {
  const [tickets, setTickets] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // --- helpers ---------------------------------------------------

  const loadTickets = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/tickets`);
      if (!res.ok) throw new Error("Failed to load tickets");
      const data = await res.json();
      setTickets(data);
    } catch (e) {
      console.error(e);
      setError("Could not load tickets");
    }
  };

  const loadLatestAnalysis = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/analysis/latest`);
      if (!res.ok) return; // it's fine if there is no analysis yet
      const data = await res.json();
      setAnalysis(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadTickets();
    loadLatestAnalysis();
  }, []);

  const handleAddTicket = async (e) => {
    e.preventDefault();
    setError(null);

    if (!title.trim() || !description.trim()) {
      setError("Please fill in both title and description.");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/tickets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify([{ title, description }]),
      });
      if (!res.ok) throw new Error("Failed to create ticket");
      const data = await res.json();
      // append returned tickets
      setTickets((prev) => [...prev, ...data]);
      setTitle("");
      setDescription("");
    } catch (e) {
      console.error(e);
      setError("Could not create ticket");
    }
  };

  const toggleSelected = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);
    try {
      const body =
        selectedIds.size > 0 ? { ticketIds: Array.from(selectedIds) } : {};

      const res = await fetch(`${API_BASE}/api/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: Object.keys(body).length ? JSON.stringify(body) : null,
      });
      if (!res.ok) throw new Error("Failed to run analysis");
      const data = await res.json();
      setAnalysis(data);
      // refresh tickets (ids might have grown)
      await loadTickets();
    } catch (e) {
      console.error(e);
      setError("Could not run analysis");
    } finally {
      setLoading(false);
    }
  };

  // Determine whether this run used LLM or rules
  const modeLabel = useMemo(() => {
    if (!analysis?.analysis_run?.summary) return null;
    const s = analysis.analysis_run.summary.toLowerCase();
    return s.includes("llm mode") ? "LLM" : "Rule-based";
  }, [analysis]);

  // --- UI --------------------------------------------------------

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "radial-gradient(circle at top, #333, #000)",
        color: "#f5f5f5",
        padding: "32px",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <h1 style={{ fontSize: "32px", marginBottom: "24px", fontWeight: 700 }}>
        Support Ticket Analyzer
      </h1>

      {error && (
        <div
          style={{
            marginBottom: "16px",
            padding: "8px 12px",
            borderRadius: "6px",
            background: "#4b1d1d",
            border: "1px solid #b94a4a",
            fontSize: "14px",
          }}
        >
          {error}
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.1fr 1.4fr",
          gap: "24px",
        }}
      >
        {/* Left: create + list */}
        <div
          style={{
            background: "rgba(24,24,24,0.95)",
            borderRadius: "10px",
            padding: "20px",
            boxShadow: "0 0 25px rgba(0,0,0,0.5)",
          }}
        >
          <h2 style={{ marginBottom: "12px", fontSize: "18px" }}>Create ticket</h2>

          <form onSubmit={handleAddTicket} style={{ marginBottom: "20px" }}>
            <div style={{ marginBottom: "10px" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "4px",
                  fontSize: "13px",
                  color: "#ccc",
                }}
              >
                Title:
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                style={{
                  width: "100%",
                  borderRadius: "6px",
                  border: "1px solid #555",
                  padding: "8px 10px",
                  background: "#111",
                  color: "#f5f5f5",
                  fontSize: "14px",
                }}
                placeholder="e.g., Login issue"
              />
            </div>

            <div style={{ marginBottom: "10px" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "4px",
                  fontSize: "13px",
                  color: "#ccc",
                }}
              >
                Description:
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                style={{
                  width: "100%",
                  borderRadius: "6px",
                  border: "1px solid #555",
                  padding: "8px 10px",
                  background: "#111",
                  color: "#f5f5f5",
                  fontSize: "14px",
                  resize: "vertical",
                }}
                placeholder="User cannot log in with correct credentials"
              />
            </div>

            <button
              type="submit"
              style={{
                marginTop: "6px",
                padding: "8px 16px",
                borderRadius: "999px",
                border: "none",
                background:
                  "linear-gradient(135deg, #ff7a18 0%, #af002d 50%, #319197 100%)",
                color: "#fff",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Add ticket
            </button>
          </form>

          <div
            style={{
              borderTop: "1px solid #333",
              marginTop: "10px",
              paddingTop: "10px",
              fontSize: "13px",
              color: "#ccc",
            }}
          >
            <p style={{ marginBottom: "8px" }}>
              Select specific tickets to analyze, or leave all unchecked to
              analyze everything.
            </p>

            <div
              style={{
                maxHeight: "260px",
                overflowY: "auto",
                paddingRight: "8px",
              }}
            >
              {tickets.map((t) => (
                <label
                  key={t.id}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "8px",
                    marginBottom: "6px",
                    fontSize: "14px",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(t.id)}
                    onChange={() => toggleSelected(t.id)}
                    style={{ marginTop: "3px" }}
                  />
                  <div>
                    <div style={{ fontWeight: 500 }}>{t.title}</div>
                    <div
                      style={{
                        fontSize: "12px",
                        color: "#aaa",
                        maxWidth: "280px",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {t.description}
                    </div>
                    <div
                      style={{
                        fontSize: "11px",
                        color: "#777",
                        marginTop: "2px",
                      }}
                    >
                      Ticket ID: {t.id}
                    </div>
                  </div>
                </label>
              ))}
              {tickets.length === 0 && (
                <div style={{ fontSize: "13px", color: "#777" }}>
                  No tickets yet. Create one above.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: analysis */}
        <div
          style={{
            background: "rgba(24,24,24,0.95)",
            borderRadius: "10px",
            padding: "20px",
            boxShadow: "0 0 25px rgba(0,0,0,0.5)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "12px",
            }}
          >
            <h2 style={{ fontSize: "18px" }}>Analyze tickets</h2>
            <button
              onClick={handleAnalyze}
              disabled={loading || tickets.length === 0}
              style={{
                padding: "8px 16px",
                borderRadius: "999px",
                border: "none",
                background: loading ? "#444" : "#111",
                color: "#fff",
                cursor: loading ? "default" : "pointer",
                boxShadow: "0 0 0 1px #555",
              }}
            >
              {loading ? "Analyzing..." : "Analyze tickets"}
            </button>
          </div>

          {analysis?.analysis_run && (
            <div
              style={{
                marginBottom: "14px",
                fontSize: "13px",
                color: "#ccc",
                borderBottom: "1px solid #333",
                paddingBottom: "8px",
              }}
            >
              <div>
                <strong>
                  Run #{analysis.analysis_run.id} ·{" "}
                  {new Date(
                    analysis.analysis_run.created_at
                  ).toLocaleString()}
                </strong>
              </div>
              {modeLabel && (
                <div style={{ marginTop: "4px" }}>
                  Mode:{" "}
                  <span
                    style={{
                      padding: "2px 8px",
                      borderRadius: "999px",
                      fontSize: "11px",
                      textTransform: "uppercase",
                      letterSpacing: "0.03em",
                      background:
                        modeLabel === "LLM" ? "#1c3b2b" : "#3b2f1c",
                      border:
                        modeLabel === "LLM"
                          ? "1px solid #3cbf7c"
                          : "1px solid #f0b95c",
                    }}
                  >
                    {modeLabel}
                  </span>
                </div>
              )}
              <div style={{ marginTop: "6px" }}>
                {analysis.analysis_run.summary}
              </div>
            </div>
          )}

          <div
            style={{
              maxHeight: "380px",
              overflowY: "auto",
              paddingRight: "8px",
            }}
          >
            {analysis?.ticket_analysis?.length ? (
              analysis.ticket_analysis.map((row) => (
                <div
                  key={row.id}
                  style={{
                    borderRadius: "8px",
                    border: "1px solid #333",
                    padding: "10px 12px",
                    marginBottom: "10px",
                    background: "#111",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: "4px",
                    }}
                  >
                    <div style={{ fontSize: "13px", color: "#888" }}>
                      Ticket ID: <strong>{row.ticket_id}</strong>
                    </div>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <span
                        style={{
                          padding: "2px 8px",
                          borderRadius: "999px",
                          fontSize: "11px",
                          border: "1px solid #666",
                          textTransform: "lowercase",
                        }}
                      >
                        {row.category}
                      </span>
                      <span
                        style={{
                          padding: "2px 8px",
                          borderRadius: "999px",
                          fontSize: "11px",
                          border: "1px solid #666",
                          textTransform: "lowercase",
                        }}
                      >
                        priority: {row.priority}
                      </span>
                    </div>
                  </div>

                  <div style={{ fontWeight: 500, marginBottom: "2px" }}>
                    {row.ticket?.title}
                  </div>
                  <div
                    style={{
                      fontSize: "12px",
                      color: "#aaa",
                      marginBottom: "6px",
                    }}
                  >
                    {row.ticket?.description}
                  </div>

                  {row.notes && (
                    <div
                      style={{
                        fontSize: "12px",
                        color: "#c7e3ff",
                        borderTop: "1px dashed #333",
                        paddingTop: "6px",
                      }}
                    >
                      {row.notes}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div style={{ fontSize: "13px", color: "#777" }}>
                No analysis results yet. Create a ticket and click{" "}
                <strong>Analyze tickets</strong>.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;