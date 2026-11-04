import { getPool } from "./db";
import { parseCountRow, toCounts, type Counts, type Variant } from "./experiment";

/**
 * Records the impression of one 30-minute session.
 * The unique index on session_id makes a repeated call a no-op.
 */
export async function recordImpression(
  visitorId: string,
  variant: Variant,
  sessionId: string,
): Promise<boolean> {
  const result = await getPool().query(
    `INSERT INTO experiment_events (type, visitor_id, variant, session_id)
     VALUES ('impression', $1, $2, $3)
     ON CONFLICT (session_id) WHERE type = 'impression' DO NOTHING`,
    [visitorId, variant, sessionId],
  );
  return result.rowCount === 1;
}

export type ConversionResult = "recorded" | "already-converted" | "no-impression";

/**
 * Records the single conversion of a visitor. It only counts when that visitor
 * already has an impression, so the rate can never be built from thin air.
 */
export async function recordConversion(
  visitorId: string,
  variant: Variant,
): Promise<ConversionResult> {
  const result = await getPool().query(
    `INSERT INTO experiment_events (type, visitor_id, variant)
     SELECT 'conversion', $1, $2
     WHERE EXISTS (
       SELECT 1 FROM experiment_events
       WHERE type = 'impression' AND visitor_id = $1 AND variant = $2
     )
     ON CONFLICT (visitor_id) WHERE type = 'conversion' DO NOTHING`,
    [visitorId, variant],
  );
  if (result.rowCount === 1) return "recorded";

  const existing = await getPool().query(
    `SELECT 1 FROM experiment_events WHERE type = 'conversion' AND visitor_id = $1`,
    [visitorId],
  );
  return existing.rowCount ? "already-converted" : "no-impression";
}

/** Live counts per variant. Every row is validated before it is used. */
export async function readCounts(): Promise<Record<Variant, Counts>> {
  const result = await getPool().query(
    `SELECT variant, type, COUNT(*) AS total
     FROM experiment_events
     GROUP BY variant, type`,
  );
  const rows = result.rows.map(parseCountRow);
  if (rows.some((row) => row === null)) {
    throw new Error("The event log returned a row that does not match the expected shape");
  }
  return toCounts(rows.filter((row) => row !== null));
}
