import { ELEMENT_KEYFRAMES, ELEMENT_SCRUB_FRAME_COUNT } from "../media";
import { blockThresholds, keyframeBlend, seedFromKey } from "../scrub-dissolve";

describe("scroll chapter block dissolve", () => {
  it("starts on the first keyframe and ends fully on the last", () => {
    expect(keyframeBlend(0, 6)).toEqual({ from: 0, to: 1, mix: 0 });
    expect(keyframeBlend(1, 6)).toEqual({ from: 4, to: 5, mix: 1 });
  });

  it("splits scroll evenly between keyframe pairs", () => {
    const mid = keyframeBlend(0.5, 6);
    expect(mid.from).toBe(2);
    expect(mid.mix).toBeCloseTo(0.5);
  });

  it("clamps overscroll", () => {
    expect(keyframeBlend(-0.2, 6)).toEqual(keyframeBlend(0, 6));
    expect(keyframeBlend(1.3, 6)).toEqual(keyframeBlend(1, 6));
  });

  it("gives every block a stable threshold in [0, 1), different per chapter", () => {
    const a = blockThresholds(2000, seedFromKey("earth"));
    expect(Array.from(a)).toEqual(Array.from(blockThresholds(2000, seedFromKey("earth"))));
    expect(Array.from(a)).not.toEqual(Array.from(blockThresholds(2000, seedFromKey("fire"))));
    expect(Math.min(...a)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...a)).toBeLessThan(1);
    // Roughly half the blocks have switched at the midpoint of a pair.
    const switched = a.filter((t) => t < 0.5).length / a.length;
    expect(switched).toBeGreaterThan(0.45);
    expect(switched).toBeLessThan(0.55);
  });

  it("loads first and last frames of the 36 as keyframes", () => {
    expect(ELEMENT_KEYFRAMES[0]).toBe(1);
    expect(ELEMENT_KEYFRAMES[ELEMENT_KEYFRAMES.length - 1]).toBe(ELEMENT_SCRUB_FRAME_COUNT);
  });
});
