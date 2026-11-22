"use client";

import { useState } from "react";
import {
  AlertTriangle,
  CloudOff,
  Loader2,
  Play,
  RefreshCw,
  Square,
  Star,
  Trash2,
} from "lucide-react";

import type { LocalUploadStatus } from "@/lib/radar-stories/voice-idb";

export interface StudioTakeItem {
  /** Stable React key: remote UUID or `local:<localId>`. */
  key: string;
  remoteId: string | null;
  localId: string | null;
  storyId: string;
  beatIndex: number;
  lineHash: string;
  durationMs: number;
  peakDbfs: number | null;
  noiseFloorDbfs: number | null;
  picked: boolean;
  createdAt: string;
  stale: boolean;
  clipped: boolean;
  tooQuiet: boolean;
  uploadStatus: "synced" | LocalUploadStatus;
  uploadError: string | null;
}

function formatDuration(ms: number): string {
  return `${(ms / 1000).toFixed(2)} วิ`;
}

function formatShortTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
}

export function TakeCard({
  take,
  indexLabel,
  isPlaying,
  isLoadingAudio,
  playProgress,
  busyAction,
  onTogglePlay,
  onPick,
  onDelete,
  onRetryUpload,
}: {
  take: StudioTakeItem;
  indexLabel: string;
  isPlaying: boolean;
  isLoadingAudio: boolean;
  playProgress: number;
  busyAction: boolean;
  onTogglePlay: () => void;
  onPick: () => void;
  onDelete: () => void;
  onRetryUpload: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  const canPick = Boolean(take.remoteId) && !take.stale && !busyAction;

  return (
    <div
      className={`rounded-2xl border p-3 transition-colors ${
        take.picked && !take.stale
          ? "border-emerald-400/50 bg-emerald-500/10"
          : take.stale
            ? "border-orange-400/30 bg-orange-500/5"
            : "border-zinc-800 bg-zinc-900/80"
      }`}
    >
      <div className="flex items-center gap-2.5">
        {/* Play / Stop button */}
        <button
          type="button"
          onClick={onTogglePlay}
          disabled={isLoadingAudio}
          aria-label={isPlaying ? "หยุดเล่น" : `เล่น ${indexLabel}`}
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition active:scale-95 ${
            isPlaying
              ? "bg-white text-zinc-950"
              : "bg-zinc-800 text-white hover:bg-zinc-700"
          }`}
        >
          {isLoadingAudio ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isPlaying ? (
            <Square className="h-4 w-4 fill-current" />
          ) : (
            <Play className="ml-0.5 h-4 w-4 fill-current" />
          )}
        </button>

        {/* Metrics & status */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="text-sm font-semibold text-white">{indexLabel}</span>
            <span className="font-mono text-xs text-zinc-300 tabular-nums">
              {formatDuration(take.durationMs)}
            </span>
            {take.peakDbfs !== null ? (
              <span className="font-mono text-[11px] text-zinc-400 tabular-nums">
                peak {take.peakDbfs.toFixed(1)} dB
              </span>
            ) : null}
            <span className="font-mono text-[10px] text-zinc-500 tabular-nums">
              {formatShortTime(take.createdAt)}
            </span>
          </div>

          {/* Badges */}
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {take.picked && !take.stale ? (
              <span className="rounded-md bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-200">
                เทคที่เลือกใช้
              </span>
            ) : null}
            {take.stale ? (
              <span className="rounded-md bg-orange-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-orange-200">
                ข้อความเปลี่ยนแล้ว (เก่า)
              </span>
            ) : null}
            {take.clipped ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-red-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-red-200">
                <AlertTriangle className="h-3 w-3" />
                เสียงแตก (Clip)
              </span>
            ) : null}
            {take.tooQuiet ? (
              <span className="rounded-md bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-medium text-amber-200">
                เสียงเบาไป
              </span>
            ) : null}
            {take.uploadStatus === "uploading" || take.uploadStatus === "queued" ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-sky-500/20 px-1.5 py-0.5 text-[10px] text-sky-200">
                <Loader2 className="h-3 w-3 animate-spin" />
                กำลังอัปโหลด...
              </span>
            ) : null}
            {take.uploadStatus === "failed" ? (
              <button
                type="button"
                onClick={onRetryUpload}
                className="inline-flex items-center gap-1 rounded-md bg-red-500/20 px-2 py-0.5 text-[10px] font-medium text-red-200 active:scale-95"
              >
                <CloudOff className="h-3 w-3" />
                เก็บในเครื่องแล้ว · แตะส่งใหม่
                <RefreshCw className="h-2.5 w-2.5" />
              </button>
            ) : null}
          </div>
        </div>

        {/* Star (Pick) & 2-tap Delete */}
        <div className="flex shrink-0 items-center gap-1.5">
          {!take.stale ? (
            <button
              type="button"
              onClick={onPick}
              disabled={!canPick}
              aria-label={take.picked ? "ยกเลิกการเลือกเทคนี้" : "เลือกใช้เทคนี้"}
              title={
                !take.remoteId
                  ? "รออัปโหลดเสร็จก่อนเลือก"
                  : take.picked
                    ? "เทคที่เลือกใช้"
                    : "เลือกใช้เทคนี้"
              }
              className={`flex h-11 w-11 items-center justify-center rounded-xl border transition active:scale-95 ${
                take.picked
                  ? "border-emerald-400/60 bg-emerald-500/25 text-emerald-300"
                  : "border-white/10 bg-zinc-800/80 text-zinc-400 hover:text-amber-300 disabled:opacity-40"
              }`}
            >
              <Star className={`h-5 w-5 ${take.picked ? "fill-current" : ""}`} />
            </button>
          ) : null}

          {confirmDelete ? (
            <button
              type="button"
              onClick={() => {
                setConfirmDelete(false);
                onDelete();
              }}
              onBlur={() => setConfirmDelete(false)}
              disabled={busyAction}
              className="flex h-11 items-center rounded-xl bg-red-600 px-3 text-xs font-semibold text-white active:scale-95"
            >
              ลบเลย
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              disabled={busyAction}
              aria-label="ลบเทคนี้"
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-zinc-800/60 text-zinc-400 hover:text-red-300 active:scale-95 disabled:opacity-40"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Inline playback scrubber bar */}
      {isPlaying ? (
        <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
          <div
            className="h-full rounded-full bg-emerald-400 transition-[width] duration-75"
            style={{ width: `${Math.min(100, Math.round(playProgress * 100))}%` }}
          />
        </div>
      ) : null}

      {take.uploadStatus === "failed" && take.uploadError ? (
        <p className="mt-1.5 text-[11px] text-red-300/90">{take.uploadError}</p>
      ) : null}
    </div>
  );
}
