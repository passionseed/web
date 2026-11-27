import { Check } from "lucide-react";

import { EL, EL_FONT } from "@/components/hackathon/poster/elemental/brand";
import { STYLE_PARTS, TEAM_METER_GOAL, TEAM_STYLE_TIERS, type StylePart } from "@/lib/hackathon/elemental/team-style";

import { DeviceStrip } from "../share/Progress";

/**
 * The team's devices on the way to each unlock: the share link's own meter
 * (DeviceStrip, ../share/Progress.tsx: one cell per device, 25 to a row, the
 * count in Trirong), with the cell of each unlock (TEAM_STYLE_TIERS) ringed
 * and a legend of what each one opens.
 */

// copy: placeholder — Angpao rewrites
export const PART_TH: Record<StylePart, string> = { color: "สี", font: "ฟอนต์", effect: "เอฟเฟกต์" };
const UNIT = "เครื่อง";

const TIERS = STYLE_PARTS.map((part) => ({ part, at: TEAM_STYLE_TIERS[part] }));

/** "31/50", as the share meter prints it; past the last unlock just "64 เครื่อง". */
function MeterCount({ value }: { value: number }) {
  if (value >= TEAM_METER_GOAL) {
    return (
      <span className="whitespace-nowrap tabular-nums">
        <span className="text-4xl" style={{ fontFamily: EL_FONT.display, fontWeight: 300 }}>
          {value}
        </span>{" "}
        <span className="text-base" style={{ color: EL.inkSoft }}>
          {UNIT}
        </span>
      </span>
    );
  }
  return (
    <span className="whitespace-nowrap tabular-nums" aria-label={`${value} จาก ${TEAM_METER_GOAL} ${UNIT}`}>
      <span className="text-4xl" style={{ fontFamily: EL_FONT.display, fontWeight: 300 }}>
        {value}
      </span>
      <span className="text-lg" style={{ color: EL.inkSoft }}>
        /{TEAM_METER_GOAL}
      </span>
    </span>
  );
}

/** The cells, with a ring on each unlock's cell, and the legend. Without devices it is the map of unlocks. */
export function TeamMeterStrip({ devices }: { devices: number | null }) {
  const filled = Math.min(devices ?? 0, TEAM_METER_GOAL);
  const tierCells = new Set(TIERS.map((t) => t.at - 1));
  return (
    <div>
      <div className="relative">
        <DeviceStrip value={filled} goal={TEAM_METER_GOAL} />
        {/* The same grid on top, transparent but for the rings, so the ticks sit exactly on their cells. */}
        <div className="pointer-events-none absolute inset-0 grid gap-[3px]" style={{ gridTemplateColumns: `repeat(${TEAM_METER_GOAL / 2}, minmax(0, 1fr))` }} aria-hidden="true">
          {Array.from({ length: TEAM_METER_GOAL }, (_, i) => (
            <span
              key={i}
              className="aspect-square rounded-[2px]"
              style={tierCells.has(i) ? { boxShadow: `0 0 0 1.5px ${EL.cream}, 0 0 0 3px ${i < filled ? EL.flame : EL.ink}` } : undefined}
            />
          ))}
        </div>
      </div>
      <ul className="mt-4 grid grid-cols-3 gap-2 text-sm">
        {TIERS.map(({ part, at }) => {
          const reached = devices !== null && devices >= at;
          return (
            <li key={part} className="flex items-start gap-1.5">
              {reached ? (
                <Check className="mt-0.5 h-4 w-4 shrink-0" style={{ color: EL.flame }} strokeWidth={2.5} aria-label="ปลดล็อกแล้ว" />
              ) : (
                <span className="mt-1 h-3 w-3 shrink-0 rounded-[2px]" style={{ boxShadow: `0 0 0 1.5px ${EL.ink}` }} aria-hidden="true" />
              )}
              <span className="leading-tight">
                <span className="block font-semibold tabular-nums">
                  {at} {UNIT}
                </span>
                <span style={{ color: EL.inkSoft }}>{PART_TH[part]}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** The meter with its label and count, as the share meter lays them out. */
export function TeamMeter({ devices, label }: { devices: number; label: string }) {
  return (
    <div>
      <div className="flex items-end justify-between gap-3">
        <span className="pb-1.5 text-base">{label}</span>
        <MeterCount value={devices} />
      </div>
      <div className="mt-2">
        <TeamMeterStrip devices={devices} />
      </div>
    </div>
  );
}
