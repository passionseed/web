import type { ReactNode } from "react";

import { T } from "../theme/tokens";
import { INK } from "./riso";

/**
 * Line icons printed as two riso plates: the ink plate on top and a soft blue
 * plate landing a touch off behind it, same as the type on the posters.
 */

type IconName =
  | "live"
  | "metrics"
  | "caseStudy"
  | "lock"
  | "chat"
  | "hammer"
  | "send"
  | "bug"
  | "gauge"
  | "mic"
  | "cert"
  | "compass"
  | "trophy"
  | "people"
  | "rocket"
  | "bulb"
  | "search"
  | "target"
  | "sparkle"
  | "judge"
  | "blocks"
  | "flask"
  | "trend"
  | "code"
  | "calendar";

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
  lock: (
    <>
      <rect x="12" y="24" width="32" height="24" rx="3" />
      <path d="M19 24v-6a9 9 0 0 1 18 0v6" />
      <circle cx="28" cy="34" r="2.5" fill="currentColor" />
      <path d="M28 36v5" />
    </>
  ),
  chat: (
    <>
      <path d="M8 10h26a3 3 0 0 1 3 3v14a3 3 0 0 1-3 3H19l-8 7v-7H8a3 3 0 0 1-3-3V13a3 3 0 0 1 3-3z" />
      <path d="M42 20h6a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3h-2v6l-7-6H27a3 3 0 0 1-3-3v-1" />
      <circle cx="14" cy="20" r="1.4" fill="currentColor" />
      <circle cx="21" cy="20" r="1.4" fill="currentColor" />
      <circle cx="28" cy="20" r="1.4" fill="currentColor" />
    </>
  ),
  hammer: (
    <>
      <path d="M22 16l-4 4 6 6 4-4" />
      <path d="M26 12l8-4 12 12-4 8-4-4-8 0z" />
      <path d="M27 25L9 43a3.5 3.5 0 0 0 5 5l18-18" />
    </>
  ),
  send: (
    <>
      <path d="M50 6L6 24l18 7 7 18z" />
      <path d="M50 6L24 31" />
    </>
  ),
  bug: (
    <>
      <ellipse cx="28" cy="33" rx="11" ry="14" />
      <path d="M22 20a6 6 0 0 1 12 0" />
      <path d="M28 21v26M17 32H8M48 32h-9M18 24l-7-6M38 24l7-6M18 42l-7 6M38 42l7 6" />
    </>
  ),
  gauge: (
    <>
      <path d="M8 42a20 20 0 0 1 40 0" />
      <path d="M28 42l11-13" />
      <circle cx="28" cy="42" r="3" fill="currentColor" />
      <path d="M13 42h3M40 42h3M28 22v3M17 30l2 2" />
    </>
  ),
  mic: (
    <>
      <rect x="21" y="6" width="14" height="24" rx="7" />
      <path d="M13 26a15 15 0 0 0 30 0" />
      <path d="M28 41v9M20 50h16" />
    </>
  ),
  cert: (
    <>
      <rect x="6" y="8" width="44" height="32" rx="2" />
      <path d="M14 18h28M14 25h18" />
      <circle cx="39" cy="38" r="6" fill={INK.black} />
      <path d="M36 43l-2 8 5-3 5 3-2-8" />
    </>
  ),
  compass: (
    <>
      <circle cx="28" cy="28" r="21" />
      <path d="M37 19l-5 13-13 5 5-13z" fill="currentColor" />
    </>
  ),
  trophy: (
    <>
      <path d="M18 8h20v12a10 10 0 0 1-20 0z" />
      <path d="M18 12h-6a6 6 0 0 0 6 8M38 12h6a6 6 0 0 1-6 8" />
      <path d="M28 30v10M21 40h14v8H21z" />
    </>
  ),
  people: (
    <>
      <circle cx="20" cy="19" r="7" />
      <circle cx="39" cy="22" r="6" />
      <path d="M6 47a14 14 0 0 1 28 0" />
      <path d="M33 35a11 11 0 0 1 17 10" />
    </>
  ),
  rocket: (
    <>
      <path d="M28 5c9 6 12 16 10 28H18C16 21 19 11 28 5z" />
      <circle cx="28" cy="20" r="4" />
      <path d="M18 27l-7 9 7 2M38 27l7 9-7 2M23 39l5 11 5-11" />
    </>
  ),
  bulb: (
    <>
      <path d="M20 36a14 14 0 1 1 16 0v6H20z" />
      <path d="M22 48h12M24 30l4-5 4 5M28 25v11" />
    </>
  ),
  search: (
    <>
      <circle cx="24" cy="24" r="14" />
      <path d="M34 34l14 14" />
      <path d="M18 20a7 7 0 0 1 6-4" />
    </>
  ),
  target: (
    <>
      <circle cx="28" cy="28" r="21" />
      <circle cx="28" cy="28" r="12" />
      <circle cx="28" cy="28" r="4" fill="currentColor" />
    </>
  ),
  sparkle: (
    <>
      <path d="M22 6l4 12 12 4-12 4-4 12-4-12-12-4 12-4z" />
      <path d="M43 32l2.5 6.5L52 41l-6.5 2.5L43 50l-2.5-6.5L34 41l6.5-2.5z" />
    </>
  ),
  judge: (
    <>
      <circle cx="28" cy="18" r="10" />
      <path d="M10 50a18 18 0 0 1 36 0" />
      <path d="M23 18l4 4 7-7" />
    </>
  ),
  blocks: (
    <>
      <rect x="7" y="30" width="18" height="18" rx="2" />
      <rect x="31" y="30" width="18" height="18" rx="2" />
      <rect x="19" y="8" width="18" height="18" rx="2" />
    </>
  ),
  flask: (
    <>
      <path d="M21 6h14M24 6v16L10 46a3 3 0 0 0 3 4h30a3 3 0 0 0 3-4L32 22V6" />
      <path d="M16 38h24" />
      <circle cx="24" cy="44" r="1.4" fill="currentColor" />
      <circle cx="33" cy="43" r="1.4" fill="currentColor" />
    </>
  ),
  trend: (
    <>
      <path d="M6 48h44" />
      <path d="M8 40l12-12 8 8 18-18" />
      <path d="M36 18h10v10" />
    </>
  ),
  code: (
    <>
      <path d="M20 16L8 28l12 12M36 16l12 12-12 12M32 10l-8 36" />
    </>
  ),
  calendar: (
    <>
      <rect x="7" y="11" width="42" height="38" rx="3" />
      <path d="M7 21h42M18 6v9M38 6v9" />
      <path d="M16 30h4M26 30h4M36 30h4M16 39h4M26 39h4" />
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
  className = "",
}: {
  name: IconName;
  ink: string;
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={`relative inline-block shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      <Plate
        name={name}
        color={T.accent4}
        className="absolute inset-0 h-full w-full translate-x-[2px] translate-y-[-1.5px] opacity-60 blur-[0.6px]"
      />
      <Plate name={name} color={ink} className="relative h-full w-full" />
    </span>
  );
}

export type { IconName as RisoIconName };
