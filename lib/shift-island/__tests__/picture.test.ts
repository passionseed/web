/**
 * @jest-environment node
 */
import { PNG } from "pngjs";

import * as render from "@/bot/src/quests/island/render";
import type { IslandMapData, IslandMapPlot } from "@/lib/supabase/shift-quests/types";

import { islandPicture, pictureVersion, renderIslandPng } from "../picture";

jest.mock("@/bot/src/quests/island/render", () => {
  const actual = jest.requireActual("@/bot/src/quests/island/render");
  return { ...actual, plotBoxes: jest.fn(actual.plotBoxes), buildScene: jest.fn(actual.buildScene) };
});

const plotBoxes = render.plotBoxes as jest.MockedFunction<typeof render.plotBoxes>;
const buildScene = render.buildScene as jest.MockedFunction<typeof render.buildScene>;

function plots(n: number): IslandMapPlot[] {
  return Array.from({ length: n }, (_, k) => ({
    slot: k + 1,
    stage: k % 8,
    visitor: k % 8 >= 3,
    key: k % 5 === 0,
    helper: k % 4 === 0,
    lantern: k % 7 === 0,
    name: `โปรเจกต์ ${k + 1}`,
    mine: k === 2,
    plain: false,
  }));
}

const SEASON = { name: "Season 1", demo_day: "2027-05-15", days_to_demo: 30 };

function map(input: IslandMapPlot[], season: IslandMapData["season"] = SEASON): IslandMapData {
  return { plots: input, goal: null, season };
}

/** A hotspot back in native pixels. */
const native = (h: { x: number; y: number; w: number; h: number }, width: number, height: number) => ({
  left: (h.x * width) / 100,
  top: (h.y * height) / 100,
  width: (h.w * width) / 100,
  height: (h.h * height) / 100,
});

let errorLog: jest.SpyInstance;
beforeEach(() => {
  errorLog = jest.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => errorLog.mockRestore());

describe("islandPicture", () => {
  it("gives one hotspot per plot, in slot order, inside the picture", () => {
    for (const n of [0, 1, 6, 12, 50, 200]) {
      const input = plots(n).reverse();
      const picture = islandPicture(map(input))!;
      expect(picture.hotspots.map((h) => h.slot)).toEqual(plots(n).map((p) => p.slot));
      for (const h of picture.hotspots) {
        expect([n, h.slot, h.x >= 0, h.y >= 0, h.w > 0, h.h > 0, h.x + h.w <= 100 + 1e-9, h.y + h.h <= 100 + 1e-9]).toEqual([
          n,
          h.slot,
          true,
          true,
          true,
          true,
          true,
          true,
        ]);
      }
    }
    expect(errorLog).not.toHaveBeenCalled();
  });

  it("uses the renderer's own boxes, at the size of the scale-1 picture", () => {
    const input = plots(14);
    const picture = islandPicture(map(input))!;
    const boxes = jest.requireActual<typeof render>("@/bot/src/quests/island/render").plotBoxes(input);
    const png = renderIslandPng(map(input));
    expect([picture.width, picture.height]).toEqual([boxes.width, boxes.height]);
    expect([picture.width, picture.height]).toEqual([png.width, png.height]);
    picture.hotspots.forEach((h, k) => {
      const back = native(h, picture.width, picture.height);
      const box = boxes.boxes[k];
      expect(box.slot).toBe(h.slot);
      for (const key of ["left", "top", "width", "height"] as const) expect(Math.abs(back[key] - box[key])).toBeLessThan(0.01);
    });
  });

  it("grows small boxes evenly to 12 x 12 native px and keeps them inside the picture", () => {
    plotBoxes.mockReturnValueOnce({
      width: 100,
      height: 60,
      boxes: [
        { slot: 1, left: 0, top: 0, width: 4, height: 4 },
        { slot: 2, left: 98, top: 58, width: 2, height: 2 },
        { slot: 3, left: 40, top: 20, width: 6, height: 20 },
        { slot: 4, left: 50, top: 1, width: 3, height: 3 },
      ],
    });
    const picture = islandPicture(map(plots(4)))!;
    const px = picture.hotspots.map((h) => native(h, 100, 60));
    const rounded = px.map((b) => Object.fromEntries(Object.entries(b).map(([k, v]) => [k, Math.round(v * 1000) / 1000])));
    expect(rounded).toEqual([
      // Pushed against the top-left corner: the missing room comes from the right and below.
      { left: 0, top: 0, width: 12, height: 12 },
      // Bottom-right corner: from the left and above.
      { left: 88, top: 48, width: 12, height: 12 },
      // Grown evenly across; tall enough already.
      { left: 37, top: 20, width: 12, height: 20 },
      // Grown evenly across; clamped at the top, the rest taken below.
      { left: 46, top: 0, width: 12, height: 12 },
    ]);
  });

  it("points at the caller's own plot, or none", () => {
    const picture = islandPicture(map(plots(6)))!;
    expect(picture.mine).toEqual(picture.hotspots.find((h) => h.slot === 3));
    expect(picture.mine?.mine).toBe(true);
    expect(picture.hotspots.filter((h) => h.mine)).toHaveLength(1);
    expect(islandPicture(map(plots(6).map((p) => ({ ...p, mine: false }))))!.mine).toBeNull();
  });

  it("shows a plain plot as an empty slot with no name", () => {
    const input = plots(6).map((p) => (p.slot === 4 ? { ...p, stage: 6, plain: true } : p));
    const plain = islandPicture(map(input))!.hotspots.find((h) => h.slot === 4)!;
    expect(plain).toMatchObject({ plain: true, stage: 0, name: null });
    const named = islandPicture(map(input))!.hotspots.find((h) => h.slot === 5)!;
    expect(named).toMatchObject({ plain: false, stage: 4, name: "โปรเจกต์ 5" });
  });

  it("links to the picture route with the map's version and flags the festival", () => {
    const withSeason = islandPicture(map(plots(5)))!;
    expect(withSeason.src).toBe(`/api/shift/island/map?v=${pictureVersion(map(plots(5)))}`);
    expect(withSeason.festival).toBe(true);
    expect(islandPicture(map(plots(5), null))!.festival).toBe(false);
  });

  it("returns null and logs one line without student text when the island cannot be drawn", () => {
    const tooBig = plots(3).map((p, k) => (k === 2 ? { ...p, slot: render.SPOTS.length + 1 } : p));
    expect(islandPicture(map(tooBig))).toBeNull();
    expect(errorLog).toHaveBeenCalledTimes(1);
    const line = String(errorLog.mock.calls[0][0]);
    expect(line).toContain("too_large");
    expect(line).not.toContain("โปรเจกต์");
    expect(islandPicture(map([...plots(2), plots(1)[0]]))).toBeNull();
    expect(String(errorLog.mock.calls[1][0])).toContain("bad_plot");
  });

  it("rethrows anything that is not a render error", () => {
    plotBoxes.mockImplementationOnce(() => {
      throw new TypeError("boom");
    });
    expect(() => islandPicture(map(plots(2)))).toThrow(TypeError);
  });
});

describe("the living island's scene", () => {
  it("comes with the picture, at the picture's size, with the caller's pin and the festival", () => {
    for (const n of [0, 1, 14, 120]) {
      const input = plots(n);
      const picture = islandPicture(map(input))!;
      const png = renderIslandPng(map(input));
      expect([n, picture.scene?.width, picture.scene?.height]).toEqual([n, picture.width, picture.height]);
      expect([n, picture.scene?.width, picture.scene?.height]).toEqual([n, png.width, png.height]);
      expect(picture.scene!.trees.map((t) => t.slot)).toEqual(picture.hotspots.map((h) => h.slot));
    }
    const picture = islandPicture(map(plots(6)))!;
    expect(picture.scene).toEqual(render.buildScene(plots(6), { markMine: true, festival: true }));
    expect(picture.scene!.marker).not.toBeNull();
    expect(picture.scene!.banner).not.toBeNull();
    expect(islandPicture(map(plots(6), null))!.scene!.banner).toBeNull();
  });

  it("carries no names", () => {
    expect(JSON.stringify(islandPicture(map(plots(12)))!.scene)).not.toContain("โปรเจกต์");
  });

  it("is null, and the PNG picture stays, when the scene cannot be built", () => {
    buildScene.mockImplementationOnce(() => {
      throw new render.RenderError("missing_sprite", "well");
    });
    const picture = islandPicture(map(plots(3)))!;
    expect(picture).not.toBeNull();
    expect(picture.scene).toBeNull();
    expect(picture.hotspots).toHaveLength(3);
    expect(String(errorLog.mock.calls[0][0])).toContain("missing_sprite");
  });
});

describe("pictureVersion", () => {
  const base = map(plots(8));
  const version = pictureVersion(base);

  it("is 12 hex characters, stable for the same picture", () => {
    expect(version).toMatch(/^[0-9a-f]{12}$/);
    expect(pictureVersion(map(plots(8)))).toBe(version);
    // Order, names and the season's wording are not drawn.
    expect(pictureVersion(map(plots(8).reverse()))).toBe(version);
    expect(pictureVersion(map(plots(8).map((p) => ({ ...p, name: "อื่น" }))))).toBe(version);
    expect(pictureVersion({ ...base, season: { ...SEASON, days_to_demo: 29 } })).toBe(version);
    expect(pictureVersion({ ...base, goal: { milestone: 3, target: 30, count: 12, deadline: "2027-04-15", unlock: null, reached: false } })).toBe(version);
  });

  it("changes when a drawn field or the festival changes", () => {
    const change = (patch: Partial<IslandMapPlot>) => map(plots(8).map((p) => (p.slot === 5 ? { ...p, ...patch } : p)));
    const versions = [
      pictureVersion(change({ stage: 7 })),
      pictureVersion(change({ visitor: false })),
      pictureVersion(change({ key: true })),
      pictureVersion(change({ helper: false })),
      pictureVersion(change({ lantern: true })),
      pictureVersion(change({ mine: true })),
      pictureVersion(change({ plain: true })),
      pictureVersion(map(plots(8), null)),
      pictureVersion(map(plots(9))),
      pictureVersion(map(plots(8).filter((p) => p.slot !== 2))),
    ];
    for (const v of versions) expect(v).not.toBe(version);
    expect(new Set(versions).size).toBe(versions.length);
  });
});

describe("renderIslandPng", () => {
  it("renders a PNG of the reported size at scale 1", () => {
    for (const n of [0, 1, 12, 120]) {
      const out = renderIslandPng(map(plots(n)));
      const png = PNG.sync.read(out.png);
      expect([n, png.width, png.height]).toEqual([n, out.width, out.height]);
      const picture = islandPicture(map(plots(n)))!;
      expect([out.width, out.height]).toEqual([picture.width, picture.height]);
    }
  });

  it("draws the caller's marker and the festival bunting as the map says", () => {
    const pixels = (m: IslandMapData) => PNG.sync.read(renderIslandPng(m).png).data.toString("base64");
    const input = plots(6);
    const direct = render.renderIsland(input, { scale: 1, markMine: true, festival: true });
    expect(pixels(map(input))).toBe(PNG.sync.read(direct.png).data.toString("base64"));
    expect(pixels(map(input, null))).not.toBe(pixels(map(input)));
    expect(pixels(map(input.map((p) => ({ ...p, mine: false }))))).not.toBe(pixels(map(input)));
  });
});
