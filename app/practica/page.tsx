import type { Metadata } from "next";
import { headers } from "next/headers";
import { CANONICAL_PATH, MESSAGES, OFFER, parsePreview, type Variant } from "@/lib/experiment";
import { variantFromHeaders } from "@/lib/request-variant";
import { HeroMessage } from "@/components/hero-message";
import { CtaButton } from "@/components/cta-button";
import { OfferDetails } from "@/components/offer-details";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

interface View {
  variant: Variant;
  preview: boolean;
}

/** Preview query wins for display only; otherwise the variant assigned by the proxy. */
async function resolveView(searchParams: SearchParams): Promise<View> {
  const preview = parsePreview((await searchParams).preview);
  if (preview) return { variant: preview, preview: true };
  return { variant: variantFromHeaders(await headers()), preview: false };
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const { variant, preview } = await resolveView(searchParams);
  const message = MESSAGES[variant];
  return {
    // Absolute: the crawler sees the variant title without the layout suffix.
    title: { absolute: message.title },
    description: message.description,
    // One indexable URL. Never the query, never a per-variant route.
    alternates: { canonical: CANONICAL_PATH },
    robots: preview ? { index: false, follow: false } : { index: true, follow: true },
  };
}

export default async function PracticePage({ searchParams }: { searchParams: SearchParams }) {
  const { variant, preview } = await resolveView(searchParams);
  const message = MESSAGES[variant];

  return (
    <main className="landing">
      {preview && (
        <p className="preview-banner" role="status">
          Vista previa de {message.label}. No escribe cookies, no cuenta visitas y no se indexa.
        </p>
      )}
      <HeroMessage headline={message.headline} description={message.description} />
      <OfferDetails offer={OFFER} />
      <CtaButton label={message.cta} preview={preview} />
    </main>
  );
}
