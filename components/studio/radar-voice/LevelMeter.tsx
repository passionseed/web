"use client";

import { DBFS_FLOOR } from "@/lib/radar-stories/audio-dsp";

import type { LiveMeterState, RecorderPhase } from "./useVoiceRecorder";

const MIN_DB = -60;
const MAX_DB = 0;

function dbToPercent(db: number): number {
  if (!Number.isFinite(db) || db <= MIN_DB) return 0;
  if (db >= MAX_DB) return 100;
  return ((db - MIN_DB) / (MAX_DB - MIN_DB)) * 100;
}

function formatDb(db: number): string {
  if (!Number.isFinite(db) || db <= DBFS_FLOOR + 1) return "-∞ dB";
  return `${db.toFixed(1)} dB`;
}

export function LevelMeter({
  meter,
  phase,
  onResetClip,
}: {
  meter: LiveMeterState;
  phase: RecorderPhase;
  onResetClip: () => void;
}) {
  const rmsPct = dbToPercent(meter.rmsDbfs);
  const peakPct = dbToPercent(meter.peakDbfs);
  const holdPct = dbToPercent(meter.peakHoldDbfs);
  const isActive = phase !== "idle";

  const barColor =
    meter.peakDbfs >= -1.5
      ? "bg-red-500"
      : meter.peakDbfs >= -9
        ? "bg-amber-400"
        : "bg-emerald-400";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2 text-[11px] font-mono tabular-nums">
        <div className="flex items-center gap-2 text-zinc-400">
          <span
            className={`inline-block h-2 w-2 rounded-full ${
              phase === "recording"
                ? "animate-pulse bg-red-500"
                : isActive
                  ? "bg-emerald-400"
                  : "bg-zinc-600"
            }`}
          />
          <span>{isActive ? `PEAK ${formatDb(meter.peakDbfs)}` : "MIC STANDBY"}</span>
          {isActive ? <span className="text-zinc-500">RMS {formatDb(meter.rmsDbfs)}</span> : null}
        </div>

        <div className="flex items-center gap-1.5">
          {meter.tooQuietLive ? (
            <span className="rounded bg-amber-500/20 px-1.5 py-0.5 font-sans text-[11px] font-medium text-amber-200">
              เสียงเบาไป เข้าใกล้ไมค์อีกนิด
            </span>
          ) : null}
          {meter.clipped ? (
            <button
              type="button"
              onClick={onResetClip}
              className="rounded bg-red-500 px-1.5 py-0.5 font-mono text-[10px] font-bold tracking-wider text-white"
              title="แตะเพื่อล้างไฟเตือน Clip"
            >
              CLIP
            </button>
          ) : null}
        </div>
      </div>

      {/* Meter track (-60 dB to 0 dB) with target zone markers */}
      <div
        className="relative h-3 w-full overflow-hidden rounded-full bg-zinc-900 ring-1 ring-white/10"
        aria-label="ระดับเสียงไมโครโฟน"
      >
        {/* Subtle ideal vocal zone (-18 dB to -6 dB) */}
        <div
          className="absolute inset-y-0 bg-emerald-500/10"
          style={{ left: `${dbToPercent(-18)}%`, width: `${dbToPercent(-6) - dbToPercent(-18)}%` }}
        />

        {/* Peak layer (translucent) */}
        <div
          className={`absolute inset-y-0 left-0 opacity-45 transition-[width] duration-75 ${barColor}`}
          style={{ width: `${peakPct}%` }}
        />

        {/* RMS solid bar */}
        <div
          className={`absolute inset-y-0 left-0 transition-[width] duration-75 ${barColor}`}
          style={{ width: `${rmsPct}%` }}
        />

        {/* Peak hold tick */}
        {isActive && holdPct > 1 ? (
          <div
            className={`absolute inset-y-0 w-0.5 ${meter.peakHoldDbfs >= -1.5 ? "bg-red-400" : "bg-white/90"}`}
            style={{ left: `calc(${holdPct}% - 1px)` }}
          />
        ) : null}

        {/* Scale ticks: -24, -12, -6 dB */}
        {[-24, -12, -6].map((mark) => (
          <div
            key={mark}
            className="pointer-events-none absolute inset-y-0 w-px bg-black/50"
            style={{ left: `${dbToPercent(mark)}%` }}
          />
        ))}
      </div>

      <div className="flex justify-between font-mono text-[9px] text-zinc-600 tabular-nums">
        <span>-60</span>
        <span>-24</span>
        <span>-12</span>
        <span>-6</span>
        <span>0 dB</span>
      </div>
    </div>
  );
}
