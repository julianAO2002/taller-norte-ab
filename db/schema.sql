-- Experiment event log. Visitor and variant live in cookies; events live here.
CREATE TABLE IF NOT EXISTS experiment_events (
  id          BIGSERIAL PRIMARY KEY,
  type        TEXT        NOT NULL CHECK (type IN ('impression', 'conversion')),
  visitor_id  UUID        NOT NULL,
  variant     CHAR(1)     NOT NULL CHECK (variant IN ('a', 'b')),
  session_id  UUID,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK ((type = 'impression') = (session_id IS NOT NULL))
);

-- One impression per 30-minute session.
CREATE UNIQUE INDEX IF NOT EXISTS experiment_events_one_impression_per_session
  ON experiment_events (session_id)
  WHERE type = 'impression';

-- One conversion per visitor.
CREATE UNIQUE INDEX IF NOT EXISTS experiment_events_one_conversion_per_visitor
  ON experiment_events (visitor_id)
  WHERE type = 'conversion';
