/**
 * @jest-environment node
 */
import {
  assessRoomNoise,
  classifyRoomNoise,
  dbfsToLinear,
  estimateNoiseFloorDbfs,
  linearToDbfs,
  measureLevels,
  trimSilence,
} from "../audio-dsp";

function buildClip(
  sampleRate: number,
  segments: Array<{ seconds: number; amp: number; freqHz?: number }>,
): Float32Array {
  const total = segments.reduce((sum, s) => sum + Math.round(s.seconds * sampleRate), 0);
  const out = new Float32Array(total);
  let cursor = 0;
  for (const seg of segments) {
    const len = Math.round(seg.seconds * sampleRate);
    const freq = seg.freqHz ?? 350;
    for (let i = 0; i < len; i++) {
      out[cursor + i] = seg.amp * Math.sin((2 * Math.PI * freq * i) / sampleRate);
    }
    cursor += len;
  }
  return out;
}

describe("dBFS and level metering", () => {
  it("converts linear amplitude and dBFS consistently", () => {
    expect(linearToDbfs(1)).toBe(0);
    expect(linearToDbfs(0.5)).toBeCloseTo(-6, 0);
    expect(linearToDbfs(0)).toBe(-96);
    expect(dbfsToLinear(0)).toBe(1);
    expect(dbfsToLinear(-6)).toBeCloseTo(0.501, 2);
    expect(dbfsToLinear(-96)).toBe(0);
  });

  it("detects clipping and too-quiet takes", () => {
    const hot = new Float32Array([0.1, 0.995, 0.995, 0.2]);
    expect(measureLevels(hot).clipped).toBe(true);
    expect(measureLevels(hot).tooQuiet).toBe(false);

    const healthy = buildClip(48_000, [{ seconds: 0.2, amp: 0.4 }]);
    const healthyLevels = measureLevels(healthy);
    expect(healthyLevels.clipped).toBe(false);
    expect(healthyLevels.tooQuiet).toBe(false);
    expect(healthyLevels.peakDbfs).toBeCloseTo(-8, 0);

    const quiet = buildClip(48_000, [{ seconds: 0.2, amp: 0.02 }]);
    expect(measureLevels(quiet).tooQuiet).toBe(true);
  });
});

describe("room noise check", () => {
  it("classifies quiet, ok, and loud rooms cleanly", () => {
    expect(classifyRoomNoise(-60).status).toBe("quiet");
    expect(classifyRoomNoise(-46).status).toBe("ok");
    expect(classifyRoomNoise(-32).status).toBe("loud");
  });

  it("measures room tone while ignoring an initial tap transient", () => {
    const sr = 48_000;
    const clip = buildClip(sr, [
      { seconds: 0.05, amp: 0.6 }, // tap click on start
      { seconds: 2.95, amp: dbfsToLinear(-56) }, // quiet room
    ]);
    const check = assessRoomNoise(clip, sr);
    expect(check.status).toBe("quiet");
    expect(check.noiseFloorDbfs).toBeLessThan(-52);
  });

  it("estimates noise floor from quiet frames inside a clip containing speech", () => {
    const sr = 48_000;
    const clip = buildClip(sr, [
      { seconds: 0.5, amp: dbfsToLinear(-58) },
      { seconds: 1.0, amp: 0.4 },
      { seconds: 0.5, amp: dbfsToLinear(-58) },
    ]);
    const floor = estimateNoiseFloorDbfs(clip, sr);
    expect(floor).toBeLessThan(-52);
  });
});

describe("silence trimming", () => {
  it("trims leading and trailing silence while keeping ~150 ms padding on both sides", () => {
    const sr = 48_000;
    const clip = buildClip(sr, [
      { seconds: 1.0, amp: dbfsToLinear(-62) }, // leading silence
      { seconds: 1.0, amp: 0.45 }, // speech
      { seconds: 1.0, amp: dbfsToLinear(-62) }, // trailing silence
    ]);

    const res = trimSilence(clip, sr, { padMs: 150 });
    expect(res.wasAllSilent).toBe(false);
    // 1000 ms speech + 150 ms lead pad + 150 ms tail pad ~= 1300 ms
    expect(res.durationMs).toBeGreaterThanOrEqual(1280);
    expect(res.durationMs).toBeLessThanOrEqual(1330);
    expect(res.trimmedStartMs).toBeGreaterThanOrEqual(830);
    expect(res.trimmedStartMs).toBeLessThanOrEqual(870);
    expect(res.trimmedEndMs).toBeGreaterThanOrEqual(830);
    expect(res.trimmedEndMs).toBeLessThanOrEqual(870);
    expect(res.clipped).toBe(false);
    expect(res.tooQuiet).toBe(false);
    // Edge fade prevents clicks at boundaries
    expect(res.samples[0]).toBe(0);
    expect(res.samples[res.samples.length - 1]).toBe(0);
  });

  it("ignores a brief isolated tap click in the leading silence", () => {
    const sr = 48_000;
    const clip = buildClip(sr, [
      { seconds: 0.2, amp: dbfsToLinear(-62) },
      { seconds: 0.008, amp: 0.5 }, // 8 ms tap click (< 30 ms minSpeechFrames)
      { seconds: 0.8, amp: dbfsToLinear(-62) },
      { seconds: 0.8, amp: 0.4 }, // real speech
      { seconds: 0.8, amp: dbfsToLinear(-62) },
    ]);

    const res = trimSilence(clip, sr, { padMs: 150 });
    expect(res.wasAllSilent).toBe(false);
    expect(res.trimmedStartMs).toBeGreaterThan(750);
    expect(res.durationMs).toBeGreaterThanOrEqual(1080);
    expect(res.durationMs).toBeLessThanOrEqual(1140);
  });

  it("never returns an empty clip if the entire recording is quiet", () => {
    const sr = 48_000;
    const clip = buildClip(sr, [{ seconds: 0.6, amp: dbfsToLinear(-65) }]);
    const res = trimSilence(clip, sr);
    expect(res.wasAllSilent).toBe(true);
    expect(res.samples.length).toBe(clip.length);
    expect(res.durationMs).toBe(600);
    expect(res.tooQuiet).toBe(true);
  });
});
