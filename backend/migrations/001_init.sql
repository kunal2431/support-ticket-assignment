-- tickets: raw support tickets
CREATE TABLE IF NOT EXISTS tickets (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- analysis_runs: one row per analysis execution
CREATE TABLE IF NOT EXISTS analysis_runs (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    summary TEXT NOT NULL
);

-- ticket_analysis: per-ticket result for a given run
CREATE TABLE IF NOT EXISTS ticket_analysis (
    id SERIAL PRIMARY KEY,
    analysis_run_id INTEGER NOT NULL REFERENCES analysis_runs(id) ON DELETE CASCADE,
    ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    priority TEXT NOT NULL,
    notes TEXT
);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_ticket_analysis_run_id
    ON ticket_analysis (analysis_run_id);

CREATE INDEX IF NOT EXISTS idx_ticket_analysis_ticket_id
    ON ticket_analysis (ticket_id);
