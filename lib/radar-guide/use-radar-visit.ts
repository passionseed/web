"use client";

/**
 * `useRadarVisit(fieldSlug | null)`: one Radar visit per page (spec section 4).
 *
 * On mount it captures attribution (utm tags, referrer host, in-app browser),
 * strips utm parameters from the address bar, reuses or creates the page's
 * visit id, records the visit once, and returns a `GuideTracker` for guide
 * events. Pass `null` for the /radar hub.
 *
 * The tracker queues events until the visit id is known, so components can
 * call `tracker.track` from their own effects without waiting.
 */
import { useEffect, useMemo, useState } from "react";
import { captureRadarAttribution, getOrCreateVisitId, touchVisit } from "./attribution";
import {
  createGuideTrackerCore,
  recordGuideEvent,
  recordRadarVisit,
  submitCareerRequest,
  type GuideTrackerCore,
} from "./events";
import type { GuideTracker, RadarAttribution } from "./types";

export const RADAR_HUB_PAGE_KEY = "hub";

/** Visit ids already sent in this document (React StrictMode runs effects twice). */
const recordedVisits = new Set<string>();

export interface RadarVisitState {
  visitId: string | null;
  attribution: RadarAttribution | null;
  tracker: GuideTracker;
}

export function useRadarVisit(fieldSlug: string | null): RadarVisitState {
  const core = useMemo<GuideTrackerCore>(
    () =>
      createGuideTrackerCore(fieldSlug, {
        send: (ctx, event) => void recordGuideEvent(ctx, event),
        submit: submitCareerRequest,
      }),
    [fieldSlug]
  );

  const [visit, setVisit] = useState<{ visitId: string; attribution: RadarAttribution } | null>(
    null
  );

  useEffect(() => {
    const pageKey = fieldSlug ?? RADAR_HUB_PAGE_KEY;
    let attribution: RadarAttribution;
    let visitId: string;
    try {
      attribution = captureRadarAttribution();
      visitId = getOrCreateVisitId(pageKey).visitId;
    } catch {
      return;
    }
    core.setVisit(visitId);
    setVisit({ visitId, attribution });

    if (!recordedVisits.has(visitId)) {
      recordedVisits.add(visitId);
      void recordRadarVisit({ visitId, fieldSlug, attribution });
    }

    // Keep the 30-minute window sliding while the student is on the page.
    const keepAlive = () => {
      if (document.visibilityState === "visible") touchVisit(pageKey, visitId);
    };
    const interval = window.setInterval(keepAlive, 5 * 60 * 1000);
    document.addEventListener("visibilitychange", keepAlive);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", keepAlive);
    };
  }, [fieldSlug, core]);

  const visitId = visit?.visitId ?? null;
  const tracker = useMemo<GuideTracker>(
    () => ({
      visitId,
      track: (event) => core.track(event),
      submitCareerRequest: (text) => core.submitCareerRequest(text),
    }),
    [core, visitId]
  );

  return { visitId, attribution: visit?.attribution ?? null, tracker };
}
