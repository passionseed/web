/**
 * Pure audio metering, room-noise assessment, and silence trimming for the
 * phone voice studio. Zero browser or Node dependencies so every threshold and
 * edge case is unit-tested in Jest.
 */

export const DBFS_FLOOR = -96;
export const CLIP_AMPLITUDE = 0.99;
export const TOO_QUIET_PEAK_DBFS = -24;
export const DEFAULT_TRIM_PAD_MS = 150;
export const DEFAULT_TRIM_EDGE_FADE_MS = 5;

export interface AudioLevels {
  peak: number;
  rms: number;
  peakDbfs: number;
  rmsDbfs: number;
  clipped: boolean;
  tooQuiet: boolean;
}

export type RoomNoiseStatus = "quiet" | "ok" | "loud";

export interface RoomNoiseAssessment {
  noiseFloorDbfs: number;
  status: RoomNoiseStatus;
  labelTh: string;
  adviceTh: string;
}

export interface TrimSilenceOptions {
  /** Leading and trailing room tone to preserve in milliseconds (default 150 ms). */
  padMs?: number;
  /** Analysis window size in milliseconds (default 10 ms). */
  frameMs?: number;
  /** Known room noise floor in dBFS; when provided, threshold adapts above it. */
  noiseFloorDbfs?: number;
  /** Explicit RMS threshold in dBFS (overrides adaptive calculation). */
  thresholdDbfs?: number;
  /** Consecutive frames above threshold needed to count as speech (rejects single clicks). */
  minSpeechFrames?: number;
  /** Short linear fade at trimmed boundaries to avoid DC clicks (default 5 ms). */
  edgeFadeMs?: number;
}

export interface TrimSilenceResult {
  samples: Float32Array;
  startSample: number;
  endSample: number;
  trimmedStartMs: number;
  trimmedEndMs: number;
  durationMs: number;
  peakDbfs: number;
  rmsDbfs: number;
  noiseFloorDbfs: number;
  clipped: boolean;
  tooQuiet: boolean;
  wasAllSilent: boolean;
}

/** Converts linear amplitude `[0, 1]` to dBFS, floored at -96 dBFS. */
export function linearToDbfs(amplitude: number): number {
  if (!Number.isFinite(amplitude) || amplitude <= 0) return DBFS_FLOOR;
  const db = 20 * Math.log10(amplitude);
  if (!Number.isFinite(db) || db < DBFS_FLOOR) return DBFS_FLOOR;
  return Math.min(0, Math.round(db * 10) / 10);
}

/** Converts dBFS (`<= 0`) to linear amplitude `[0, 1]`. */
export function dbfsToLinear(dbfs: number): number {
  if (!Number.isFinite(dbfs) || dbfs <= DBFS_FLOOR) return 0;
  return Math.min(1, Math.pow(10, dbfs / 20));
}

/** Computes peak, RMS, dBFS levels, clipping, and quietness flags. */
export function measureLevels(samples: Float32Array): AudioLevels {
  if (samples.length === 0) {
    return {
      peak: 0,
      rms: 0,
      peakDbfs: DBFS_FLOOR,
      rmsDbfs: DBFS_FLOOR,
      clipped: false,
      tooQuiet: true,
    };
  }

  let peak = 0;
  let sumSq = 0;
  let consecutiveHot = 0;
  let clipped = false;

  for (let i = 0; i < samples.length; i++) {
    const abs = Math.abs(samples[i]);
    if (abs > peak) peak = abs;
    sumSq += abs * abs;

    if (abs >= CLIP_AMPLITUDE) {
      consecutiveHot++;
      if (consecutiveHot >= 2 || abs >= 0.999) clipped = true;
    } else {
      consecutiveHot = 0;
    }
  }

  const rms = Math.sqrt(sumSq / samples.length);
  const peakDbfs = linearToDbfs(peak);
  const rmsDbfs = linearToDbfs(rms);

  return {
    peak,
    rms,
    peakDbfs,
    rmsDbfs,
    clipped,
    tooQuiet: peakDbfs < TOO_QUIET_PEAK_DBFS,
  };
}

/**
 * Estimates noise floor from 50 ms frame RMS values using a low quantile
 * (15th percentile by default, so speech frames do not bias the estimate).
 */
export function estimateNoiseFloorDbfs(
  samples: Float32Array,
  sampleRate: number,
  quantile = 0.15,
): number {
  if (samples.length === 0 || sampleRate <= 0) return DBFS_FLOOR;

  const frameSize = Math.max(1, Math.round(sampleRate * 0.05));
  const frameRms: number[] = [];

  for (let start = 0; start < samples.length; start += frameSize) {
    const end = Math.min(samples.length, start + frameSize);
    if (end - start < Math.min(frameSize / 2, samples.length)) continue;
    let sumSq = 0;
    for (let i = start; i < end; i++) {
      const s = samples[i];
      sumSq += s * s;
    }
    frameRms.push(Math.sqrt(sumSq / (end - start)));
  }

  if (frameRms.length === 0) {
    return measureLevels(samples).rmsDbfs;
  }

  frameRms.sort((a, b) => a - b);
  const idx = Math.min(frameRms.length - 1, Math.max(0, Math.floor((frameRms.length - 1) * quantile)));
  return linearToDbfs(frameRms[idx]);
}

/**
 * Assesses a 3-second room-tone capture (skips the first 150 ms tap transient
 * when enough audio is present, then takes the median 50 ms frame level).
 */
export function assessRoomNoise(samples: Float32Array, sampleRate: number): RoomNoiseAssessment {
  const skipSamples = Math.min(Math.floor(samples.length * 0.2), Math.round(sampleRate * 0.15));
  const usable = samples.length > skipSamples + 100 ? samples.subarray(skipSamples) : samples;
  const noiseFloorDbfs = estimateNoiseFloorDbfs(usable, sampleRate, 0.5);
  return classifyRoomNoise(noiseFloorDbfs);
}

/** Classifies measured room noise floor into studio-ready Thai guidance. */
export function classifyRoomNoise(noiseFloorDbfs: number): RoomNoiseAssessment {
  if (noiseFloorDbfs <= -52) {
    return {
      noiseFloorDbfs,
      status: "quiet",
      labelTh: "ห้องเงียบดี",
      adviceTh: "เสียงพื้นหลังเบา พร้อมอัดได้เลย",
    };
  }
  if (noiseFloorDbfs <= -40) {
    return {
      noiseFloorDbfs,
      status: "ok",
      labelTh: "พออัดได้",
      adviceTh: "มีเสียงพื้นหลังเบาๆ ถือไมค์ใกล้ปากประมาณ 1 คืบจะชัดขึ้น",
    };
  }
  return {
    noiseFloorDbfs,
    status: "loud",
    labelTh: "ห้องดังไปหน่อย",
    adviceTh: "เสียงรอบข้างค่อนข้างดัง ลองปิดพัดลมหรือแอร์ แล้วย้ายมุมเงียบกว่านี้",
  };
}

/**
 * Auto-trims leading and trailing silence while preserving `padMs` (~150 ms)
 * of room tone on both sides and applying a short 5 ms edge fade to avoid
 * clicks. Never returns an empty take: if no speech crosses the threshold,
 * returns the original samples with `wasAllSilent: true`.
 */
export function trimSilence(
  samples: Float32Array,
  sampleRate: number,
  options: TrimSilenceOptions = {},
): TrimSilenceResult {
  const padMs = options.padMs ?? DEFAULT_TRIM_PAD_MS;
  const frameMs = options.frameMs ?? 10;
  const minSpeechFrames = Math.max(1, options.minSpeechFrames ?? 3);
  const edgeFadeMs = options.edgeFadeMs ?? DEFAULT_TRIM_EDGE_FADE_MS;

  if (samples.length === 0 || sampleRate <= 0) {
    return {
      samples: new Float32Array(0),
      startSample: 0,
      endSample: 0,
      trimmedStartMs: 0,
      trimmedEndMs: 0,
      durationMs: 0,
      peakDbfs: DBFS_FLOOR,
      rmsDbfs: DBFS_FLOOR,
      noiseFloorDbfs: DBFS_FLOOR,
      clipped: false,
      tooQuiet: true,
      wasAllSilent: true,
    };
  }

  const detectedNoiseFloor = options.noiseFloorDbfs ?? estimateNoiseFloorDbfs(samples, sampleRate);
  const overallLevels = measureLevels(samples);

  const thresholdDbfs =
    options.thresholdDbfs ??
    Math.max(
      -42,
      Math.min(-24, Math.max(detectedNoiseFloor + 12, overallLevels.peakDbfs - 30)),
    );
  const thresholdLinear = dbfsToLinear(thresholdDbfs);

  const frameSize = Math.max(1, Math.round((sampleRate * frameMs) / 1000));
  const numFrames = Math.ceil(samples.length / frameSize);
  const active = new Uint8Array(numFrames);

  for (let f = 0; f < numFrames; f++) {
    const start = f * frameSize;
    const end = Math.min(samples.length, start + frameSize);
    let sumSq = 0;
    for (let i = start; i < end; i++) {
      const s = samples[i];
      sumSq += s * s;
    }
    const rms = Math.sqrt(sumSq / (end - start));
    if (rms >= thresholdLinear) active[f] = 1;
  }

  // First run of `minSpeechFrames` consecutive active frames.
  let firstSpeechFrame = -1;
  let run = 0;
  for (let f = 0; f < numFrames; f++) {
    if (active[f]) {
      run++;
      if (run >= minSpeechFrames) {
        firstSpeechFrame = f - minSpeechFrames + 1;
        break;
      }
    } else {
      run = 0;
    }
  }

  // Last run of `minSpeechFrames` consecutive active frames.
  let lastSpeechFrame = -1;
  run = 0;
  for (let f = numFrames - 1; f >= 0; f--) {
    if (active[f]) {
      run++;
      if (run >= minSpeechFrames) {
        lastSpeechFrame = f + minSpeechFrames - 1;
        break;
      }
    } else {
      run = 0;
    }
  }

  // Fallback for very brief single-syllable bursts if no full run matched.
  if (firstSpeechFrame === -1) {
    for (let f = 0; f < numFrames; f++) {
      if (active[f]) {
        firstSpeechFrame = f;
        break;
      }
    }
    for (let f = numFrames - 1; f >= 0; f--) {
      if (active[f]) {
        lastSpeechFrame = f;
        break;
      }
    }
  }

  if (firstSpeechFrame === -1 || lastSpeechFrame === -1) {
    const copy = new Float32Array(samples);
    return {
      samples: copy,
      startSample: 0,
      endSample: copy.length,
      trimmedStartMs: 0,
      trimmedEndMs: 0,
      durationMs: Math.round((copy.length / sampleRate) * 1000),
      peakDbfs: overallLevels.peakDbfs,
      rmsDbfs: overallLevels.rmsDbfs,
      noiseFloorDbfs: detectedNoiseFloor,
      clipped: overallLevels.clipped,
      tooQuiet: overallLevels.tooQuiet,
      wasAllSilent: true,
    };
  }

  const padSamples = Math.round((sampleRate * padMs) / 1000);
  const startSample = Math.max(0, firstSpeechFrame * frameSize - padSamples);
  const endSample = Math.min(samples.length, (lastSpeechFrame + 1) * frameSize + padSamples);

  const trimmed = new Float32Array(samples.subarray(startSample, endSample));
  const fadeSamples = Math.min(Math.floor(trimmed.length / 4), Math.round((sampleRate * edgeFadeMs) / 1000));
  if (fadeSamples > 1) {
    for (let i = 0; i < fadeSamples; i++) {
      const gain = i / fadeSamples;
      trimmed[i] *= gain;
      trimmed[trimmed.length - 1 - i] *= gain;
    }
  }

  const levels = measureLevels(trimmed);
  return {
    samples: trimmed,
    startSample,
    endSample,
    trimmedStartMs: Math.round((startSample / sampleRate) * 1000),
    trimmedEndMs: Math.round(((samples.length - endSample) / sampleRate) * 1000),
    durationMs: Math.round((trimmed.length / sampleRate) * 1000),
    peakDbfs: levels.peakDbfs,
    rmsDbfs: levels.rmsDbfs,
    noiseFloorDbfs: detectedNoiseFloor,
    clipped: levels.clipped,
    tooQuiet: levels.tooQuiet,
    wasAllSilent: false,
  };
}
