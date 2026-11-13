/**
 * @jest-environment node
 */
import { createHash } from "node:crypto";

import { PNG } from "pngjs";

import { PALETTE, SPRITES } from "../../../assets/island/sprites";
import { QuestDbError, type QuestApi } from "../api";
import { MAX_ROOTS, ROOTS_ROW, buildScene, plotBoxes, renderIsland, rootsLevel, type IslandPlot } from "../island/render";
import { ROOTS_SCHEMA, readMyRoots, readRoots, resetRootsForTests, rootsFrom, withRoots } from "../island/roots";

function plots(n: number): IslandPlot[] {
  return Array.from({ length: n }, (_, k) => ({
    slot: k + 1,
    stage: k % 8,
    visitor: k % 8 >= 3,
    key: k % 5 === 0,
    helper: k % 4 === 0,
    lantern: k % 7 === 0,
    name: null,
    mine: k === 2,
  }));
}

/** Every level on the island: roots = slot % 4. */
const rooted = (n: number) => plots(n).map((p) => ({ ...p, roots: p.slot % 4 }));

const pixels = (png: Buffer) => createHash("sha256").update(PNG.sync.read(png).data).digest("hex");

/** A fake database: answers by function name, records the calls. */
function fakeApi(answers: Record<string, unknown>): QuestApi & { call: jest.Mock } {
  const call = jest.fn(async (fn: string) => {
    if (!(fn in answers)) throw new Error(`unexpected ${fn}`);
    const answer = answers[fn];
    if (answer instanceof Error) throw answer;
    return answer;
  });
  return { call, rows: jest.fn() } as unknown as QuestApi & { call: jest.Mock };
}

describe("roots sprites", () => {
  it("has one 32 x 10 overlay per level, in known colours", () => {
    expect(MAX_ROOTS).toBe(3);
    for (let level = 1; level <= MAX_ROOTS; level++) {
      const rows = SPRITES[`roots_${level}`];
      expect([level, rows.length, new Set(rows.map((r) => r.length))]).toEqual([level, 10, new Set([32])]);
      for (const ch of rows.join("")) if (ch !== ".") expect([level, ch, Boolean(PALETTE[ch])]).toEqual([level, ch, true]);
    }
    // Each level shows more roots than the one below it.
    const ink = (level: number) => SPRITES[`roots_${level}`].join("").replace(/\./g, "").length;
    expect(ink(1)).toBeLessThan(ink(2));
    expect(ink(2)).toBeLessThan(ink(3));
  });
});

describe("roots in the scene", () => {
  it("clamps a level to 0..3 and treats anything else as 0", () => {
    expect([0, 1, 2, 3, 4, 99, -1, 1.4, 2.6, NaN, Infinity, "2", null, undefined].map(rootsLevel)).toEqual([
      0, 1, 2, 3, 3, 3, 0, 1, 3, 0, 0, 0, 0, 0,
    ]);
  });

  it("puts the level's sprite over the tree's soil, and nothing for level 0", () => {
    const scene = buildScene(rooted(8));
    for (const tree of scene.trees) {
      const level = tree.slot % 4;
      expect([tree.slot, tree.roots]).toEqual([
        tree.slot,
        level === 0 ? null : { sprite: `roots_${level}`, x: tree.left, y: tree.top + ROOTS_ROW },
      ]);
    }
    expect(buildScene(plots(8)).trees.every((t) => t.roots === null)).toBe(true);
  });

  it("keeps roots inside the tree's box: never over a number tag, and the tap boxes do not move", () => {
    for (const n of [1, 6, 24, 40, 120]) {
      const input = rooted(n);
      const scene = buildScene(input, { markMine: true, festival: true });
      expect([n, plotBoxes(input)]).toEqual([n, plotBoxes(plots(n))]);
      const boxes = plotBoxes(input).boxes;
      scene.trees.forEach((tree, k) => {
        if (!tree.roots) return;
        const { w, h } = { w: SPRITES[tree.roots.sprite][0].length, h: SPRITES[tree.roots.sprite].length };
        const r = { x: tree.roots.x, y: tree.roots.y, w, h };
        const inTree = r.x >= tree.left && r.y >= tree.top && r.x + r.w <= tree.left + tree.w && r.y + r.h <= tree.top + tree.h;
        const box = boxes[k];
        const inBox = r.x >= box.left && r.y >= box.top && r.x + r.w <= box.left + box.width && r.y + r.h <= box.top + box.height;
        // No tag (its own or a neighbour's) shares a pixel with the roots.
        const overTag = scene.tags.some((t) => r.x < t.x + t.w && t.x < r.x + r.w && r.y < t.y + t.h && t.y < r.y + r.h);
        expect([n, tree.slot, inTree, inBox, overTag]).toEqual([n, tree.slot, true, true, false]);
      });
    }
  });

  it("draws no roots on a plain plot, whatever it was sent", () => {
    const input = rooted(8).map((p) => (p.slot === 3 ? { ...p, plain: true } : p));
    expect(buildScene(input).trees.find((t) => t.slot === 3)?.roots).toBeNull();
    const plain = renderIsland(input, { scale: 1 });
    const none = renderIsland(input.map((p) => (p.slot === 3 ? { ...p, roots: 0 } : p)), { scale: 1 });
    expect(pixels(plain.png)).toBe(pixels(none.png));
  });

  it("changes the PNG only where there are roots: roots 0 or absent draw the island as before", () => {
    const before = renderIsland(plots(12), { markMine: true, festival: true });
    const zero = renderIsland(plots(12).map((p) => ({ ...p, roots: 0 })), { markMine: true, festival: true });
    const withSome = renderIsland(rooted(12), { markMine: true, festival: true });
    expect(pixels(zero.png)).toBe(pixels(before.png));
    expect(pixels(withSome.png)).not.toBe(pixels(before.png));
    expect([withSome.width, withSome.height]).toEqual([before.width, before.height]);
  });
});

describe("rootsFrom", () => {
  it("reads [{slot, roots}] and leaves out anything malformed or 0", () => {
    const got = rootsFrom([
      { slot: 1, roots: 1 },
      { slot: 2, roots: 3 },
      { slot: 3, roots: 0 },
      { slot: 4, roots: 9 },
      { slot: 0, roots: 2 },
      { slot: 1.5, roots: 2 },
      { slot: "5", roots: 2 },
      { slot: 6, roots: "2" },
      { slot: 7, roots: 1.5 },
      null,
      "x",
      { slot: 8 },
    ]);
    expect([...got]).toEqual([[1, 1], [2, 3], [4, 3]]);
    for (const raw of [null, undefined, {}, "[]", 3]) expect(rootsFrom(raw).size).toBe(0);
  });
});

describe("withRoots", () => {
  it("merges by slot, never onto a plain plot, and leaves plots without roots unchanged", () => {
    const input = [
      ...plots(3),
      { ...plots(4)[3], plain: true },
      { ...plots(5)[4], roots: 2 },
    ];
    const out = withRoots(input, new Map([[1, 2], [3, 1], [4, 3], [9, 1]]));
    expect(out.map((p) => [p.slot, p.roots])).toEqual([[1, 2], [2, undefined], [3, 1], [4, undefined], [5, undefined]]);
    expect(out[1]).toEqual(input[1]);
    expect("roots" in out[1] || "roots" in out[3] || "roots" in out[4]).toBe(false);
    // The input is not changed.
    expect(input[4].roots).toBe(2);
  });
});

describe("readRoots", () => {
  let warn: jest.SpyInstance;
  beforeEach(() => {
    resetRootsForTests();
    warn = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    jest.spyOn(console, "error").mockImplementation(() => undefined);
  });
  afterEach(() => jest.restoreAllMocks());

  it("reads the roots from schema 10, and the version only once per api", async () => {
    expect(ROOTS_SCHEMA).toBe(10);
    const api = fakeApi({ shift_quest_schema_version: 10, shift_quest_island_roots: [{ slot: 2, roots: 2 }] });
    expect([...(await readRoots(api))]).toEqual([[2, 2]]);
    expect([...(await readRoots(api))]).toEqual([[2, 2]]);
    expect(api.call.mock.calls.map((c) => c[0])).toEqual([
      "shift_quest_schema_version",
      "shift_quest_island_roots",
      "shift_quest_island_roots",
    ]);
    expect(warn).not.toHaveBeenCalled();
  });

  it("calls nothing more below schema 10: no roots, one line in the log", async () => {
    const api = fakeApi({ shift_quest_schema_version: 9 });
    expect((await readRoots(api)).size).toBe(0);
    expect((await readRoots(api)).size).toBe(0);
    expect(api.call.mock.calls.map((c) => c[0])).toEqual(["shift_quest_schema_version"]);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain("schema 9 < 10");
  });

  it("never throws: a failed read draws no roots and is logged once per cause, without the message", async () => {
    const api = fakeApi({
      shift_quest_schema_version: 10,
      shift_quest_island_roots: new QuestDbError("shift_quest_island_roots", "42501"),
    });
    expect((await readRoots(api, "[test]")).size).toBe(0);
    expect((await readRoots(api, "[test]")).size).toBe(0);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toBe("[test] island roots off (SQLSTATE 42501); trees are drawn without roots");
  });

  it("tries the version again after it could not be read", async () => {
    const api = fakeApi({ shift_quest_schema_version: new Error("connection reset") });
    expect((await readRoots(api)).size).toBe(0);
    expect((await readRoots(api)).size).toBe(0);
    expect(api.call.mock.calls.map((c) => c[0])).toEqual(["shift_quest_schema_version", "shift_quest_schema_version"]);
  });
});


describe("private own roots", () => {
  it("overrides only mine and keeps plain plots empty", () => {
    const input = [{ slot: 1, mine: true }, { slot: 2, mine: false }, { slot: 3, mine: true, plain: true }];
    const publicRoots = new Map([[1, 1], [2, 2], [3, 3]]);
    expect(withRoots(input, publicRoots, 3).map((p) => (p as { roots?: number }).roots)).toEqual([3, 2, undefined]);
    expect(withRoots(input, publicRoots, 0).map((p) => (p as { roots?: number }).roots)).toEqual([undefined, 2, undefined]);
    expect(withRoots(input, publicRoots, null).map((p) => (p as { roots?: number }).roots)).toEqual([1, 2, undefined]);
  });
  it("reads only from schema 11 with the supplied actor", async () => {
    const api = fakeApi({ shift_quest_schema_version: 11, shift_quest_island_my_roots: 2 });
    expect(await readMyRoots(api, "actor")).toBe(2);
    expect(api.call).toHaveBeenCalledWith("shift_quest_island_my_roots", "actor");
    const old = fakeApi({ shift_quest_schema_version: 10 });
    expect(await readMyRoots(old, "actor")).toBeNull();
    expect(old.call).toHaveBeenCalledTimes(1);
  });
  it.each([new QuestDbError("shift_quest_island_my_roots", "42883"), null, "3", 4, -1, 1.5])("preserves public roots on failed or invalid reads (%s)", async (value) => {
    jest.spyOn(console, "warn").mockImplementation(() => undefined);
    const api = fakeApi({ shift_quest_schema_version: 11, shift_quest_island_my_roots: value });
    expect(await readMyRoots(api, "actor")).toBeNull();
    jest.restoreAllMocks();
  });
});
