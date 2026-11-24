/**
 * @jest-environment node
 */
import { BUBBLE_SIDE, BUBBLE_TOP, bubbleRoom, CELL, placeBubble, splitStress, steppedClip, TAIL_CELLS } from "../story/bubble";
import { headTop, SAFE } from "../story/cast";
import { GRAIN_HOLD, grainOffset } from "../story/StoryScene";
import { landScale } from "../story/StoryText";

describe("speech bubble", () => {
  const head = headTop("parent");

  it("sits over the speaker, on whole cells, its tail ending just above the head", () => {
    const { box, tail } = placeBubble({ w: 250, h: 100 }, 300, head);
    expect(box.w % CELL).toBe(0);
    expect(box.h % CELL).toBe(0);
    expect(box.y + box.h).toBe(Math.round((head - TAIL_CELLS * CELL) / 2) * 2);
    expect(Math.abs(box.x + box.w / 2 - 300)).toBeLessThan(60);
    const tip = tail[tail.length - 1];
    expect(tip.w).toBe(CELL);
    expect(tip.y + tip.h).toBeLessThanOrEqual(head);
    expect(Math.abs(tip.x + tip.w / 2 - 300)).toBeLessThanOrEqual(CELL);
    // A wedge: never wider lower down.
    tail.forEach((c, i) => i > 0 && expect(c.w).toBeLessThanOrEqual(tail[i - 1].w));
    expect(tail[0].y).toBe(box.y + box.h - CELL); // joins the bubble with no seam
  });

  it("never leaves the safe zone, even for a speaker at the edge", () => {
    for (const x of [10, 216, 420]) {
      const { box, tail } = placeBubble({ w: 320, h: 150 }, x, head);
      expect(box.x).toBeGreaterThanOrEqual(BUBBLE_SIDE);
      expect(box.x + box.w).toBeLessThanOrEqual(SAFE.right);
      expect(box.y).toBeGreaterThanOrEqual(BUBBLE_TOP);
      for (const c of tail) expect(c.x + c.w).toBeLessThanOrEqual(SAFE.right + CELL);
    }
    // A tall bubble stops at the top band instead of climbing into it.
    expect(placeBubble({ w: 200, h: 400 }, 216, head).box.y).toBe(BUBBLE_TOP);
    expect(bubbleRoom(head)).toBe(head - TAIL_CELLS * CELL - BUBBLE_TOP);
  });

  it("has stepped pixel corners", () => {
    const clip = steppedClip(60, 36);
    expect(clip.startsWith("polygon(12px 0px")).toBe(true);
    expect(clip.split(",")).toHaveLength(20);
  });

  it("colours only the stressed words, and the hook's last phrase", () => {
    expect(splitStress("จะเข้าคณะอะไร?", "คณะ")).toEqual([
      { text: "จะเข้า", stress: false },
      { text: "คณะ", stress: true },
      { text: "อะไร?", stress: false },
    ]);
    expect(splitStress("ทำไม", "ไม่มี")).toEqual([{ text: "ทำไม", stress: false }]);
    expect(splitStress("ทำไม", undefined)).toEqual([{ text: "ทำไม", stress: false }]);
  });

  it("lands a line in two stepped frames, whole from the first", () => {
    expect([0, 1, 2, 40].map((f) => landScale(f, 90))).toEqual([0.9, 0.96, 1, 1]);
  });

  it("opens cold: a line starting on frame 0 (the cover) is already landed", () => {
    expect(landScale(0, 0)).toBe(1);
  });
});

describe("film grain", () => {
  it("moves to a new whole-device-pixel spot every frame, the same on every run", () => {
    const spots = Array.from({ length: 30 }, (_, f) => grainOffset(f));
    expect(new Set(spots.map((s) => `${s.x},${s.y}`)).size).toBeGreaterThan(25);
    for (const s of spots) {
      expect(Number.isInteger(Math.round(s.x * 2.5 * 1000) / 1000)).toBe(true);
      expect(s.x).toBeLessThan(102.4);
      expect(s.y).toBeLessThan(102.4);
    }
    expect(grainOffset(77)).toEqual(grainOffset(77));
  });

  it("holds each spot for a couple of frames so the encoder is not fed fresh noise every frame", () => {
    expect(GRAIN_HOLD).toBeGreaterThanOrEqual(2);
  });
});
