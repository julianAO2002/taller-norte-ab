/**
 * Experiment domain: copy, offer, fixed case, assignment hash, rate and
 * validation of what is read back from cookies, queries and the event log.
 * Pure functions only: no I/O lives here.
 */

export type Variant = "a" | "b";
export type EventType = "impression" | "conversion";

export const VARIANTS: readonly Variant[] = ["a", "b"];
export const CONTROL: Variant = "a";

export const CANONICAL_PATH = "/practica";

export const COOKIES = {
  visitor: "tn_visitor",
  variant: "tn_variant",
  session: "tn_session",
} as const;

export const VISITOR_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;
export const SESSION_MAX_AGE_SECONDS = 30 * 60;

/** The offer is the same in both variants. Only the message changes. */
export const OFFER = {
  startDate: "14 de abril",
  durationWeeks: 8,
  groupSize: 12,
  trades: ["carpintería", "electricidad", "cocina"],
} as const;

export interface Message {
  label: string;
  title: string;
  description: string;
  headline: string;
  cta: string;
}

export const MESSAGES: Record<Variant, Message> = {
  a: {
    label: "A · Control",
    title: "Cursos de oficio en ocho semanas, con salida laboral",
    description:
      "Aprendé carpintería, electricidad o cocina en ocho semanas. Grupos de doce personas y práctica real, con una salida laboral que se puede cobrar.",
    headline: "Ocho semanas para un oficio que se puede cobrar.",
    cta: "Ver cupos de abril",
  },
  b: {
    label: "B · Tratamiento",
    title: "Abril abre cupos: cursos de oficio en grupos de 12",
    description:
      "El 14 de abril empiezan grupos de doce. En la cohorte anterior, ocho de cada diez consiguieron trabajo en el rubro antes de los noventa días.",
    headline: "El curso empieza el 14 de abril. El cupo, no.",
    cta: "Reservar mi lugar",
  },
};

export interface Counts {
  impressions: number;
  conversions: number;
}

/** Fixed test case. It does not come from any session and never changes. */
export const FIXED_CASE: Record<Variant, Counts> = {
  a: { impressions: 240, conversions: 18 },
  b: { impressions: 236, conversions: 31 },
};

export const DEMO_VISITOR_ID = "lab-visitor-demo-01";

/**
 * FNV-1a, 32 bits, over the UTF-8 bytes of the input.
 * Offset basis 0x811c9dc5, prime 0x01000193.
 */
export function fnv1a32(input: string): number {
  let hash = 0x811c9dc5;
  for (const byte of new TextEncoder().encode(input)) {
    hash ^= byte;
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** Deterministic assignment: even hash → A, odd hash → B. */
export function assignVariant(visitorId: string): Variant {
  return fnv1a32(visitorId) % 2 === 0 ? "a" : "b";
}

/** Conversions / impressions. Without impressions the rate does not exist. */
export function conversionRate(counts: Counts): number | null {
  if (counts.impressions <= 0) return null;
  return counts.conversions / counts.impressions;
}

/** B − A in percentage points, from the unrounded rates. */
export function differenceInPoints(rateA: number | null, rateB: number | null): number | null {
  if (rateA === null || rateB === null) return null;
  return (rateB - rateA) * 100;
}

const twoDecimals = new Intl.NumberFormat("es-AR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const fourDecimals = new Intl.NumberFormat("es-AR", {
  minimumFractionDigits: 4,
  maximumFractionDigits: 4,
});

export function formatPercent(rate: number | null): string {
  return rate === null ? "Sin impresiones" : `${twoDecimals.format(rate * 100)}%`;
}

export function formatPoints(points: number | null): string {
  return points === null ? "Sin dato" : `${twoDecimals.format(points)} pp`;
}

export function formatRatio(rate: number | null): string {
  return rate === null ? "Sin dato" : fourDecimals.format(rate);
}

// --- Validation of untrusted input -----------------------------------------

export function parseVariant(value: unknown): Variant | null {
  return value === "a" || value === "b" ? value : null;
}

/** `?preview=` may arrive repeated; only the first value counts. */
export function parsePreview(value: string | string[] | undefined): Variant | null {
  return parseVariant(Array.isArray(value) ? value[0] : value);
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isVisitorId(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

export interface CountRow {
  variant: Variant;
  type: EventType;
  total: number;
}

/** Validates one aggregated row read from the event log before using it. */
export function parseCountRow(row: unknown): CountRow | null {
  if (typeof row !== "object" || row === null) return null;
  const { variant, type, total } = row as Record<string, unknown>;
  const parsedVariant = parseVariant(variant);
  if (!parsedVariant) return null;
  if (type !== "impression" && type !== "conversion") return null;
  const raw = typeof total === "number" ? String(total) : total;
  if (typeof raw !== "string" || !/^\d+$/.test(raw)) return null;
  const parsedTotal = Number(raw);
  if (!Number.isSafeInteger(parsedTotal)) return null;
  return { variant: parsedVariant, type, total: parsedTotal };
}

/** Folds validated rows into counts per variant. Missing variants count as zero. */
export function toCounts(rows: CountRow[]): Record<Variant, Counts> {
  const counts: Record<Variant, Counts> = {
    a: { impressions: 0, conversions: 0 },
    b: { impressions: 0, conversions: 0 },
  };
  for (const row of rows) {
    if (row.type === "impression") counts[row.variant].impressions = row.total;
    else counts[row.variant].conversions = row.total;
  }
  return counts;
}

// --- Crawler detection ------------------------------------------------------

const CRAWLER_PATTERN =
  /bot|crawler|spider|crawling|slurp|bingpreview|facebookexternalhit|embedly|quora link preview|whatsapp|telegram|lighthouse|headlesschrome/i;

/** Crawlers do not keep cookies: they always get the control, never an assignment. */
export function isCrawler(userAgent: string | null | undefined): boolean {
  return !!userAgent && CRAWLER_PATTERN.test(userAgent);
}
