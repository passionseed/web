/** @jest-environment node */
import { ACTOR_FRAMES, MOTION_SPRITES } from "@/bot/assets/island/motion-sprites";
import { PALETTE } from "@/bot/assets/island/sprites";

import { castsShadow, catchesLight, webSprites } from "../atmosphere";
import { SHIP_HULL_TOP, SHIP_SIZE } from "../ship";
import {
  SHIP_FOAM_AT,
  SHIP_FOAM_FRAMES,
  SHIP_FOAM_SIZE,
  SHIP_POOL,
  SHIP_SHADOW,
  SHIP_WATER_SPRITES,
  isShipSprite,
  shipFoamFrame,
  shipGlints,
  shipOf,
  shipPoolBox,
} from "../shipWater";

const SHIP = { x: 100, y: 60 };
/** The part of the ship's box that ship.ts keeps on open water: the hull's rows down. */
const WATER = { x: SHIP.x, y: SHIP.y + SHIP_HULL_TOP, w: SHIP_SIZE.w, h: SHIP_SIZE.h - SHIP_HULL_TOP };
const inWater = (r: { x: number; y: number; w: number; h: number }) =>
  r.x >= WATER.x && r.y >= WATER.y && r.x + r.w <= WATER.x + WATER.w && r.y + r.h <= WATER.y + WATER.h;

describe("the merchant ship in the water", () => {
  it("finds the ship among the actors, by its sprite", () => {
    expect(shipOf([])).toBeNull();
    expect(shipOf([{ frames: ["sit_a_0"], x: 1, y: 2 }])).toBeNull();
    expect(shipOf([{ frames: ["sit_a_0"], x: 1, y: 2 }, { frames: ACTOR_FRAMES.merchantShip, x: 10.4, y: 20.6 }])).toEqual({ x: 10, y: 21 });
    expect(isShipSprite("merchant_ship_1")).toBe(true);
    expect(isShipSprite("ship_foam_0")).toBe(false);
  });

  it("floats: no footprint shadow and no firelight on it, its own shadow on the water instead", () => {
    for (const name of ACTOR_FRAMES.merchantShip) {
      expect(castsShadow(name)).toBe(false);
      expect(catchesLight(name)).toBe(false);
    }
    expect(inWater({ x: SHIP.x + SHIP_SHADOW.x - 2, y: SHIP.y + SHIP_SHADOW.y, w: SHIP_SHADOW.w + 4, h: SHIP_SHADOW.h })).toBe(true);
  });

  it("draws its foam in the hour's palette, inside the water round the hull", () => {
    for (const name of SHIP_FOAM_FRAMES) {
      const rows = SHIP_WATER_SPRITES[name];
      expect(rows).toHaveLength(SHIP_FOAM_SIZE.h);
      for (const row of rows) {
        expect(row).toHaveLength(SHIP_FOAM_SIZE.w);
        for (const ch of row) if (ch !== ".") expect(["i", "u", "v"]).toContain(ch);
      }
      expect(webSprites()[name]).toBe(rows);
    }
    expect(inWater({ x: SHIP.x + SHIP_FOAM_AT.x, y: SHIP.y + SHIP_FOAM_AT.y, ...SHIP_FOAM_SIZE })).toBe(true);
    expect(Object.keys(PALETTE)).toEqual(expect.arrayContaining(["i", "u", "v"]));
  });

  it("never lays foam over the hull it laps at (frame 0, the ship at rest)", () => {
    const hull = MOTION_SPRITES.merchant_ship_0;
    for (const name of SHIP_FOAM_FRAMES) {
      SHIP_WATER_SPRITES[name].forEach((row, j) => {
        [...row].forEach((ch, i) => {
          if (ch !== ".") expect([name, i, j, hull[SHIP_FOAM_AT.y + j]?.[SHIP_FOAM_AT.x + i]]).toEqual([name, i, j, "."]);
        });
      });
    }
  });

  it("laps on the sea's beat, 0-1-2-1, and holds still on step 0", () => {
    expect([0, 1, 2, 3, 4].map(shipFoamFrame)).toEqual(["ship_foam_0", "ship_foam_1", "ship_foam_2", "ship_foam_1", "ship_foam_0"]);
  });

  it("puts the lantern's glints under the keel, in its pool, the same for the same step", () => {
    const pool = shipPoolBox(SHIP);
    for (let step = 0; step < 40; step++) {
      const glints = shipGlints(step, SHIP);
      expect(glints).toEqual(shipGlints(step, SHIP));
      for (const g of glints) {
        const box = { x: g.x, y: g.y, w: g.w, h: 1 };
        expect(inWater(box)).toBe(true);
        expect(box.y).toBeGreaterThanOrEqual(SHIP.y + 37);
        expect(box.x).toBeGreaterThanOrEqual(pool.x);
        expect(box.x + box.w).toBeLessThanOrEqual(pool.x + pool.w);
      }
    }
    // Under the stall's lantern.
    expect(pool.x + pool.w / 2).toBe(SHIP.x + SHIP_POOL.x);
  });
});
