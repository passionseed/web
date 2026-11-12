/**
 * @jest-environment node
 */
import { HUD_RESERVE, scrollToCentre, worldLayout, worldScale, type Insets, type WorldInput } from "../world";

const NO_INSETS: Insets = { top: 0, right: 0, bottom: 0, left: 0 };
/** The pilot island (30 x 16 tiles). */
const PILOT = { sceneW: 480, sceneH: 256 };

const input = (over: Partial<WorldInput>): WorldInput => ({
  viewW: 360,
  viewH: 740,
  dpr: 3,
  ...PILOT,
  safe: NO_INSETS,
  whole: false,
  ...over,
});

/** True when v lands on the device pixel grid. */
const onGrid = (v: number, dpr: number) => Math.abs(v * dpr - Math.round(v * dpr)) < 1e-6;

describe("worldScale", () => {
  it("keeps about 2x on a phone, where the island is wider than the screen", () => {
    expect(worldScale(input({}))).toBe(2);
  });

  it("grows on a desktop to the biggest whole scale that fits between the HUD bars", () => {
    // 1440 x 900 at 2x: 2832 device px wide over 480 is 5.9, 1480 tall over 256 is 5.78: 5 device px.
    expect(worldScale(input({ viewW: 1440, viewH: 900, dpr: 2 }))).toBe(2.5);
  });

  it("fits the whole island on request, at whole device pixels, never below one", () => {
    const whole = worldScale(input({ whole: true }));
    expect(whole * 3).toBe(2);
    // A 1600 px island on a phone cannot fit: one device pixel per native pixel.
    expect(worldScale(input({ whole: true, sceneW: 1600, sceneH: 896 }))).toBeCloseTo(1 / 3);
  });

  it("uses whole device pixels at fractional ratios", () => {
    for (const dpr of [1, 1.25, 1.5, 2, 2.625, 3]) {
      for (const whole of [false, true]) {
        const s = worldScale(input({ dpr, whole, viewW: 1280, viewH: 720 }));
        expect([dpr, whole, onGrid(s, dpr) && Number.isInteger(Math.round(s * dpr))]).toEqual([dpr, whole, true]);
      }
    }
  });

  it("stops growing on very big screens", () => {
    expect(worldScale(input({ viewW: 3840, viewH: 2160, dpr: 1 }))).toBe(6);
  });
});

describe("worldLayout", () => {
  it("fills the screen with sea around a centred island when it fits", () => {
    const layout = worldLayout(input({ viewW: 1440, viewH: 900, dpr: 2 }));
    expect(layout.fits).toBe(true);
    expect(layout.world).toEqual({ w: 1440, h: 900 });
    expect(layout.island.w).toBe(1200);
    expect(layout.island.h).toBe(640);
    expect(layout.island.x).toBe(120);
    // Centred in the room between the HUD bars.
    expect(layout.island.y).toBe(HUD_RESERVE.top + (900 - HUD_RESERVE.top - HUD_RESERVE.bottom - 640) / 2);
  });

  it("makes the world wider than a phone, with a strip of sea beside the island", () => {
    const layout = worldLayout(input({}));
    expect(layout.fits).toBe(false);
    expect(layout.world.w).toBe(960 + 2 * HUD_RESERVE.side);
    expect(layout.world.h).toBe(740);
    expect(layout.island.x).toBe(HUD_RESERVE.side);
  });

  it("covers the whole world with canvas, overhanging by less than a native pixel", () => {
    for (const over of [{}, { viewW: 1440, viewH: 900, dpr: 2 }, { viewW: 740, viewH: 360 }, { viewW: 393, viewH: 852, dpr: 2.625, whole: true }]) {
      const layout = worldLayout(input(over));
      const { canvas, world, scale, frame } = layout;
      expect(canvas.x).toBeLessThanOrEqual(0);
      expect(canvas.y).toBeLessThanOrEqual(0);
      expect(canvas.x).toBeGreaterThan(-scale);
      expect(canvas.y).toBeGreaterThan(-scale);
      expect(canvas.x + canvas.w).toBeGreaterThanOrEqual(world.w - 1e-6);
      expect(canvas.y + canvas.h).toBeGreaterThanOrEqual(world.h - 1e-6);
      expect(canvas.x + canvas.w).toBeLessThan(world.w + scale + 1e-6);
      expect(canvas.w).toBeCloseTo(frame.w * scale);
      // The canvas's scene origin is the island's corner.
      expect(canvas.x - frame.x * scale).toBeCloseTo(layout.island.x);
      expect(canvas.y - frame.y * scale).toBeCloseTo(layout.island.y);
      for (const v of [layout.island.x, layout.island.y, canvas.x, canvas.y]) expect(onGrid(v, (over as { dpr?: number }).dpr ?? 3)).toBe(true);
      expect(Number.isInteger(frame.x) && Number.isInteger(frame.y) && Number.isInteger(frame.w) && Number.isInteger(frame.h)).toBe(true);
    }
  });

  it("keeps the island clear of the notch and the home bar", () => {
    const safe = { top: 47, right: 0, bottom: 34, left: 0 };
    const layout = worldLayout(input({ viewW: 740, viewH: 360, safe }));
    expect(layout.island.y).toBe(safe.top + HUD_RESERVE.top);
    expect(layout.world.h).toBe(Math.ceil(layout.island.h + safe.top + HUD_RESERVE.top + safe.bottom + HUD_RESERVE.bottom));
  });
});

describe("scrollToCentre", () => {
  it("puts the student's plot in the middle of the room between the bars", () => {
    const layout = worldLayout(input({}));
    const at = scrollToCentre(layout, { w: 360, h: 740 }, { x: 50, y: 50 }, NO_INSETS);
    expect(at.left).toBe(Math.round(layout.island.x + layout.island.w / 2 - 180));
    // The island fits the height: no vertical scroll.
    expect(at.top).toBe(0);
  });

  it("never scrolls past the world", () => {
    const layout = worldLayout(input({}));
    expect(scrollToCentre(layout, { w: 360, h: 740 }, { x: 0, y: 0 }, NO_INSETS).left).toBe(0);
    expect(scrollToCentre(layout, { w: 360, h: 740 }, { x: 100, y: 100 }, NO_INSETS).left).toBe(layout.world.w - 360);
  });
});
