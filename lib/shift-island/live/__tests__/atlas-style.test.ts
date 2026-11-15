import { allSprites, buildAtlasData, stylesOf, treeSpriteKey } from "../atlas";
import { resolveStyle, treeItem } from "@/lib/shift-island/tree-style";

const AUTUMN = resolveStyle({ leaf: "leaf:autumn", bark: "bark:birch" });
const px = (d: ReturnType<typeof buildAtlasData>, key: string, i: number, j: number) => {
  const r = d.rects.get(key)!;
  const k = ((r.y + j) * d.width + r.x + i) * 4;
  return [...d.data.slice(k, k + 4)];
};
const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

describe("styled tree atlas copies", () => {
  it("adds one recoloured copy per style and sprite, keyed sprite|style, and none without styles", () => {
    expect(buildAtlasData("day").rects.has(treeSpriteKey("stage_7", AUTUMN))).toBe(false);
    const data = buildAtlasData("day", allSprites(), [AUTUMN]);
    for (const name of ["stage_0", "stage_7", "stage_seed", "stage_7_b"]) {
      expect(data.rects.has(treeSpriteKey(name, AUTUMN))).toBe(true);
      expect(data.flipped.has(treeSpriteKey(name, AUTUMN))).toBe(true);
    }
  });

  it("recolours leaf pixels, keeps soil, and leaves the plain sprite alone", () => {
    const data = buildAtlasData("day", allSprites(), [AUTUMN]);
    const rows = allSprites().stage_7;
    let leaf: [number, number] | null = null;
    let soil: [number, number] | null = null;
    rows.forEach((row, j) => [...row].forEach((ch, i) => {
      if (!leaf && ch === "m" && j < 30) leaf = [i, j];
      if (!soil && ch === "b" && j >= 30) soil = [i, j];
    }));
    expect(px(data, treeSpriteKey("stage_7", AUTUMN), ...leaf!).slice(0, 3)).toEqual(rgb(treeItem("leaf:autumn")!.colors![1]));
    expect(px(data, treeSpriteKey("stage_7", AUTUMN), ...soil!)).toEqual(px(data, "stage_7", ...soil!));
    expect(px(data, "stage_7", ...leaf!).slice(0, 3)).not.toEqual(rgb(treeItem("leaf:autumn")!.colors![1]));
  });

  it("collects distinct styles from a scene's trees", () => {
    expect(stylesOf([{ style: AUTUMN }, {}, { style: { ...AUTUMN } }])).toEqual([AUTUMN]);
    expect(stylesOf([{}])).toEqual([]);
  });
});
