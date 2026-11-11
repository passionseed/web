/**
 * @jest-environment node
 */
import { ACTOR_FRAMES, GOAL_BULB_SPOTS, MOTION_SIZES, type MotionSpriteName } from "@/bot/assets/island/motion-sprites";
import { SPRITES } from "@/bot/assets/island/sprites";
import { buildScene, tagRect, type IslandPlot, type IslandScene, type SceneRect } from "@/bot/src/quests/island/scene";
import type { Festival } from "@/lib/shift-island/festival";

import { allSprites } from "../atlas";
import { lampRects, sceneModel } from "../draw";
import { overlaps, union, type Rect } from "../geometry";
import {
  MAX_SEATS,
  NO_PLAZA,
  PLAZA_LAYOUT,
  boothFlagAt,
  plazaCentre,
  plazaWorld,
  type PlazaInput,
  type PlazaLabel,
  type PlazaWorld,
} from "../plaza";
import type { LiveActor } from "../types";

const SIZES = [1, 3, 8, 12, 20, 40, 80, 150];
const GLYPHS = [1, 2, 3];
/** The smallest tap target in native px: 48 CSS px at the usual 2x. */
const TAP = 24;
const FESTIVAL_SPRITES = new Set<string>(["goal_string", "goal_bulb"]);
const FLAGS = new Set<string>(["booth_flag", "star_flag"]);

function plots(n: number, mine: number, shift = 0, decorated = true): IslandPlot[] {
  return Array.from({ length: n }, (_, i) => {
    const slot = i + 1;
    return {
      slot,
      stage: ((slot + shift) % 7) + 1,
      visitor: decorated,
      key: decorated,
      helper: decorated,
      lantern: decorated,
      name: null,
      mine: slot === mine,
    };
  });
}

function festival(over: Partial<Festival> = {}): Festival {
  return {
    demoDay: "2026-11-28",
    daysToDemo: 17,
    stageStep: 3,
    tableBar: 2,
    stageBar: 3,
    lanterns: { total: 8, lit: 8, reached: true, count: 12, target: 12 },
    booths: [],
    ...over,
  };
}

/** Everything at once: every booth, a full board, more people than seats, the prize board. */
function fullInput(scene: IslandScene): PlazaInput {
  const booths = scene.trees.map((t) => ({ slot: t.slot, kind: t.slot % 2 ? ("stage" as const) : ("table" as const) }));
  return { festival: festival({ booths }), pins: ["active", "main", "side"], campfire: { count: 12 }, prizes: true };
}

function actorRect(actor: LiveActor): Rect {
  const [w, h] = MOTION_SIZES[actor.frames[0] as MotionSpriteName];
  return { x: actor.x, y: actor.y, w, h };
}

/** A spot back in native px (it was rounded to 4 decimals of a percent). */
function nativeSpot(scene: IslandScene, spot: { x: number; y: number; w: number; h: number }): Rect {
  const x = (spot.x / 100) * scene.width;
  const y = (spot.y / 100) * scene.height;
  // Shrink by a hair: rounding must not make a box that only touches look like it overlaps.
  return { x: x + 0.01, y: y + 0.01, w: (spot.w / 100) * scene.width - 0.02, h: (spot.h / 100) * scene.height - 0.02 };
}

/** A label's text box, conservatively: 64 native px wide (128 CSS px at 2x), two lines tall. */
function labelBox(scene: IslandScene, label: PlazaLabel): Rect {
  const x = (label.x / 100) * scene.width;
  const y = (label.y / 100) * scene.height;
  return label.anchor === "bottom" ? { x: x - 32, y: y - 20, w: 64, h: 20 } : { x, y: y - 10, w: 64, h: 20 };
}

function grow(r: Rect, min: number): Rect {
  const w = Math.max(min, r.w);
  const h = Math.max(min, r.h);
  return { x: r.x + r.w / 2 - w / 2, y: r.y + r.h / 2 - h / 2, w, h };
}

/** Tag rects for a tree at every glyph size, not only the scene's own. */
function tagsOf(scene: IslandScene, slot: number): Rect[] {
  const tree = scene.trees.find((t) => t.slot === slot)!;
  return [scene.tags.find((t) => t.slot === slot)!, ...GLYPHS.map((g) => tagRect(slot, tree.left + Math.floor(tree.w / 2), tree.top + tree.h, g))];
}

interface Obstacle {
  what: string;
  /** The plot it belongs to; null for the plaza's own fixtures. */
  slot: number | null;
  rect: Rect;
}

/** Everything the plaza must keep clear of. */
function obstacles(scene: IslandScene): Obstacle[] {
  const out: Obstacle[] = [];
  const model = sceneModel(scene);
  for (const m of model.trees) {
    const { tree } = m;
    const slot = tree.slot;
    out.push({ what: `tree ${slot}`, slot, rect: m.rect });
    const tags = tagsOf(scene, slot);
    tags.forEach((rect, i) => out.push({ what: `tag ${slot} (${i ? `glyph ${GLYPHS[i - 1]}` : "scene"})`, slot, rect }));
    if (tree.key) out.push({ what: `key ${slot}`, slot, rect: { x: tree.key.x, y: tree.key.y, w: 10, h: 16 } });
    if (tree.visitor) out.push({ what: `visitor ${slot}`, slot, rect: { x: tree.visitor.x, y: tree.visitor.y, w: 10, h: 14 } });
    if (tree.lantern) out.push({ what: `lantern ${slot}`, slot, rect: { x: tree.lantern.x, y: tree.lantern.y, w: 8, h: 14 } });
    if (m.glow) out.push({ what: `glow ${slot}`, slot, rect: m.glow });
    const hotspot = grow(tags.reduce<Rect>((acc, t) => union(acc, t), m.rect), TAP);
    out.push({ what: `hotspot ${slot}`, slot, rect: hotspot });
  }
  for (const cell of scene.paths) {
    out.push({ what: `path ${cell}`, slot: null, rect: { x: (cell % scene.cols) * scene.tile, y: Math.floor(cell / scene.cols) * scene.tile, w: scene.tile, h: scene.tile } });
  }
  if (scene.marker) {
    const side = SPRITES.marker.length * scene.marker.scale;
    out.push({ what: "pin", slot: null, rect: { x: scene.marker.x, y: scene.marker.y, w: side, h: side } });
  }
  out.push({ what: "well", slot: null, rect: { x: scene.well.x, y: scene.well.y, w: 24, h: 24 } });
  lampRects(model).forEach((rect, i) => out.push({ what: `lamp ${i}`, slot: null, rect }));
  if (scene.banner) out.push({ what: "banner", slot: null, rect: { x: scene.banner.x, y: scene.banner.y, w: 48, h: 20 } });
  return out;
}

/** What each piece hits; the goal string sits on the banner (and the paths under it) by design. */
function hits(rect: Rect, list: Obstacle[], skip: (o: Obstacle) => boolean = () => false): string[] {
  return list.filter((o) => !skip(o) && overlaps(rect, o.rect)).map((o) => o.what);
}

const WATER = new Set(["a", "b", "N", "S", "E", "W"]);

/** True when every tile under the rect is dry land (plaza, grass, sand). */
function onLand(scene: IslandScene, r: Rect): boolean {
  for (let row = Math.floor(r.y / scene.tile); row < Math.ceil((r.y + r.h) / scene.tile); row++) {
    for (let col = Math.floor(r.x / scene.tile); col < Math.ceil((r.x + r.w) / scene.tile); col++) {
      if (row < 0 || col < 0 || row >= scene.rows || col >= scene.cols) return false;
      if (WATER.has(scene.tiles[row * scene.cols + col])) return false;
    }
  }
  return true;
}

const names = (world: PlazaWorld) => world.actors.map((a) => a.frames[0]);

describe("plazaWorld placement", () => {
  const cases: { n: number; mine: number; shift: number; decorated: boolean }[] = [];
  for (const n of SIZES) {
    for (let mine = 1; mine <= Math.min(n, 8); mine++) cases.push({ n, mine, shift: mine, decorated: true });
    cases.push({ n, mine: 0, shift: 0, decorated: false });
  }

  it.each(cases)("keeps every piece clear of the island ($n plots, mine $mine, decorated $decorated)", ({ n, mine, shift, decorated }) => {
    const scene = buildScene(plots(n, mine, shift, decorated), { markMine: true, festival: true });
    const world = plazaWorld(scene, fullInput(scene));
    const list = obstacles(scene);
    const problems: string[] = [];

    for (const actor of world.actors) {
      const name = actor.frames[0];
      const rect = actorRect(actor);
      if (FLAGS.has(name)) {
        // A booth flag stands inside its own tree's box (over whatever path runs under the
        // tree, as the tree itself does) and may touch only that tree's key flag.
        const own = scene.trees.find((t) => boothFlagAt(t, scene).x === actor.x && boothFlagAt(t, scene).y === actor.y)!;
        expect(own).toBeDefined();
        const box = { x: own.left, y: own.top, w: own.w, h: own.h };
        if (!(rect.x >= box.x && rect.y >= box.y && rect.x + rect.w <= box.x + box.w && rect.y + rect.h <= box.y + box.h)) {
          problems.push(`${name} on ${own.slot} leaves its tree`);
        }
        const hit = hits(rect, list, (o) => o.what === `tree ${own.slot}` || o.what === `hotspot ${own.slot}` || o.what.startsWith("path "));
        if (hit.length) problems.push(`${name} on ${own.slot}: ${hit.join(", ")}`);
        continue;
      }
      const skip = FESTIVAL_SPRITES.has(name) ? (o: Obstacle) => o.what === "banner" || o.what.startsWith("path ") : undefined;
      const hit = hits(rect, list, skip);
      if (hit.length) problems.push(`${name} at ${actor.x},${actor.y}: ${hit.join(", ")}`);
      if (!onLand(scene, rect)) problems.push(`${name} at ${actor.x},${actor.y} is over water`);
    }

    for (const spot of world.spots) {
      const rect = nativeSpot(scene, spot);
      const hit = hits(rect, list);
      if (hit.length) problems.push(`spot ${spot.id}: ${hit.join(", ")}`);
      for (const other of world.spots) {
        if (other.id !== spot.id && overlaps(rect, nativeSpot(scene, other))) problems.push(`spot ${spot.id} over spot ${other.id}`);
      }
      expect(spot.x).toBeGreaterThanOrEqual(0);
      expect(spot.y).toBeGreaterThanOrEqual(0);
      expect(spot.x + spot.w).toBeLessThanOrEqual(100 + 1e-9);
      expect(spot.y + spot.h).toBeLessThanOrEqual(100 + 1e-9);
    }

    const tags = list.filter((o) => o.what.startsWith("tag "));
    const trees = list.filter((o) => o.what.startsWith("tree "));
    for (const label of world.labels) {
      const box = labelBox(scene, label);
      const hit = hits(box, [...tags, ...trees]);
      if (hit.length) problems.push(`label ${label.id}: ${hit.join(", ")}`);
      // The point itself keeps about 40 native px from any tag.
      const px = (label.x / 100) * scene.width;
      const py = (label.y / 100) * scene.height;
      for (const tag of tags) {
        const dx = Math.max(tag.rect.x - px, 0, px - (tag.rect.x + tag.rect.w));
        const dy = Math.max(tag.rect.y - py, 0, py - (tag.rect.y + tag.rect.h));
        if (Math.hypot(dx, dy) < 40) problems.push(`label ${label.id} ${Math.round(Math.hypot(dx, dy))} px from ${tag.what}`);
      }
    }

    expect(problems).toEqual([]);
  });

  it.each(cases)("keeps the prize board's 48px tap target off every other tap target ($n plots, mine $mine)", ({ n, mine, shift, decorated }) => {
    const scene = buildScene(plots(n, mine, shift, decorated), { markMine: true, festival: true });
    const world = plazaWorld(scene, fullInput(scene));
    const prize = world.spots.find((s) => s.id === "prizes")!;
    expect(prize).toBeDefined();
    // At the usual 2x, the 48px floor is 24 native px each way.
    const tap = grow(nativeSpot(scene, prize), TAP);
    const others = [
      ...world.spots.filter((s) => s.id !== "prizes").map((s) => ({ what: `spot ${s.id}`, rect: nativeSpot(scene, s) })),
      ...obstacles(scene).filter((o) => o.what.startsWith("hotspot ") || o.what === "pin"),
    ];
    expect(others.filter((o) => overlaps(tap, o.rect)).map((o) => o.what)).toEqual([]);
    // The board itself never covers another plaza sprite (notice board, stage, sign, flags, campfire, seats).
    const board = world.actors.find((a) => a.frames[0] === "prize_board")!;
    const covered = world.actors.filter((a) => a !== board && overlaps(actorRect(board), actorRect(a))).map((a) => a.frames[0]);
    expect(covered).toEqual([]);
  });

  it("draws every frame it names, in whole native pixels", () => {
    const sprites = allSprites();
    const scene = buildScene(plots(12, 1), { markMine: true, festival: true });
    for (const step of [0, 1, 2, 3] as const) {
      const world = plazaWorld(scene, { ...fullInput(scene), festival: festival({ stageStep: step, booths: [{ slot: 2, kind: "table" }] }) });
      for (const actor of world.actors) {
        for (const frame of actor.frames) expect(sprites[frame]).toBeDefined();
        expect(Number.isInteger(actor.x) && Number.isInteger(actor.y)).toBe(true);
        // Every frame of an actor has the same size, so a frame change repaints one box.
        const sizes = new Set(actor.frames.map((f) => MOTION_SIZES[f as MotionSpriteName].join("x")));
        expect(sizes.size).toBe(1);
      }
    }
  });
});

describe("plazaWorld content", () => {
  const scene = buildScene(plots(12, 1), { markMine: true, festival: true });
  const c = plazaCentre(scene);

  it("is NO_PLAZA when there is nothing to show", () => {
    expect(plazaWorld(scene, { festival: null, pins: null, campfire: null })).toBe(NO_PLAZA);
    expect(NO_PLAZA).toEqual({ actors: [], spots: [], labels: [] });
  });

  it("centres on the well", () => {
    expect(c).toEqual({ x: scene.well.x + 12, y: scene.well.y + 12 });
  });

  it("draws in order: goal string, bulbs, stage, sign, board, notes, flags, pit, seats behind, flame, seats in front", () => {
    const world = plazaWorld(scene, {
      festival: festival({ lanterns: { total: 8, lit: 2, reached: false, count: 3, target: 12 }, booths: [{ slot: 2, kind: "table" }], stageStep: 1 }),
      pins: ["active", "side"],
      campfire: { count: 4 },
    });
    expect(names(world)).toEqual([
      "goal_string",
      "goal_bulb",
      "goal_bulb",
      "fest_stage_1",
      "fest_sign",
      "notice_board",
      "notice_note_active",
      "notice_note_side",
      "booth_flag",
      "campfire_pit",
      "sit_c_0",
      "sit_d_1",
      "campfire_flame_0",
      "sit_a_0",
      "sit_b_1",
    ]);
    expect(world.spots.map((s) => s.id)).toEqual(["notice", "stage", "campfire"]);
    expect(world.labels.map((l) => [l.id, l.anchor])).toEqual([
      ["sign", "bottom"],
      ["campfireCount", "bottom"],
    ]);
  });

  it("puts the board, notes, stage, sign and campfire at their offsets from the plaza centre", () => {
    const world = plazaWorld(scene, { festival: festival({ stageStep: 2 }), pins: ["main", "main", "active", "side"], campfire: { count: 1 } });
    const at = (name: string) => world.actors.filter((a) => a.frames[0] === name).map((a) => [a.x - c.x, a.y - c.y]);
    expect(at("notice_board")).toEqual([[-38, -24]]);
    // At most three notes, in pin order.
    expect(world.actors.filter((a) => a.frames[0].startsWith("notice_note_")).map((a) => [a.frames[0], a.x - c.x, a.y - c.y])).toEqual([
      ["notice_note_main", -35, -21],
      ["notice_note_main", -29, -22],
      ["notice_note_active", -22, -21],
    ]);
    expect(at("fest_stage_2")).toEqual([[50, -16]]);
    expect(at("fest_sign")).toEqual([[36, -12]]);
    expect(at("campfire_pit")).toEqual([[-63, 46]]);
    expect(at("campfire_flame_0")).toEqual([[-61, 38]]);
    expect(world.actors.find((a) => a.frames[0] === "campfire_flame_0")).toMatchObject({ frames: ACTOR_FRAMES.campfireFlame, frameMs: 250 });
  });

  it("gives spots and labels as percentages of the picture, like the plot hotspots", () => {
    const world = plazaWorld(scene, { festival: festival(), pins: [], campfire: { count: 9 } });
    const pct = (v: number, of: number) => Math.round((v / of) * 100 * 10_000) / 10_000;
    const notice = world.spots.find((s) => s.id === "notice")!;
    const box = PLAZA_LAYOUT.noticeSpot;
    expect(notice.x).toBe(pct(c.x + box.x, scene.width));
    expect(notice.y).toBe(pct(c.y + box.y, scene.height));
    expect(notice.w).toBeCloseTo(pct(box.w, scene.width), 3);
    expect(notice.h).toBeCloseTo(pct(box.h, scene.height), 3);
    for (const v of [notice.x, notice.y, notice.w, notice.h]) expect(Math.round(v * 10_000) / 10_000).toBe(v);
    const more = world.labels.find((l) => l.id === "campfireMore")!;
    expect(more).toEqual({ id: "campfireMore", x: pct(c.x - 24, scene.width), y: pct(c.y + 46, scene.height), anchor: "left" });
    // An empty board still stands and can be tapped.
    expect(names(world)).toContain("notice_board");
  });

  describe("prize board", () => {
    it("draws no prize board and no prizes spot unless asked", () => {
      for (const prizes of [undefined, false]) {
        const world = plazaWorld(scene, { ...fullInput(scene), prizes });
        expect(names(world)).not.toContain("prize_board");
        expect(world.spots.map((s) => s.id)).not.toContain("prizes");
      }
      expect(plazaWorld(scene, { festival: null, pins: null, campfire: null, prizes: false })).toBe(NO_PLAZA);
    });

    it("stands alone on an otherwise empty plaza, with its spot and no label", () => {
      const world = plazaWorld(scene, { festival: null, pins: null, campfire: null, prizes: true });
      expect(world).not.toBe(NO_PLAZA);
      expect(world.actors).toEqual([{ frames: ["prize_board"], x: c.x + 15, y: c.y + 10 }]);
      expect(world.spots.map((s) => s.id)).toEqual(["prizes"]);
      expect(world.labels).toEqual([]);
    });

    it("draws after the booth flags and before the campfire, and its spot comes between the stage and the campfire", () => {
      const world = plazaWorld(scene, {
        festival: festival({ booths: [{ slot: 2, kind: "table" }] }),
        pins: ["main"],
        campfire: { count: 1 },
        prizes: true,
      });
      const order = names(world);
      expect(order.indexOf("prize_board")).toBe(order.indexOf("booth_flag") + 1);
      expect(order.indexOf("campfire_pit")).toBe(order.indexOf("prize_board") + 1);
      expect(world.spots.map((s) => s.id)).toEqual(["notice", "stage", "prizes", "campfire"]);
      expect(world.labels.map((l) => l.id)).not.toContain("prizes");
    });

    it("puts the board inside its spot, at its offset, on whole native pixels", () => {
      const world = plazaWorld(scene, { festival: null, pins: null, campfire: null, prizes: true });
      const board = world.actors[0];
      expect([board.x - c.x, board.y - c.y]).toEqual([...PLAZA_LAYOUT.prizeBoard]);
      const spot = nativeSpot(scene, world.spots[0]);
      const rect = actorRect(board);
      expect(rect.x).toBeGreaterThanOrEqual(spot.x);
      expect(rect.y).toBeGreaterThanOrEqual(spot.y);
      expect(rect.x + rect.w).toBeLessThanOrEqual(spot.x + spot.w + 0.02);
      expect(rect.y + rect.h).toBeLessThanOrEqual(spot.y + spot.h + 0.02);
      const box = PLAZA_LAYOUT.prizeSpot;
      // About 48 CSS px at the usual 2x before the floor applies.
      expect(Math.min(box.w, box.h)).toBeGreaterThanOrEqual(TAP - 1);
    });

    it("draws the board from palette keys, still (one frame)", () => {
      const world = plazaWorld(scene, { festival: null, pins: null, campfire: null, prizes: true });
      expect(world.actors[0].frames).toEqual(["prize_board"]);
      expect(world.actors[0].frameMs).toBeUndefined();
      expect(allSprites().prize_board).toHaveLength(MOTION_SIZES.prize_board[1]);
    });
  });

  describe("campfire", () => {
    const seats = (world: PlazaWorld) => world.actors.filter((a) => a.frames[0].startsWith("sit_"));

    it("draws nothing without a campfire", () => {
      const world = plazaWorld(scene, { festival: null, pins: [], campfire: null });
      expect(names(world).some((n) => n.startsWith("campfire") || n.startsWith("sit_"))).toBe(false);
      expect(world.spots.map((s) => s.id)).toEqual(["notice"]);
      expect(world.labels).toEqual([]);
    });

    it("is an unlit pit with no label when nobody is in the channel", () => {
      for (const count of [0, -3, Number.NaN]) {
        const world = plazaWorld(scene, { festival: null, pins: null, campfire: { count } });
        expect(names(world)).toEqual(["campfire_pit_cold"]);
        expect(world.spots.map((s) => s.id)).toEqual(["campfire"]);
        expect(world.labels).toEqual([]);
      }
    });

    it("draws the cold pit with no light at night, and the ember pit under a flame", () => {
      // y and i are the embers: the only keys the atlas leaves untinted (glowing) in the pit.
      expect(allSprites().campfire_pit_cold.join("")).not.toMatch(/[yi]/);
      expect(allSprites().campfire_pit.join("")).toMatch(/[yi]/);
      const one = plazaWorld(scene, { festival: null, pins: null, campfire: { count: 1 } });
      expect(names(one)).toContain("campfire_pit");
      expect(names(one)).toContain("campfire_flame_0");
    });

    it("seats one figure per person, at most eight, then a +N label", () => {
      for (const [count, drawn] of [[1, 1], [3, 3], [8, 8], [9, 8], [40, 8]]) {
        const world = plazaWorld(scene, { festival: null, pins: null, campfire: { count } });
        expect(seats(world)).toHaveLength(drawn);
        expect(world.actors.filter((a) => a.frames[0] === "campfire_flame_0")).toHaveLength(1);
        expect(world.labels.map((l) => l.id)).toEqual(count > MAX_SEATS ? ["campfireCount", "campfireMore"] : ["campfireCount"]);
      }
    });

    it("fills the seats in a fixed order, the variant by seat (never by person), breathing out of step", () => {
      const sitters = [ACTOR_FRAMES.sitA, ACTOR_FRAMES.sitB, ACTOR_FRAMES.sitC, ACTOR_FRAMES.sitD];
      for (let count = 1; count <= MAX_SEATS; count++) {
        const world = plazaWorld(scene, { festival: null, pins: null, campfire: { count } });
        const byPlace = new Map(seats(world).map((a) => [`${a.x - c.x},${a.y - c.y}`, a]));
        expect(byPlace.size).toBe(count);
        PLAZA_LAYOUT.seats.slice(0, count).forEach(([dx, dy], i) => {
          const actor = byPlace.get(`${dx},${dy}`);
          expect(actor).toBeDefined();
          const frames = i % 2 ? [...sitters[i % 4]].reverse() : [...sitters[i % 4]];
          expect(actor!.frames).toEqual(frames);
          expect(actor!.frameMs).toBe(1100);
        });
      }
    });

    it("turns the seats right of the fire to face it", () => {
      const world = plazaWorld(scene, { festival: null, pins: null, campfire: { count: 8 } });
      for (const actor of seats(world)) expect([actor.x - c.x, actor.flip === true]).toEqual([actor.x - c.x, actor.x - c.x > -56]);
      expect(seats(world).filter((a) => a.flip)).toHaveLength(4);
    });
  });

  describe("festival", () => {
    it("draws no festival props without a festival", () => {
      const world = plazaWorld(scene, { festival: null, pins: ["main"], campfire: { count: 2 } });
      const festive = names(world).filter((n) => n.startsWith("fest_") || n.startsWith("goal_") || FLAGS.has(n));
      expect(festive).toEqual([]);
      expect(world.spots.map((s) => s.id)).not.toContain("stage");
      expect(world.labels.map((l) => l.id)).not.toContain("sign");
    });

    it("lights as many bulbs as the goal says, on the string's own bulbs", () => {
      for (const lit of [0, 1, 4, 7, 8]) {
        const world = plazaWorld(scene, { festival: festival({ lanterns: { total: 8, lit, reached: lit === 8, count: lit, target: 8 } }), pins: null, campfire: null });
        const string = world.actors.find((a) => a.frames[0] === "goal_string")!;
        expect(string).toMatchObject({ x: scene.banner!.x, y: scene.banner!.y });
        const bulbs = world.actors.filter((a) => a.frames[0] === "goal_bulb");
        expect(bulbs.map((b) => [b.x - string.x, b.y - string.y])).toEqual(GOAL_BULB_SPOTS.slice(0, lit).map(([x, y]) => [x, y]));
      }
    });

    it("hangs no string without a goal or without the banner", () => {
      expect(names(plazaWorld(scene, { festival: festival({ lanterns: null }), pins: null, campfire: null }))).not.toContain("goal_string");
      const quiet = buildScene(plots(12, 1), { markMine: true, festival: false });
      expect(names(plazaWorld(quiet, { festival: festival(), pins: null, campfire: null }))).not.toContain("goal_string");
    });

    it("builds the stage step by step on one footprint", () => {
      const spots = new Set<string>();
      for (const step of [0, 1, 2, 3] as const) {
        const world = plazaWorld(scene, { festival: festival({ stageStep: step }), pins: null, campfire: null });
        const stage = world.actors.filter((a) => a.frames[0].startsWith("fest_stage_"));
        expect(stage.map((a) => a.frames[0])).toEqual([`fest_stage_${step}`]);
        spots.add(`${stage[0].x},${stage[0].y},${MOTION_SIZES[`fest_stage_${step}`].join("x")}`);
      }
      expect(spots.size).toBe(1);
    });

    it("flags only plots with a booth and a tree the viewer sees in full (never a stage-0 or plain plot)", () => {
      const mixed = buildScene(
        [
          { slot: 1, stage: 4, visitor: true, key: false, helper: false, lantern: false, name: null, mine: true },
          { slot: 2, stage: 0, visitor: false, key: false, helper: false, lantern: false, name: null, mine: false },
          { slot: 3, stage: 6, visitor: true, key: true, helper: false, lantern: false, name: null, mine: false, plain: true },
          { slot: 4, stage: 3, visitor: false, key: false, helper: false, lantern: false, name: null, mine: false },
        ],
        { markMine: true, festival: true }
      );
      const booths = [
        { slot: 1, kind: "stage" as const },
        { slot: 2, kind: "table" as const },
        { slot: 3, kind: "table" as const },
        { slot: 4, kind: "table" as const },
        { slot: 9, kind: "table" as const },
      ];
      const world = plazaWorld(mixed, { festival: festival({ booths }), pins: null, campfire: null });
      const flags = world.actors.filter((a) => FLAGS.has(a.frames[0]));
      const tree = (slot: number) => mixed.trees.find((t) => t.slot === slot)!;
      expect(flags.map((a) => [a.frames[0], a.x, a.y])).toEqual([
        ["star_flag", tree(1).left + 4, tree(1).top + 22],
        ["booth_flag", tree(4).left + 4, tree(4).top + 22],
      ]);
    });

    it("keeps the flag on the student's own small tree under the pin", () => {
      for (const n of [1, 40, 150]) {
        const scene1 = buildScene(
          plots(n, 1).map((p) => (p.slot === 1 ? { ...p, stage: 1 } : p)),
          { markMine: true, festival: true }
        );
        const tree = scene1.trees.find((t) => t.slot === 1)!;
        const world = plazaWorld(scene1, { festival: festival({ booths: [{ slot: 1, kind: "table" }] }), pins: null, campfire: null });
        const flag = world.actors.find((a) => a.frames[0] === "booth_flag")!;
        const pin = scene1.marker!;
        const side = SPRITES.marker.length * pin.scale;
        expect(overlaps(actorRect(flag), { x: pin.x, y: pin.y, w: side, h: side })).toBe(false);
        // Still in the tree's soil mound, above its tag.
        expect(flag.y + MOTION_SIZES.booth_flag[1]).toBeLessThanOrEqual(tree.top + tree.h);
        expect(flag.x).toBe(tree.left + 4);
      }
    });
  });
});

describe("plazaWorld cost", () => {
  it("returns equal worlds for equal input, and still sprites only where nothing moves", () => {
    const scene = buildScene(plots(20, 3), { markMine: true, festival: true });
    const input = fullInput(scene);
    expect(plazaWorld(scene, input)).toEqual(plazaWorld(scene, JSON.parse(JSON.stringify(input))));
    // Only the people and the flame animate; the board, stage, flags and bulbs are single frames.
    const moving = plazaWorld(scene, input).actors.filter((a) => a.frames.length > 1).map((a) => a.frames[0]);
    expect(moving.length).toBe(MAX_SEATS + 1);
    expect(moving.every((n) => n.startsWith("sit_") || n === "campfire_flame_0")).toBe(true);
  });

  it("keeps the plaza's pieces inside the scene's festival room on the smallest island", () => {
    const scene = buildScene(plots(1, 1), { markMine: true, festival: true });
    const world = plazaWorld(scene, fullInput(scene));
    const all = world.actors.map(actorRect).reduce<SceneRect>((acc, r) => union(acc, r), actorRect(world.actors[0]));
    expect(all.x).toBeGreaterThanOrEqual(0);
    expect(all.y).toBeGreaterThanOrEqual(0);
    expect(all.x + all.w).toBeLessThanOrEqual(scene.width);
    expect(all.y + all.h).toBeLessThanOrEqual(scene.height);
  });
});
