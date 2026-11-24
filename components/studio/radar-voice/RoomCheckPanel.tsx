"use client";

import { AlertTriangle, CheckCircle2, Mic, RefreshCw, Volume2 } from "lucide-react";

import type { RoomNoiseAssessment } from "@/lib/radar-stories/audio-dsp";

import type { RecorderPhase } from "./useVoiceRecorder";

export function RoomCheckPanel({
  roomCheck,
  phase,
  progress,
  onStartCheck,
  onSkip,
  dismissed,
}: {
  roomCheck: RoomNoiseAssessment | null;
  phase: RecorderPhase;
  progress: number;
  onStartCheck: () => void;
  onSkip: () => void;
  dismissed: boolean;
}) {
  const checking = phase === "room-check";

  // After passing a quiet/ok check or dismissing, keep only warnings visible inline.
  if (dismissed && !checking && roomCheck?.status !== "loud") {
    return null;
  }
  if (roomCheck && roomCheck.status !== "loud" && !checking && dismissed) {
    return null;
  }

  if (checking) {
    const remaining = Math.max(0.1, (1 - progress) * 3).toFixed(1);
    return (
      <div className="rounded-2xl border border-sky-400/30 bg-sky-500/10 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Volume2 className="h-5 w-5 animate-pulse text-sky-300" />
            <div>
              <p className="text-sm font-semibold text-white">กำลังฟังเสียงห้อง... เงียบไว้สักครู่</p>
              <p className="font-mono text-xs text-sky-200/80 tabular-nums">เหลืออีก {remaining} วิ</p>
            </div>
          </div>
        </div>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-zinc-900">
          <div
            className="h-full rounded-full bg-sky-400 transition-[width] duration-75"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
      </div>
    );
  }

  if (roomCheck) {
    const isLoud = roomCheck.status === "loud";
    const isQuiet = roomCheck.status === "quiet";
    return (
      <div
        className={`rounded-2xl border p-3.5 ${
          isLoud
            ? "border-amber-400/40 bg-amber-500/10"
            : isQuiet
              ? "border-emerald-400/30 bg-emerald-500/10"
              : "border-zinc-700 bg-zinc-900/90"
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            {isLoud ? (
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
            ) : (
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
            )}
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-white">{roomCheck.labelTh}</span>
                <span className="rounded bg-black/40 px-1.5 py-0.5 font-mono text-[11px] text-zinc-300 tabular-nums">
                  พื้นเสียง {roomCheck.noiseFloorDbfs.toFixed(1)} dBFS
                </span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-zinc-300">{roomCheck.adviceTh}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={onStartCheck}
              className="flex h-9 items-center gap-1 rounded-xl border border-white/15 bg-white/5 px-2.5 text-xs font-medium text-zinc-200 active:scale-95"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              เช็กใหม่
            </button>
            {!isLoud ? (
              <button
                type="button"
                onClick={onSkip}
                className="h-9 rounded-xl bg-white/10 px-2.5 text-xs font-medium text-zinc-200 active:scale-95"
              >
                ปิด
              </button>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/90 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-white">เช็กเสียงห้อง 3 วินาทีก่อนอัดเทคแรก</p>
          <p className="mt-1 text-xs leading-relaxed text-zinc-400">
            วัดเสียงพื้นหลัง (แอร์/พัดลม) และตั้งระดับตัดเสียงเงียบอัตโนมัติให้พอดีกับห้องนี้
          </p>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={onStartCheck}
          className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-zinc-950 active:scale-[0.98]"
        >
          <Mic className="h-4 w-4" />
          เริ่มเช็กเสียงห้อง 3 วิ
        </button>
        <button
          type="button"
          onClick={onSkip}
          className="h-11 rounded-xl border border-white/10 px-3.5 text-xs font-medium text-zinc-400 active:scale-95"
        >
          ข้ามก่อน
        </button>
      </div>
    </div>
  );
}
