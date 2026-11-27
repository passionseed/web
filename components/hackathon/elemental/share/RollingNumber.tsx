"use client";

import { useState, type CSSProperties } from "react";

import shell from "./shell.module.css";

/**
 * A number that changed on a poll: the old one slides up 6px and fades
 * (120ms snap), the new one comes in (240ms tension), and "+2" shows under it
 * in flameCore for 2.4s. Under prefers-reduced-motion nothing moves (the "+2"
 * still shows, then goes). The first render never animates.
 * Shared by the board rows and SeatCard's live count; import it from ./ui.
 */
export function RollingNumber({
  value,
  style,
  align = "end",
  className,
}: {
  value: number;
  /** The number's type (usually Trirong) and colour. */
  style?: CSSProperties;
  /** Which edge the "+2" lines up with. */
  align?: "start" | "end";
  className?: string;
}) {
  const [prev, setPrev] = useState(value);
  const [change, setChange] = useState<{ from: number; delta: number; n: number } | null>(null);
  // The "previous value" pattern: set during render, so the change paints in the same frame.
  if (value !== prev) {
    setChange({ from: prev, delta: value - prev, n: (change?.n ?? 0) + 1 });
    setPrev(value);
  }
  return (
    <span className={`${shell.roll} tabular-nums ${className ?? ""}`} style={style}>
      {change && (
        <span key={`out-${change.n}`} aria-hidden="true" className={shell.rollOut}>
          {change.from}
        </span>
      )}
      <span key={`in-${change?.n ?? 0}`} className={change ? shell.rollIn : undefined}>
        {value}
      </span>
      {change && change.delta > 0 && (
        <span key={`delta-${change.n}`} aria-hidden="true" className={`${shell.delta} ${align === "end" ? shell.deltaEnd : shell.deltaStart}`}>
          +{change.delta}
        </span>
      )}
    </span>
  );
}
