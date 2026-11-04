import { NextResponse, type NextRequest } from "next/server";
import {
  CANONICAL_PATH,
  CONTROL,
  COOKIES,
  SESSION_MAX_AGE_SECONDS,
  VISITOR_MAX_AGE_SECONDS,
  assignVariant,
  isCrawler,
  isVisitorId,
  parsePreview,
  parseVariant,
} from "@/lib/experiment";
import { VARIANT_HEADER } from "@/lib/request-variant";
import { recordImpression } from "@/lib/events";

/**
 * Assigns visitor and variant on the first request without cookies and
 * records one impression per 30-minute session. The URL never changes:
 * the variant travels in cookies and in an internal request header.
 */
export async function proxy(request: NextRequest) {
  const forwarded = new Headers(request.headers);
  // Never trust a variant header coming from the client.
  forwarded.delete(VARIANT_HEADER);
  const next = () => NextResponse.next({ request: { headers: forwarded } });

  // Preview is an instrument: it shows a copy, writes no cookies and is not a visit.
  if (parsePreview(request.nextUrl.searchParams.get("preview") ?? undefined)) {
    return next();
  }

  // Crawlers keep no cookies: same URL, same canonical, always the control.
  if (isCrawler(request.headers.get("user-agent"))) {
    forwarded.set(VARIANT_HEADER, CONTROL);
    return next();
  }

  const storedVisitor = request.cookies.get(COOKIES.visitor)?.value;
  const isReturning = isVisitorId(storedVisitor);

  // Without a visitor there is nothing to resolve on non-GET requests (e.g. a server action).
  if (!isReturning && request.method !== "GET") return next();

  const visitorId = isReturning ? storedVisitor : crypto.randomUUID();
  const variant = assignVariant(visitorId);
  forwarded.set(VARIANT_HEADER, variant);
  const response = next();

  const cookieOptions = buildCookieOptions(request);
  const storedVariant = parseVariant(request.cookies.get(COOKIES.variant)?.value);
  if (!isReturning || storedVariant !== variant) {
    response.cookies.set(COOKIES.visitor, visitorId, { ...cookieOptions, maxAge: VISITOR_MAX_AGE_SECONDS });
    response.cookies.set(COOKIES.variant, variant, { ...cookieOptions, maxAge: VISITOR_MAX_AGE_SECONDS });
  }

  if (request.method !== "GET" || isPrefetch(request)) return response;

  const hasOpenSession = isVisitorId(request.cookies.get(COOKIES.session)?.value);
  if (hasOpenSession) return response;

  const sessionId = crypto.randomUUID();
  try {
    await recordImpression(visitorId, variant, sessionId);
    response.cookies.set(COOKIES.session, sessionId, { ...cookieOptions, maxAge: SESSION_MAX_AGE_SECONDS });
  } catch (error) {
    // The page still renders; without the session cookie the next request retries the impression.
    console.error("[experiment] could not record impression", error);
  }
  return response;
}

function isPrefetch(request: NextRequest): boolean {
  const purpose = `${request.headers.get("sec-purpose") ?? ""} ${request.headers.get("purpose") ?? ""}`;
  return request.headers.has("next-router-prefetch") || /prefetch/i.test(purpose);
}

function buildCookieOptions(request: NextRequest) {
  // Inside an embedded preview (iframe) the browser drops cookies unless SameSite=None; Secure.
  const embedded = process.env.EMBEDDED_PREVIEW === "1";
  return {
    httpOnly: true,
    path: CANONICAL_PATH,
    sameSite: embedded ? ("none" as const) : ("lax" as const),
    secure: embedded || request.nextUrl.protocol === "https:",
  };
}

export const config = {
  matcher: ["/practica"],
};
