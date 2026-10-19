import type { StudioFormat } from "./types";

export interface FormatSpec {
  width: number;
  height: number;
  label: string;
  /** Space the platform UI covers at the top and bottom (Stories). */
  safeTop: number;
  safeBottom: number;
}

/**
 * Every export is 1080px wide so type sizes carry across formats.
 * ig-tall (3:4) shows uncropped on the IG profile grid; ig-portrait (4:5)
 * is the classic feed and ad size; linkedin is 4:5 pages in a PDF.
 */
export const FORMATS: Record<StudioFormat, FormatSpec> = {
  "ig-tall": { width: 1080, height: 1440, label: "IG carousel 3:4", safeTop: 0, safeBottom: 0 },
  "ig-portrait": { width: 1080, height: 1350, label: "IG feed 4:5", safeTop: 0, safeBottom: 0 },
  story: { width: 1080, height: 1920, label: "IG Story 9:16", safeTop: 200, safeBottom: 260 },
  linkedin: { width: 1080, height: 1350, label: "LinkedIn document 4:5", safeTop: 0, safeBottom: 0 },
  square: { width: 1080, height: 1080, label: "Square 1:1", safeTop: 0, safeBottom: 0 },
};

/** DOM id of slide n (1-based) of a set; the export script screenshots these. */
export const slideId = (slug: string, n: number) => `studio-${slug}-${n}`;
