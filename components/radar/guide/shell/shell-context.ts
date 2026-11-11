"use client";

/**
 * The guide shell's context: one per guide visit (the (guide) layout keeps it
 * mounted across levels). Owns progress, the tracker, the level stepper and
 * the sheets. Islands and steps read it through useGuideShell().
 */
import { createContext, useContext } from "react";
import type { FactId, GuideIndexEntry, GuideIndexPage, GuideState } from "@/lib/radar-guide/guide-types";
import type { ProgressAction, StepResult, XpSummary } from "@/lib/radar-guide/story";
import type { GuideTracker, RadarAttribution } from "@/lib/radar-guide/types";
import type { StepMeta } from "./level-steps";

export interface GuideShellValue {
  slug: string;
  /** Index with derived games/cutscene counts (registry.server guideIndexFor). */
  index: GuideIndexEntry;
  /** The level on screen (route segment), or null on a non-level route. */
  pageKey: string | null;
  page: GuideIndexPage | null;
  /** `?demo=1`: no tracking, no storage writes, every step revealed. */
  demo: boolean;
  /** False until the first client effect (demo mode and storage are known). */
  ready: boolean;
  reducedMotion: boolean;
  /** NOOP until the visit is known, and always NOOP in demo mode. */
  tracker: GuideTracker;
  attribution: RadarAttribution | null;

  progress: GuideState;
  xp: XpSummary;
  /** Applies a progress action; earned badges are toasted by the shell. */
  dispatch(action: ProgressAction): StepResult;

  /** The level stepper registers its steps once per level. */
  registerSteps(pageKey: string, steps: readonly StepMeta[]): void;
  /** Index of the last revealed step on a level. */
  cursor(pageKey: string): number;
  /** The sticky "ต่อ ▶": reveal the next step, or clear the level and move on. */
  advance(): void;
  /** Bumped on every in-level "ต่อ" press (the stepper scrolls the new step into view). */
  advanceSeq: number;
  advanceLabelTh: string;
  /** A step finished its own sequence (dialogue read, game done): "ต่อ" pulses. */
  markStepDone(pageKey: string, stepId: string): void;
  /** The current step is done (or needs nothing), so "ต่อ" is highlighted. */
  readyToAdvance: boolean;
  /**
   * "ต่อ" pressed while the current dialogue is still being read: the dialogue
   * with this `<pageKey>:<stepId>` key finishes its line or opens its next box
   * (as a tap on the box would) instead of the level skipping past it.
   */
  dialogueNudge?: { key: string; seq: number } | null;

  openMap(): void;
  sources: { open: boolean; focus: readonly FactId[] };
  openSources(focus?: readonly FactId[]): void;
  closeSources(): void;
}

export const GuideShellContext = createContext<GuideShellValue | null>(null);

export function useGuideShellOptional(): GuideShellValue | null {
  return useContext(GuideShellContext);
}

export function useGuideShell(): GuideShellValue {
  const value = useContext(GuideShellContext);
  if (!value) {
    throw new Error("useGuideShell: render guide levels inside <GuideShellProvider> (app/radar/[slug]/(guide)/layout.tsx)");
  }
  return value;
}
