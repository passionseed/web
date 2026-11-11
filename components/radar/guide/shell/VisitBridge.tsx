"use client";

/**
 * Mounts useRadarVisit only when it should run (never in demo mode, never
 * while a legacy-hash redirect is pending) and hands the tracker up. Mounting
 * it is what records the visit, so the shell mounts it after its first effect.
 */
import { useEffect } from "react";
import { useRadarVisit } from "@/lib/radar-guide/use-radar-visit";
import type { GuideTracker, RadarAttribution } from "@/lib/radar-guide/types";

export interface VisitBridgeProps {
  slug: string;
  onVisit?(tracker: GuideTracker, attribution: RadarAttribution | null): void;
}

export function VisitBridge({ slug, onVisit }: VisitBridgeProps) {
  const { tracker, attribution } = useRadarVisit(slug);
  useEffect(() => {
    onVisit?.(tracker, attribution);
  }, [tracker, attribution, onVisit]);
  return null;
}
