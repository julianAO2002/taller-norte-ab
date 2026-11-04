import { CONTROL, type Variant, parseVariant } from "./experiment";

/** Internal header the proxy uses to hand the resolved variant to the page. */
export const VARIANT_HEADER = "x-experiment-variant";

/**
 * Reads the variant resolved by the proxy for this request.
 * If it is missing or malformed, the page falls back to the control.
 */
export function variantFromHeaders(headers: Headers): Variant {
  return parseVariant(headers.get(VARIANT_HEADER)) ?? CONTROL;
}
