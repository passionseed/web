import { ELEMENTAL_OG_SIZE, elementalOgAlt, elementalOgResponse } from "@/lib/og/elemental-hackathon";

// The Elemental key art, for /hackathon pages that don't set their own
// openGraph. Its details come from facts.ts.
export const alt = elementalOgAlt();
export const size = ELEMENTAL_OG_SIZE;
export const contentType = "image/jpeg";
export const runtime = "nodejs";

export default function Image() {
  return elementalOgResponse();
}
