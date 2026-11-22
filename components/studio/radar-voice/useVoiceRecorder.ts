"use client";

/**
 * Pro-audio phone voice recording hook.
 *
 * - Requests raw unprocessed mic audio (echoCancellation/noiseSuppression/AGC all off, mono).
 * - Captures raw Float32 PCM via AudioWorklet (`public/worklets/pcm-capture-processor.js`).
 * - Supports a 3-second room noise check before the first take.
 * - Live peak + RMS metering with clip latch and live quiet hint.
 * - 3-2-1 countdown with rolling pre-roll buffer (~250 ms) so the first syllable is never cut.
 * - 120 ms post-roll on stop, auto-trim silence (~150 ms pad), resample to 48 kHz, encode 16-bit mono WAV.
 * - Screen Wake Lock while capturing; haptic tick on start/stop where supported.
 * - Clean mic teardown (`releaseMic`) before playback so iOS Safari exits earpiece routing.
 */
import { useCallback, useEffect, useRef, useState } from "react";

import {
  assessRoomNoise,
  CLIP_AMPLITUDE,
  DBFS_FLOOR,
  linearToDbfs,
  trimSilence,
  type RoomNoiseAssessment,
} from "@/lib/radar-stories/audio-dsp";
import { encodeWav16Mono, resampleMono, STUDIO_SAMPLE_RATE } from "@/lib/radar-stories/wav";

export type RecorderPhase = "idle" | "monitoring" | "room-check" | "countdown" | "recording" | "processing";

export interface LiveMeterState {
  peakDbfs: number;
  rmsDbfs: number;
  peakHoldDbfs: number;
  clipped: boolean;
  tooQuietLive: boolean;
}

export interface RecordedTakePayload {
  wavBytes: Uint8Array;
  durationMs: number;
  peakDbfs: number;
  noiseFloorDbfs: number;
  clipped: boolean;
  tooQuiet: boolean;
  wasAllSilent: boolean;
  sampleRate: number;
}

const ROOM_CHECK_MS = 3000;
const COUNTDOWN_STEP_MS = 550;
const PRE_ROLL_MS = 280;
const POST_ROLL_MS = 120;
const ROOM_CHECK_STORAGE_KEY = "ps_radar_voice_room_check_v1";

const INITIAL_METER: LiveMeterState = {
  peakDbfs: DBFS_FLOOR,
  rmsDbfs: DBFS_FLOOR,
  peakHoldDbfs: DBFS_FLOOR,
  clipped: false,
  tooQuietLive: false,
};

function triggerHaptic(kind: "tick" | "start" | "stop"): void {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
  try {
    if (kind === "tick") navigator.vibrate(10);
    else if (kind === "start") navigator.vibrate(20);
    else navigator.vibrate([12, 35, 12]);
  } catch {
    // Ignore on browsers that restrict vibrate.
  }
}

function concatFloat32(chunks: Float32Array[]): Float32Array {
  let total = 0;
  for (const c of chunks) total += c.length;
  const out = new Float32Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }
  return out;
}

function sliceTail(chunks: Float32Array[], maxSamples: number): Float32Array {
  const all = concatFloat32(chunks);
  if (all.length <= maxSamples) return all;
  return all.slice(all.length - maxSamples);
}

function formatMicError(err: unknown): string {
  if (typeof window !== "undefined" && !window.isSecureContext) {
    return "เบราว์เซอร์ไม่อนุญาตให้ใช้ไมค์บน HTTP กรุณาเปิดผ่าน HTTPS (หรือ localhost)";
  }
  const name = err instanceof Error ? err.name : "";
  if (name === "NotAllowedError" || name === "PermissionDeniedError") {
    return "ไม่ได้รับอนุญาตให้ใช้ไมโครโฟน กรุณาเปิดสิทธิ์ไมค์ในตั้งค่าเบราว์เซอร์แล้วลองใหม่";
  }
  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    return "ไม่พบไมโครโฟนบนอุปกรณ์นี้";
  }
  if (name === "NotReadableError") {
    return "ไมโครโฟนถูกแอปอื่นใช้งานอยู่ ลองปิดแอปอื่นแล้วแตะอีกครั้ง";
  }
  if (err instanceof Error && err.message) {
    return `เปิดไมค์ไม่สำเร็จ: ${err.message}`;
  }
  return "เปิดไมค์ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
}

function loadSessionRoomCheck(): RoomNoiseAssessment | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(ROOM_CHECK_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as RoomNoiseAssessment;
    if (typeof parsed?.noiseFloorDbfs === "number" && typeof parsed?.status === "string") {
      return parsed;
    }
  } catch {
    // ignore storage errors
  }
  return null;
}

function saveSessionRoomCheck(result: RoomNoiseAssessment): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(ROOM_CHECK_STORAGE_KEY, JSON.stringify(result));
  } catch {
    // ignore
  }
}

export function useVoiceRecorder({
  onTakeReady,
}: {
  onTakeReady: (payload: RecordedTakePayload) => void;
}) {
  const [phase, setPhase] = useState<RecorderPhase>("idle");
  const [meter, setMeter] = useState<LiveMeterState>(INITIAL_METER);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [roomCheck, setRoomCheck] = useState<RoomNoiseAssessment | null>(null);
  const [roomCheckProgress, setRoomCheckProgress] = useState(0);
  const [micError, setMicError] = useState<string | null>(null);
  const [inputSampleRate, setInputSampleRate] = useState<number>(STUDIO_SAMPLE_RATE);

  // Hydrate saved room check from sessionStorage after mount (avoid SSR mismatch).
  useEffect(() => {
    const saved = loadSessionRoomCheck();
    if (saved) setRoomCheck(saved);
  }, []);

  const phaseRef = useRef<RecorderPhase>("idle");
  const setPhaseSync = useCallback((next: RecorderPhase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  // Audio graph refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const workletRef = useRef<AudioWorkletNode | null>(null);
  const silentGainRef = useRef<GainNode | null>(null);
  const workletLoadedRef = useRef(false);

  // Capture buffers
  const preRollChunksRef = useRef<Float32Array[]>([]);
  const preRollSamplesRef = useRef(0);
  const recordChunksRef = useRef<Float32Array[]>([]);
  const roomChunksRef = useRef<Float32Array[]>([]);

  // Timers & metering refs
  const timersRef = useRef<number[]>([]);
  const rafRef = useRef<number>(0);
  const recordStartRef = useRef<number>(0);
  const maxPeakDuringTakeRef = useRef<number>(0);
  const peakHoldRef = useRef<{ db: number; until: number }>({ db: DBFS_FLOOR, until: 0 });
  const clippedLatchRef = useRef(false);
  const wakeLockRef = useRef<{ release: () => Promise<void> } | null>(null);
  const onTakeReadyRef = useRef(onTakeReady);
  onTakeReadyRef.current = onTakeReady;
  const roomCheckRef = useRef<RoomNoiseAssessment | null>(null);
  roomCheckRef.current = roomCheck;

  const clearTimers = useCallback(() => {
    for (const id of timersRef.current) window.clearTimeout(id);
    timersRef.current = [];
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
  }, []);

  const releaseWakeLock = useCallback(() => {
    const lock = wakeLockRef.current;
    wakeLockRef.current = null;
    if (lock) void lock.release().catch(() => undefined);
  }, []);

  const acquireWakeLock = useCallback(async () => {
    if (typeof navigator === "undefined" || !("wakeLock" in navigator)) return;
    if (wakeLockRef.current) return;
    try {
      const lock = await (
        navigator as Navigator & {
          wakeLock: { request: (type: "screen") => Promise<{ release: () => Promise<void> }> };
        }
      ).wakeLock.request("screen");
      wakeLockRef.current = lock;
    } catch {
      // Unsupported or battery-saver mode; recording still proceeds.
    }
  }, []);

  // Re-acquire Wake Lock if the screen wakes up mid-recording.
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        const p = phaseRef.current;
        if (p === "recording" || p === "countdown" || p === "room-check") {
          void acquireWakeLock();
        }
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [acquireWakeLock]);

  /** Tears down the live mic stream so iOS Safari returns audio routing to loud speaker/headphones. */
  const releaseMic = useCallback(() => {
    clearTimers();
    releaseWakeLock();

    if (workletRef.current) {
      try {
        workletRef.current.port.postMessage({ type: "stop" });
        workletRef.current.port.onmessage = null;
        workletRef.current.disconnect();
      } catch {
        // ignore
      }
      workletRef.current = null;
    }
    if (sourceRef.current) {
      try {
        sourceRef.current.disconnect();
      } catch {
        // ignore
      }
      sourceRef.current = null;
    }
    if (silentGainRef.current) {
      try {
        silentGainRef.current.disconnect();
      } catch {
        // ignore
      }
      silentGainRef.current = null;
    }
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) track.stop();
      streamRef.current = null;
    }
    if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
      void audioCtxRef.current.close().catch(() => undefined);
    }
    audioCtxRef.current = null;
    workletLoadedRef.current = false;

    preRollChunksRef.current = [];
    preRollSamplesRef.current = 0;
    recordChunksRef.current = [];
    roomChunksRef.current = [];
    setCountdown(null);
    setElapsedMs(0);
    setRoomCheckProgress(0);
    setMeter(INITIAL_METER);
    setPhaseSync("idle");
  }, [clearTimers, releaseWakeLock, setPhaseSync]);

  useEffect(() => () => releaseMic(), [releaseMic]);

  const handlePcmChunk = useCallback((samples: Float32Array, peak: number, rms: number) => {
    const now = performance.now();
    const peakDb = linearToDbfs(peak);
    const rmsDb = linearToDbfs(rms);

    if (peak >= CLIP_AMPLITUDE) clippedLatchRef.current = true;
    if (peakDb >= peakHoldRef.current.db || now > peakHoldRef.current.until) {
      peakHoldRef.current = { db: peakDb, until: now + 1200 };
    }

    const activePhase = phaseRef.current;
    if (activePhase === "recording") {
      if (peak > maxPeakDuringTakeRef.current) maxPeakDuringTakeRef.current = peak;
      recordChunksRef.current.push(samples);
    } else if (activePhase === "room-check") {
      roomChunksRef.current.push(samples);
    } else if (activePhase === "countdown" || activePhase === "monitoring") {
      const sr = audioCtxRef.current?.sampleRate ?? STUDIO_SAMPLE_RATE;
      const maxPreRollSamples = Math.round((sr * (PRE_ROLL_MS + 150)) / 1000);
      preRollChunksRef.current.push(samples);
      preRollSamplesRef.current += samples.length;
      while (preRollSamplesRef.current > maxPreRollSamples && preRollChunksRef.current.length > 1) {
        const dropped = preRollChunksRef.current.shift()!;
        preRollSamplesRef.current -= dropped.length;
      }
    }

    const recElapsed = activePhase === "recording" ? now - recordStartRef.current : 0;
    const tooQuietLive =
      activePhase === "recording" &&
      recElapsed > 650 &&
      linearToDbfs(maxPeakDuringTakeRef.current) < -26;

    setMeter({
      peakDbfs: peakDb,
      rmsDbfs: rmsDb,
      peakHoldDbfs: peakHoldRef.current.db,
      clipped: clippedLatchRef.current,
      tooQuietLive,
    });
  }, []);

  /**
   * Acquires raw mic + AudioWorklet graph. MUST be called from a user tap
   * gesture so iOS Safari unlocks `AudioContext`.
   */
  const ensureMic = useCallback(async (): Promise<AudioContext | null> => {
    setMicError(null);
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices ||
      typeof navigator.mediaDevices.getUserMedia !== "function"
    ) {
      setMicError(formatMicError(new Error("getUserMedia unavailable")));
      return null;
    }

    if (audioCtxRef.current && streamRef.current && workletRef.current) {
      const liveTrack = streamRef.current.getAudioTracks().some((t) => t.readyState === "live");
      if (liveTrack) {
        if (audioCtxRef.current.state === "suspended") {
          await audioCtxRef.current.resume().catch(() => undefined);
        }
        return audioCtxRef.current;
      }
      releaseMic();
    }

    try {
      const AudioCtx =
        window.AudioContext ||
        (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) {
        setMicError("เบราว์เซอร์นี้ไม่รองรับ Web Audio API");
        return null;
      }

      // Create/resume AudioContext synchronously inside user gesture before getUserMedia awaits.
      const ctx = new AudioCtx({ sampleRate: STUDIO_SAMPLE_RATE, latencyHint: "interactive" });
      audioCtxRef.current = ctx;
      if (ctx.state === "suspended") {
        void ctx.resume().catch(() => undefined);
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          channelCount: 1,
        },
      });
      streamRef.current = stream;

      if (ctx.state === "suspended") {
        await ctx.resume();
      }
      if (!ctx.audioWorklet) {
        releaseMic();
        setMicError("เบราว์เซอร์นี้ไม่รองรับ AudioWorklet กรุณาใช้ Safari หรือ Chrome เวอร์ชันล่าสุด");
        return null;
      }

      if (!workletLoadedRef.current) {
        await ctx.audioWorklet.addModule("/worklets/pcm-capture-processor.js");
        workletLoadedRef.current = true;
      }

      const source = ctx.createMediaStreamSource(stream);
      const worklet = new AudioWorkletNode(ctx, "pcm-capture-processor", {
        numberOfInputs: 1,
        numberOfOutputs: 1,
        channelCount: 1,
        channelCountMode: "explicit",
      });
      // Connect through a zero-gain node to destination so Safari always schedules process() without feedback.
      const silentGain = ctx.createGain();
      silentGain.gain.value = 0;

      worklet.port.onmessage = (event: MessageEvent<{ type?: string; samples?: Float32Array; peak?: number; rms?: number }>) => {
        if (event.data?.type === "chunk" && event.data.samples) {
          handlePcmChunk(event.data.samples, event.data.peak ?? 0, event.data.rms ?? 0);
        }
      };

      source.connect(worklet);
      worklet.connect(silentGain);
      silentGain.connect(ctx.destination);

      sourceRef.current = source;
      workletRef.current = worklet;
      silentGainRef.current = silentGain;
      setInputSampleRate(ctx.sampleRate);
      return ctx;
    } catch (err) {
      releaseMic();
      setMicError(formatMicError(err));
      return null;
    }
  }, [handlePcmChunk, releaseMic]);

  const clearClipLatch = useCallback(() => {
    clippedLatchRef.current = false;
    setMeter((m) => ({ ...m, clipped: false }));
  }, []);

  /** Runs a 3-second room noise check and stores the assessment. */
  const runRoomCheck = useCallback(async () => {
    if (phaseRef.current === "recording" || phaseRef.current === "countdown" || phaseRef.current === "room-check") {
      return;
    }
    const ctx = await ensureMic();
    if (!ctx) return;

    clearTimers();
    await acquireWakeLock();
    roomChunksRef.current = [];
    clippedLatchRef.current = false;
    setRoomCheckProgress(0);
    setPhaseSync("room-check");
    triggerHaptic("tick");

    const started = performance.now();
    const tick = () => {
      if (phaseRef.current !== "room-check") return;
      const pct = Math.min(1, (performance.now() - started) / ROOM_CHECK_MS);
      setRoomCheckProgress(pct);
      if (pct < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);

    const doneTimer = window.setTimeout(() => {
      clearTimers();
      releaseWakeLock();
      const raw = concatFloat32(roomChunksRef.current);
      roomChunksRef.current = [];
      const result = assessRoomNoise(raw, ctx.sampleRate);
      saveSessionRoomCheck(result);
      setRoomCheck(result);
      setRoomCheckProgress(1);
      setPhaseSync("monitoring");
      triggerHaptic("stop");
    }, ROOM_CHECK_MS);
    timersRef.current.push(doneTimer);
  }, [acquireWakeLock, clearTimers, ensureMic, releaseWakeLock, setPhaseSync]);

  /** Starts a 3-2-1 countdown with rolling pre-roll, then begins recording. */
  const startRecording = useCallback(async () => {
    if (phaseRef.current === "recording" || phaseRef.current === "countdown" || phaseRef.current === "processing") {
      return;
    }
    const ctx = await ensureMic();
    if (!ctx) return;

    clearTimers();
    await acquireWakeLock();
    clippedLatchRef.current = false;
    maxPeakDuringTakeRef.current = 0;
    preRollChunksRef.current = [];
    preRollSamplesRef.current = 0;
    recordChunksRef.current = [];
    setElapsedMs(0);
    setPhaseSync("countdown");
    setCountdown(3);
    triggerHaptic("tick");

    const t2 = window.setTimeout(() => {
      if (phaseRef.current !== "countdown") return;
      setCountdown(2);
      triggerHaptic("tick");
    }, COUNTDOWN_STEP_MS);

    const t1 = window.setTimeout(() => {
      if (phaseRef.current !== "countdown") return;
      setCountdown(1);
      triggerHaptic("tick");
    }, COUNTDOWN_STEP_MS * 2);

    const tGo = window.setTimeout(() => {
      if (phaseRef.current !== "countdown") return;
      const sr = ctx.sampleRate;
      const preRollSamples = Math.round((sr * PRE_ROLL_MS) / 1000);
      const preRoll = sliceTail(preRollChunksRef.current, preRollSamples);
      recordChunksRef.current = preRoll.length > 0 ? [preRoll] : [];
      preRollChunksRef.current = [];
      preRollSamplesRef.current = 0;

      recordStartRef.current = performance.now();
      setCountdown(null);
      setPhaseSync("recording");
      triggerHaptic("start");

      const tickElapsed = () => {
        if (phaseRef.current !== "recording") return;
        setElapsedMs(performance.now() - recordStartRef.current);
        rafRef.current = requestAnimationFrame(tickElapsed);
      };
      rafRef.current = requestAnimationFrame(tickElapsed);
    }, COUNTDOWN_STEP_MS * 3);

    timersRef.current.push(t2, t1, tGo);
  }, [acquireWakeLock, clearTimers, ensureMic, setPhaseSync]);

  /** Cancels an in-progress countdown or room check without creating a take. */
  const cancelCapture = useCallback(() => {
    clearTimers();
    releaseWakeLock();
    recordChunksRef.current = [];
    roomChunksRef.current = [];
    setCountdown(null);
    setElapsedMs(0);
    setRoomCheckProgress(0);
    setPhaseSync(streamRef.current ? "monitoring" : "idle");
  }, [clearTimers, releaseWakeLock, setPhaseSync]);

  /** Stops recording (after a brief 120 ms post-roll), trims silence, resamples to 48 kHz, and encodes WAV. */
  const stopRecording = useCallback(() => {
    if (phaseRef.current !== "recording") return;
    clearTimers();
    triggerHaptic("stop");

    const sr = audioCtxRef.current?.sampleRate ?? STUDIO_SAMPLE_RATE;
    // Keep recording for 120 ms so the stop tap never chops the final syllable.
    const finishTimer = window.setTimeout(() => {
      setPhaseSync("processing");
      releaseWakeLock();

      const raw = concatFloat32(recordChunksRef.current);
      recordChunksRef.current = [];
      setElapsedMs(0);

      const trimmed = trimSilence(raw, sr, {
        padMs: 150,
        noiseFloorDbfs: roomCheckRef.current?.noiseFloorDbfs,
      });

      const pcm48 =
        sr === STUDIO_SAMPLE_RATE
          ? trimmed.samples
          : resampleMono(trimmed.samples, sr, STUDIO_SAMPLE_RATE);

      const wavBytes = encodeWav16Mono(pcm48, STUDIO_SAMPLE_RATE);
      const durationMs = Math.max(1, Math.round((pcm48.length / STUDIO_SAMPLE_RATE) * 1000));

      setPhaseSync("monitoring");
      onTakeReadyRef.current({
        wavBytes,
        durationMs,
        peakDbfs: trimmed.peakDbfs,
        noiseFloorDbfs: roomCheckRef.current?.noiseFloorDbfs ?? trimmed.noiseFloorDbfs,
        clipped: trimmed.clipped,
        tooQuiet: trimmed.tooQuiet,
        wasAllSilent: trimmed.wasAllSilent,
        sampleRate: STUDIO_SAMPLE_RATE,
      });
    }, POST_ROLL_MS);

    timersRef.current.push(finishTimer);
  }, [clearTimers, releaseWakeLock, setPhaseSync]);

  return {
    phase,
    meter,
    countdown,
    elapsedMs,
    roomCheck,
    roomCheckProgress,
    micError,
    inputSampleRate,
    clearClipLatch,
    runRoomCheck,
    startRecording,
    stopRecording,
    cancelCapture,
    releaseMic,
  };
}
