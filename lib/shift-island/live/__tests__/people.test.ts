/**
 * @jest-environment node
 */
import { MOTION_SPRITES } from "@/bot/assets/island/motion-sprites";
import { PALETTE, SPRITES } from "@/bot/assets/island/sprites";
import { campfireActors } from "@/bot/src/quests/island/firepit";
import { buildScene, type IslandPlot } from "@/bot/src/quests/island/scene";
import { storyPanels } from "@/components/shift/island/story/scenes";

import { allSprites } from "../atlas";
import { webSprites } from "../atmosphere";
import { TICK_MS, actorFrame, stillFrame } from "../clock";
import { treeFigures } from "../figures";
import { plazaWorld } from "../plaza";
import { BREATH_TICKS, idlePattern, livelyActors, partnerRects, partnerSprite, peopleSprites } from "../people";
import type { LiveActor } from "../types";

const plot = (slot: number, extra: Partial<IslandPlot> = {}): IslandPlot => ({
  slot,
  stage: (slot % 7) + 1,
  visitor: true,
  key: false,
  helper: false,
  lantern: false,
  name: null,
  mine: slot === 2,
  ...extra,
});
const scene = buildScene(Array.from({ length: 10 }, (_, i) => plot(i + 1)), { markMine: true, festival: true });

/** The sprite an idle frame was made from: its name without _blink or _rest. */
const sourceOf = (name: string) => name.replace(/_(blink|rest)$/, "");
const rowsOf = (name: string) => (MOTION_SPRITES as Record<string, string[]>)[name] ?? SPRITES[name];

/** Every plaza actor at its busiest (a full campfire, today's visitors) and the story's people. */
function everyone(): LiveActor[] {
  const plaza = plazaWorld(scene, {
    festival: null,
    pins: ["active"],
    campfire: { count: 8 },
    prizes: true,
    visitors: { count: 12, team: 2, me: true, shirt: "l" },
  });
  return [...plaza.actors, ...storyPanels().flatMap((p) => p.actors)];
}

describe("the people's idle frames", () => {
  const all = peopleSprites();

  it("makes a blink and a breath for every standing or sitting person, and only a blink for the builder", () => {
    for (const name of ["visitor", "tester_0", "tester_1", ...["a", "b", "c", "d"].flatMap((v) => [`sit_${v}_0`, `sit_${v}_1`])]) {
      expect(all[`${name}_blink`]).toBeDefined();
      expect(all[`${name}_rest`]).toBeDefined();
    }
    // The hammer stays where it is: no breath that would move it.
    expect(all.builder_0_blink).toBeDefined();
    expect(all.builder_0_rest).toBeUndefined();
  });

  it("keeps each frame its sprite's size and the island's palette, in the atlas the web and the engine read", () => {
    const atlas = allSprites();
    const web = webSprites();
    for (const [name, rows] of Object.entries(all)) {
      const source = rowsOf(sourceOf(name));
      expect(rows).toHaveLength(source.length);
      for (const row of rows) {
        expect(row).toHaveLength(source[0].length);
        for (const ch of row) if (ch !== ".") expect(PALETTE[ch]).toBeDefined();
      }
      expect(atlas[name]).toBe(rows);
      expect(web[name]).toBe(rows);
    }
  });

  it("closes the eye and changes nothing else: one outline pixel turned to skin", () => {
    for (const [name, rows] of Object.entries(all)) {
      if (!name.endsWith("_blink")) continue;
      const source = rowsOf(sourceOf(name));
      const changed: string[] = [];
      rows.forEach((row, y) => [...row].forEach((ch, x) => ch !== source[y][x] && changed.push(`${source[y][x]}>${ch}`)));
      expect([name, changed]).toEqual([name, ["o>k"]]);
    }
  });

  it("settles the head and shoulders one pixel and leaves the feet where they stand", () => {
    for (const [name, rows] of Object.entries(all)) {
      if (!name.endsWith("_rest")) continue;
      const source = rowsOf(sourceOf(name));
      expect(rows[0]).toBe(".".repeat(source[0].length));
      // The head is the source's, a row lower.
      expect(rows.slice(1, 4)).toEqual(source.slice(0, 3));
      // The legs and feet do not move.
      expect(rows.slice(-3)).toEqual(source.slice(-3));
    }
  });
});

describe("breathing and blinking over a loop", () => {
  const LOOPS = [56, 72, 86, 88, 108, 112, 234, 240];

  it("starts plain, breathes in whole breaths that fill the loop, and blinks only while the head is up", () => {
    for (const n of LOOPS) {
      for (const seed of [0, 1, 7, 40, 233]) {
        const p = idlePattern(n, seed);
        expect(p).toHaveLength(n);
        expect(p[0]).toBe("");
        // The settled runs, round the loop: one per breath, each a breath apart.
        const starts = p.map((v, i) => (v === "rest" && p[(i - 1 + n) % n] !== "rest" ? i : -1)).filter((i) => i >= 0);
        expect(starts).toHaveLength(Math.round(n / BREATH_TICKS));
        starts.forEach((s, k) => {
          const gap = (starts[(k + 1) % starts.length] - s + n) % n || n;
          expect(gap).toBeGreaterThanOrEqual(BREATH_TICKS - 4);
          expect(gap).toBeLessThanOrEqual(BREATH_TICKS + 6);
          let run = 0;
          while (p[(s + run) % n] === "rest") run++;
          // About a third of the breath, never a twitch.
          expect(run).toBeGreaterThanOrEqual(8);
          expect(run).toBeLessThanOrEqual(9);
        });
        p.forEach((v, i) => {
          if (v !== "blink") return;
          expect(p[(i + 1) % n]).toBe("");
          expect(p[(i - 1 + n) % n]).toBe("");
        });
        expect(p.filter((v) => v === "blink").length).toBeLessThanOrEqual(starts.length);
      }
    }
  });

  it("is the same every time, and out of step from one person to the next", () => {
    expect(idlePattern(112, 9)).toEqual(idlePattern(112, 9));
    const seeds = [1, 2, 3, 4, 5, 6, 7, 8];
    const firstRest = new Set(seeds.map((seed) => idlePattern(112, seed).indexOf("rest")));
    expect(firstRest.size).toBeGreaterThan(4);
  });
});

describe("the actors as the web draws them", () => {
  it("leaves the bot's campfire as it is: the GIF never asks for idle frames", () => {
    const actors = campfireActors(scene, { count: 8 });
    for (const a of actors) for (const f of a.frames) expect(f).not.toMatch(/_(blink|rest)$/);
  });

  it("gives every sitter, builder and tester an idle loop: index for index, the first frame plain, every frame its own sprite's box", () => {
    const actors = everyone();
    const lively = livelyActors(actors);
    expect(lively).toHaveLength(actors.length);
    const web = webSprites();
    let idled = 0;
    lively.forEach((a, i) => {
      const was = actors[i];
      if (!/^(sit_|builder_|tester_)/.test(was.frames[0])) {
        // Props, the flame, the board, the crowd (whose scripts idle already): untouched, the same object.
        expect(a).toBe(was);
        return;
      }
      idled++;
      expect(a.frameMs).toBe(TICK_MS);
      expect(a.frames.length).toBeLessThan(256);
      expect(a.x).toBe(was.x);
      expect(a.y).toBe(was.y);
      expect(a.flip).toBe(was.flip);
      expect(a.steps).toBeUndefined();
      // The still island shows the same frame as before.
      expect(a.frames[stillFrame(a)]).toBe(was.frames[stillFrame(was)]);
      // Its own frames in its own order, at its own pace to the tick, each the size of the one it stands for.
      const per = Math.round((was.frameMs ?? 500) / TICK_MS);
      a.frames.forEach((name, n) => {
        const own = was.frames[Math.floor(n / per) % was.frames.length];
        expect(sourceOf(name)).toBe(own);
        expect(web[name]).toBeDefined();
        expect([web[name].length, web[name][0].length]).toEqual([web[own].length, web[own][0].length]);
      });
      // It does breathe or blink.
      expect(a.frames.some((name) => name !== sourceOf(name))).toBe(true);
    });
    expect(idled).toBeGreaterThanOrEqual(8 + 3);
  });

  it("keeps an arrival and anything with steps as given", () => {
    const once: LiveActor = { frames: ["sit_a_0", "sit_a_1"], x: 1, y: 2, once: true };
    const walker: LiveActor = { frames: ["tester_0", "tester_1"], x: 1, y: 2, steps: [{ dx: 0, dy: 0 }, { dx: 1, dy: 0 }] };
    const [a, b] = livelyActors([once, walker]);
    expect(a).toBe(once);
    expect(b).toBe(walker);
  });

  it("plays the loop round without a jump: frame by tick, the last frame running into the first", () => {
    const [sitter] = livelyActors([{ frames: ["sit_b_1", "sit_b_0"], x: 10, y: 10, frameMs: 1100 }]);
    const n = sitter.frames.length;
    expect(n % 18).toBe(0);
    expect(actorFrame(n - 1, sitter)).toBe(n - 1);
    expect(actorFrame(n, sitter)).toBe(0);
  });
});

describe("a tree's partner", () => {
  it("breathes and blinks on a clock that runs on without a seam, out of step with the other partners", () => {
    const loop = 4 * BREATH_TICKS;
    const seen = new Set<string>();
    for (let t = 0; t < 3 * loop; t++) {
      const name = partnerSprite(t, 3);
      seen.add(name);
      expect(partnerSprite(t + loop, 3)).toBe(name);
    }
    expect([...seen].sort()).toEqual(["visitor", "visitor_blink", "visitor_rest"]);
    const phases = new Set([1, 2, 3, 4, 5, 6].map((slot) => Array.from({ length: loop }, (_, t) => partnerSprite(t, slot)).join()));
    expect(phases.size).toBe(6);
  });

  it("repaints just the partners that changed, over the very box a tap on them hits", () => {
    const figures = treeFigures(scene);
    const boxes = new Map(figures.map((f) => [f.n, f.box]));
    let changes = 0;
    for (let t = 0; t < 200; t++) {
      const rects = partnerRects(t, t + 1, scene.trees);
      const changed = scene.trees.filter((tree) => tree.visitor && partnerSprite(t, tree.slot) !== partnerSprite(t + 1, tree.slot));
      expect(rects).toEqual(changed.map((tree) => boxes.get(tree.slot)));
      changes += rects.length;
    }
    expect(changes).toBeGreaterThan(0);
    // Trees without a partner never repaint for one.
    const bare = buildScene([plot(1, { visitor: false })], { markMine: false });
    for (let t = 0; t < 120; t++) expect(partnerRects(t, t + 1, bare.trees)).toEqual([]);
  });
});
