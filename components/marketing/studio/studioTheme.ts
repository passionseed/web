import { INK } from "@/components/shift/poster/riso";
import type { InkName, StudioTheme } from "@/lib/marketing/types";

/**
 * Ink jobs per sheet theme. Night is the SHIFT riso print (paper type on
 * black ink); paper is the same drum run on cream stock, for guides and
 * LinkedIn, where the reader is scanning, not being sold to.
 */
export interface StudioInks {
  /** Inked area behind the content. */
  ground: string;
  text: string;
  dim: string;
  faint: string;
  hair: string;
  /** Panel fill and outline for cards. */
  panel: string;
  panelLine: string;
  /** Misregistered second plate on display headings. */
  headingShadow: string;
  accent: Record<InkName, string>;
  /** The one accent used for kickers and stamps. */
  kicker: string;
}

/** Riso yellow disappears on cream; the paper theme prints it as deep amber. */
const PAPER_AMBER = "#c98a00";

export const STUDIO_INKS: Record<StudioTheme, StudioInks> = {
  night: {
    ground: INK.black,
    text: INK.paper,
    dim: `${INK.paper}b3`,
    faint: `${INK.paper}73`,
    hair: `${INK.paper}26`,
    panel: `${INK.paper}0d`,
    panelLine: `${INK.paper}26`,
    headingShadow: "-1.5px 1px 1.5px rgba(255,72,176,0.6)",
    accent: { orange: INK.orange, pink: INK.pink, yellow: INK.yellow, blue: "#5fb4ff" },
    kicker: INK.orange,
  },
  paper: {
    ground: "#f6efe0",
    text: INK.black,
    dim: `${INK.black}b3`,
    faint: `${INK.black}80`,
    hair: `${INK.black}24`,
    panel: "#fffaf0",
    panelLine: `${INK.black}1f`,
    headingShadow: "-2px 1.5px 0 rgba(255,72,176,0.45)",
    accent: { orange: "#e8541c", pink: "#e0308f", yellow: PAPER_AMBER, blue: INK.blue },
    kicker: "#e8541c",
  },
};

export const ACCENT_ORDER: InkName[] = ["orange", "pink", "blue", "yellow"];

export function accentAt(inks: StudioInks, index: number): string {
  return inks.accent[ACCENT_ORDER[index % ACCENT_ORDER.length]];
}
