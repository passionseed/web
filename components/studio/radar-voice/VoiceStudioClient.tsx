"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  Cloud,
  CloudOff,
  Headphones,
  Loader2,
  Mic,
  Square,
  Volume2,
  X,
} from "lucide-react";

import { TOO_QUIET_PEAK_DBFS } from "@/lib/radar-stories/audio-dsp";
import type { StoryScript } from "@/lib/radar-stories/types";
import {
  buildStoryVoicePlan,
  isTakeStale,
  MOOD_DIRECTION_TH,
  sceneLabelTh,
  WHO_LABEL_TH,
} from "@/lib/radar-stories/voice";
import {
  deleteLocalTake,
  listLocalTakes,
  putLocalTake,
  updateLocalTakeStatus,
  type LocalTakeRecord,
} from "@/lib/radar-stories/voice-idb";
import type { RadarVoiceTake } from "@/lib/supabase/radar-voice";

import { LevelMeter } from "./LevelMeter";
import { RoomCheckPanel } from "./RoomCheckPanel";
import { TakeCard, type StudioTakeItem } from "./TakeCard";
import { useVoiceRecorder, type RecordedTakePayload } from "./useVoiceRecorder";

const RETRY_DELAYS_MS = [2000, 5000, 12000, 25000];

function formatTimer(ms: number): string {
  const secs = Math.max(0, ms) / 1000;
  const mins = Math.floor(secs / 60);
  const rem = (secs % 60).toFixed(1).padStart(4, "0");
  return `${String(mins).padStart(2, "0")}:${rem}`;
}

export function VoiceStudioClient({
  script,
  initialTakes,
  initialLineIndex,
  migrationMissing,
}: {
  script: StoryScript;
  initialTakes: RadarVoiceTake[];
  initialLineIndex: number;
  migrationMissing: boolean;
}) {
  const plan = useMemo(() => buildStoryVoicePlan(script), [script]);
  const [lineIndex, setLineIndex] = useState(() =>
    Math.min(Math.max(0, initialLineIndex), Math.max(0, plan.length - 1)),
  );
  const [remoteTakes, setRemoteTakes] = useState<RadarVoiceTake[]>(initialTakes);
  const [localTakes, setLocalTakes] = useState<LocalTakeRecord[]>([]);
  const [roomCheckDismissed, setRoomCheckDismissed] = useState(false);
  const [notice, setNotice] = useState<{ kind: "info" | "warn" | "error"; text: string } | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  // Playback state
  const [playingKey, setPlayingKey] = useState<string | null>(null);
  const [loadingAudioKey, setLoadingAudioKey] = useState<string | null>(null);
  const [playProgress, setPlayProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playRafRef = useRef<number>(0);

  // Audio URL caches: local blob URLs (instant playback) + signed remote URLs.
  const blobUrlCacheRef = useRef<Map<string, string>>(new Map());
  const signedUrlCacheRef = useRef<Map<string, { url: string; expiresAt: number }>>(new Map());
  const inFlightUploadsRef = useRef<Set<string>>(new Set());
  const retryTimersRef = useRef<Map<string, number>>(new Map());

  const currentLine = plan[lineIndex] ?? null;

  // Cleanup audio element, object URLs, and timers on unmount.
  useEffect(() => {
    const blobCache = blobUrlCacheRef.current;
    const retryTimers = retryTimersRef.current;
    return () => {
      if (playRafRef.current) cancelAnimationFrame(playRafRef.current);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
      for (const timer of retryTimers.values()) window.clearTimeout(timer);
      retryTimers.clear();
      const revoked = new Set<string>();
      for (const url of blobCache.values()) {
        if (!revoked.has(url)) {
          URL.revokeObjectURL(url);
          revoked.add(url);
        }
      }
      blobCache.clear();
    };
  }, []);

  const stopPlayback = useCallback(() => {
    if (playRafRef.current) {
      cancelAnimationFrame(playRafRef.current);
      playRafRef.current = 0;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setPlayingKey(null);
    setLoadingAudioKey(null);
    setPlayProgress(0);
  }, []);

  // Upload one local IndexedDB take in the background with exponential backoff.
  const uploadLocalTake = useCallback(async (record: LocalTakeRecord) => {
    if (inFlightUploadsRef.current.has(record.localId)) return;
    inFlightUploadsRef.current.add(record.localId);

    const existingTimer = retryTimersRef.current.get(record.localId);
    if (existingTimer) {
      window.clearTimeout(existingTimer);
      retryTimersRef.current.delete(record.localId);
    }

    const nextAttempts = record.attempts + 1;
    setLocalTakes((prev) =>
      prev.map((item) =>
        item.localId === record.localId
          ? { ...item, uploadStatus: "uploading", uploadError: null, attempts: nextAttempts }
          : item,
      ),
    );
    await updateLocalTakeStatus(record.localId, {
      uploadStatus: "uploading",
      uploadError: null,
      attempts: nextAttempts,
    });

    try {
      const qs = new URLSearchParams({
        storyId: record.storyId,
        beatIndex: String(record.beatIndex),
        lineHash: record.lineHash,
        noiseFloorDbfs: String(record.noiseFloorDbfs),
      });

      const response = await fetch(`/api/studio/radar-voice?${qs.toString()}`, {
        method: "POST",
        headers: {
          "Content-Type": "audio/wav",
          "x-story-id": record.storyId,
          "x-beat-index": String(record.beatIndex),
          "x-line-hash": record.lineHash,
          "x-noise-floor-dbfs": String(record.noiseFloorDbfs),
        },
        body: record.wavBytes,
      });

      const data = (await response.json().catch(() => null)) as {
        take?: RadarVoiceTake;
        signedUrl?: string;
        error?: string;
      } | null;

      if (!response.ok || !data?.take) {
        const message = data?.error ?? `อัปโหลดไม่สำเร็จ (HTTP ${response.status})`;
        throw new Error(message);
      }

      const uploadedTake = data.take;
      // Preserve instant local blob playback under the new remote ID for this session.
      const localKey = `local:${record.localId}`;
      const existingBlobUrl = blobUrlCacheRef.current.get(localKey);
      if (existingBlobUrl) {
        blobUrlCacheRef.current.set(uploadedTake.id, existingBlobUrl);
      }
      if (data.signedUrl) {
        signedUrlCacheRef.current.set(uploadedTake.id, {
          url: data.signedUrl,
          expiresAt: Date.now() + 55 * 60 * 1000,
        });
      }

      setRemoteTakes((prev) => [uploadedTake, ...prev.filter((t) => t.id !== uploadedTake.id)]);
      setLocalTakes((prev) => prev.filter((item) => item.localId !== record.localId));
      await deleteLocalTake(record.localId);
    } catch (err) {
      const errorText = err instanceof Error ? err.message : "เชื่อมต่อไม่ได้ เก็บไฟล์ไว้ในเครื่องแล้ว";
      const updatedRecord: LocalTakeRecord = {
        ...record,
        uploadStatus: "failed",
        uploadError: errorText,
        attempts: nextAttempts,
      };
      setLocalTakes((prev) =>
        prev.map((item) => (item.localId === record.localId ? updatedRecord : item)),
      );
      await updateLocalTakeStatus(record.localId, {
        uploadStatus: "failed",
        uploadError: errorText,
        attempts: nextAttempts,
      });

      const delay = RETRY_DELAYS_MS[Math.min(nextAttempts - 1, RETRY_DELAYS_MS.length - 1)];
      if (nextAttempts <= RETRY_DELAYS_MS.length) {
        const timer = window.setTimeout(() => {
          retryTimersRef.current.delete(record.localId);
          void uploadLocalTake(updatedRecord);
        }, delay);
        retryTimersRef.current.set(record.localId, timer);
      }
    } finally {
      inFlightUploadsRef.current.delete(record.localId);
    }
  }, []);

  // Hydrate pending takes from IndexedDB on mount and auto-upload them.
  useEffect(() => {
    let active = true;
    void listLocalTakes(script.id).then((records) => {
      if (!active || records.length === 0) return;
      for (const rec of records) {
        const localKey = `local:${rec.localId}`;
        if (!blobUrlCacheRef.current.has(localKey)) {
          const url = URL.createObjectURL(new Blob([rec.wavBytes], { type: "audio/wav" }));
          blobUrlCacheRef.current.set(localKey, url);
        }
      }
      setLocalTakes(records);
      for (const rec of records) {
        void uploadLocalTake(rec);
      }
    });
    return () => {
      active = false;
    };
  }, [script.id, uploadLocalTake]);

  // Retry failed local uploads automatically when phone regains internet connection.
  const localTakesRef = useRef<LocalTakeRecord[]>(localTakes);
  localTakesRef.current = localTakes;
  useEffect(() => {
    const onOnline = () => {
      for (const rec of localTakesRef.current) {
        if (rec.uploadStatus === "failed" || rec.uploadStatus === "queued") {
          void uploadLocalTake({ ...rec, attempts: 0 });
        }
      }
    };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [uploadLocalTake]);

  // Handle a finished recording from useVoiceRecorder.
  const handleTakeReady = useCallback(
    (payload: RecordedTakePayload) => {
      if (!currentLine) return;

      const localId =
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

      const wavCopy = new Uint8Array(payload.wavBytes.byteLength);
      wavCopy.set(payload.wavBytes);

      const record: LocalTakeRecord = {
        localId,
        storyId: script.id,
        beatIndex: currentLine.beatIndex,
        lineHash: currentLine.lineHash,
        wavBytes: wavCopy.buffer,
        durationMs: payload.durationMs,
        peakDbfs: payload.peakDbfs,
        noiseFloorDbfs: payload.noiseFloorDbfs,
        clipped: payload.clipped,
        tooQuiet: payload.tooQuiet,
        createdAt: new Date().toISOString(),
        uploadStatus: "queued",
        uploadError: null,
        attempts: 0,
      };

      const blobUrl = URL.createObjectURL(new Blob([wavCopy], { type: "audio/wav" }));
      blobUrlCacheRef.current.set(`local:${localId}`, blobUrl);

      setLocalTakes((prev) => [record, ...prev]);

      if (payload.clipped) {
        setNotice({ kind: "warn", text: "เทคนี้มีเสียงแตก (Clip) ลองขยับไมค์ห่างปากอีกนิดแล้วอัดเพิ่ม" });
      } else if (payload.wasAllSilent || payload.tooQuiet) {
        setNotice({ kind: "warn", text: "เสียงค่อนข้างเบา ลองพูดใกล้ไมค์ขึ้นอีกหน่อย" });
      } else {
        setNotice(null);
      }

      // Persist to IndexedDB first, then upload in background.
      void putLocalTake(record).then(() => uploadLocalTake(record));
    },
    [currentLine, script.id, uploadLocalTake],
  );

  const recorder = useVoiceRecorder({ onTakeReady: handleTakeReady });

  // Merge remote + local pending takes for the current line.
  const currentLineTakes = useMemo<StudioTakeItem[]>(() => {
    if (!currentLine) return [];
    const items: StudioTakeItem[] = [];

    for (const loc of localTakes) {
      if (loc.beatIndex !== currentLine.beatIndex) continue;
      items.push({
        key: `local:${loc.localId}`,
        remoteId: null,
        localId: loc.localId,
        storyId: loc.storyId,
        beatIndex: loc.beatIndex,
        lineHash: loc.lineHash,
        durationMs: loc.durationMs,
        peakDbfs: loc.peakDbfs,
        noiseFloorDbfs: loc.noiseFloorDbfs,
        picked: false,
        createdAt: loc.createdAt,
        stale: isTakeStale({ line_hash: loc.lineHash }, currentLine),
        clipped: loc.clipped,
        tooQuiet: loc.tooQuiet,
        uploadStatus: loc.uploadStatus,
        uploadError: loc.uploadError,
      });
    }

    for (const rem of remoteTakes) {
      if (rem.beat_index !== currentLine.beatIndex) continue;
      items.push({
        key: rem.id,
        remoteId: rem.id,
        localId: null,
        storyId: rem.story_id,
        beatIndex: rem.beat_index,
        lineHash: rem.line_hash,
        durationMs: rem.duration_ms,
        peakDbfs: rem.peak_dbfs,
        noiseFloorDbfs: rem.noise_floor_dbfs,
        picked: rem.picked,
        createdAt: rem.created_at,
        stale: isTakeStale(rem, currentLine),
        clipped: rem.peak_dbfs !== null && rem.peak_dbfs >= -0.2,
        tooQuiet: rem.peak_dbfs !== null && rem.peak_dbfs < TOO_QUIET_PEAK_DBFS,
        uploadStatus: "synced",
        uploadError: null,
      });
    }

    return items;
  }, [currentLine, localTakes, remoteTakes]);

  const currentFreshTakes = useMemo(
    () => currentLineTakes.filter((t) => !t.stale),
    [currentLineTakes],
  );
  const currentStaleTakes = useMemo(
    () => currentLineTakes.filter((t) => t.stale),
    [currentLineTakes],
  );

  // Per-line progress dots for the header strip.
  const lineStatuses = useMemo(() => {
    return plan.map((line) => {
      const rem = remoteTakes.filter((t) => t.beat_index === line.beatIndex);
      const loc = localTakes.filter((t) => t.beatIndex === line.beatIndex);
      if (rem.some((t) => t.picked && !isTakeStale(t, line))) return "picked" as const;
      if (rem.some((t) => !isTakeStale(t, line)) || loc.some((t) => t.lineHash === line.lineHash)) {
        return "recorded" as const;
      }
      if (rem.length > 0) return "stale" as const;
      return "missing" as const;
    });
  }, [plan, remoteTakes, localTakes]);

  const handleTogglePlay = useCallback(
    async (take: StudioTakeItem) => {
      if (playingKey === take.key) {
        stopPlayback();
        return;
      }

      stopPlayback();
      // Release live mic stream so iOS Safari plays back through speaker/headphones at full volume.
      if (recorder.phase === "monitoring") {
        recorder.releaseMic();
      }

      let src: string | null = blobUrlCacheRef.current.get(take.key) ?? null;

      if (!src && take.remoteId) {
        const cached = signedUrlCacheRef.current.get(take.remoteId);
        if (cached && cached.expiresAt > Date.now()) {
          src = cached.url;
        } else {
          setLoadingAudioKey(take.key);
          try {
            const res = await fetch(`/api/studio/radar-voice/${take.remoteId}/url`, {
              cache: "no-store",
            });
            const data = (await res.json().catch(() => null)) as {
              url?: string;
              expiresIn?: number;
              error?: string;
            } | null;
            if (!res.ok || !data?.url) {
              throw new Error(data?.error ?? "โหลดลิงก์เสียงไม่สำเร็จ");
            }
            src = data.url;
            signedUrlCacheRef.current.set(take.remoteId, {
              url: src,
              expiresAt: Date.now() + Math.max(60, (data.expiresIn ?? 3600) - 300) * 1000,
            });
          } catch (err) {
            setLoadingAudioKey(null);
            setNotice({
              kind: "error",
              text: err instanceof Error ? err.message : "เล่นไฟล์เสียงไม่ได้",
            });
            return;
          }
          setLoadingAudioKey(null);
        }
      }

      if (!src) return;

      const audio = audioRef.current ?? new Audio();
      audioRef.current = audio;
      audio.src = src;
      audio.preload = "auto";
      audio.onended = () => {
        if (playRafRef.current) cancelAnimationFrame(playRafRef.current);
        setPlayingKey(null);
        setPlayProgress(0);
      };
      audio.onerror = () => {
        if (playRafRef.current) cancelAnimationFrame(playRafRef.current);
        setPlayingKey(null);
        setPlayProgress(0);
        setNotice({ kind: "error", text: "ไม่สามารถเล่นไฟล์เสียงนี้ได้ ลองแตะใหม่อีกครั้ง" });
      };

      try {
        await audio.play();
        setPlayingKey(take.key);
        const tick = () => {
          if (!audioRef.current || audioRef.current.paused) return;
          const dur = audioRef.current.duration || take.durationMs / 1000;
          setPlayProgress(dur > 0 ? Math.min(1, audioRef.current.currentTime / dur) : 0);
          playRafRef.current = requestAnimationFrame(tick);
        };
        playRafRef.current = requestAnimationFrame(tick);
      } catch {
        setPlayingKey(null);
        setNotice({ kind: "error", text: "แตะปุ่มเล่นอีกครั้งเพื่อเปิดเสียงบนเบราว์เซอร์นี้" });
      }
    },
    [playingKey, recorder, stopPlayback],
  );

  const handlePick = useCallback(
    async (take: StudioTakeItem) => {
      if (!take.remoteId) return;
      setBusyKey(take.key);
      setNotice(null);
      const nextPicked = !take.picked;
      try {
        const res = await fetch(`/api/studio/radar-voice/${take.remoteId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ picked: nextPicked }),
        });
        const data = (await res.json().catch(() => null)) as {
          take?: RadarVoiceTake;
          error?: string;
        } | null;
        if (!res.ok || !data?.take) {
          throw new Error(data?.error ?? "เลือกเทคไม่สำเร็จ");
        }
        const updated = data.take;
        setRemoteTakes((prev) =>
          prev.map((row) => {
            if (row.id === updated.id) return updated;
            if (nextPicked && row.beat_index === updated.beat_index && row.picked) {
              return { ...row, picked: false };
            }
            return row;
          }),
        );
      } catch (err) {
        setNotice({ kind: "error", text: err instanceof Error ? err.message : "เลือกเทคไม่สำเร็จ" });
      } finally {
        setBusyKey(null);
      }
    },
    [],
  );

  const handleDelete = useCallback(
    async (take: StudioTakeItem) => {
      if (playingKey === take.key) stopPlayback();
      setBusyKey(take.key);
      setNotice(null);

      try {
        if (take.localId) {
          const timer = retryTimersRef.current.get(take.localId);
          if (timer) {
            window.clearTimeout(timer);
            retryTimersRef.current.delete(take.localId);
          }
          setLocalTakes((prev) => prev.filter((item) => item.localId !== take.localId));
          await deleteLocalTake(take.localId);
          return;
        }

        if (take.remoteId) {
          const res = await fetch(`/api/studio/radar-voice/${take.remoteId}`, {
            method: "DELETE",
          });
          if (!res.ok) {
            const data = (await res.json().catch(() => null)) as { error?: string } | null;
            throw new Error(data?.error ?? "ลบเทคไม่สำเร็จ");
          }
          setRemoteTakes((prev) => prev.filter((row) => row.id !== take.remoteId));
        }
      } catch (err) {
        setNotice({ kind: "error", text: err instanceof Error ? err.message : "ลบเทคไม่สำเร็จ" });
      } finally {
        setBusyKey(null);
      }
    },
    [playingKey, stopPlayback],
  );

  const goLine = useCallback(
    (nextIndex: number) => {
      if (recorder.phase === "recording" || recorder.phase === "countdown" || recorder.phase === "room-check") {
        return;
      }
      const clamped = Math.min(Math.max(0, nextIndex), Math.max(0, plan.length - 1));
      stopPlayback();
      setNotice(null);
      setLineIndex(clamped);
    },
    [plan.length, recorder.phase, stopPlayback],
  );

  const handlePrimaryRecordTap = useCallback(() => {
    setNotice(null);
    if (recorder.phase === "recording") {
      recorder.stopRecording();
    } else if (recorder.phase === "countdown") {
      recorder.cancelCapture();
    } else {
      stopPlayback();
      setRoomCheckDismissed(true);
      void recorder.startRecording();
    }
  }, [recorder, stopPlayback]);

  const pendingUploadsCount = localTakes.length;
  const failedUploadsCount = localTakes.filter((t) => t.uploadStatus === "failed").length;
  const isCapturing =
    recorder.phase === "recording" || recorder.phase === "countdown" || recorder.phase === "room-check";

  if (!currentLine) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-zinc-950 p-6 text-center text-zinc-200">
        <p className="text-base font-semibold">Reel นี้ไม่มีบรรทัดที่ต้องอัดเสียง</p>
        <Link
          href="/studio/radar-voice"
          className="mt-4 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-zinc-950"
        >
          กลับหน้ารวม Reels
        </Link>
      </div>
    );
  }

  const moodInfo = MOOD_DIRECTION_TH[currentLine.mood];

  return (
    <div
      className="flex min-h-[100dvh] flex-col bg-zinc-950 text-zinc-100 select-none"
      style={{
        fontFamily: "var(--font-bai-jamjuree), var(--font-noto-sans-thai), sans-serif",
        paddingTop: "env(safe-area-inset-top)",
      }}
    >
      {/* Top sticky header */}
      <header className="sticky top-0 z-20 border-b border-white/[0.07] bg-zinc-950/95 px-4 py-2.5 backdrop-blur">
        <div className="mx-auto flex max-w-xl items-center justify-between gap-2">
          <Link
            href="/studio/radar-voice"
            className="flex h-9 items-center gap-1 rounded-xl border border-white/10 bg-zinc-900 px-2.5 text-xs font-medium text-zinc-200 active:scale-95"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Reels</span>
          </Link>

          <div className="min-w-0 flex-1 text-center">
            <p className="truncate text-xs font-semibold text-white">{script.titleTh}</p>
            <p className="font-mono text-[10px] text-zinc-400 tabular-nums">
              {script.id} · บรรทัด {lineIndex + 1}/{plan.length} (Beat #{currentLine.beatIndex})
            </p>
          </div>

          {/* Room check + Sync status pill */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                setRoomCheckDismissed(false);
                void recorder.runRoomCheck();
              }}
              disabled={isCapturing}
              title="เช็กเสียงห้อง 3 วินาที"
              className={`flex h-9 items-center gap-1 rounded-xl border px-2 font-mono text-[10px] tabular-nums active:scale-95 ${
                recorder.roomCheck?.status === "loud"
                  ? "border-amber-400/40 bg-amber-500/15 text-amber-200"
                  : recorder.roomCheck
                    ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
                    : "border-white/10 bg-zinc-900 text-zinc-400"
              }`}
            >
              <Volume2 className="h-3.5 w-3.5" />
              <span>
                {recorder.roomCheck ? `${Math.round(recorder.roomCheck.noiseFloorDbfs)}dB` : "ห้อง"}
              </span>
            </button>

            <span
              className={`flex h-9 items-center gap-1 rounded-xl border px-2 text-[10px] ${
                failedUploadsCount > 0
                  ? "border-red-400/40 bg-red-500/15 text-red-200"
                  : pendingUploadsCount > 0
                    ? "border-sky-400/40 bg-sky-500/15 text-sky-200"
                    : "border-white/10 bg-zinc-900 text-zinc-400"
              }`}
              title="สถานะซิงก์ไฟล์เสียง"
            >
              {failedUploadsCount > 0 ? (
                <>
                  <CloudOff className="h-3.5 w-3.5" />
                  <span>{failedUploadsCount}</span>
                </>
              ) : pendingUploadsCount > 0 ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>{pendingUploadsCount}</span>
                </>
              ) : (
                <Cloud className="h-3.5 w-3.5 text-emerald-400" />
              )}
            </span>
          </div>
        </div>

        {/* Tappable line progress strip */}
        <div className="mx-auto mt-2 flex max-w-xl items-center gap-1.5">
          {plan.map((line, i) => {
            const st = lineStatuses[i];
            const active = i === lineIndex;
            const color =
              st === "picked"
                ? "bg-emerald-400"
                : st === "recorded"
                  ? "bg-amber-400"
                  : st === "stale"
                    ? "bg-orange-500"
                    : "bg-zinc-700";
            return (
              <button
                key={line.lineKey}
                type="button"
                disabled={isCapturing}
                onClick={() => goLine(i)}
                aria-label={`ไปบรรทัดที่ ${i + 1}`}
                className={`h-2 flex-1 rounded-full transition-all ${color} ${
                  active ? "ring-2 ring-white ring-offset-2 ring-offset-zinc-950" : "opacity-55 hover:opacity-85"
                }`}
              />
            );
          })}
        </div>
      </header>

      {/* Main scrollable stage */}
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-3.5 px-4 pb-60 pt-4">
        {migrationMissing ? (
          <div className="rounded-2xl border border-amber-400/40 bg-amber-500/10 p-3 text-xs text-amber-100">
            ยังไม่ได้รัน migration <code className="font-mono">20261122120000_radar_voice_studio.sql</code> เทคที่อัดจะถูกเก็บไว้ในเครื่องก่อน
          </div>
        ) : null}

        {recorder.micError ? (
          <div className="flex items-start gap-2.5 rounded-2xl border border-red-400/40 bg-red-500/10 p-3.5 text-xs text-red-100">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-300" />
            <p className="leading-relaxed">{recorder.micError}</p>
          </div>
        ) : null}

        {notice ? (
          <div
            className={`flex items-center justify-between gap-2 rounded-2xl border px-3.5 py-2.5 text-xs ${
              notice.kind === "error"
                ? "border-red-400/40 bg-red-500/10 text-red-100"
                : notice.kind === "warn"
                  ? "border-amber-400/40 bg-amber-500/10 text-amber-100"
                  : "border-zinc-700 bg-zinc-900 text-zinc-200"
            }`}
          >
            <span>{notice.text}</span>
            <button type="button" onClick={() => setNotice(null)} aria-label="ปิดข้อความแจ้งเตือน">
              <X className="h-4 w-4 opacity-70" />
            </button>
          </div>
        ) : null}

        {/* 3-second room noise check before first take (or when re-checking / room too loud) */}
        <RoomCheckPanel
          roomCheck={recorder.roomCheck}
          phase={recorder.phase}
          progress={recorder.roomCheckProgress}
          onStartCheck={() => {
            stopPlayback();
            void recorder.runRoomCheck();
          }}
          onSkip={() => setRoomCheckDismissed(true)}
          dismissed={roomCheckDismissed}
        />

        {/* Direction + huge readable Thai line card */}
        <section className="rounded-3xl border border-zinc-800 bg-zinc-900/90 p-5 shadow-2xl">
          {/* Direction metadata chips */}
          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
            <span className="rounded-lg bg-amber-400/15 px-2 py-0.5 font-semibold text-amber-200">
              {WHO_LABEL_TH[currentLine.who]} พูดกับ{WHO_LABEL_TH[currentLine.speakingTo]}
            </span>
            <span className="rounded-lg bg-violet-400/15 px-2 py-0.5 font-medium text-violet-200">
              อารมณ์ {moodInfo.label}: {moodInfo.cue}
            </span>
            <span className="rounded-lg bg-zinc-800 px-2 py-0.5 font-mono text-zinc-300 tabular-nums">
              เป้า ~{currentLine.targetSeconds.toFixed(1)} วิ
            </span>
            <span className="rounded-lg bg-zinc-800/70 px-2 py-0.5 text-zinc-400">
              ฉาก: {sceneLabelTh(currentLine.scene)}
            </span>
          </div>

          {/* Context before */}
          {currentLine.prevBeat ? (
            <div className="mt-4 rounded-xl bg-zinc-950/70 px-3 py-2 text-xs text-zinc-400">
              <span className="font-semibold text-zinc-500">
                ก่อนหน้า ({WHO_LABEL_TH[currentLine.prevBeat.who]}):
              </span>{" "}
              <span>&ldquo;{currentLine.prevBeat.lineTh}&rdquo;</span>
            </div>
          ) : (
            <div className="mt-4 rounded-xl bg-zinc-950/70 px-3 py-2 text-xs text-zinc-400">
              <span className="font-semibold text-zinc-500">Hook เปิดเรื่อง:</span>{" "}
              <span>&ldquo;{script.hookTh}&rdquo;</span>
            </div>
          )}

          {/* THE LINE (huge, high-contrast, easy to read at arm's length) */}
          <div className="my-5 border-l-4 border-rose-400 pl-4">
            <p className="select-text text-[26px] font-bold leading-[1.45] tracking-tight text-white sm:text-[32px]">
              {currentLine.lineTh}
            </p>
          </div>

          {/* Context after */}
          {currentLine.nextBeat ? (
            <div className="rounded-xl bg-zinc-950/70 px-3 py-2 text-xs text-zinc-400">
              <span className="font-semibold text-zinc-500">
                ถัดไป ({WHO_LABEL_TH[currentLine.nextBeat.who]}):
              </span>{" "}
              <span>&ldquo;{currentLine.nextBeat.lineTh}&rdquo;</span>
            </div>
          ) : (
            <div className="rounded-xl bg-zinc-950/70 px-3 py-2 text-xs text-zinc-400">
              <span className="font-semibold text-zinc-500">ปิดท้าย (End Card):</span>{" "}
              <span>&ldquo;{script.endCardTh}&rdquo;</span>
            </div>
          )}
        </section>

        {/* Takes list */}
        <section className="space-y-2.5">
          <div className="flex items-center justify-between gap-2 px-1">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              เทคของบรรทัดนี้ ({currentFreshTakes.length})
            </h2>
            {currentLineTakes.length > 0 ? (
              <span className="inline-flex items-center gap-1 text-[11px] text-zinc-500">
                <Headphones className="h-3.5 w-3.5" />
                ใส่หูฟังเวลาฟังเทียบเทค
              </span>
            ) : null}
          </div>

          {currentFreshTakes.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-800 px-4 py-6 text-center text-xs text-zinc-500">
              ยังไม่มีเทคสำหรับบรรทัดนี้ แตะปุ่มสีแดงด้านล่างเพื่อเริ่มอัด
            </div>
          ) : (
            <div className="space-y-2">
              {currentFreshTakes.map((take, idx) => (
                <TakeCard
                  key={take.key}
                  take={take}
                  indexLabel={`Take ${currentFreshTakes.length - idx}`}
                  isPlaying={playingKey === take.key}
                  isLoadingAudio={loadingAudioKey === take.key}
                  playProgress={playingKey === take.key ? playProgress : 0}
                  busyAction={busyKey === take.key}
                  onTogglePlay={() => void handleTogglePlay(take)}
                  onPick={() => void handlePick(take)}
                  onDelete={() => void handleDelete(take)}
                  onRetryUpload={() => {
                    const rec = localTakes.find((l) => l.localId === take.localId);
                    if (rec) void uploadLocalTake({ ...rec, attempts: 0 });
                  }}
                />
              ))}
            </div>
          )}

          {currentStaleTakes.length > 0 ? (
            <div className="space-y-2 pt-2">
              <p className="px-1 text-xs font-medium text-orange-300">
                เทคเก่าจากสคริปต์ก่อนแก้ไข ({currentStaleTakes.length})
              </p>
              {currentStaleTakes.map((take, idx) => (
                <TakeCard
                  key={take.key}
                  take={take}
                  indexLabel={`เทคเก่า #${currentStaleTakes.length - idx}`}
                  isPlaying={playingKey === take.key}
                  isLoadingAudio={loadingAudioKey === take.key}
                  playProgress={playingKey === take.key ? playProgress : 0}
                  busyAction={busyKey === take.key}
                  onTogglePlay={() => void handleTogglePlay(take)}
                  onPick={() => void handlePick(take)}
                  onDelete={() => void handleDelete(take)}
                  onRetryUpload={() => undefined}
                />
              ))}
            </div>
          ) : null}
        </section>
      </main>

      {/* Fixed bottom thumb-reachable pro audio dock */}
      <footer
        className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-zinc-950/95 px-4 pt-3 backdrop-blur-md"
        style={{ paddingBottom: "calc(14px + env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto max-w-xl space-y-3">
          {/* Live peak + RMS input meter */}
          <LevelMeter
            meter={recorder.meter}
            phase={recorder.phase}
            onResetClip={recorder.clearClipLatch}
          />

          {/* Countdown / recording timer / format status strip */}
          <div className="flex h-6 items-center justify-center">
            {recorder.phase === "countdown" && recorder.countdown !== null ? (
              <div className="flex items-center gap-2 text-amber-300">
                <span className="font-mono text-lg font-bold tabular-nums">{recorder.countdown}</span>
                <span className="text-xs font-medium">เตรียมพูด... (Pre-roll เปิดอยู่)</span>
              </div>
            ) : recorder.phase === "recording" ? (
              <div className="flex items-center gap-2 font-mono text-sm font-bold text-red-400 tabular-nums">
                <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
                <span>REC {formatTimer(recorder.elapsedMs)}</span>
                <span className="text-xs font-normal text-zinc-400">
                  / เป้า ~{currentLine.targetSeconds.toFixed(1)} วิ
                </span>
              </div>
            ) : recorder.phase === "processing" ? (
              <span className="inline-flex items-center gap-1.5 text-xs text-zinc-300">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                กำลังตัดเสียงเงียบและเข้ารหัส 48 kHz WAV...
              </span>
            ) : (
              <span className="font-mono text-[10px] text-zinc-500 tabular-nums">
                RAW PCM · {Math.round(recorder.inputSampleRate / 1000)}kHz → 48kHz 16-bit WAV · Hash{" "}
                {currentLine.lineHash}
              </span>
            )}
          </div>

          {/* Thumb transport controls: Prev · Record/Stop · Next */}
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <button
              type="button"
              disabled={lineIndex === 0 || isCapturing}
              onClick={() => goLine(lineIndex - 1)}
              className="flex h-12 items-center justify-center gap-1 rounded-2xl border border-white/10 bg-zinc-900 px-3 text-sm font-medium text-zinc-200 active:scale-95 disabled:opacity-35"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>ก่อนหน้า</span>
            </button>

            {/* Primary Record / Stop button */}
            <button
              type="button"
              onClick={handlePrimaryRecordTap}
              disabled={recorder.phase === "room-check" || recorder.phase === "processing"}
              aria-label={
                recorder.phase === "recording"
                  ? "หยุดอัดเสียง"
                  : recorder.phase === "countdown"
                    ? "ยกเลิกนับถอยหลัง"
                    : "เริ่มอัดเสียง"
              }
              style={{ touchAction: "manipulation" }}
              className={`relative flex h-[74px] w-[74px] items-center justify-center rounded-full border-4 transition-transform active:scale-95 disabled:opacity-40 ${
                recorder.phase === "recording"
                  ? "border-red-300/60 bg-red-600 shadow-[0_0_28px_rgba(239,68,68,0.65)]"
                  : recorder.phase === "countdown"
                    ? "border-amber-300/70 bg-amber-500 text-zinc-950"
                    : "border-white/20 bg-rose-600 shadow-[0_0_24px_rgba(225,29,72,0.4)] hover:bg-rose-500"
              }`}
            >
              {recorder.phase === "recording" ? (
                <Square className="h-7 w-7 fill-white text-white" />
              ) : recorder.phase === "countdown" ? (
                <span className="font-mono text-2xl font-black tabular-nums">
                  {recorder.countdown}
                </span>
              ) : (
                <Mic className="h-8 w-8 text-white" />
              )}
            </button>

            {lineIndex < plan.length - 1 ? (
              <button
                type="button"
                disabled={isCapturing}
                onClick={() => goLine(lineIndex + 1)}
                className="flex h-12 items-center justify-center gap-1 rounded-2xl border border-white/10 bg-zinc-900 px-3 text-sm font-medium text-zinc-200 active:scale-95 disabled:opacity-35"
              >
                <span>ถัดไป</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <Link
                href="/studio/radar-voice"
                aria-disabled={isCapturing}
                className={`flex h-12 items-center justify-center gap-1 rounded-2xl border border-emerald-400/40 bg-emerald-500/20 px-3 text-sm font-semibold text-emerald-200 active:scale-95 ${
                  isCapturing ? "pointer-events-none opacity-35" : ""
                }`}
              >
                <Check className="h-4 w-4" />
                <span>จบ Reel</span>
              </Link>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
