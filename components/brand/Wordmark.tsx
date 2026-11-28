import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

/**
 * The PassionSeed wordmark: "passion" in Libre Franklin bold italic, "seed" in
 * Libre Franklin regular, letter-spacing -6%. Set by Big on 2026-11-26; the spec
 * and the vector file live on the company brain's brand page (brand.md).
 * Size and colour come from the parent or from className/style.
 */
export function Wordmark({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <span className={cn("ps-wordmark", className)} style={style}>
      <b>passion</b>seed
    </span>
  );
}
