"use client";

import { useEffect } from "react";

import type { FunnelDetailEvent, FunnelStep } from "@/lib/hackathon/elemental/funnel";

import { trackElemental } from "./track";

/** Drop into a server page to count one funnel step (or a page event such as kit_view) when it opens. */
export function TrackStep({ step, source, detail }: { step: FunnelStep | FunnelDetailEvent; source?: string; detail?: string }) {
  useEffect(() => {
    trackElemental({ step, source, detail });
  }, [step, source, detail]);
  return null;
}
