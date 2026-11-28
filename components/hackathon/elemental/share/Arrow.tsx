/**
 * "→" and "←" drawn as SVG. The trimmed Google font files (Trirong, Bai
 * Jamjuree) have no arrow glyphs, so a typed arrow falls back to Times, Arial
 * or the phone's own font. This one is sized in em and sits on the text
 * baseline, at the height of a typed arrow, in the text colour.
 * - thin: for Trirong 300 links (EditorialLink, the top bar, the wordmark)
 * - bold: for Bai Jamjuree 600 buttons
 */

// One em is 20 units. The box is 0.75em tall with its bottom on the baseline,
// so the shaft (y = 9) sits 0.3em up, about where a typed arrow sits.
const STROKE = { thin: 1.1, bold: 2.1 } as const;
const PATH = {
  right: "M1 9H18.4M13 3.6L18.4 9L13 14.4",
  left: "M19 9H1.6M7 3.6L1.6 9L7 14.4",
} as const;

export function Arrow({ dir = "right", weight = "thin", className }: { dir?: "right" | "left"; weight?: "thin" | "bold"; className?: string }) {
  return (
    <svg
      viewBox="0 0 20 15"
      aria-hidden="true"
      focusable="false"
      className={`inline-block shrink-0 ${className ?? ""}`}
      style={{ width: "1em", height: "0.75em", verticalAlign: "baseline", overflow: "visible" }}
    >
      <path d={PATH[dir]} fill="none" stroke="currentColor" strokeWidth={STROKE[weight]} strokeLinecap="butt" strokeLinejoin="miter" />
    </svg>
  );
}
