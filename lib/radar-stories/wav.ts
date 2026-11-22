/**
 * Pure 16-bit mono PCM WAV encoder, RIFF chunk parser, windowed-sinc
 * resampler, upload validator, and voice-track assembler. Zero DOM or Node
 * dependencies so the phone studio, API routes, CLI scripts, and Jest share
 * the exact same codec.
 */

export const STUDIO_SAMPLE_RATE = 48_000;
export const SCORER_SAMPLE_RATE = 44_100;

export const WAV_UPLOAD_LIMITS = {
  /** 10 MB (~109 seconds of 48 kHz 16-bit mono PCM). */
  maxBytes: 10 * 1024 * 1024,
  minDurationMs: 150,
  maxDurationMs: 60_000,
  minSampleRate: 16_000,
  maxSampleRate: 96_000,
} as const;

export interface ParsedWav {
  audioFormat: number;
  channels: number;
  sampleRate: number;
  bitsPerSample: number;
  numSamples: number;
  durationMs: number;
  samples: Float32Array;
}

export type WavParseResult =
  | { ok: true; wav: ParsedWav }
  | { ok: false; error: string };

/**
 * Resamples mono Float32 PCM from `fromRate` to `toRate` using a
 * Blackman-windowed sinc kernel with automatic anti-aliasing lowpass when
 * downsampling and per-sample DC gain normalization.
 */
export function resampleMono(
  samples: Float32Array,
  fromRate: number,
  toRate: number,
): Float32Array {
  if (!Number.isFinite(fromRate) || !Number.isFinite(toRate) || fromRate <= 0 || toRate <= 0) {
    throw new RangeError(`Invalid sample rates: ${fromRate} -> ${toRate}`);
  }
  if (samples.length === 0) return new Float32Array(0);
  if (fromRate === toRate) return new Float32Array(samples);

  const ratio = fromRate / toRate;
  const outLength = Math.max(1, Math.round(samples.length / ratio));
  const out = new Float32Array(outLength);

  // Cutoff <= 1 prevents aliasing when downsampling.
  const cutoff = Math.min(1, toRate / fromRate);
  const halfWindow = 12;
  const support = Math.ceil(halfWindow / cutoff);

  for (let i = 0; i < outLength; i++) {
    const center = i * ratio;
    const start = Math.max(0, Math.floor(center) - support);
    const end = Math.min(samples.length - 1, Math.ceil(center) + support);

    let acc = 0;
    let weightSum = 0;
    for (let j = start; j <= end; j++) {
      const dx = j - center;
      const u = dx * cutoff;
      const sinc = Math.abs(u) < 1e-8 ? 1 : Math.sin(Math.PI * u) / (Math.PI * u);
      const norm = dx / support;
      if (Math.abs(norm) >= 1) continue;
      // Blackman window over [-1, 1].
      const angle = Math.PI * (norm + 1);
      const win = 0.42 - 0.5 * Math.cos(angle) + 0.08 * Math.cos(2 * angle);
      const w = sinc * win;
      acc += samples[j] * w;
      weightSum += w;
    }

    const value = weightSum > 1e-9 ? acc / weightSum : 0;
    out[i] = value < -1 ? -1 : value > 1 ? 1 : value;
  }

  return out;
}

/** Float [-1, 1] sample to signed 16-bit PCM integer. */
export function floatToInt16(sample: number): number {
  if (!Number.isFinite(sample)) return 0;
  if (sample <= -1) return -32768;
  if (sample >= 1) return 32767;
  return Math.round(sample * 32767);
}

function writeAscii(view: DataView, offset: number, text: string): void {
  for (let i = 0; i < text.length; i++) {
    view.setUint8(offset + i, text.charCodeAt(i));
  }
}

function readAscii(view: DataView, offset: number, length: number): string {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += String.fromCharCode(view.getUint8(offset + i));
  }
  return out;
}

/**
 * Encodes mono Float32 PCM samples (`[-1, 1]`) into a canonical 44-byte header
 * 16-bit signed little-endian RIFF/WAVE file.
 */
export function encodeWav16Mono(
  samples: Float32Array,
  sampleRate = STUDIO_SAMPLE_RATE,
): Uint8Array {
  if (!Number.isInteger(sampleRate) || sampleRate <= 0) {
    throw new RangeError(`Invalid sampleRate: ${sampleRate}`);
  }
  const numChannels = 1;
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataByteLength = samples.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataByteLength);
  const view = new DataView(buffer);

  // RIFF chunk descriptor
  writeAscii(view, 0, "RIFF");
  view.setUint32(4, 36 + dataByteLength, true);
  writeAscii(view, 8, "WAVE");

  // fmt sub-chunk
  writeAscii(view, 12, "fmt ");
  view.setUint32(16, 16, true); // PCM fmt chunk size
  view.setUint16(20, 1, true); // AudioFormat = 1 (PCM)
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);

  // data sub-chunk
  writeAscii(view, 36, "data");
  view.setUint32(40, dataByteLength, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    view.setInt16(offset, floatToInt16(samples[i]), true);
    offset += 2;
  }

  return new Uint8Array(buffer);
}

/**
 * Parses a RIFF/WAVE PCM file (16-bit linear PCM, mono or stereo mixed to mono
 * when decoding). Walks RIFF chunks cleanly so extra metadata chunks such as
 * LIST or JUNK do not break parsing.
 */
export function parseWav(bytes: Uint8Array): WavParseResult {
  if (bytes.byteLength < 44) {
    return { ok: false, error: "File is too small to be a valid WAV" };
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (readAscii(view, 0, 4) !== "RIFF" || readAscii(view, 8, 4) !== "WAVE") {
    return { ok: false, error: "Not a RIFF/WAVE file" };
  }

  const riffSize = view.getUint32(4, true);
  if (riffSize + 8 > bytes.byteLength + 1) {
    return { ok: false, error: "WAV file is truncated" };
  }

  let audioFormat = -1;
  let channels = 0;
  let sampleRate = 0;
  let bitsPerSample = 0;
  let dataOffset = -1;
  let dataSize = 0;

  let offset = 12;
  while (offset + 8 <= bytes.byteLength) {
    const chunkId = readAscii(view, offset, 4);
    const chunkSize = view.getUint32(offset + 4, true);
    const bodyStart = offset + 8;

    if (bodyStart + chunkSize > bytes.byteLength) {
      return { ok: false, error: `WAV chunk "${chunkId}" extends past end of file` };
    }

    if (chunkId === "fmt ") {
      if (chunkSize < 16) {
        return { ok: false, error: "WAV fmt chunk is malformed" };
      }
      audioFormat = view.getUint16(bodyStart, true);
      channels = view.getUint16(bodyStart + 2, true);
      sampleRate = view.getUint32(bodyStart + 4, true);
      bitsPerSample = view.getUint16(bodyStart + 14, true);
    } else if (chunkId === "data") {
      dataOffset = bodyStart;
      dataSize = chunkSize;
      break;
    }

    // RIFF chunks are word-aligned (padded to even byte boundary).
    offset = bodyStart + chunkSize + (chunkSize % 2);
  }

  if (audioFormat === -1) {
    return { ok: false, error: "WAV is missing fmt chunk" };
  }
  if (dataOffset === -1) {
    return { ok: false, error: "WAV is missing data chunk" };
  }
  if (audioFormat !== 1) {
    return { ok: false, error: `Unsupported WAV audio format (${audioFormat}); expected PCM (1)` };
  }
  if (bitsPerSample !== 16) {
    return { ok: false, error: `Unsupported bit depth (${bitsPerSample}); expected 16-bit PCM` };
  }
  if (channels < 1 || channels > 2) {
    return { ok: false, error: `Unsupported channel count (${channels}); expected mono or stereo` };
  }
  if (sampleRate <= 0) {
    return { ok: false, error: "Invalid sample rate in WAV header" };
  }

  const bytesPerFrame = channels * 2;
  if (dataSize === 0 || dataSize % bytesPerFrame !== 0) {
    return { ok: false, error: "WAV data chunk length is empty or unaligned" };
  }

  const numSamples = dataSize / bytesPerFrame;
  const samples = new Float32Array(numSamples);

  if (channels === 1) {
    for (let i = 0; i < numSamples; i++) {
      samples[i] = view.getInt16(dataOffset + i * 2, true) / 32768;
    }
  } else {
    for (let i = 0; i < numSamples; i++) {
      const l = view.getInt16(dataOffset + i * 4, true) / 32768;
      const r = view.getInt16(dataOffset + i * 4 + 2, true) / 32768;
      samples[i] = (l + r) * 0.5;
    }
  }

  const durationMs = Math.round((numSamples / sampleRate) * 1000);
  return {
    ok: true,
    wav: {
      audioFormat,
      channels,
      sampleRate,
      bitsPerSample,
      numSamples,
      durationMs,
      samples,
    },
  };
}

/**
 * Server-side upload guard: validates byte size, RIFF PCM header, mono 16-bit,
 * sane sample rate, and duration bounds before touching Supabase Storage.
 */
export function validateUploadedWav(bytes: Uint8Array): WavParseResult {
  if (bytes.byteLength === 0) {
    return { ok: false, error: "Empty audio body" };
  }
  if (bytes.byteLength > WAV_UPLOAD_LIMITS.maxBytes) {
    return {
      ok: false,
      error: `WAV exceeds maximum size (${Math.round(WAV_UPLOAD_LIMITS.maxBytes / (1024 * 1024))} MB)`,
    };
  }
  const parsed = parseWav(bytes);
  if (!parsed.ok) return parsed;

  const { wav } = parsed;
  if (wav.channels !== 1) {
    return { ok: false, error: "Uploaded voice takes must be mono (1 channel)" };
  }
  if (wav.sampleRate < WAV_UPLOAD_LIMITS.minSampleRate || wav.sampleRate > WAV_UPLOAD_LIMITS.maxSampleRate) {
    return {
      ok: false,
      error: `Sample rate ${wav.sampleRate} Hz out of range (${WAV_UPLOAD_LIMITS.minSampleRate} to ${WAV_UPLOAD_LIMITS.maxSampleRate} Hz)`,
    };
  }
  if (wav.durationMs < WAV_UPLOAD_LIMITS.minDurationMs) {
    return { ok: false, error: `Take is too short (${wav.durationMs} ms; minimum ${WAV_UPLOAD_LIMITS.minDurationMs} ms)` };
  }
  if (wav.durationMs > WAV_UPLOAD_LIMITS.maxDurationMs) {
    return { ok: false, error: `Take is too long (${wav.durationMs} ms; maximum ${WAV_UPLOAD_LIMITS.maxDurationMs} ms)` };
  }
  return parsed;
}

export interface VoiceTrackClip {
  /** Start offset in seconds from frame 0 of the reel. */
  startSeconds: number;
  samples: Float32Array;
  sampleRate: number;
}

/**
 * Places each voiced take at its beat's exact start time on a 44.1 kHz mono
 * timeline buffer starting at 0 s (ready for scripts/shift-reel-audio.py).
 */
export function assembleVoiceTrack(
  totalSeconds: number,
  clips: readonly VoiceTrackClip[],
  targetSampleRate = SCORER_SAMPLE_RATE,
): Float32Array {
  const totalSamples = Math.max(1, Math.ceil(totalSeconds * targetSampleRate));
  const track = new Float32Array(totalSamples);

  for (const clip of clips) {
    if (clip.samples.length === 0) continue;
    const aligned =
      clip.sampleRate === targetSampleRate
        ? clip.samples
        : resampleMono(clip.samples, clip.sampleRate, targetSampleRate);
    const startSample = Math.round(clip.startSeconds * targetSampleRate);
    const clipStart = startSample < 0 ? -startSample : 0;
    const trackStart = Math.max(0, startSample);
    const writable = Math.min(aligned.length - clipStart, totalSamples - trackStart);
    for (let i = 0; i < writable; i++) {
      const mixed = track[trackStart + i] + aligned[clipStart + i];
      track[trackStart + i] = mixed < -1 ? -1 : mixed > 1 ? 1 : mixed;
    }
  }

  return track;
}

/** Encodes placed voice clips into a 16-bit 44.1 kHz mono WAV buffer. */
export function encodeVoiceTrackWav(
  totalSeconds: number,
  clips: readonly VoiceTrackClip[],
  targetSampleRate = SCORER_SAMPLE_RATE,
): Uint8Array {
  return encodeWav16Mono(assembleVoiceTrack(totalSeconds, clips, targetSampleRate), targetSampleRate);
}
