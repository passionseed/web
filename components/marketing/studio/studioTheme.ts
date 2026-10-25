import { COSMOS, starlight } from "@/components/shift/next/cosmos";
import { INK } from "@/components/shift/poster/riso";
import type { InkName, StudioTheme } from "@/lib/marketing/types";

/**
 * Ink jobs per sheet theme. Night is the SHIFT riso print (paper type on
 * black ink); paper is the same drum run on cream stock, for guides and
 * LinkedIn, where the reader is scanning, not being sold to. Cosmos is the
 * SHIFT[3] look: clear glass floating over deep space, lit by aurora,
 * nebula and one warm sol for the thing that matters most.
 */
export interface StudioInks {
  /** riso: printed sheet, ink panels, marker highlight. cosmos: full-bleed
   *  space, glass panels, Latin eyebrows, glow highlight. */
  look: "riso" | "cosmos";
  /** Inked area behind the content. */
  ground: string;
  text: string;
  dim: string;
  faint: string;
  hair: string;
  /** Panel fill and outline for cards. */
  panel: string;
  panelLine: string;
  /** Misregistered second plate on display headings (riso), or a dark halo
   *  that keeps type legible over stars (cosmos). */
  headingShadow: string;
  accent: Record<InkName, string>;
  /** The one accent used for kickers and stamps. */
  kicker: string;
  /** The warm light: the one thing to notice (hot panels, price, highlight). */
  hot: string;
}

/** Riso yellow disappears on cream; the paper theme prints it as deep amber. */
const PAPER_AMBER = "#c98a00";

export const STUDIO_INKS: Record<StudioTheme, StudioInks> = {
  night: {
    look: "riso",
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
    hot: INK.orange,
  },
  paper: {
    look: "riso",
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
    hot: INK.orange,
  },
  cosmos: {
    look: "cosmos",
    ground: COSMOS.void,
    text: COSMOS.star,
    dim: starlight("b8"),
    faint: starlight("80"),
    hair: starlight("1f"),
    panel: "rgba(255,255,255,0.05)",
    panelLine: "rgba(255,255,255,0.12)",
    headingShadow: `0 2px 22px ${COSMOS.void}, 0 0 2px ${COSMOS.void}`,
    // Orange is the warm light, pink the flare, blue the cool aurora, and
    // yellow (unreadable as a fourth warm on dark glass) the far nebula.
    accent: { orange: COSMOS.sol, pink: COSMOS.flare, yellow: COSMOS.nebula, blue: COSMOS.aurora },
    kicker: COSMOS.aurora,
    hot: COSMOS.sol,
  },
};

export const ACCENT_ORDER: InkName[] = ["orange", "pink", "blue", "yellow"];

export function accentAt(inks: StudioInks, index: number): string {
  return inks.accent[ACCENT_ORDER[index % ACCENT_ORDER.length]];
}

/** Latin display face for the cosmos wordmark, eyebrows and numerals. */
export const LATIN = "var(--font-libre-franklin), ui-sans-serif, system-ui, sans-serif";
