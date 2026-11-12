/**
 * @jest-environment node
 */
import { buildAtlasData, allSprites } from "../atlas";
import { area, cellRange, exposed, intersect, pxPerNativeFor, visibleRect, type Rect } from "../geometry";

describe("pxPerNativeFor", () => {
  it("is about 2x and always a whole number of device pixels", () => {
    expect(pxPerNativeFor(1)).toBe(2);
    expect(pxPerNativeFor(2)).toBe(2);
    expect(pxPerNativeFor(3)).toBe(2);
    expect(pxPerNativeFor(1.5)).toBe(2);
    expect(pxPerNativeFor(1.25)).toBeCloseTo(2.4);
    for (const dpr of [0.5, 1, 1.25, 1.5, 1.75, 2, 2.25, 2.625, 2.75, 3, 3.5, 4]) {
      const device = pxPerNativeFor(dpr) * dpr;
      expect([dpr, Math.abs(device - Math.round(device)) < 1e-9, device >= 1]).toEqual([dpr, true, true]);
      expect(Math.abs(pxPerNativeFor(dpr) - 2)).toBeLessThanOrEqual(1);
    }
    expect(pxPerNativeFor(Number.NaN)).toBe(2);
    expect(pxPerNativeFor(0)).toBe(2);
  });
});

describe("the visible rect", () => {
  const scene: Rect = { x: 0, y: 0, w: 480, h: 256 };

  it("maps the scroller's client area to native pixels at 2x", () => {
    // The picture box starts at the scroller's top-left and is scrolled 200 px right, 100 down.
    const box = { left: -200, top: -100, width: 960, height: 512 };
    const view = { left: 0, top: 0, width: 390, height: 300 };
    expect(visibleRect(box, view, scene)).toEqual({ x: 100, y: 50, w: 195, h: 150 });
    expect(visibleRect(box, view, scene, 2)).toEqual({ x: 98, y: 48, w: 199, h: 154 });
  });

  it("rounds outwards, clamps to the picture and is null off it", () => {
    const box = { left: -1, top: 0, width: 960, height: 512 };
    expect(visibleRect(box, { left: 0, top: 0, width: 3, height: 3 }, scene)).toEqual({ x: 0, y: 0, w: 2, h: 2 });
    expect(visibleRect({ left: 0, top: 0, width: 960, height: 512 }, { left: -50, top: -50, width: 5000, height: 5000 }, scene, 4)).toEqual(scene);
    expect(visibleRect({ left: 1000, top: 0, width: 960, height: 512 }, { left: 0, top: 0, width: 390, height: 300 }, scene)).toBeNull();
  });

  it("works on a crop: native pixels of the scene, not of the canvas", () => {
    const crop = { x: 100, y: 60, w: 160, h: 112 };
    expect(visibleRect({ left: 0, top: 0, width: 320, height: 224 }, { left: 0, top: 0, width: 320, height: 224 }, crop)).toEqual(crop);
  });

  it("names the tiles a rect touches", () => {
    expect(cellRange({ x: 100, y: 50, w: 195, h: 150 }, 30, 16, 16)).toEqual({ c0: 6, r0: 3, c1: 19, r1: 13 });
    expect(cellRange({ x: 0, y: 0, w: 16, h: 16 }, 30, 16, 16)).toEqual({ c0: 0, r0: 0, c1: 1, r1: 1 });
    expect(cellRange({ x: 470, y: 250, w: 40, h: 40 }, 30, 16, 16)).toEqual({ c0: 29, r0: 15, c1: 30, r1: 16 });
  });

  it("finds exactly what a scroll reveals", () => {
    const prev = { x: 100, y: 50, w: 195, h: 150 };
    const next = { x: 120, y: 40, w: 195, h: 150 };
    const strips = exposed(prev, next);
    const common = intersect(prev, next)!;
    expect(strips.reduce((s, r) => s + area(r), 0)).toBe(area(next) - area(common));
    for (const s of strips) expect(intersect(s, prev)).toBeNull();
    for (let i = 0; i < strips.length; i++) for (let j = i + 1; j < strips.length; j++) expect(intersect(strips[i], strips[j])).toBeNull();
    expect(exposed(prev, prev)).toEqual([]);
    expect(exposed(null, next)).toEqual([next]);
    expect(exposed({ x: 0, y: 0, w: 10, h: 10 }, next)).toEqual([next]);
  });
});

describe("the atlas", () => {
  it("holds every sprite once, mirrored copies beside them, none overlapping", () => {
    const atlas = buildAtlasData("day");
    const sprites = allSprites();
    const all: Rect[] = [];
    for (const [name, rows] of Object.entries(sprites)) {
      const r = atlas.rects.get(name)!;
      expect([name, r.w, r.h]).toEqual([name, rows[0].length, rows.length]);
      all.push(r);
      const ground = /^(water|shore|sand|grass|path|plaza)/.test(name);
      expect([name, atlas.flipped.has(name)]).toEqual([name, !ground]);
      if (!ground) {
        const f = atlas.flipped.get(name)!;
        all.push(f);
        // A mirrored copy reads its rows backwards.
        const px = (x: number, y: number) => atlas.data[(y * atlas.width + x) * 4 + 3];
        for (let j = 0; j < r.h; j++) for (let i = 0; i < r.w; i++) expect(px(f.x + i, f.y + j)).toBe(px(r.x + r.w - 1 - i, r.y + j));
      }
    }
    for (const r of all) {
      expect(r.x + r.w).toBeLessThanOrEqual(atlas.width);
      expect(r.y + r.h).toBeLessThanOrEqual(atlas.height);
    }
    for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) expect(intersect(all[i], all[j])).toBeNull();
    // The same layout in every phase, so sprite rects never depend on the light.
    expect([...buildAtlasData("night").rects]).toEqual([...atlas.rects]);
  });
});
