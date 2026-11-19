/** @jest-environment node */
import { ACTOR_FRAMES, MOTION_SIZES } from "@/bot/assets/island/motion-sprites";
import { buildScene, type IslandPlot, type SceneRect } from "@/bot/src/quests/island/scene";

import { overlaps } from "../geometry";
import { NO_PLAZA, plazaCentre, plazaWorld } from "../plaza";
import { allWater, SHIP_HULL_TOP, SHIP_SIZE, shipAnchor, shipKeepOut } from "../ship";

const SIZES = [1, 3, 8, 12, 20, 40, 80, 150];

function plots(n: number, mine: number): IslandPlot[] {
  return Array.from({ length: n }, (_, i) => ({
    slot: i + 1,
    stage: ((i + 1) % 7) + 1,
    visitor: true,
    key: true,
    helper: true,
    lantern: true,
    name: null,
    mine: i + 1 === mine,
  }));
}

describe("the merchant ship's mooring", () => {
  it("matches the sprite's size", () => {
    expect([SHIP_SIZE.w, SHIP_SIZE.h]).toEqual(MOTION_SIZES.merchant_ship_0);
    expect(MOTION_SIZES.merchant_ship_1).toEqual(MOTION_SIZES.merchant_ship_0);
  });

  it.each(SIZES)("moors a %i-plot island's ship inside the picture, hull on open water, clear of everything tappable", (n) => {
    const scene = buildScene(plots(n, 1), { markMine: true, festival: true });
    const at = shipAnchor(scene, plazaCentre(scene));
    expect(at).not.toBeNull();
    const box: SceneRect = { ...at!, ...SHIP_SIZE };
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.x + box.w).toBeLessThanOrEqual(scene.width);
    expect(box.y + box.h).toBeLessThanOrEqual(scene.height);
    expect(allWater(scene, { x: box.x, y: box.y + SHIP_HULL_TOP, w: box.w, h: box.h - SHIP_HULL_TOP })).toBe(true);
    for (const rect of shipKeepOut(scene)) expect(overlaps(box, rect)).toBe(false);
    // Every tree and every tag, also checked one by one.
    for (const tree of scene.trees) expect(overlaps(box, { x: tree.left, y: tree.top, w: tree.w, h: tree.h })).toBe(false);
    for (const tag of scene.tags) expect(overlaps(box, tag)).toBe(false);
  });

  it("always moors in the same place for the same island", () => {
    const scene = buildScene(plots(20, 3), { markMine: true });
    expect(shipAnchor(scene, plazaCentre(scene))).toEqual(shipAnchor(buildScene(plots(20, 3), { markMine: true }), plazaCentre(scene)));
  });

  it("finds no mooring on an island with no open water", () => {
    const scene = buildScene(plots(5, 0));
    const land = { ...scene, tiles: "1".repeat(scene.tiles.length) };
    expect(shipAnchor(land, plazaCentre(land))).toBeNull();
  });
});

describe("the merchant ship on the plaza", () => {
  const scene = buildScene(plots(12, 2), { markMine: true, festival: true });

  it("draws nothing without the ship (or anything else)", () => {
    expect(plazaWorld(scene, { festival: null, pins: null, campfire: null })).toBe(NO_PLAZA);
  });

  it("rocks the ship first, under everything else, with its tap target and sign", () => {
    const world = plazaWorld(scene, { festival: null, pins: null, campfire: null, ship: true });
    const at = shipAnchor(scene, plazaCentre(scene))!;
    expect(world.actors).toEqual([{ frames: ACTOR_FRAMES.merchantShip, x: at.x, y: at.y, frameMs: 900 }]);
    const spot = world.spots.find((s) => s.id === "ship")!;
    expect(spot.x).toBeCloseTo((at.x / scene.width) * 100, 3);
    expect(spot.w).toBeCloseTo((SHIP_SIZE.w / scene.width) * 100, 3);
    const sign = world.labels.find((l) => l.id === "ship")!;
    expect(sign.anchor).toBe("bottom");
    expect(sign.y).toBeLessThan(spot.y);
  });

  it("puts the ship before the plaza's own pieces in draw order", () => {
    const world = plazaWorld(scene, { festival: null, pins: ["active"], campfire: { count: 2 }, prizes: true, ship: true });
    expect(world.actors[0].frames).toBe(ACTOR_FRAMES.merchantShip);
    expect(world.spots.map((s) => s.id)).toEqual(["ship", "notice", "prizes", "campfire"]);
  });
});
