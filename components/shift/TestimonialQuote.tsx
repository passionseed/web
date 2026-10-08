import type { CSSProperties } from "react";
import type { ShiftTestimonial } from "@/lib/content/shift-testimonials";

export function TestimonialQuote({
  card,
  style,
}: {
  card: ShiftTestimonial;
  style?: CSSProperties;
}) {
  return (
    <div className="relative flex-1 text-sm leading-relaxed" style={style}>
      <blockquote>&ldquo;{card.excerpt ?? card.quote}&rdquo;</blockquote>
      {card.excerpt && (
        <details className="mt-3">
          <summary className="cursor-pointer py-3 underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4">
            อ่านคำบอกเล่าฉบับเต็ม
          </summary>
          <blockquote className="mt-2">&ldquo;{card.quote}&rdquo;</blockquote>
        </details>
      )}
    </div>
  );
}
