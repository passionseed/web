import type { ComponentType, ReactNode } from "react";

import type { ShiftCohort } from "@/lib/content/shift-cohort";

import type { ShiftPalette } from "./tokens";

export interface ShiftHeroProps {
  cohort: ShiftCohort;
  /** "7 วัน ปั้น 1 โปรเจกต์จริง", already broken into lines. */
  headline: ReactNode;
  /** Intro copy, apply CTA, dates/price line. Render below the art. */
  children: ReactNode;
}

/** Pixel rounds draw sprites; everything else uses the riso line plates. */
export type ShiftArtKind = "riso" | "pixel";

/**
 * Everything that makes a round page look like that round's poster. The
 * page body (sections, copy, FAQ) is shared; a theme only swaps these slots
 * and the palette the body reads through CSS variables.
 */
export interface ShiftTheme {
  /** Art family for icons and illustrations in the shared page body. */
  kind: ShiftArtKind;
  palette: ShiftPalette;
  /** Top of the page: the round's poster art, headline and wordmark. */
  Hero: ComponentType<ShiftHeroProps>;
  /** Fixed full-page overlay (grain, scanlines, sheen). Optional. */
  Texture?: ComponentType;
  /** Background art behind the final CTA section. Optional. */
  Bookend?: ComponentType;
}
