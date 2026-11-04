"use server";

import { cookies } from "next/headers";
import { COOKIES, assignVariant, isVisitorId } from "@/lib/experiment";
import { recordConversion } from "@/lib/events";

export type CtaStatus = "idle" | "recorded" | "already-converted" | "not-counted" | "error";

export interface CtaState {
  status: CtaStatus;
}

/**
 * The only way to convert: a click on the CTA. Loading the page never calls it.
 * One conversion per visitor; the variant is derived from the visitor cookie,
 * never taken from the form.
 */
export async function registerConversion(_previous: CtaState): Promise<CtaState> {
  const visitorId = (await cookies()).get(COOKIES.visitor)?.value;
  if (!isVisitorId(visitorId)) return { status: "not-counted" };

  try {
    const result = await recordConversion(visitorId, assignVariant(visitorId));
    if (result === "no-impression") return { status: "not-counted" };
    return { status: result };
  } catch (error) {
    console.error("[experiment] could not record conversion", error);
    return { status: "error" };
  }
}
