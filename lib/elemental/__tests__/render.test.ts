/**
 * @jest-environment node
 */
import { createHash } from "node:crypto";

import { PNG } from "pngjs";

import { ELEMENTAL_PALETTE, ELEMENTAL_SPRITES, FLAG_ELEMENTS } from "../../../bot/assets/elemental/sprites";
import { PALETTE, SPRITES } from "../../../bot/assets/island/sprites";
import { DIGITS, RenderError, tagRect } from "../../../bot/src/quests/island/scene";
import { fullHealth, healthFor, type HealthPaint, type HealthSettings, type HealthTotals } from "../island/healing";
import { ORIENTATIONS, elementalLayout, plazaCentrePx, treeBase, type Orientation } from "../island/layout";
import { plotBoxes, type ElementalPlotBox } from "../island/overlays";
import { TAG_GLYPH, digitsSize } from "../island/pixelFont";
import { normalizeHealth, renderIsland, renderIslandPixels, type ElementalRenderOptions } from "../island/render";
import { ElementalSceneError, buildElementalScene, type ElementalPlotInput, type ElementalScene } from "../island/scene";
import { SECTOR_ORDER, candidateSlots, type SectorElement } from "../island/sectors";
import { bitmap, hexRgba } from "../island/surface";

/**
 * sha256 of the decoded RGB pixels of renderIsland(fixture(), { layout }).
 * Update only with a sprite or layout change you meant (and look at the PNG).
 */
const PINNED: Record<Orientation, string> = {
  landscape: "b3c80c8d1122b3fc95fcb8c5360dc14358cd05d2488c85908b296996f25f0a0c",
  portrait: "3a5df3be658567ba38a6afdf1531a69532ed4c22ca22e9a84c453dc4c906ed12",
};

const sha = (b: Buffer | Uint8Array) => createHash("sha256").update(b).digest("hex");

function decode(png: Buffer): PNG {
  return PNG.sync.read(png);
}

/** sha256 of the RGB bytes (alpha is always opaque in the encoded PNG). */
function pixelHash(png: Buffer): string {
  const img = decode(png);
  const rgb = Buffer.alloc(img.width * img.height * 3);
  for (let i = 0, o = 0; i < img.data.length; i += 4) {
    rgb[o++] = img.data[i];
    rgb[o++] = img.data[i + 1];
    rgb[o++] = img.data[i + 2];
  }
  return sha(rgb);
}

function pixelAt(img: PNG, x: number, y: number): [number, number, number] {
  const i = (y * img.width + x) * 4;
  return [img.data[i], img.data[i + 1], img.data[i + 2]];
}

/** A mixed island: every element, every stage, lanterns and 0..5 badges, slots as SQL would give them. */
function fixture(): ElementalScene {
  const taken: number[] = [];
  const rows: ElementalPlotInput[] = Array.from({ length: 30 }, (_, k) => {
    const element = SECTOR_ORDER[(k * 3) % 5];
    const slot = candidateSlots(element, taken)[0];
    taken.push(slot);
    return { slot, element, counted: k % 10, lit: k % 3 === 0, badges: k % 7 };
  });
  return buildElementalScene(rows);
}

/** 175 teams, 60 of them Fire, slotted by candidateSlots in join order; every piece drawn (lit, 5 badges, stage 7). */
function crowd(): ElementalScene {
  const taken: number[] = [];
  const others = SECTOR_ORDER.filter((e) => e !== "fire");
  const rows: ElementalPlotInput[] = Array.from({ length: 175 }, (_, k) => {
    // Exactly 60 Fire teams, spread through the join order.
    const element: SectorElement = Math.floor(((k + 1) * 60) / 175) > Math.floor((k * 60) / 175) ? "fire" : others[k % others.length];
    return { element, k };
  }).map(({ element, k }) => {
    const slot = candidateSlots(element, taken)[0];
    taken.push(slot);
    return { slot, element, counted: 7 + (k % 3), lit: true, badges: 9 };
  });
  return buildElementalScene(rows);
}

function overlaps(a: ElementalPlotBox, b: ElementalPlotBox): boolean {
  return a.left < b.left + b.width && b.left < a.left + a.width && a.top < b.top + b.height && b.top < a.top + a.height;
}

describe("renderIsland", () => {
  it.each(ORIENTATIONS)("%s: the same scene gives the same PNG, pinned", (layout) => {
    const a = renderIsland(fixture(), { layout });
    const b = renderIsland(fixture(), { layout });
    expect(sha(a.png)).toBe(sha(b.png));
    const L = elementalLayout(layout);
    expect([a.width, a.height, a.scale, a.orientation]).toEqual([L.width, L.height, 1, layout]);
    const img = decode(a.png);
    expect([img.width, img.height]).toEqual([L.width, L.height]);
    expect(pixelHash(a.png)).toBe(PINNED[layout]);
  });

  it("draws the two layouts at 1600 x 896 and 896 x 1600", () => {
    const scene = fixture();
    const wide = renderIsland(scene, { layout: "landscape" });
    const tall = renderIsland(scene, { layout: "portrait" });
    expect([wide.width, wide.height]).toEqual([1600, 896]);
    expect([tall.width, tall.height]).toEqual([896, 1600]);
  });

  it.each(ORIENTATIONS)("%s: 175 teams with 60 in Fire draw with no overlapping plot boxes, inside the picture, in under 1.5 s", (layout) => {
    const scene = crowd();
    expect(scene.plots).toHaveLength(175);
    expect(scene.teams.fire).toBe(60);
    expect(Math.max(...scene.plots.map((p) => p.slot))).toBeLessThanOrEqual(200);

    const boxes = plotBoxes(scene, layout);
    expect(boxes).toHaveLength(175);
    const L = elementalLayout(layout);
    const clashes: string[] = [];
    for (let i = 0; i < boxes.length; i++) {
      const b = boxes[i];
      expect(b.left >= 0 && b.top >= 0 && b.left + b.width <= L.width && b.top + b.height <= L.height).toBe(true);
      for (let j = i + 1; j < boxes.length; j++) if (overlaps(b, boxes[j])) clashes.push(`${b.slot}/${boxes[j].slot}`);
    }
    expect(clashes).toEqual([]);

    const start = performance.now();
    const out = renderIsland(scene, { layout });
    expect(performance.now() - start).toBeLessThan(1500);
    expect(decode(out.png).width).toBe(L.width);
  });

  it("keeps all 200 slots apart in both layouts, every piece drawn", () => {
    const rows: ElementalPlotInput[] = Array.from({ length: 200 }, (_, k) => ({
      slot: k + 1,
      element: SECTOR_ORDER[k % 5],
      counted: 7,
      lit: true,
      badges: 5,
    }));
    const scene = buildElementalScene(rows);
    for (const layout of ORIENTATIONS) {
      const boxes = plotBoxes(scene, layout);
      const clashes: string[] = [];
      for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) if (overlaps(boxes[i], boxes[j])) clashes.push(`${layout} ${boxes[i].slot}/${boxes[j].slot}`);
      expect(clashes).toEqual([]);
    }
  });

  it.each(ORIENTATIONS)("%s: 0 teams draws the island with its plaza and well", (layout) => {
    const out = renderIsland(buildElementalScene([]), { layout });
    const img = decode(out.png);
    const L = elementalLayout(layout);
    // Plaza paving at the plaza's top-left tile.
    const paving = SPRITES.plaza[0][0];
    expect(pixelAt(img, L.plaza.x * L.tile, L.plaza.y * L.tile)).toEqual(hexRgba(PALETTE[paving])!.slice(0, 3));
    // The well, centred on the plaza.
    const centre = plazaCentrePx(L);
    const well = SPRITES.well;
    const wx = Math.round(centre.x - well[0].length / 2);
    const wy = Math.round(centre.y - well.length / 2);
    let checked = 0;
    well.forEach((row, j) =>
      [...row].forEach((ch, i) => {
        if (ch === ".") return;
        expect(pixelAt(img, wx + i, wy + j)).toEqual(hexRgba(PALETTE[ch])!.slice(0, 3));
        checked++;
      })
    );
    expect(checked).toBeGreaterThan(100);
    // No plot drawn: no tag box anywhere.
    expect(renderIslandPixels(buildElementalScene([]), { layout }).plots).toEqual([]);
  });

  it.each(ORIENTATIONS)("%s: health all 1 (or empty, or not numbers) equals the no-health picture", (layout) => {
    const scene = fixture();
    const base = sha(renderIsland(scene, { layout }).png);
    expect(sha(renderIsland(scene, { layout, health: fullHealth() }).png)).toBe(base);
    expect(sha(renderIsland(scene, { layout, health: {} }).png)).toBe(base);
    expect(sha(renderIsland(scene, { layout, health: { fire: Number.NaN } }).png)).toBe(base);
    expect(sha(renderIsland(scene, { layout, health: healthFor({}, {}) }).png)).toBe(base);
  });

  it("calls healing's paint only when an element is below full health, with sectors and trees", () => {
    jest.isolateModules(() => {
      const calls: HealthPaint[] = [];
      jest.doMock("../island/healing", () => ({
        ...jest.requireActual("../island/healing"),
        paintHealth: (_s: unknown, paint: HealthPaint) => calls.push(paint),
      }));
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { renderIslandPixels: render } = require("../island/render") as typeof import("../island/render");
      const scene = fixture();
      render(scene, { layout: "landscape", health: fullHealth() });
      expect(calls).toHaveLength(0);
      render(scene, { layout: "portrait", health: { water: 0.4, aether: -3 } });
      expect(calls).toHaveLength(1);
      expect(calls[0].layout.orientation).toBe("portrait");
      expect(calls[0].health).toEqual({ ...fullHealth(), water: 0.4, aether: 0 });
      expect(calls[0].trees.map((t) => t.slot)).toEqual(scene.plots.map((p) => p.slot));
      expect(calls[0].trees.map((t) => t.sector)).toEqual(scene.plots.map((p) => p.sector));
      jest.dontMock("../island/healing");
    });
  });

  it("draws each plot number tag with 2 x 2 digit pixels on the soil line", () => {
    const scene = buildElementalScene([{ slot: 7, element: "water", counted: 3, lit: false, badges: 0 }]);
    for (const layout of ORIENTATIONS) {
      const img = decode(renderIsland(scene, { layout }).png);
      const { cx, baseY } = treeBase(elementalLayout(layout), 7);
      const tag = tagRect(7, cx, baseY, TAG_GLYPH);
      expect(tag.h).toBe(18);
      const bits = DIGITS[7];
      for (let j = 0; j < 5; j++) {
        for (let i = 0; i < 3; i++) {
          const x = tag.x + (2 + i) * 2;
          const y = tag.y + (2 + j) * 2;
          const ink = bits[j * 3 + i] === "1";
          for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
            const px = pixelAt(img, x + dx, y + dy);
            expect(px.every((v) => v === 255)).toBe(ink);
          }
        }
      }
    }
    expect(digitsSize(200, 2)).toEqual({ w: 22, h: 10 });
  });

  it("draws the team's element flag in its element colour, even outside its own sector", () => {
    // Slot 1's sector, and a team of another element on it (an overflow team).
    const scene = buildElementalScene([{ slot: 1, element: "aether", counted: 0, lit: false, badges: 0 }]);
    const own = scene.plots[0];
    const other = SECTOR_ORDER.find((e) => e !== own.sector)!;
    const flagged = buildElementalScene([{ slot: 1, element: other, counted: 0, lit: false, badges: 0 }]);
    const drawing = renderIslandPixels(flagged, { layout: "landscape" });
    const flag = drawing.plots[0].flag;
    expect(flag.sprite).toBe(`flag_${other}`);
    const img = decode(renderIsland(flagged, { layout: "landscape" }).png);
    const rows = ELEMENTAL_SPRITES[flag.sprite];
    const clothCh = rows[2][3];
    expect(pixelAt(img, flag.x + 3, flag.y + 2)).toEqual(hexRgba(ELEMENTAL_PALETTE[clothCh])!.slice(0, 3));
  });

  it("draws a lantern only when lit and at most 5 badge pips", () => {
    const lit = renderIslandPixels(buildElementalScene([{ slot: 3, element: "fire", counted: 2, lit: true, badges: 12 }]), { layout: "portrait" });
    expect(lit.plots[0].lantern?.sprite).toBe("lantern");
    expect(lit.plots[0].pips).toHaveLength(5);
    const dark = renderIslandPixels(buildElementalScene([{ slot: 3, element: "fire", counted: 2, lit: false, badges: 0 }]), { layout: "portrait" });
    expect(dark.plots[0].lantern).toBeNull();
    expect(dark.plots[0].pips).toHaveLength(0);
  });

  it("grows the tree to stage min(7, counted)", () => {
    const scene = buildElementalScene([
      { slot: 1, element: "water", counted: 0, lit: false, badges: 0 },
      { slot: 2, element: "water", counted: 4, lit: false, badges: 0 },
      { slot: 3, element: "water", counted: 30, lit: false, badges: 0 },
    ]);
    expect(renderIslandPixels(scene, { layout: "landscape" }).plots.map((p) => p.tree.sprite)).toEqual(["stage_0", "stage_4", "stage_7"]);
  });

  it("ignores fields outside the scene: extra strings never reach the picture", () => {
    const scene = fixture();
    const base = sha(renderIsland(scene, { layout: "landscape" }).png);
    const tainted = {
      ...scene,
      name: "Team",
      plots: scene.plots.map((p) => ({ ...p, name: "Someone", discord_user_id: "1", project: "x" })),
    };
    expect(sha(renderIsland(tainted, { layout: "landscape" }).png)).toBe(base);
  });

  it("refuses a bad plot with a code and a slot only", () => {
    const plot = fixture().plots[0];
    const render = (plots: unknown[]) => () => renderIsland({ plots } as unknown as ElementalScene, { layout: "landscape" });
    expect(render([{ ...plot, slot: 0 }])).toThrow(ElementalSceneError);
    expect(render([{ ...plot, slot: 201 }])).toThrow(expect.objectContaining({ code: "bad_slot" }));
    expect(render([plot, plot])).toThrow(expect.objectContaining({ code: "duplicate_slot" }));
    expect(render([{ ...plot, element: "metal" }])).toThrow(expect.objectContaining({ code: "bad_element", detail: `slot ${plot.slot}` }));
    expect(render([null])).toThrow(expect.objectContaining({ code: "bad_slot" }));
    // A string where a slot belongs is never echoed back.
    expect(render([{ ...plot, slot: "Someone" }])).toThrow(expect.objectContaining({ code: "bad_slot", detail: "string" }));
  });

  it("normalizes health to 0..1 per element", () => {
    expect(normalizeHealth(undefined)).toEqual(fullHealth());
    expect(normalizeHealth({ earth: 2, air: -1, fire: 0.5 })).toEqual({ water: 1, earth: 1, air: 0, fire: 0.5, aether: 1 });
  });
});

// E25 filled healthFor; its rule is tested in healing.test.ts. Here: healing off keeps E10's healthy island.
describe("healthFor with healing off", () => {
  it("returns 1 for every element whatever the totals", () => {
    const totals: HealthTotals = { fire: { counted: 0, teams: 60 }, water: { counted: 3, teams: 1 } };
    const settings: HealthSettings = { healing_enabled: false, heal_per_team: 3, heal_steps: 5 };
    expect(healthFor(totals, settings)).toEqual({ water: 1, earth: 1, air: 1, fire: 1, aether: 1 });
    expect(healthFor({}, { healing_enabled: false })).toEqual(fullHealth());
    expect(Object.keys(healthFor({}, {}))).toEqual([...SECTOR_ORDER]);
  });

  it("accepts a whole settings row (only the healing fields are read)", () => {
    const row = { guild_id: "g", edition: "e", healing_enabled: null, heal_per_team: 3, heal_steps: null };
    expect(healthFor({}, row)).toEqual(fullHealth());
  });
});

describe("sprites", () => {
  it("has one flag per element, in the island's element order, all 9 x 16 with known colours", () => {
    expect([...FLAG_ELEMENTS]).toEqual([...SECTOR_ORDER]);
    for (const element of SECTOR_ORDER) {
      const rows = ELEMENTAL_SPRITES[`flag_${element}`];
      expect(rows).toHaveLength(16);
      expect(rows.every((r) => r.length === 9)).toBe(true);
    }
    for (const rows of Object.values(ELEMENTAL_SPRITES)) {
      for (const ch of rows.join("").replace(/\./g, "")) expect(ELEMENTAL_PALETTE[ch]).toMatch(/^#[0-9A-F]{6}$/i);
    }
  });

  it("gives every flag a different cloth colour and a different mark", () => {
    const cloth = SECTOR_ORDER.map((e) => ELEMENTAL_SPRITES[`flag_${e}`][2][3]);
    expect(new Set(cloth.map((c) => ELEMENTAL_PALETTE[c])).size).toBe(5);
    const shapes = SECTOR_ORDER.map((e) => ELEMENTAL_SPRITES[`flag_${e}`].slice(2, 6).map((r) => r.slice(3, 8)).join("|").replace(/[A-Z]/g, (ch) => (ch === ELEMENTAL_SPRITES[`flag_${e}`][2][3] ? "C" : "M")));
    expect(new Set(shapes).size).toBe(5);
  });

  it("fails loudly on a missing sprite, and clamps a stage past 7 to stage_7", () => {
    expect(() => bitmap("flag_metal")).toThrow(RenderError);
    const scene = { plots: [{ slot: 1, element: "water" as const, sector: "water" as const, stage: 99, counted: 99, lit: false, badges: 0 }] };
    expect(renderIslandPixels(scene, { layout: "landscape" }).plots[0].tree.sprite).toBe("stage_7");
  });
});

// ---- Type tests: no input type carries a free-text string. ----

/** true when some field (at any depth) is typed as plain `string` rather than a fixed set of keys. */
type HasFreeString<T> = T extends string
  ? string extends T
    ? true
    : never
  : T extends readonly (infer U)[]
    ? HasFreeString<U>
    : T extends object
      ? { [K in keyof T]-?: HasFreeString<T[K]> }[keyof T]
      : never;
type NoFreeString<T> = [HasFreeString<T>] extends [never] ? true : false;

const typeChecks: {
  scene: NoFreeString<ElementalScene>;
  plotInput: NoFreeString<ElementalPlotInput>;
  options: NoFreeString<ElementalRenderOptions>;
  totals: NoFreeString<HealthTotals>;
  settings: NoFreeString<HealthSettings>;
  control: NoFreeString<{ a: { name: string } }>;
} = { scene: true, plotInput: true, options: true, totals: true, settings: true, control: false };

it("has no free-text string field in any input type (type test)", () => {
  expect(typeChecks).toEqual({ scene: true, plotInput: true, options: true, totals: true, settings: true, control: false });
});
