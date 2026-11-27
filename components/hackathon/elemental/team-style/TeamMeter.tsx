import { Check } from "lucide-react";

import { EL, EL_FONT } from "@/components/hackathon/poster/elemental/brand";
import { STYLE_PARTS, TEAM_METER_GOAL, TEAM_STYLE_TIERS, type StylePart } from "@/lib/hackathon/elemental/team-style";

import { DeviceStrip, deviceTickLeft } from "../share/Progress";

/**
 * The team's devices on the way to each unlock: the share link's own meter
 * (DeviceStrip, ../share/Progress.tsx: one cell per device, filling two rows
 * column by column, the count in Trirong), with the cell of each unlock
 * (TEAM_STYLE_TIERS) ringed and, under its tick (deviceTickLeft), what it opens.
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

/** The cells, with a ring on each unlock's cell and its label under it. Without devices it is the map of unlocks. */
export function TeamMeterStrip({ devices }: { devices: number | null }) {
  const filled = Math.min(devices ?? 0, TEAM_METER_GOAL);
  const tierCells = new Set(TIERS.map((t) => t.at - 1));
  return (
    <div>
      <div className="relative">
        <DeviceStrip value={filled} goal={TEAM_METER_GOAL} />
        {/* DeviceStrip's grid again on top, transparent but for the rings, so they sit exactly on their cells. */}
        <div
          className="pointer-events-none absolute inset-0 grid gap-[3px]"
          style={{ gridTemplateRows: "repeat(2, auto)", gridAutoFlow: "column", gridAutoColumns: "minmax(0, 1fr)" }}
          aria-hidden="true"
        >
          {Array.from({ length: TEAM_METER_GOAL }, (_, i) => (
            <span
              key={i}
              className="aspect-square rounded-[2px]"
              style={tierCells.has(i) ? { boxShadow: `0 0 0 1.5px ${EL.cream}, 0 0 0 3px ${i < filled ? EL.flame : EL.ink}` } : undefined}
            />
          ))}
        </div>
      </div>
      {/* Each unlock under its tick: centred, the last one held to the right edge. */}
      <ul className="relative mt-2 h-11 text-sm">
        {TIERS.map(({ part, at }) => {
          const reached = devices !== null && devices >= at;
          const last = at >= TEAM_METER_GOAL;
          return (
            <li
              key={part}
              className={`absolute top-0 whitespace-nowrap leading-tight ${last ? "right-0 text-right" : "-translate-x-1/2 text-center"}`}
              style={last ? undefined : { left: deviceTickLeft(at, TEAM_METER_GOAL) }}
            >
              <span className="flex items-center gap-1 font-semibold tabular-nums" style={{ justifyContent: last ? "flex-end" : "center" }}>
                {reached && <Check className="h-3.5 w-3.5 shrink-0" style={{ color: EL.flame }} strokeWidth={2.5} aria-label="ปลดล็อกแล้ว" />}
                {at} {UNIT}
              </span>
              <span className="block" style={{ color: EL.inkSoft }}>
                {PART_TH[part]}
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
