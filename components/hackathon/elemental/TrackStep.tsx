"use client";

import { useEffect } from "react";

import type { FunnelStep } from "@/lib/hackathon/elemental/funnel";

import { trackElemental } from "./track";

/** Drop into a server page to count one funnel step when it opens. */
export function TrackStep({ step, source }: { step: FunnelStep; source?: string }) {
  useEffect(() => {
    trackElemental({ step, source });
  }, [step, source]);
  return null;
}
