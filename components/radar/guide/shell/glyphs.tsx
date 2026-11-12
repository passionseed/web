/**
 * Tiny pixel glyphs for the shell chrome, drawn as SVG rects on a 7x7 grid so
 * they stay crisp at any integer scale. Decorative: callers label the button.
 */
import type { ReactNode } from "react";

function Grid({ children, size = 20 }: { children: ReactNode; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 7 7"
      shapeRendering="crispEdges"
      aria-hidden="true"
      focusable="false"
      className="rg-glyph"
    >
      <g fill="currentColor">{children}</g>
    </svg>
  );
}

/** Folded map. */
export function MapGlyph() {
  return (
    <Grid>
      <rect x="0" y="1" width="2" height="5" />
      <rect x="2" y="0" width="1" height="5" opacity="0.6" />
      <rect x="3" y="1" width="2" height="5" />
      <rect x="5" y="0" width="1" height="5" opacity="0.6" />
      <rect x="6" y="1" width="1" height="5" />
    </Grid>
  );
}

/** Left-pointing arrow. */
export function BackGlyph() {
  return (
    <Grid>
      <rect x="1" y="3" width="6" height="1" />
      <rect x="2" y="2" width="1" height="3" />
      <rect x="3" y="1" width="1" height="1" />
      <rect x="3" y="5" width="1" height="1" />
    </Grid>
  );
}

/** Right-pointing play triangle ("▶"), used on "ต่อ". */
export function NextGlyph() {
  return (
    <Grid size={16}>
      <rect x="1" y="0" width="1" height="7" />
      <rect x="2" y="1" width="1" height="5" />
      <rect x="3" y="2" width="1" height="3" />
      <rect x="4" y="3" width="1" height="1" />
    </Grid>
  );
}

/** Warning sign for safety lines. */
export function WarnGlyph() {
  return (
    <Grid size={24}>
      <rect x="3" y="0" width="1" height="1" />
      <rect x="2" y="1" width="3" height="2" />
      <rect x="1" y="3" width="5" height="2" />
      <rect x="0" y="5" width="7" height="2" />
      <rect x="3" y="2" width="1" height="2" fill="#120a14" />
      <rect x="3" y="5" width="1" height="1" fill="#120a14" />
    </Grid>
  );
}
