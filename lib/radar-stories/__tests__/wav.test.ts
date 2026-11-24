/**
 * @jest-environment node
 */
import {
  assembleVoiceTrack,
  encodeVoiceTrackWav,
  encodeWav16Mono,
  parseWav,
  resampleMono,
  SCORER_SAMPLE_RATE,
  STUDIO_SAMPLE_RATE,
  validateUploadedWav,
} from "../wav";

function sineWave(freqHz: number, seconds: number, sampleRate: number, amp = 0.5): Float32Array {
  const n = Math.round(seconds * sampleRate);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    out[i] = amp * Math.sin((2 * Math.PI * freqHz * i) / sampleRate);
  }
  return out;
}

describe("16-bit mono WAV encoder and parser", () => {
  it("encodes valid RIFF/WAVE PCM headers and round-trips samples accurately", () => {
    const samples = sineWave(440, 0.5, STUDIO_SAMPLE_RATE, 0.6);
    const wavBytes = encodeWav16Mono(samples, STUDIO_SAMPLE_RATE);

    expect(wavBytes.byteLength).toBe(44 + samples.length * 2);
    expect(String.fromCharCode(...wavBytes.subarray(0, 4))).toBe("RIFF");
    expect(String.fromCharCode(...wavBytes.subarray(8, 12))).toBe("WAVE");

    const parsed = parseWav(wavBytes);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    expect(parsed.wav.audioFormat).toBe(1);
    expect(parsed.wav.channels).toBe(1);
    expect(parsed.wav.sampleRate).toBe(STUDIO_SAMPLE_RATE);
    expect(parsed.wav.bitsPerSample).toBe(16);
    expect(parsed.wav.numSamples).toBe(samples.length);
    expect(parsed.wav.durationMs).toBe(500);

    // 16-bit quantization error is under 1/16384.
    for (let i = 0; i < samples.length; i += 97) {
      expect(Math.abs(parsed.wav.samples[i] - samples[i])).toBeLessThan(0.0002);
    }
  });

  it("clamps out-of-range samples without wrapping", () => {
    const samples = new Float32Array([-2.5, -1, 0, 1, 3.2]);
    const parsed = parseWav(encodeWav16Mono(samples, 48_000));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.wav.samples[0]).toBeCloseTo(-1, 4);
    expect(parsed.wav.samples[1]).toBeCloseTo(-1, 4);
    expect(parsed.wav.samples[2]).toBe(0);
    expect(parsed.wav.samples[3]).toBeCloseTo(32767 / 32768, 4);
    expect(parsed.wav.samples[4]).toBeCloseTo(32767 / 32768, 4);
  });

  it("skips extra RIFF metadata chunks (e.g. LIST) before data", () => {
    const samples = sineWave(220, 0.25, 44_100, 0.4);
    const base = encodeWav16Mono(samples, 44_100);
    const listChunk = new Uint8Array([
      0x4c, 0x49, 0x53, 0x54, // "LIST"
      0x04, 0x00, 0x00, 0x00, // size = 4
      0x49, 0x4e, 0x46, 0x4f, // "INFO"
    ]);
    const combined = new Uint8Array(base.length + listChunk.length);
    // RIFF header + fmt chunk = 36 bytes
    combined.set(base.subarray(0, 36), 0);
    combined.set(listChunk, 36);
    combined.set(base.subarray(36), 36 + listChunk.length);
    // Update RIFF chunk size
    new DataView(combined.buffer).setUint32(4, combined.length - 8, true);

    const parsed = parseWav(combined);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.wav.numSamples).toBe(samples.length);
  });
});

describe("windowed-sinc resampler", () => {
  it("resamples 44.1 kHz to 48 kHz while preserving signal duration and amplitude", () => {
    const src = sineWave(500, 0.2, 44_100, 0.5);
    const dst = resampleMono(src, 44_100, 48_000);
    expect(dst.length).toBe(Math.round(0.2 * 48_000));

    // Check interior peak amplitude stays ~0.5 (skip window edges).
    let maxInterior = 0;
    for (let i = 200; i < dst.length - 200; i++) {
      maxInterior = Math.max(maxInterior, Math.abs(dst[i]));
    }
    expect(maxInterior).toBeGreaterThan(0.49);
    expect(maxInterior).toBeLessThan(0.51);
  });

  it("returns an exact copy when sample rates already match", () => {
    const src = new Float32Array([0.1, -0.2, 0.3]);
    const dst = resampleMono(src, 48_000, 48_000);
    expect(Array.from(dst)).toEqual(Array.from(src));
    expect(dst).not.toBe(src);
  });
});

describe("server-side WAV upload validator", () => {
  it("accepts a valid 48 kHz mono 16-bit WAV within duration limits", () => {
    const wav = encodeWav16Mono(sineWave(300, 1.2, STUDIO_SAMPLE_RATE, 0.4), STUDIO_SAMPLE_RATE);
    const res = validateUploadedWav(wav);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.wav.durationMs).toBe(1200);
  });

  it("rejects non-WAV bytes, truncated WAVs, and too-short clips", () => {
    expect(validateUploadedWav(new Uint8Array([1, 2, 3, 4])).ok).toBe(false);
    expect(validateUploadedWav(new TextEncoder().encode("not a wav file at all, just plain text padding")).ok).toBe(false);

    const valid = encodeWav16Mono(sineWave(300, 0.5, STUDIO_SAMPLE_RATE), STUDIO_SAMPLE_RATE);
    expect(validateUploadedWav(valid.subarray(0, valid.length - 100)).ok).toBe(false);

    const tooShort = encodeWav16Mono(sineWave(300, 0.05, STUDIO_SAMPLE_RATE), STUDIO_SAMPLE_RATE);
    expect(validateUploadedWav(tooShort).ok).toBe(false);
  });
});

describe("voice track placement", () => {
  it("places clips at exact beat start offsets on a 44.1 kHz timeline", () => {
    const clipA = new Float32Array(SCORER_SAMPLE_RATE * 0.2).fill(0.5);
    const clipB = new Float32Array(SCORER_SAMPLE_RATE * 0.1).fill(-0.4);

    const track = assembleVoiceTrack(3.0, [
      { startSeconds: 0.5, samples: clipA, sampleRate: SCORER_SAMPLE_RATE },
      { startSeconds: 2.0, samples: clipB, sampleRate: SCORER_SAMPLE_RATE },
    ]);

    expect(track.length).toBe(3 * SCORER_SAMPLE_RATE);
    // Silent before clip A
    expect(track[0]).toBe(0);
    expect(track[Math.round(0.49 * SCORER_SAMPLE_RATE)]).toBe(0);
    // Clip A present at 0.5 s .. 0.7 s
    expect(track[Math.round(0.55 * SCORER_SAMPLE_RATE)]).toBeCloseTo(0.5, 4);
    // Silent between clips
    expect(track[Math.round(1.2 * SCORER_SAMPLE_RATE)]).toBe(0);
    // Clip B present at 2.0 s .. 2.1 s
    expect(track[Math.round(2.05 * SCORER_SAMPLE_RATE)]).toBeCloseTo(-0.4, 4);
    // Silent after clip B
    expect(track[Math.round(2.5 * SCORER_SAMPLE_RATE)]).toBe(0);
  });

  it("resamples 48 kHz clips automatically and encodes a 44.1 kHz WAV for the scorer", () => {
    const clip48 = sineWave(440, 0.25, 48_000, 0.6);
    const wavBytes = encodeVoiceTrackWav(1.5, [
      { startSeconds: 0.5, samples: clip48, sampleRate: 48_000 },
    ]);
    const parsed = parseWav(wavBytes);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.wav.sampleRate).toBe(SCORER_SAMPLE_RATE);
    expect(parsed.wav.channels).toBe(1);
    expect(parsed.wav.durationMs).toBe(1500);
    // Energy should exist around 0.6 s and be zero at 0.1 s.
    expect(Math.abs(parsed.wav.samples[Math.round(0.1 * SCORER_SAMPLE_RATE)])).toBe(0);
    let maxAtClip = 0;
    for (let i = Math.round(0.55 * SCORER_SAMPLE_RATE); i < Math.round(0.7 * SCORER_SAMPLE_RATE); i++) {
      maxAtClip = Math.max(maxAtClip, Math.abs(parsed.wav.samples[i]));
    }
    expect(maxAtClip).toBeGreaterThan(0.5);
  });
});
