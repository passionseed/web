import {
  DEFAULT_STYLE,
  SEEDS,
  TREE_ITEMS,
  mapTreeColor,
  resolveStyle,
  treeItem,
  type SeedId,
  type TreeSlot,
} from "@/lib/shift-island/tree-style";

const SLOTS: TreeSlot[] = ["shape", "leaf", "bark", "bloom"];
const autumnStyle = { ...DEFAULT_STYLE, leaf: "leaf:autumn" };
const birchStyle = { ...DEFAULT_STYLE, bark: "bark:birch" };

describe("resolveStyle", () => {
  it("falls back to the default for null and unknown ids", () => {
    expect(resolveStyle(null)).toEqual(DEFAULT_STYLE);
    expect(resolveStyle({ leaf: "leaf:nope" })).toEqual(DEFAULT_STYLE);
  });

  it("keeps known ids and ignores ids from the wrong slot", () => {
    expect(resolveStyle({ leaf: "leaf:autumn" }).leaf).toBe("leaf:autumn");
    expect(resolveStyle({ leaf: "bark:birch" }).leaf).toBe(DEFAULT_STYLE.leaf);
  });
});

describe("catalog", () => {
  it("has unique ids and resolvable items", () => {
    const ids = TREE_ITEMS.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(treeItem(id)?.id).toBe(id);
    expect(treeItem("nope")).toBeNull();
  });

  it("has exactly one default per slot, matching DEFAULT_STYLE", () => {
    for (const slot of SLOTS) {
      expect(TREE_ITEMS.some((i) => i.id === DEFAULT_STYLE[slot] && i.slot === slot)).toBe(true);
    }
  });

  it("builds every seed from catalog items of the right slot", () => {
    for (const seed of Object.keys(SEEDS) as SeedId[]) {
      for (const slot of SLOTS) {
        expect(treeItem(SEEDS[seed].style[slot])?.slot).toBe(slot);
      }
    }
  });

  it("has no em dashes in names", () => {
    for (const i of TREE_ITEMS) expect(i.name).not.toContain("—");
    for (const s of Object.values(SEEDS)) expect(s.name).not.toContain("—");
  });
});

describe("mapTreeColor", () => {
  it("recolours leaves", () => {
    expect(mapTreeColor(autumnStyle, "m", 5)).toBe("#C9603A");
  });

  it("recolours bark above the soil only", () => {
    expect(mapTreeColor(birchStyle, "c", 28)).toBe("#CFC8B8");
    expect(mapTreeColor(birchStyle, "c", 29)).toBe("#CFC8B8");
    expect(mapTreeColor(birchStyle, "c", 30)).toBeNull();
  });

  it("leaves other palette keys alone", () => {
    expect(mapTreeColor(DEFAULT_STYLE, "o", 3)).toBeNull();
  });
});
