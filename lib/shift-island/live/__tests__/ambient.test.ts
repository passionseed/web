/**
 * @jest-environment node
 */
import { buildScene, type IslandPlot } from "@/bot/src/quests/island/scene";

import { BIRD, BUTTERFLY, FLUTTER, bentAt, birdsAt, butterfliesAt, critterDirty, lifePlan, type Critter } from "../ambient";
import { LIFE_SPRITES, webSprites } from "../atmosphere";
import { GUST, gustStart, TICK_MS } from "../clock";
import { sceneModel } from "../draw";
import { overlaps, type Rect } from "../geometry";
import { bentRows, terrainFor } from "../terrain";
import type { LightPhase } from "../types";

const plots = (n: number): IslandPlot[] =>
  Array.from({ length: n }, (_, k) => ({ slot: k + 1, stage: k % 8, visitor: k % 2 === 0, key: k % 3 === 0, helper: k % 5 === 0, lantern: k % 4 === 1, name: null, mine: k === 2 }));

const SIZES = [1, 8, 20, 80];
const PHASES: LightPhase[] = ["dawn", "day", "dusk", "night"];

function island(n: number) {
  const scene = buildScene(plots(n), { markMine: true, festival: true });
  const terrain = terrainFor(sceneModel(scene));
  return { scene, terrain, plan: lifePlan(terrain, scene), span: { x: 0, w: scene.width } };
}

const grown = (r: Rect, d: number): Rect => ({ x: r.x - d, y: r.y - d, w: r.w + 2 * d, h: r.h + 2 * d });
const inside = (a: Rect, b: Rect) => a.x >= b.x && a.y >= b.y && a.x + a.w <= b.x + b.w && a.y + a.h <= b.y + b.h;
const resting = (c: Critter) => c.name === "bird_stand" || c.name === "bird_peck";

/** Ticks enough for every bird to make a few visits and every butterfly a few rounds. */
const TICKS = 3 * 960;

describe("the island's small life", () => {
  it.each(SIZES)("lands birds only by a tuft or a flower patch, inside the room the terrain keeps round it (%i plots)", (n) => {
    const { terrain, plan, span } = island(n);
    const rooms = terrain.sway.map((p) => grown(p.rect, 2));
    let rests = 0;
    for (let tick = 0; tick < TICKS; tick++) {
      for (const bird of birdsAt(tick, plan, span, "day")) {
        if (!bird || !resting(bird)) continue;
        rests++;
        const box = { x: bird.x, y: bird.y, w: BIRD.w, h: BIRD.h };
        // A hop lifts it a pixel off the ground, so the top may reach one row higher.
        expect(rooms.some((room) => inside(box, grown(room, 0)) || inside({ ...box, y: box.y + 1 }, room))).toBe(true);
      }
    }
    expect(rests).toBeGreaterThan(0);
  });

  it.each(SIZES)("settles butterflies on a bloom's heart (%i plots)", (n) => {
    const { terrain, plan } = island(n);
    const hearts = terrain.sway.flatMap((p) => p.hearts);
    expect(plan.butterflies.length).toBeGreaterThan(0);
    for (const b of plan.butterflies) {
      expect(hearts).toContainEqual(b.home);
      if (b.away) expect(hearts).toContainEqual(b.away);
    }
    // At rest, the body (the sprite's middle column) sits over the heart.
    const u = (FLUTTER.cycle - plan.butterflies[0].offset) % FLUTTER.cycle;
    const [first] = butterfliesAt(u, plan, "day");
    expect({ x: first.x + 2, y: first.y + 1 }).toEqual(plan.butterflies[0].home);
  });

  it.each(SIZES)("keeps to a few of each, and moves slowly (%i plots)", (n) => {
    const { plan, span } = island(n);
    expect(plan.birds).toBeLessThanOrEqual(3);
    expect(plan.butterflies.length).toBeLessThanOrEqual(3);
    let prevBirds = birdsAt(0, plan, span, "day");
    let prevFlies = butterfliesAt(0, plan, "day");
    let most = 0;
    for (let tick = 1; tick < TICKS; tick++) {
      const birds = birdsAt(tick, plan, span, "day");
      const flies = butterfliesAt(tick, plan, "day");
      expect(birds.filter(Boolean).length).toBeLessThanOrEqual(3);
      most = Math.max(most, birds.filter(Boolean).length);
      for (const [a, b] of [...birds.map((c, i) => [prevBirds[i], c]), ...flies.map((c, i) => [prevFlies[i], c])]) {
        if (!a || !b) continue;
        expect(Math.abs(b.x - a.x)).toBeLessThanOrEqual(5);
        expect(Math.abs(b.y - a.y)).toBeLessThanOrEqual(5);
      }
      prevBirds = birds;
      prevFlies = flies;
    }
    // Most of the time a bird or two, now and then none: never a flock.
    expect(most).toBeGreaterThanOrEqual(1);
  });

  it("arrives and leaves out of sight, past the edge of the span", () => {
    const { plan, span } = island(8);
    let away = 0;
    for (let tick = 1; tick < TICKS; tick++) {
      const [before] = birdsAt(tick - 1, plan, span, "day");
      const [now] = birdsAt(tick, plan, span, "day");
      if (Boolean(before) === Boolean(now)) continue;
      away++;
      const seen = (now ?? before)!;
      expect(seen.x + BIRD.w <= span.x || seen.x >= span.x + span.w).toBe(true);
    }
    expect(away).toBeGreaterThan(0);
  });

  it("is a pure function of the tick", () => {
    const a = island(14);
    const b = island(14);
    for (const tick of [0, 7, 333, 1234, 5000]) {
      expect(birdsAt(tick, a.plan, a.span, "day")).toEqual(birdsAt(tick, b.plan, b.span, "day"));
      expect(butterfliesAt(tick, a.plan, "day")).toEqual(butterfliesAt(tick, b.plan, "day"));
      expect(bentAt(tick, a.plan, "day")).toEqual(bentAt(tick, b.plan, "day"));
    }
  });

  it("brings birds at dawn, by day and at dusk, butterflies only by day, and nothing at night (no fireflies)", () => {
    const { plan, span } = island(14);
    const any = (phase: LightPhase, at: (tick: number) => readonly (Critter | null)[]) => {
      for (let tick = 0; tick < TICKS; tick += 4) if (at(tick).some(Boolean)) return true;
      return false;
    };
    for (const phase of PHASES) {
      expect(any(phase, (t) => birdsAt(t, plan, span, phase))).toBe(phase !== "night");
      expect(any(phase, (t) => butterfliesAt(t, plan, phase))).toBe(phase === "day");
    }
    expect(Object.keys(LIFE_SPRITES).some((name) => /firefl/.test(name))).toBe(false);
  });

  it("draws from the web's sprite set, in palette keys the hour grades", () => {
    const { plan, span } = island(14);
    const sprites = webSprites();
    const names = new Set<string>();
    for (let tick = 0; tick < TICKS; tick += 3) {
      for (const c of [...birdsAt(tick, plan, span, "day"), ...butterfliesAt(tick, plan, "day")]) if (c) names.add(c.name);
    }
    for (const name of names) {
      const rows = sprites[name];
      expect(rows).toBeDefined();
      const size = name.startsWith("bird") ? BIRD : BUTTERFLY;
      expect(rows.length).toBe(size.h);
      for (const row of rows) expect(row).toHaveLength(size.w);
    }
    expect([...names].some((n) => n.startsWith("bird_fly"))).toBe(true);
    expect([...names].some((n) => n === "bird_peck")).toBe(true);
  });

  it("repaints only where a critter moved, came or went", () => {
    const a: (Critter | null)[] = [{ name: "bird_stand", x: 10, y: 10, flip: false, shadow: { x: 11, y: 13, w: 5, h: 2 } }, null];
    const same: (Critter | null)[] = [{ ...a[0]!, shadow: { ...a[0]!.shadow! } }, null];
    const out: Rect[] = [];
    critterDirty(a, same, BIRD, out);
    expect(out).toEqual([]);
    critterDirty(a, [{ ...a[0]!, x: 11, shadow: { x: 12, y: 13, w: 5, h: 2 } }, { name: "bird_fly_0", x: 40, y: 2, flip: false, shadow: null }], BIRD, out);
    expect(out).toEqual([
      { x: 10, y: 10, w: 8, h: 5 },
      { x: 40, y: 2, w: 7, h: 5 },
    ]);
    // High over its shadow: the bird and its shadow repaint apart, not the sky between.
    const high = (x: number): Critter => ({ name: "bird_fly_0", x, y: 0, flip: false, shadow: { x: x + 1, y: 33, w: 5, h: 2 } });
    out.length = 0;
    critterDirty([high(50)], [high(53)], BIRD, out);
    expect(out).toEqual([
      { x: 50, y: 0, w: 10, h: 5 },
      { x: 51, y: 33, w: 8, h: 2 },
    ]);
  });
});

describe("the breeze in the grass", () => {
  it("bends tufts and flowers in a wave as each gust crosses, with the trees, and never at night", () => {
    const { plan, scene } = island(20);
    expect(plan.sway.length).toBeGreaterThan(10);
    // Before the first gust nothing leans; inside it the pieces lean in order of where they stand.
    expect(bentAt(0, plan, "day")).toEqual([]);
    const start = Math.ceil(gustStart(0) / TICK_MS);
    const firstBent = new Map<number, number>();
    for (let tick = start; tick < start + Math.ceil((GUST.spread + GUST.flip) / TICK_MS) + 1; tick++) {
      for (const i of bentAt(tick, plan, "day")) if (!firstBent.has(i)) firstBent.set(i, tick);
      expect(bentAt(tick, plan, "night")).toEqual([]);
    }
    expect(firstBent.size).toBe(plan.sway.length);
    const order = [...firstBent].sort((a, b) => plan.sway[a[0]].rect.x - plan.sway[b[0]].rect.x).map(([, tick]) => tick);
    expect(order).toEqual([...order].sort((a, b) => a - b));
    // Upright again once the gust has passed every piece.
    const after = Math.ceil((gustStart(0) + GUST.length + GUST.spread) / TICK_MS) + 1;
    expect(bentAt(after, plan, "day")).toEqual([]);
    expect(scene.width).toBeGreaterThan(0);
  });

  it("leans a tuft's tips and a patch's blooms one px downwind, stems in place", () => {
    expect(bentRows("tuft", ["U.U.U", "T.T.T", ".TTT."])).toEqual([".U.U.U", "T.T.T.", ".TTT.."]);
    expect(bentRows("tuft", [".U.", "UTU", ".T."])).toEqual(["..U.", "UTU.", ".T.."]);
    expect(bentRows("flowers", [".p...", "pyp.p", ".p..T", "UT..."])).toEqual(["..p...", ".pyp.p", "..p.T.", "UT...."]);
  });

  it.each(SIZES)("keeps each bent frame on the ground it lies on (%i plots)", (n) => {
    const { terrain } = island(n);
    const W = terrain.width;
    expect(terrain.sway.length).toBeGreaterThan(0);
    for (const p of terrain.sway) {
      expect(p.box).toEqual({ x: p.rect.x, y: p.rect.y, w: p.rect.w + 1, h: p.rect.h });
      expect(p.bent).toHaveLength(p.box.w * p.box.h);
      // The column it leans into is ground no other piece takes: there the bent frame is a tip or the ground itself.
      const tips = new Set((p.kind === "tuft" ? ["U"] : ["p", "f", "y", "r", "V"]).map((ch) => ch.charCodeAt(0)));
      for (let j = 0; j < p.box.h; j++) {
        const x = p.box.x + p.box.w - 1;
        const v = p.bent[j * p.box.w + p.box.w - 1];
        expect(v === terrain.ground[(p.box.y + j) * W + x] || tips.has(v)).toBe(true);
      }
      expect(p.hearts.length > 0).toBe(p.kind === "flowers");
      for (const h of p.hearts) expect(overlaps({ ...h, w: 1, h: 1 }, p.rect)).toBe(true);
    }
  });
});
