"use client";

import { useRadarVisit } from "@/lib/radar-guide/use-radar-visit";

/**
 * Records the /radar hub visit: attribution (utm tags from bio links and the
 * fallback short link), the in-app browser, and a visit id, then strips utm
 * parameters from the address bar. Renders nothing.
 */
export function RadarLandingBeacon() {
  useRadarVisit(null);
  return null;
}
