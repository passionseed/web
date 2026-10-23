import type { ReactNode } from "react";

import { MarkerHighlight } from "@/components/shift/poster/riso";

import { GlowMark } from "./cosmosParts";

/**
 * Renders the studio's inline marks: ==marker highlight==, **accent ink**
 * and \n line breaks. Anything else is plain text, so copy stays copy.
 * `mark` picks how the highlight is drawn: a riso marker swipe, or the
 * cosmos glow pill.
 */
const TOKEN = /(==[^=]+==|\*\*[^*]+\*\*)/g;

export type HighlightMark = "marker" | "glow";

export function RichText({
  text,
  accent,
  mark = "marker",
}: {
  text: string;
  accent: string;
  mark?: HighlightMark;
}): ReactNode {
  // "\n" is a deliberate line break: Thai has no spaces, so the copy picks the break.
  const lines = text.split("\n");
  if (lines.length > 1) {
    return lines.map((line, i) => (
      <span key={i} className="block">
        <RichText text={line} accent={accent} mark={mark} />
      </span>
    ));
  }
  const parts = text.split(TOKEN).filter(Boolean);
  return parts.map((part, i) => {
    if (part.startsWith("==") && part.endsWith("==")) {
      const inner = part.slice(2, -2);
      return mark === "glow" ? <GlowMark key={i}>{inner}</GlowMark> : <MarkerHighlight key={i}>{inner}</MarkerHighlight>;
    }
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <span key={i} style={{ color: accent }}>
          {part.slice(2, -2)}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

/** The same text with the marks stripped, for alt text and captions. */
export function plainText(text: string): string {
  return text.replace(/==([^=]+)==/g, "$1").replace(/\*\*([^*]+)\*\*/g, "$1").replace(/\n/g, " ");
}
