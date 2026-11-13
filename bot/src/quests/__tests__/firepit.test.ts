/**
 * @jest-environment node
 */
import { actorFrame } from "@/lib/shift-island/live/clock";
import { MAX_SEATS, PLAZA_LAYOUT, plazaCentre } from "@/lib/shift-island/live/plaza";
import type { LiveActor } from "@/lib/shift-island/live/types";

import { islandCampfire } from "../handlers/island";
import { campfireActors } from "../island/firepit";
import { LOOP_TICKS, loopActor, loopMotion, renderIslandGif } from "../island/gif";
import { buildScene, renderIsland, type IslandPlot } from "../island/render";
import { pictureCampfire, type LivePostData } from "../live";

function plots(n: number): IslandPlot[] {
  return Array.from({ length: n }, (_, k) => ({
    slot: k + 1,
    stage: k % 8,
    visitor: k % 8 >= 3,
    key: k % 5 === 0,
    helper: k % 4 === 0,
    lantern: k % 3 === 0,
    name: `โปรเจกต์ ${k + 1}`,
    mine: false,
  }));
}

const sitters = (actors: LiveActor[]) => actors.filter((a) => a.frames[0].startsWith("sit_"));
const named = (actors: LiveActor[], name: string) => actors.filter((a) => a.frames.includes(name));

describe("the campfire's actors", () => {
  const scene = buildScene(plots(12), { festival: true });

  it("draws nothing without a campfire", () => {
    expect(campfireActors(scene, null)).toEqual([]);
    expect(campfireActors(scene, undefined)).toEqual([]);
  });

  it("draws a cold pit and nobody while nobody sits there", () => {
    const actors = campfireActors(scene, { count: 0 });
    expect(actors.map((a) => a.frames)).toEqual([["campfire_pit_cold"]]);
    const c = plazaCentre(scene);
    expect([actors[0].x, actors[0].y]).toEqual([c.x + PLAZA_LAYOUT.pit[0], c.y + PLAZA_LAYOUT.pit[1]]);
  });

  it("lights the pit and seats one figure per person, at most MAX_SEATS", () => {
    for (const count of [1, 3, MAX_SEATS, MAX_SEATS + 5]) {
      const actors = campfireActors(scene, { count });
      expect(named(actors, "campfire_pit")).toHaveLength(1);
      expect(named(actors, "campfire_flame_0")).toHaveLength(1);
      expect([count, sitters(actors).length]).toEqual([count, Math.min(count, MAX_SEATS)]);
    }
  });
});

describe("the campfire in the GIF loop", () => {
  const scene = buildScene(plots(12), { festival: true });
  const raw = campfireActors(scene, { count: MAX_SEATS });

  it("snaps each pace to one that divides the 48 tick loop", () => {
    const flame = loopActor(named(raw, "campfire_flame_0")[0]);
    const sitter = loopActor(sitters(raw)[0]);
    expect(flame.frameMs).toBe(250);
    expect(sitter.frameMs).toBe(1000);
    // A pace that already fits, or a still sprite, is left as it is.
    expect(loopActor(flame)).toEqual(flame);
    const pit = named(raw, "campfire_pit")[0];
    expect(loopActor(pit)).toBe(pit);
  });

  it("meets itself at the seam, every frame as long as the others", () => {
    const actors = raw.map(loopActor);
    const swaying = scene.trees.map(() => true);
    for (const night of [false, true]) {
      expect(loopMotion(LOOP_TICKS, scene, swaying, night, actors)).toEqual(loopMotion(0, scene, swaying, night, actors));
    }
    for (const actor of actors) {
      const frames = Array.from({ length: LOOP_TICKS }, (_, t) => actorFrame(t, actor));
      // Runs of one frame, counted round the loop from a change: all the same length.
      const start = frames.findIndex((f, t) => f !== frames[(t + LOOP_TICKS - 1) % LOOP_TICKS]);
      if (start < 0) continue;
      const runs: number[] = [];
      for (let k = 0, run = 0; k < LOOP_TICKS; k++) {
        const t = (start + k) % LOOP_TICKS;
        run++;
        if (frames[(t + 1) % LOOP_TICKS] !== frames[t]) {
          runs.push(run);
          run = 0;
        }
      }
      expect(new Set(runs).size).toBe(1);
    }
  });

  it("flickers only when lit", () => {
    const none = renderIslandGif(plots(12), { festival: true });
    const unlit = renderIslandGif(plots(12), { festival: true, campfire: { count: 0 } });
    const lit = renderIslandGif(plots(12), { festival: true, campfire: { count: 3 } });
    expect(unlit.frames).toBe(none.frames);
    expect(unlit.gif.equals(none.gif)).toBe(false);
    expect(lit.frames).toBeGreaterThan(unlit.frames);
  });

  it("stays small enough for the live post on a big island with a full campfire", () => {
    for (const phase of ["day", "night"] as const) {
      const out = renderIslandGif(plots(60), { scale: 2, festival: true, phase, campfire: { count: 20 } });
      expect([phase, out.gif.length < 1024 * 1024]).toEqual([phase, true]);
    }
  });
});

describe("the campfire on the still picture", () => {
  const png = (campfire?: { count: number } | null) => renderIsland(plots(12), { scale: 1, festival: true, campfire }).png;

  it("draws the pit with the channel, lit with people, and never more than MAX_SEATS figures", () => {
    expect(png(null).equals(png())).toBe(true);
    expect(png({ count: 0 }).equals(png(null))).toBe(false);
    expect(png({ count: 3 }).equals(png({ count: 0 }))).toBe(false);
    expect(png({ count: 3 }).equals(png({ count: 4 }))).toBe(false);
    expect(png({ count: MAX_SEATS + 1 }).equals(png({ count: MAX_SEATS }))).toBe(true);
  });
});

describe("where the count comes from", () => {
  const live = (over: Partial<LivePostData>): LivePostData => ({
    channel_id: null,
    message_id: null,
    coworking_channel_id: "100000000000000001",
    plots: [],
    goal: null,
    season: null,
    trees: 0,
    approved: null,
    campfire: { live: true, count: 3 },
    ...over,
  });

  it("live post: the pit with a coworking channel, people only while the count is live", () => {
    expect(pictureCampfire(live({}))).toEqual({ count: 3 });
    expect(pictureCampfire(live({ campfire: { live: false, count: 3 } }))).toEqual({ count: 0 });
    expect(pictureCampfire(live({ coworking_channel_id: null }))).toBeNull();
  });

  it("/island: what the running campfire knows, nothing without a channel", () => {
    expect(islandCampfire({})).toBeNull();
    expect(islandCampfire({ campfire: () => ({ channel: null, sitters: 0 }) })).toBeNull();
    expect(islandCampfire({ campfire: () => ({ channel: "100000000000000001", sitters: 0 }) })).toEqual({ count: 0 });
    expect(islandCampfire({ campfire: () => ({ channel: "100000000000000001", sitters: 5 }) })).toEqual({ count: 5 });
  });
});
