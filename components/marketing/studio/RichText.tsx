import type { ReactNode } from "react";

import { MarkerHighlight } from "@/components/shift/poster/riso";

/**
 * Renders the studio's inline marks: ==marker highlight==, **accent ink**
 * and \n line breaks. Anything else is plain text, so copy stays copy.
 */
const TOKEN = /(==[^=]+==|\*\*[^*]+\*\*)/g;

export function RichText({ text, accent }: { text: string; accent: string }): ReactNode {
  // "\n" is a deliberate line break: Thai has no spaces, so the copy picks the break.
  const lines = text.split("\n");
  if (lines.length > 1) {
    return lines.map((line, i) => (
      <span key={i} className="block">
        <RichText text={line} accent={accent} />
      </span>
    ));
  }
  const parts = text.split(TOKEN).filter(Boolean);
  return parts.map((part, i) => {
    if (part.startsWith("==") && part.endsWith("==")) {
      return <MarkerHighlight key={i}>{part.slice(2, -2)}</MarkerHighlight>;
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
