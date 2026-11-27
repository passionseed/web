import { Check, Lock } from "lucide-react";

import { EL } from "@/components/hackathon/poster/elemental/brand";
import { STYLE_PARTS, TEAM_STYLE_TIERS, type StylePart } from "@/lib/hackathon/elemental/team-style";

// copy: placeholder — Angpao rewrites
export const PART_TH: Record<StylePart, string> = { color: "สี", font: "ฟอนต์", effect: "เอฟเฟกต์" };

/**
 * Where a team is on the way to each unlock: three evenly spaced stops
 * (TEAM_STYLE_TIERS), filled up to the team's devices. Without devices it is
 * just the map of what unlocks when.
 */
export function UnlockTrack({ devices }: { devices: number | null }) {
  const stops = STYLE_PARTS.map((part) => TEAM_STYLE_TIERS[part]);
  // Piecewise: each stop is a third of the bar, so early progress shows.
  const fill = (() => {
    if (devices === null) return 0;
    let prev = 0;
    for (let i = 0; i < stops.length; i++) {
      if (devices < stops[i]) return ((i + (devices - prev) / (stops[i] - prev)) / stops.length) * 100;
      prev = stops[i];
    }
    return 100;
  })();

  return (
    <div className="pb-1" aria-hidden>
      <div className="relative mx-2 h-[3px] rounded-full" style={{ backgroundColor: "rgba(29,33,31,0.12)" }}>
        <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${fill}%`, backgroundColor: EL.flame }} />
        {STYLE_PARTS.map((part, i) => {
          const reached = devices !== null && devices >= TEAM_STYLE_TIERS[part];
          return (
            <span
              key={part}
              className="absolute top-1/2 flex h-5 w-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full"
              style={{
                left: `${((i + 1) / stops.length) * 100}%`,
                backgroundColor: reached ? EL.flame : EL.cream,
                boxShadow: reached ? "none" : `inset 0 0 0 1.5px ${devices === null ? EL.ink : "rgba(29,33,31,0.35)"}`,
                color: reached ? EL.flameWhite : EL.inkSoft,
              }}
            >
              {reached ? <Check className="h-3 w-3" strokeWidth={3} /> : devices !== null && <Lock className="h-2.5 w-2.5" strokeWidth={2.5} />}
            </span>
          );
        })}
      </div>
      <div className="relative mx-2 mt-4 h-10 text-sm">
        {STYLE_PARTS.map((part, i) => {
          const last = i === stops.length - 1;
          return (
            <span
              key={part}
              className={`absolute top-0 whitespace-nowrap leading-tight ${last ? "-right-2 text-right" : "-translate-x-1/2 text-center"}`}
              style={last ? undefined : { left: `${((i + 1) / stops.length) * 100}%` }}
            >
              <span className="block font-semibold tabular-nums">{TEAM_STYLE_TIERS[part]}</span>
              <span className="block" style={{ color: EL.inkSoft }}>
                {PART_TH[part]}
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
