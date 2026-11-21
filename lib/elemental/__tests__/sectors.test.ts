/**
 * @jest-environment node
 */
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { ELEMENTAL } from "@/components/hackathon/poster/elemental/facts";

import { SPOTS, TILE_BY_CODE } from "../../../bot/src/quests/island/scene";
import { DEFAULT_OUT, POOL_ORDER, buildSlotPool, renderSlotPool, sha256, writeSlotPool } from "../../../scripts/elemental/gen-slot-pool";
import { ORIENTATIONS, elementalLayout, plazaCentrePx, sectorOfTile, spotFor, tileAt, treeBase } from "../island/layout";
import { ElementalSceneError, MAX_BADGE_PIPS, buildElementalScene, type ElementalPlotInput } from "../island/scene";
import {
  ELEMENTAL_SLOTS,
  SECTOR_ORDER,
  SLOT_POOL,
  candidateSlots,
  sectorAtOffset,
  sectorOf,
  sectorSlots,
  type SectorElement,
} from "../island/sectors";

const ALL_SLOTS = Array.from({ length: ELEMENTAL_SLOTS }, (_, k) => k + 1);

describe("element order", () => {
  it("is the poster's element order, in the generator and the sectors", () => {
    const keys = ELEMENTAL.elements.map((e) => e.key);
    expect([...SECTOR_ORDER]).toEqual(keys);
    expect([...POOL_ORDER]).toEqual(keys);
    expect(SLOT_POOL.order).toEqual(keys);
  });

  it("matches core/elements ELEMENT_KEYS once that module exists", async () => {
    const path = join(__dirname, "..", "core", "elements.ts");
    if (!existsSync(path)) return;
    const core = (await import(path)) as { ELEMENT_KEYS?: readonly string[] };
    expect([...(core.ELEMENT_KEYS ?? [])]).toEqual([...SECTOR_ORDER]);
  });
});

describe("sectors", () => {
  it("are disjoint and together cover 1..200 exactly", () => {
    const all = SECTOR_ORDER.flatMap((e) => [...sectorSlots(e)]);
    expect(all).toHaveLength(ELEMENTAL_SLOTS);
    expect(new Set(all).size).toBe(ELEMENTAL_SLOTS);
    expect([...all].sort((a, b) => a - b)).toEqual(ALL_SLOTS);
    for (const e of SECTOR_ORDER) expect(sectorSlots(e)).toHaveLength(ELEMENTAL_SLOTS / SECTOR_ORDER.length);
  });

  it("list each sector nearest the plaza first (SPOTS order is distance order)", () => {
    for (const e of SECTOR_ORDER) expect([...sectorSlots(e)]).toEqual([...sectorSlots(e)].sort((a, b) => a - b));
  });

  it("sectorOf agrees with the lists and is null outside 1..200", () => {
    for (const e of SECTOR_ORDER) for (const slot of sectorSlots(e)) expect(sectorOf(slot)).toBe(e);
    expect(sectorOf(0)).toBeNull();
    expect(sectorOf(201)).toBeNull();
  });

  it("are wedges: each slot's footprint centre falls in its own sector by angle", () => {
    for (const slot of ALL_SLOTS) {
      const s = SPOTS[slot - 1];
      expect([slot, sectorAtOffset(s.x + 1, s.y)]).toEqual([slot, sectorOf(slot)]);
    }
  });

  it("go clockwise from north in element order", () => {
    expect(sectorAtOffset(0.01, -10)).toBe("water");
    expect(sectorAtOffset(-0.01, -10)).toBe("aether");
    expect(SLOT_POOL.starts[0]).toBe(0);
    for (let k = 1; k < SLOT_POOL.starts.length; k++) expect(SLOT_POOL.starts[k]).toBeGreaterThan(SLOT_POOL.starts[k - 1]);
  });
});

describe("gen-slot-pool", () => {
  it("gives the same bytes and hash on every run", () => {
    const dir = mkdtempSync(join(tmpdir(), "slot-pool-"));
    try {
      const a = writeSlotPool(join(dir, "a.json"));
      const b = writeSlotPool(join(dir, "b.json"));
      expect(a).toBe(b);
      expect(readFileSync(join(dir, "a.json"), "utf8")).toBe(readFileSync(join(dir, "b.json"), "utf8"));
      expect(sha256(renderSlotPool(buildSlotPool()))).toBe(a);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("matches the committed slot-pool.json (rerun the generator if SPOTS changed)", () => {
    expect(readFileSync(DEFAULT_OUT, "utf8")).toBe(renderSlotPool());
    expect(JSON.parse(renderSlotPool())).toEqual(buildSlotPool());
  });
});

describe("candidateSlots", () => {
  it("starts with the element's own sector, nearest first, then every other slot", () => {
    for (const e of SECTOR_ORDER) {
      const list = candidateSlots(e);
      expect(list).toHaveLength(ELEMENTAL_SLOTS);
      expect(list.slice(0, 40)).toEqual([...sectorSlots(e)]);
      expect(new Set(list).size).toBe(ELEMENTAL_SLOTS);
      expect(Math.max(...list)).toBeLessThanOrEqual(ELEMENTAL_SLOTS);
    }
  });

  it("never returns a taken slot", () => {
    const taken = new Set<number>();
    // A deterministic scatter of taken slots, growing to a full island.
    for (let k = 0; k < ELEMENTAL_SLOTS; k++) {
      taken.add(((k * 73) % ELEMENTAL_SLOTS) + 1);
      for (const e of SECTOR_ORDER) {
        const list = candidateSlots(e, taken);
        expect(list.some((slot) => taken.has(slot))).toBe(false);
        expect(list).toHaveLength(ELEMENTAL_SLOTS - taken.size);
      }
    }
    expect(candidateSlots("fire", taken)).toEqual([]);
  });

  it("overflows next to its own sector, not across the island", () => {
    const fire = new Set(sectorSlots("fire"));
    const firstOverflow = candidateSlots("fire", fire)[0];
    const near = [...fire].map((slot) => {
      const a = SPOTS[slot - 1];
      const b = SPOTS[firstOverflow - 1];
      return Math.hypot(a.x - b.x, a.y - b.y);
    });
    expect(Math.min(...near)).toBeLessThanOrEqual(5);
  });

  /** Activates teams one by one, each taking the first candidate, as elemental_bot_team_accept does. */
  function assign(order: SectorElement[]): Map<number, SectorElement> {
    const taken = new Map<number, SectorElement>();
    for (const e of order) {
      const slot = candidateSlots(e, taken.keys())[0];
      expect(slot).toBeDefined();
      taken.set(slot, e);
    }
    return taken;
  }

  it("seats 60 Fire teams plus 115 others on slots 1..200", () => {
    const others: SectorElement[] = ["water", "earth", "air", "aether"];
    const order: SectorElement[] = [];
    let fire = 0;
    let rest = 0;
    // Interleaved, as sign-ups arrive: fire every third team until its 60 are in.
    for (let k = 0; fire + rest < 175; k++) {
      if ((k % 3 === 0 && fire < 60) || rest >= 115) {
        order.push("fire");
        fire++;
      } else {
        order.push(others[rest % 4]);
        rest++;
      }
    }
    const seated = assign(order);
    expect(seated.size).toBe(175);
    for (const slot of seated.keys()) {
      expect(slot).toBeGreaterThanOrEqual(1);
      expect(slot).toBeLessThanOrEqual(ELEMENTAL_SLOTS);
    }
    const fireSlots = [...seated].filter(([, e]) => e === "fire").map(([slot]) => slot);
    expect(fireSlots).toHaveLength(60);
    // The fire sector fills completely before any fire team overflows.
    expect(fireSlots.filter((slot) => sectorOf(slot) === "fire")).toHaveLength(40);
  });

  it("seats 175 teams of one element", () => {
    const seated = assign(Array.from({ length: 175 }, () => "fire" as const));
    expect(seated.size).toBe(175);
    expect(Math.max(...seated.keys())).toBeLessThanOrEqual(ELEMENTAL_SLOTS);
  });
});

describe("layouts", () => {
  const land = elementalLayout("landscape");
  const portrait = elementalLayout("portrait");

  it("landscape is SHIFT's 200-slot island: 100 x 56 tiles, 1600 x 896 px", () => {
    expect([land.cols, land.rows, land.width, land.height, land.tile]).toEqual([100, 56, 1600, 896, 16]);
    expect(land.tiles).toHaveLength(land.cols * land.rows);
  });

  it("portrait is 56 x 100 tiles and fits 1080 x 1600 at scale 1", () => {
    expect([portrait.cols, portrait.rows, portrait.width, portrait.height]).toEqual([56, 100, 896, 1600]);
    expect(portrait.width).toBeLessThanOrEqual(1080);
    expect(portrait.height).toBeLessThanOrEqual(1600);
    expect(portrait.landBoxPx.x + portrait.landBoxPx.w).toBeLessThanOrEqual(1080);
    expect(portrait.landBoxPx.y + portrait.landBoxPx.h).toBeLessThanOrEqual(1600);
  });

  it("portrait is the exact transpose of landscape", () => {
    // Shore sprites stay upright, so they turn to face the same water.
    const turned: Record<string, string> = { shore_n: "shore_w", shore_w: "shore_n", shore_s: "shore_e", shore_e: "shore_s" };
    const wrong: string[] = [];
    for (let y = 0; y < land.rows; y++) {
      for (let x = 0; x < land.cols; x++) {
        if (portrait.land[x][y] !== land.land[y][x]) wrong.push(`land ${x},${y}`);
        const a = tileAt(land, x, y);
        if (tileAt(portrait, y, x) !== (turned[a] ?? a)) wrong.push(`tile ${x},${y}`);
      }
    }
    expect(wrong).toEqual([]);
    expect(portrait.plaza).toEqual({ x: land.plaza.y, y: land.plaza.x, w: land.plaza.h, h: land.plaza.w });
    expect([portrait.pcx, portrait.pcy]).toEqual([land.pcy, land.pcx]);
    expect(portrait.landBox).toEqual({ x: land.landBox.y, y: land.landBox.x, w: land.landBox.h, h: land.landBox.w });
    expect(plazaCentrePx(portrait)).toEqual({ x: plazaCentrePx(land).y, y: plazaCentrePx(land).x });
    expect(portrait.tiles).toHaveLength(land.tiles.length);
    for (const code of portrait.tiles) expect(TILE_BY_CODE[code]).toBeDefined();
  });

  it("exposes a land bounding box that holds every land tile", () => {
    for (const layout of ORIENTATIONS.map(elementalLayout)) {
      const { x, y, w, h } = layout.landBox;
      let inside = 0;
      let total = 0;
      layout.land.forEach((row, ty) =>
        row.forEach((isLand, tx) => {
          if (!isLand) return;
          total++;
          if (tx >= x && tx < x + w && ty >= y && ty < y + h) inside++;
        })
      );
      expect(inside).toBe(total);
      expect(layout.landBoxPx).toEqual({ x: x * 16, y: y * 16, w: w * 16, h: h * 16 });
    }
  });

  it("puts every tree's footprint on land, off the plaza, in both orientations", () => {
    const wrong: string[] = [];
    for (const layout of ORIENTATIONS.map(elementalLayout)) {
      const p = layout.plaza;
      for (const slot of ALL_SLOTS) {
        const spot = spotFor(slot, layout.orientation);
        const sx = layout.pcx + spot.x;
        const sy = layout.pcy + spot.y;
        for (let dy = -2; dy <= 1; dy++) {
          for (let dx = -1; dx <= 2; dx++) {
            const tx = sx + dx;
            const ty = sy + dy;
            if (layout.land[ty]?.[tx] !== true) wrong.push(`${layout.orientation} ${slot} water`);
            if (tx >= p.x && tx < p.x + p.w && ty >= p.y && ty < p.y + p.h) wrong.push(`${layout.orientation} ${slot} plaza`);
          }
        }
      }
    }
    expect(wrong).toEqual([]);
  });

  it("transposes each tree's footprint centre, and landscape trees stand where SHIFT draws them", () => {
    for (const slot of ALL_SLOTS) {
      const a = treeBase(land, slot);
      const s = SPOTS[slot - 1];
      expect(a).toEqual({ cx: (land.pcx + s.x + 1) * 16, baseY: (land.pcy + s.y + 1) * 16 });
      // Footprint centre: (cx, baseY - 16) in landscape is (baseY - 16, cx) in portrait.
      const b = treeBase(portrait, slot);
      expect({ x: b.cx, y: b.baseY - 16 }).toEqual({ x: a.baseY - 16, y: a.cx });
    }
  });

  it("finds the same sector for a tile in either orientation", () => {
    for (let y = 0; y < land.rows; y += 3) for (let x = 0; x < land.cols; x += 3) expect(sectorOfTile(portrait, y, x)).toBe(sectorOfTile(land, x, y));
  });

  it("rejects slots outside 1..200", () => {
    expect(() => spotFor(0, "landscape")).toThrow();
    expect(() => spotFor(201, "portrait")).toThrow();
  });
});

/** Compile-time checks on the scene input type: no names, no Discord, no free text. */
type InputKey = keyof ElementalPlotInput;
type Forbidden = Extract<InputKey, `${string}${"name" | "Name" | "discord" | "Discord" | "user" | "member" | "project" | "registration"}${string}`>;
type StringKeys = { [K in InputKey]: ElementalPlotInput[K] extends string ? (string extends ElementalPlotInput[K] ? K : never) : never }[InputKey];
const noForbiddenKeys: [Forbidden] extends [never] ? true : false = true;
const noFreeTextKeys: [StringKeys] extends [never] ? true : false = true;
const exactKeys: [InputKey] extends ["slot" | "element" | "counted" | "lit" | "badges"]
  ? ["slot" | "element" | "counted" | "lit" | "badges"] extends [InputKey]
    ? true
    : false
  : false = true;

describe("scene", () => {
  const row = (slot: number, element: SectorElement, counted = 0, lit = false, badges = 0): ElementalPlotInput => ({ slot, element, counted, lit, badges });

  it("has an input type with only slot, element, counted, lit and badges", () => {
    expect([noForbiddenKeys, noFreeTextKeys, exactKeys]).toEqual([true, true, true]);
    // @ts-expect-error a name is not part of the input
    const named: ElementalPlotInput = { slot: 1, element: "fire", counted: 0, lit: false, badges: 0, project_name: "x" };
    // @ts-expect-error a Discord id is not part of the input
    const discord: ElementalPlotInput = { slot: 1, element: "fire", counted: 0, lit: false, badges: 0, discord_user_id: "1" };
    expect([named.slot, discord.slot]).toEqual([1, 1]);
  });

  it("copies only known fields, so extra row fields never reach the scene", () => {
    const wide = { ...row(3, "water", 2, true, 1), project_name: "placeholder project", discord_channel_id: "0" };
    const text = JSON.stringify(buildElementalScene([wide]));
    expect(text).not.toMatch(/placeholder|discord|project|name/i);
  });

  it("maps rows to a fixed-size scene in slot order", () => {
    const scene = buildElementalScene([row(40, "fire", 9, true, 7), row(3, "water", 2), row(200, "aether", 0, false, 1)]);
    expect([scene.v, scene.slots, scene.cols, scene.rows]).toEqual([1, 200, 100, 56]);
    expect(scene.plots.map((p) => p.slot)).toEqual([3, 40, 200]);
    const fire = scene.plots[1];
    expect(fire).toEqual({ slot: 40, element: "fire", sector: sectorOf(40), stage: 7, counted: 9, lit: true, badges: MAX_BADGE_PIPS });
    expect(scene.plots[0].stage).toBe(2);
    expect(scene.teams).toEqual({ water: 1, earth: 0, air: 0, fire: 1, aether: 1 });
  });

  it("is the same size with no teams", () => {
    const scene = buildElementalScene([]);
    expect([scene.cols, scene.rows, scene.plots]).toEqual([100, 56, []]);
  });

  it("refuses bad rows with a slot-only detail", () => {
    const expectCode = (rows: ElementalPlotInput[], code: string) => {
      try {
        buildElementalScene(rows);
        throw new Error("no error");
      } catch (error) {
        expect(error).toBeInstanceOf(ElementalSceneError);
        expect((error as ElementalSceneError).code).toBe(code);
      }
    };
    expectCode([row(0, "fire")], "bad_slot");
    expectCode([row(201, "fire")], "bad_slot");
    expectCode([row(1.5, "fire")], "bad_slot");
    expectCode([row(5, "fire"), row(5, "air")], "duplicate_slot");
    expectCode([row(5, "plasma" as SectorElement)], "bad_element");
    expectCode([row(5, "fire", -1)], "bad_count");
    expectCode([row(5, "fire", 0, false, Number.NaN)], "bad_count");
  });
});
