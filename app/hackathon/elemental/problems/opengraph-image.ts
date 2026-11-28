import { ELEMENTAL_OG_SIZE, elementalOgAlt, elementalOgResponse } from "@/lib/og/elemental-hackathon";

// The page sets its own openGraph, which drops the image from its parent, so
// the preview needs its own handler here.
export const alt = elementalOgAlt();
export const size = ELEMENTAL_OG_SIZE;
export const contentType = "image/jpeg";
export const runtime = "nodejs";

export default function Image() {
  return elementalOgResponse();
}
