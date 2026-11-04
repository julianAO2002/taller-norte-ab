import type { OFFER } from "@/lib/experiment";

interface OfferDetailsProps {
  offer: typeof OFFER;
}

/** The offer. Identical for every variant: if it changes, it is another experiment. */
export function OfferDetails({ offer }: OfferDetailsProps) {
  return (
    <dl className="offer">
      <div>
        <dt>Inicio</dt>
        <dd>{offer.startDate}</dd>
      </div>
      <div>
        <dt>Duración</dt>
        <dd>{offer.durationWeeks} semanas</dd>
      </div>
      <div>
        <dt>Cupo</dt>
        <dd>{offer.groupSize} personas por grupo</dd>
      </div>
      <div>
        <dt>Oficios</dt>
        <dd>{offer.trades.join(", ")}</dd>
      </div>
    </dl>
  );
}
