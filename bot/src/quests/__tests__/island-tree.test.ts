/**
 * @jest-environment node
 */
import { PNG } from "pngjs";

import { PALETTE, SPRITES } from "../../../assets/island/sprites";
import { mapTreeColor, resolveStyle, treeItem, DEFAULT_STYLE } from "@/lib/shift-island/tree-style";
import { QuestDbError, type QuestApi } from "../api";
import { buildScene, renderIsland, type IslandPlot } from "../island/render";
import { TREE_SCHEMA, readMyTree, readStyles, resetTreeForTests, styleKey, stylesFrom, withStyles } from "../island/tree";

const plot = (slot: number, extra: Partial<IslandPlot> = {}): IslandPlot => ({
  slot,
  stage: 7,
  visitor: false,
  key: false,
  helper: false,
  lantern: false,
  name: null,
  mine: false,
  ...extra,
});

function fakeApi(answers: Record<string, unknown>): QuestApi & { call: jest.Mock } {
  const call = jest.fn(async (fn: string) => {
    if (!(fn in answers)) throw new Error(`unexpected ${fn}`);
    const answer = answers[fn];
    if (answer instanceof Error) throw answer;
    return answer;
  });
  return { call, rows: jest.fn() } as unknown as QuestApi & { call: jest.Mock };
}

const AUTUMN = resolveStyle({ leaf: "leaf:autumn" });
const BIRCH = resolveStyle({ bark: "bark:birch" });
const hexOf = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

function colours(png: Buffer): Set<string> {
  const { data } = PNG.sync.read(png);
  const out = new Set<string>();
  for (let i = 0; i < data.length; i += 4) out.add(`${data[i]},${data[i + 1]},${data[i + 2]}`);
  return out;
}

const mid = (style: typeof AUTUMN) => hexOf(treeItem(style.leaf)!.colors![1]).join(",");

beforeEach(() => {
  resetTreeForTests();
  jest.spyOn(console, "warn").mockImplementation(() => undefined);
});
afterEach(() => jest.restoreAllMocks());

describe("stylesFrom", () => {
  it("keeps good entries, resolves unknown ids to defaults and drops malformed ones", () => {
    const styles = stylesFrom([
      { slot: 2, seed: "maple", equipped: { leaf: "leaf:autumn", bark: "bark:nope", bloom: 7 } },
      { slot: 3, seed: "tulip", equipped: {} },
      { slot: 0, seed: null, equipped: {} },
      { slot: 1.5, seed: null, equipped: {} },
      { slot: "4", seed: null, equipped: {} },
      { slot: 5, seed: null },
      null,
      "x",
    ]);
    expect([...styles.keys()]).toEqual([2, 3]);
    expect(styles.get(2)).toEqual({ seed: "maple", style: { ...DEFAULT_STYLE, leaf: "leaf:autumn" } });
    expect(styles.get(3)).toEqual({ seed: null, style: DEFAULT_STYLE });
  });
  it("is empty for anything that is not a list", () => {
    for (const raw of [null, undefined, {}, "a", 3]) expect(stylesFrom(raw).size).toBe(0);
  });
});

describe("withStyles", () => {
  const styles = stylesFrom([
    { slot: 1, seed: "oak", equipped: AUTUMN },
    { slot: 2, seed: null, equipped: BIRCH },
    { slot: 3, seed: "oak", equipped: BIRCH },
  ]);
  it("styles only name-visible plots and leaves the rest without style fields", () => {
    const out = withStyles([plot(1), plot(2, { plain: true }), plot(4)], styles);
    expect(out[0]).toMatchObject({ style: AUTUMN, seeded: true });
    expect(out[1]).not.toHaveProperty("style");
    expect(out[1]).not.toHaveProperty("seeded");
    expect(out[2]).not.toHaveProperty("style");
  });
  it("uses the caller's own tree for the mine plot, and replaces earlier style fields", () => {
    const mine = { seed: null, equipped: AUTUMN, owned: [], gifts: [], roots: { count: 0, recent: 0 }, stage: 3 };
    const out = withStyles([plot(3, { mine: true, style: BIRCH, seeded: true }), plot(1)], styles, mine);
    expect(out[0].style).toEqual(AUTUMN);
    expect(out[0]).not.toHaveProperty("seeded");
    expect(out[1].style).toEqual(AUTUMN);
  });
  it("ignores mine on a plain own plot", () => {
    const mine = { seed: "oak", equipped: AUTUMN, owned: [], gifts: [], roots: { count: 0, recent: 0 }, stage: 0 };
    expect(withStyles([plot(9, { mine: true, plain: true })], styles, mine)[0]).not.toHaveProperty("style");
  });
});

describe("readers below schema 13", () => {
  it.each([12, 11, 0])("make no style call at schema %s", async (version) => {
    const api = fakeApi({ shift_quest_schema_version: version });
    expect((await readStyles(api)).size).toBe(0);
    expect(await readMyTree(api, "42")).toBeNull();
    expect(api.call.mock.calls.map(([fn]) => fn)).toEqual(["shift_quest_schema_version"]);
  });
  it("read at schema 13 and never throw on failure", async () => {
    expect(TREE_SCHEMA).toBe(13);
    const api = fakeApi({
      shift_quest_schema_version: 13,
      shift_quest_island_styles: [{ slot: 1, seed: null, equipped: AUTUMN }],
      shift_quest_tree_get: {
        seed: "pine",
        equipped: BIRCH,
        owned: ["x"],
        gifts: [{ id: "g", options: ["leaf:gold"] }, 5],
        roots: { count: 2, recent: 1 },
        stage: 4,
        ambition: "แอปจองโต๊ะ",
      },
    });
    expect((await readStyles(api)).get(1)?.style).toEqual(AUTUMN);
    expect(await readMyTree(api, "42")).toEqual({
      seed: "pine",
      equipped: BIRCH,
      owned: ["x"],
      gifts: [{ id: "g", options: ["leaf:gold"] }],
      roots: { count: 2, recent: 1 },
      stage: 4,
      ambition: "แอปจองโต๊ะ",
    });
    const broken = fakeApi({
      shift_quest_schema_version: 13,
      shift_quest_island_styles: new QuestDbError("shift_quest_island_styles", "42883"),
      shift_quest_tree_get: "junk",
    });
    expect((await readStyles(broken)).size).toBe(0);
    expect(await readMyTree(broken, "42")).toBeNull();
    // No ambition, a blank one or one that is not text: none (the pickers start empty).
    for (const ambition of [undefined, null, "  ", 7]) {
      const plain = fakeApi({ shift_quest_schema_version: 13, shift_quest_tree_get: { equipped: BIRCH, ambition } });
      expect((await readMyTree(plain, "42"))?.ambition).toBeNull();
    }
    expect(console.warn).toHaveBeenCalledTimes(1);
  });
});

describe("the island picture", () => {
  const pixelsOf = (plots: IslandPlot[]) => PNG.sync.read(renderIsland(plots, { scale: 1 }).png).data;

  it("draws a styled stage 7 tree in its leaf colours and the unstyled one without them", () => {
    const styled = colours(renderIsland([plot(1, { style: AUTUMN })], { scale: 1 }).png);
    const plain = colours(renderIsland([plot(1)], { scale: 1 }).png);
    expect(styled.has(mid(AUTUMN))).toBe(true);
    expect(plain.has(mid(AUTUMN))).toBe(false);
  });

  it("keeps the soil of a birch tree as the default's", () => {
    const scene = buildScene([plot(1, { style: BIRCH })]);
    const tree = scene.trees[0];
    const birch = pixelsOf([plot(1, { style: BIRCH })]);
    const base = pixelsOf([plot(1)]);
    const width = scene.width;
    let soil = 0;
    let bark = 0;
    for (let j = 0; j < tree.h; j++) {
      for (let i = 0; i < tree.w; i++) {
        const k = ((tree.top + j) * width + tree.left + i) * 4;
        const same = [0, 1, 2].every((c) => birch[k + c] === base[k + c]);
        if (j >= 30 && SPRITES.stage_7[j][i] !== ".") {
          soil++;
          expect(same).toBe(true);
        } else if (j < 30 && "bce".includes(SPRITES.stage_7[j][i]) && !same) bark++;
      }
    }
    expect(soil).toBeGreaterThan(0);
    expect(bark).toBeGreaterThan(0);
  });

  it("draws a planted seed at stage 0 differently from bare soil, and only when not plain", () => {
    const bare = pixelsOf([plot(1, { stage: 0 })]);
    const seeded = pixelsOf([plot(1, { stage: 0, seeded: true })]);
    expect(Buffer.compare(Buffer.from(bare), Buffer.from(seeded))).not.toBe(0);
    expect(buildScene([plot(1, { stage: 0, seeded: true })]).trees[0].sprite).toBe("stage_seed");
    expect(buildScene([plot(1, { stage: 0, seeded: true, plain: true })]).trees[0].sprite).toBe("stage_0");
    expect(buildScene([plot(1, { stage: 2, seeded: true })]).trees[0].sprite).toBe("stage_2");
  });

  it("is unchanged for plots without style, and the scene carries no style key", () => {
    expect(buildScene([plot(1)]).trees[0]).not.toHaveProperty("style");
    expect(buildScene([plot(1, { style: AUTUMN, plain: true })]).trees[0]).not.toHaveProperty("style");
  });

  it("never throws on a malformed style", () => {
    const bad = { shape: 1, leaf: "leaf:zzz" } as unknown as IslandPlot["style"];
    expect(() => renderIsland([plot(1, { style: bad })])).not.toThrow();
  });
});

describe("tree sprites and keys", () => {
  it("stage_seed is stage_1 without its seed pixel", () => {
    expect(SPRITES.stage_seed.join("\n")).toBe(SPRITES.stage_1.join("\n").replace("n", "."));
    expect(SPRITES.stage_seed.join("")).not.toContain("n");
  });
  it("styleKey is distinct per style", () => {
    expect(styleKey(AUTUMN)).not.toBe(styleKey(BIRCH));
    expect(styleKey(AUTUMN)).toBe(styleKey(resolveStyle({ leaf: "leaf:autumn" })));
  });
  it("recolours leaf pixels and leaves unrelated ones", () => {
    expect(mapTreeColor(AUTUMN, "m", 5)).toBe(treeItem("leaf:autumn")!.colors![1]);
    expect(PALETTE.m).toBeDefined();
  });
});
