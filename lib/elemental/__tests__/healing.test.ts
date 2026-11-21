/**
 * @jest-environment node
 */
import { createHash } from "node:crypto";

import { PNG } from "pngjs";

import { BARE_BRANCHES, BARE_PALETTE, SICK_COLOURS } from "../../../bot/assets/elemental/sick-sprites";
import { PALETTE } from "../../../bot/assets/island/sprites";
import {
  NO_SECTOR,
  fullHealth,
  healthFor,
  healthSectorMask,
  paintHealth,
  type ElementHealth,
  type HealthSettings,
  type HealthTotals,
  type HealthTree,
} from "../island/healing";
import { ORIENTATIONS, elementalLayout, type Orientation } from "../island/layout";
import { renderIsland, renderIslandPixels, type ElementalPixels } from "../island/render";
import { buildElementalScene, type ElementalPlotInput, type ElementalScene } from "../island/scene";
import { SECTOR_ORDER, candidateSlots, type SectorElement } from "../island/sectors";
import { Surface, bitmap, hexRgba, pack } from "../island/surface";

/** E10's pinned hashes of the same 30-team fixture (render.test.ts): full health must keep matching them. */
const HEALTHY: Record<Orientation, string> = {
  landscape: "b3c80c8d1122b3fc95fcb8c5360dc14358cd05d2488c85908b296996f25f0a0c",
  portrait: "3a5df3be658567ba38a6afdf1531a69532ed4c22ca22e9a84c453dc4c906ed12",
};

/**
 * sha256 of the decoded RGB pixels at step 0 (every sector sick) and mid-way
 * (MID). Update only with a healing art change you meant (and look at the PNG).
 */
const STEP0: Record<Orientation, string> = {
  landscape: "962aa798f93117c7e4d2f4cbbd644f31fd41121c0be4a85393effcb2756d181f",
  portrait: "868cf80f962bfc4f25630d2a41d81f8c7e4b718ac84a4930312a715952d9b400",
};
const MID_PINNED: Record<Orientation, string> = {
  landscape: "f1252c6ea037ab1f9e16c36cb3ecec3ff0b69ba824d2d862a8015b6356c81cc6",
  portrait: "ef06e06376b479c1cab8b59b3f3b17ab3adf9110ed3a6bc523d0a16db04e5494",
};

const SICK: ElementHealth = { water: 0, earth: 0, air: 0, fire: 0, aether: 0 };
/** Every sector at a different step of 5. */
const MID: ElementHealth = { water: 0, earth: 0.2, air: 0.4, fire: 0.6, aether: 0.8 };

const sha = (b: Buffer | Uint8Array) => createHash("sha256").update(b).digest("hex");

function pixelHash(png: Buffer): string {
  const img = PNG.sync.read(png);
  const rgb = Buffer.alloc(img.width * img.height * 3);
  for (let i = 0, o = 0; i < img.data.length; i += 4) {
    rgb[o++] = img.data[i];
    rgb[o++] = img.data[i + 1];
    rgb[o++] = img.data[i + 2];
  }
  return sha(rgb);
}

/** The same 30-team fixture as render.test.ts. */
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

/** 175 teams, 60 of them Fire, every piece drawn (as render.test.ts's crowd). */
function crowd(): ElementalScene {
  const taken: number[] = [];
  const others = SECTOR_ORDER.filter((e) => e !== "fire");
  const rows: ElementalPlotInput[] = Array.from({ length: 175 }, (_, k) => {
    const element: SectorElement = Math.floor(((k + 1) * 60) / 175) > Math.floor((k * 60) / 175) ? "fire" : others[k % others.length];
    const slot = candidateSlots(element, taken)[0];
    taken.push(slot);
    return { slot, element, counted: 7 + (k % 3), lit: true, badges: 9 };
  });
  return buildElementalScene(rows);
}

function treesOf(drawing: ElementalPixels): HealthTree[] {
  return drawing.plots.map((p) => ({ slot: p.slot, sector: p.sector, stage: p.stage, ...p.tree }));
}

function changed(a: Uint32Array, b: Uint32Array): number[] {
  const out: number[] = [];
  for (let k = 0; k < a.length; k++) if (a[k] !== b[k]) out.push(k);
  return out;
}

/** Saturation (max - min channel) summed over the masked pixels: how much colour a sector shows. */
function colourIn(px: Uint32Array, mask: Uint8Array, sector: number): number {
  let sum = 0;
  for (let k = 0; k < px.length; k++) {
    if (mask[k] !== sector) continue;
    const v = px[k];
    const r = v & 255;
    const g = (v >>> 8) & 255;
    const b = (v >>> 16) & 255;
    sum += Math.max(r, g, b) - Math.min(r, g, b);
  }
  return sum;
}

const ON: HealthSettings = { healing_enabled: true, heal_per_team: 3, heal_steps: 5 };

describe("healthFor", () => {
  it("is min(1, floor(counted / (heal_per_team x teams) x steps) / steps) per element", () => {
    const totals: HealthTotals = {
      water: { counted: 3, teams: 1 }, // 3 of 3: healed
      earth: { counted: 9, teams: 5 }, // 9 of 15: 3 of 5 steps
      air: { counted: 14, teams: 5 }, // 14 of 15: 4 of 5 steps
      fire: { counted: 0, teams: 60 }, // nothing yet
      aether: { counted: 400, teams: 2 }, // far past 6: capped at 1
    };
    expect(healthFor(totals, ON)).toEqual({ water: 1, earth: 0.6, air: 0.8, fire: 0, aether: 1 });
  });

  it("lands exactly on step edges (no float error)", () => {
    // 1 of 3 entries in 3 steps is exactly step 1; 0.1 x 3 x 10 would round below 3 in floats.
    expect(healthFor({ water: { counted: 1, teams: 1 } }, { healing_enabled: true, heal_per_team: 3, heal_steps: 3 }).water).toBe(1 / 3);
    expect(healthFor({ earth: { counted: 3, teams: 10 } }, { healing_enabled: true, heal_per_team: 1, heal_steps: 10 }).earth).toBe(0.3);
    expect(healthFor({ fire: { counted: 7, teams: 7 } }, { healing_enabled: true, heal_per_team: 1, heal_steps: 7 }).fire).toBe(1);
  });

  it("returns all 1 unless healing_enabled is exactly true", () => {
    const totals: HealthTotals = { fire: { counted: 0, teams: 60 } };
    for (const healing_enabled of [false, null, undefined]) {
      expect(healthFor(totals, { ...ON, healing_enabled })).toEqual(fullHealth());
    }
    expect(healthFor({}, {})).toEqual(fullHealth());
    expect(healthFor(totals, { healing_enabled: "true" } as unknown as HealthSettings)).toEqual(fullHealth());
  });

  it("counts a missing element or one with no teams as sick until someone counts for it", () => {
    const h = healthFor({ water: { counted: 2, teams: 0 } }, ON);
    expect(h.earth).toBe(0);
    // No teams heals as one team: 2 of 3 entries, 3 of 5 steps.
    expect(h.water).toBe(0.6);
  });

  it("uses the column defaults (3 per team, 5 steps) and their bounds", () => {
    const totals: HealthTotals = { water: { counted: 2, teams: 1 } };
    expect(healthFor(totals, { healing_enabled: true }).water).toBe(0.6);
    expect(healthFor(totals, { healing_enabled: true, heal_per_team: null, heal_steps: null }).water).toBe(0.6);
    // heal_steps below 1 is 1 step: sick until fully healed.
    expect(healthFor(totals, { healing_enabled: true, heal_steps: 0 }).water).toBe(0);
    // heal_per_team past 50 is 50.
    expect(healthFor({ water: { counted: 50, teams: 1 } }, { healing_enabled: true, heal_per_team: 9999 }).water).toBe(1);
    expect(healthFor(totals, { healing_enabled: true, heal_per_team: Number.NaN, heal_steps: Infinity }).water).toBe(0.6);
  });

  it("reads bad tallies as 0", () => {
    const totals = {
      water: { counted: -5, teams: 1 },
      earth: { counted: Number.NaN, teams: 1 },
      air: { counted: "9", teams: 1 },
      fire: null,
      aether: { counted: 3, teams: -4 },
    } as unknown as HealthTotals;
    expect(healthFor(totals, ON)).toEqual({ water: 0, earth: 0, air: 0, fire: 0, aether: 1 });
  });

  it("accepts a whole settings row (only the healing fields are read)", () => {
    const row = { guild_id: "g", edition: "e", healing_enabled: true, heal_per_team: 3, heal_steps: 5, tester_cap: 9 };
    expect(healthFor({ water: { counted: 3, teams: 1 } }, row).water).toBe(1);
  });

  it("holds the element furthest behind at 0 until every other is healed, when asked", () => {
    const hold: HealthSettings = { ...ON, hold_last_at_zero: true };
    const totals: HealthTotals = {
      water: { counted: 3, teams: 1 },
      earth: { counted: 3, teams: 1 },
      air: { counted: 3, teams: 1 },
      fire: { counted: 2, teams: 1 },
      aether: { counted: 1, teams: 1 },
    };
    expect(healthFor(totals, ON).aether).toBe(0.2);
    expect(healthFor(totals, hold)).toEqual({ water: 1, earth: 1, air: 1, fire: 0.6, aether: 0 });
    // Once every other element is healed, the last one heals by its own count.
    expect(healthFor({ ...totals, fire: { counted: 3, teams: 1 } }, hold).aether).toBe(0.2);
    // A tie goes to the later element in the fixed order.
    expect(healthFor({}, hold)).toEqual({ water: 0, earth: 0, air: 0, fire: 0, aether: 0 });
    expect(healthFor({ ...totals, aether: { counted: 2, teams: 1 } }, hold)).toEqual({ water: 1, earth: 1, air: 1, fire: 0.6, aether: 0 });
    expect(healthFor(totals, { ...hold, hold_last_at_zero: null }).aether).toBe(0.2);
  });
});

describe("paintHealth", () => {
  it.each(ORIENTATIONS)("%s: full health still matches E10's pinned picture", (layout) => {
    expect(pixelHash(renderIsland(fixture(), { layout, health: fullHealth() }).png)).toBe(HEALTHY[layout]);
    expect(pixelHash(renderIsland(fixture(), { layout, health: healthFor({}, { healing_enabled: false }) }).png)).toBe(HEALTHY[layout]);
  });

  it.each(ORIENTATIONS)("%s: step 0 and mid-way are pinned and differ from healthy", (layout) => {
    const step0 = pixelHash(renderIsland(fixture(), { layout, health: SICK }).png);
    const mid = pixelHash(renderIsland(fixture(), { layout, health: MID }).png);
    expect(step0).toBe(STEP0[layout]);
    expect(mid).toBe(MID_PINNED[layout]);
    expect(new Set([step0, mid, HEALTHY[layout]]).size).toBe(3);
    // Deterministic.
    expect(pixelHash(renderIsland(fixture(), { layout, health: MID }).png)).toBe(mid);
  });

  it.each(ORIENTATIONS)("%s: changing one element changes only pixels in its sector mask", (layout) => {
    const scene = fixture();
    const base = renderIslandPixels(scene, { layout, health: MID });
    const mask = healthSectorMask(base.layout, treesOf(base));
    SECTOR_ORDER.forEach((element, k) => {
      for (const value of [0, 0.5, 1]) {
        if (value === MID[element]) continue;
        const other = renderIslandPixels(scene, { layout, health: { ...MID, [element]: value } });
        const diff = changed(base.px, other.px);
        expect(diff.length).toBeGreaterThan(1000);
        expect(diff.filter((i) => mask[i] !== k)).toEqual([]);
      }
    });
    // And from healthy: one sick element touches only its own mask.
    const healthy = renderIslandPixels(scene, { layout });
    const fire = SECTOR_ORDER.indexOf("fire");
    const sickFire = renderIslandPixels(scene, { layout, health: { fire: 0 } });
    expect(changed(healthy.px, sickFire.px).filter((i) => mask[i] !== fire)).toEqual([]);
  });

  it.each(ORIENTATIONS)("%s: each step brings colour back", (layout) => {
    const scene = fixture();
    const drawing = renderIslandPixels(scene, { layout });
    const mask = healthSectorMask(drawing.layout, treesOf(drawing));
    for (const element of SECTOR_ORDER) {
      const k = SECTOR_ORDER.indexOf(element);
      const colour = [0, 0.2, 0.4, 0.6, 0.8, 1].map((h) => colourIn(renderIslandPixels(scene, { layout, health: { [element]: h } }).px, mask, k));
      for (let i = 1; i < colour.length; i++) expect(colour[i]).toBeGreaterThan(colour[i - 1]);
    }
  });

  it.each(ORIENTATIONS)("%s: flags, lanterns, number tags, badge pips and the plaza stay bright at step 0", (layout) => {
    const scene = fixture();
    const healthy = renderIslandPixels(scene, { layout });
    const sick = renderIslandPixels(scene, { layout, health: SICK });
    const W = healthy.width;
    const same = (x: number, y: number) => healthy.px[y * W + x] === sick.px[y * W + x];
    let checked = 0;
    for (const p of healthy.plots) {
      for (const piece of [p.flag, p.lantern, ...p.pips]) {
        if (!piece) continue;
        const b = bitmap(piece.sprite);
        for (let j = 0; j < b.h; j++) for (let i = 0; i < b.w; i++) if (b.px[j * b.w + i] !== 0) expect(same(piece.x + i, piece.y + j) || `${piece.sprite} ${i},${j}`).toBe(true);
        checked++;
      }
      // The tag box is 90% opaque: the ground shows through a little, the digits not at all.
      for (let j = 0; j < p.tag.h; j++) {
        for (let i = 0; i < p.tag.w; i++) {
          const k = (p.tag.y + j) * W + p.tag.x + i;
          for (const shift of [0, 8, 16]) expect(Math.abs(((healthy.px[k] >>> shift) & 255) - ((sick.px[k] >>> shift) & 255))).toBeLessThanOrEqual(12);
        }
      }
    }
    expect(checked).toBeGreaterThan(30);
    const L = elementalLayout(layout);
    const t = L.tile;
    for (let y = L.plaza.y * t; y < (L.plaza.y + L.plaza.h) * t; y++) for (let x = L.plaza.x * t; x < (L.plaza.x + L.plaza.w) * t; x++) expect(same(x, y)).toBe(true);
    const mask = healthSectorMask(L, treesOf(healthy));
    expect(mask[(L.plaza.y * t + 1) * W + L.plaza.x * t + 1]).toBe(NO_SECTOR);
  });

  it("drops every leaf of a sick tree at step 0, leaving bare branches", () => {
    const scene = buildElementalScene([{ slot: 7, element: "water", counted: 7, lit: false, badges: 0 }]);
    const leaves = new Set(
      ["#3B6A48", "#55894F", "#8AB65E"].flatMap((hex) => [hex, SICK_COLOURS[hex]]).map((hex) => pack(hexRgba(hex)!))
    );
    const wood = new Set(Object.values(BARE_PALETTE).map((hex) => pack(hexRgba(hex)!)));
    for (const layout of ORIENTATIONS) {
      const healthy = renderIslandPixels(scene, { layout });
      const sick = renderIslandPixels(scene, { layout, health: SICK });
      const tree = healthy.plots[0].tree;
      expect(tree.sprite).toBe("stage_7");
      const canopy = (px: Uint32Array) => {
        let n = 0;
        for (let j = 0; j < 21; j++) for (let i = 0; i < tree.w; i++) if (leaves.has(px[(tree.y + j) * healthy.width + tree.x + i])) n++;
        return n;
      };
      expect(canopy(healthy.px)).toBeGreaterThan(300);
      expect(canopy(sick.px)).toBe(0);
      // Half-way, fewer branches show than at step 0 (leaves cover the rest), and none when healthy.
      const half = renderIslandPixels(scene, { layout, health: { [sick.plots[0].sector]: 0.5 } }).px;
      const branches = (px: Uint32Array) => {
        let n = 0;
        for (let j = 0; j < 21; j++) for (let i = 0; i < tree.w; i++) if (wood.has(px[(tree.y + j) * healthy.width + tree.x + i])) n++;
        return n;
      };
      expect(branches(healthy.px)).toBe(0);
      expect(branches(half)).toBeGreaterThan(10);
      expect(branches(half)).toBeLessThan(branches(sick.px));
      expect(canopy(half)).toBeLessThan(canopy(healthy.px));
    }
    expect(BARE_BRANCHES).toHaveLength(21);
    expect(BARE_BRANCHES.every((r) => r.length === 32)).toBe(true);
  });

  it("has a sick colour for every colour of SHIFT's island palette", () => {
    const shift = new Set(Object.values(PALETTE).map((hex) => hex.toUpperCase()));
    expect(new Set(Object.keys(SICK_COLOURS))).toEqual(shift);
  });

  it("does nothing when every sector is healthy, or for a sector it does not know", () => {
    const drawing = renderIslandPixels(fixture(), { layout: "landscape" });
    const surface = new Surface(drawing.width, drawing.height);
    surface.px.set(drawing.px);
    paintHealth(surface, { layout: drawing.layout, health: fullHealth(), trees: treesOf(drawing) });
    expect(changed(surface.px, drawing.px)).toEqual([]);
    paintHealth(surface, { layout: drawing.layout, health: { ...fullHealth(), fire: Number.NaN }, trees: treesOf(drawing) });
    expect(changed(surface.px, drawing.px)).toEqual([]);
  });

  it.each(ORIENTATIONS)("%s: paints 175 plots at step 0 in under 300 ms", (layout) => {
    const scene = crowd();
    // Warm the layout and sprite caches, as a running bot has them.
    renderIslandPixels(scene, { layout, health: SICK });
    const drawing = renderIslandPixels(scene, { layout });
    const surface = new Surface(drawing.width, drawing.height);
    surface.px.set(drawing.px);
    const start = performance.now();
    paintHealth(surface, { layout: drawing.layout, health: SICK, trees: treesOf(drawing) });
    expect(performance.now() - start).toBeLessThan(300);

    const whole = performance.now();
    renderIsland(scene, { layout, health: MID });
    expect(performance.now() - whole).toBeLessThan(1500);
  });
});
