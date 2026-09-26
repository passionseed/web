import type { ReactNode } from "react";

import { INK } from "./riso";

/**
 * Line icons printed as two riso plates: the ink plate on top and a soft blue
 * plate landing a touch off behind it, same as the type on the posters.
 */

type IconName = "live" | "metrics" | "caseStudy";

const PATHS: Record<IconName, ReactNode> = {
  // Browser window with a live dot and a cursor clicking in
  live: (
    <>
      <rect x="6" y="10" width="44" height="34" rx="4" />
      <path d="M6 19h44" />
      <circle cx="12" cy="14.5" r="1.2" fill="currentColor" />
      <circle cx="17" cy="14.5" r="1.2" fill="currentColor" />
      <path d="M14 29h14M14 35h9" />
      <path d="M38 30l12 5-5 2-2 5z" fill="currentColor" />
    </>
  ),
  // Rising bars with a trend arrow breaking out of the frame
  metrics: (
    <>
      <path d="M8 48h44" />
      <rect x="12" y="34" width="7" height="14" rx="1" />
      <rect x="24" y="26" width="7" height="22" rx="1" />
      <rect x="36" y="18" width="7" height="30" rx="1" />
      <path d="M10 26l12-9 9 6 17-14" />
      <path d="M41 9h7v7" />
    </>
  ),
  // One page with a folded corner, text lines, and an approval stamp
  caseStudy: (
    <>
      <path d="M12 6h22l10 10v34a2 2 0 0 1-2 2H12a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z" />
      <path d="M34 6v10h10" />
      <path d="M16 22h14M16 28h20M16 34h12" />
      <circle cx="40" cy="42" r="8" fill={INK.black} />
      <path d="M36.5 42l2.5 2.5 4.5-5" />
    </>
  ),
};

function Plate({ name, color, className }: { name: IconName; color: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 56 56"
      fill="none"
      stroke="currentColor"
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={{ color }}
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  );
}

export function RisoIcon({
  name,
  ink,
  size = 56,
}: {
  name: IconName;
  ink: string;
  size?: number;
}) {
  return (
    <span className="relative inline-block shrink-0" style={{ width: size, height: size }}>
      <Plate
        name={name}
        color={INK.blue}
        className="absolute inset-0 h-full w-full translate-x-[2px] translate-y-[-1.5px] opacity-60 blur-[0.6px]"
      />
      <Plate name={name} color={ink} className="relative h-full w-full" />
    </span>
  );
}

export type { IconName as RisoIconName };
