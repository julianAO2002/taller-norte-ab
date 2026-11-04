interface HeroMessageProps {
  headline: string;
  description: string;
}

/** The message under test: headline and lead. Nothing about the offer lives here. */
export function HeroMessage({ headline, description }: HeroMessageProps) {
  return (
    <header className="hero">
      <p className="eyebrow">Taller Norte · Escuela de oficios</p>
      <h1>{headline}</h1>
      <p className="lead">{description}</p>
    </header>
  );
}
