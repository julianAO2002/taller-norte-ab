import type { Metadata } from "next";
import {
  DEMO_VISITOR_ID,
  FIXED_CASE,
  MESSAGES,
  VARIANTS,
  assignVariant,
  conversionRate,
  differenceInPoints,
  fnv1a32,
  formatPercent,
  formatPoints,
  formatRatio,
  type Counts,
  type Variant,
} from "@/lib/experiment";
import { readCounts } from "@/lib/events";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Bitácora del experimento",
  robots: { index: false, follow: false },
};

async function loadLiveCounts(): Promise<Record<Variant, Counts> | null> {
  try {
    return await readCounts();
  } catch (error) {
    console.error("[experiment] could not read the event log", error);
    return null;
  }
}

export default async function LogbookPage() {
  const live = await loadLiveCounts();
  const demoRuns = [1, 2, 3].map(() => ({
    hash: fnv1a32(DEMO_VISITOR_ID),
    variant: assignVariant(DEMO_VISITOR_ID),
  }));

  return (
    <main className="logbook">
      <h1>Bitácora del experimento</h1>
      <p className="note">
        Tasa = conversiones / impresiones. Sin impresiones la tasa no existe. Una diferencia entre
        tasas no es una prueba: acá no se declara ganador.
      </p>

      <section>
        <h2>Conteo en vivo</h2>
        {live ? (
          <RatesTable counts={live} />
        ) : (
          <p className="warning">La base de eventos no está disponible. El caso fijo sigue abajo.</p>
        )}
      </section>

      <section>
        <h2>Caso de prueba fijo</h2>
        <p className="note">No sale de ninguna sesión. Los porcentajes se calculan con la misma fórmula.</p>
        <RatesTable counts={FIXED_CASE} showWork />
      </section>

      <section>
        <h2>Verificación de la asignación</h2>
        <p className="note">
          Función: FNV-1a de 32 bits sobre los bytes UTF-8 del identificador. Hash par → A, impar → B.
        </p>
        <table>
          <thead>
            <tr>
              <th>Corrida</th>
              <th>Identificador</th>
              <th>FNV-1a (hex)</th>
              <th>Variante</th>
            </tr>
          </thead>
          <tbody>
            {demoRuns.map((run, index) => (
              <tr key={index}>
                <td>{index + 1}</td>
                <td><code>{DEMO_VISITOR_ID}</code></td>
                <td><code>0x{run.hash.toString(16).padStart(8, "0")}</code></td>
                <td>{MESSAGES[run.variant].label}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}

function RatesTable({ counts, showWork = false }: { counts: Record<Variant, Counts>; showWork?: boolean }) {
  const rates = { a: conversionRate(counts.a), b: conversionRate(counts.b) };
  return (
    <table>
      <thead>
        <tr>
          <th>Variante</th>
          <th>Impresiones</th>
          <th>Conversiones</th>
          <th>Tasa</th>
          {showWork && <th>Cálculo</th>}
        </tr>
      </thead>
      <tbody>
        {VARIANTS.map((variant) => (
          <tr key={variant}>
            <th scope="row">{MESSAGES[variant].label}</th>
            <td>{counts[variant].impressions}</td>
            <td>{counts[variant].conversions}</td>
            <td><strong>{formatPercent(rates[variant])}</strong></td>
            {showWork && (
              <td>
                {counts[variant].conversions} / {counts[variant].impressions} = {formatRatio(rates[variant])}
              </td>
            )}
          </tr>
        ))}
        <tr className="difference">
          <th scope="row">B − A</th>
          <td>No se compara el conteo</td>
          <td>No se compara el conteo</td>
          <td><strong>{formatPoints(differenceInPoints(rates.a, rates.b))}</strong></td>
          {showWork && <td>{formatPercent(rates.b)} − {formatPercent(rates.a)}</td>}
        </tr>
      </tbody>
    </table>
  );
}
