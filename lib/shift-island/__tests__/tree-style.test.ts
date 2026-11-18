import {
  DEFAULT_STYLE,
  SEEDS,
  TREE_ITEMS,
  mapTreeColor,
  openGifts,
  openOptions,
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

  it("has the evening guests' 10 looks at the end: 2 per guest (staff nights' 2 last), colours only, never a default or a seed's", () => {
    const guests = TREE_ITEMS.filter((i) => i.guest);
    expect(guests.map((i) => i.id)).toEqual([
      "leaf:seaglass",
      "bark:driftwood",
      "bloom:shell",
      "leaf:seafoam",
      "bloom:firefly",
      "bark:moonlit",
      "bloom:pearl",
      "leaf:kelp",
      "leaf:ember",
      "bloom:starlit",
    ]);
    // After the 22 common items, in the database's sort order (20261118150000).
    expect(TREE_ITEMS.slice(22)).toEqual(guests);
    for (const key of ["boat", "gull", "fireflies", "turtle", "mentor"]) expect(guests.filter((i) => i.guest === key)).toHaveLength(2);
    // A staff night's looks are only theirs: no rotation guest brings them.
    expect(guests.filter((i) => i.guest === "mentor").map((i) => i.id)).toEqual(["leaf:ember", "bloom:starlit"]);
    for (const i of guests) {
      expect(i.slot).not.toBe("shape");
      expect(i.stamp).toBeUndefined();
      expect(i.colors).toHaveLength(3);
      for (const c of i.colors!) expect(c).toMatch(/^#[0-9A-F]{6}$/);
      expect(Object.values(DEFAULT_STYLE)).not.toContain(i.id);
      for (const s of Object.values(SEEDS)) expect(Object.values(s.style)).not.toContain(i.id);
    }
    // A guest gift shows its look like any other: unowned, it is open.
    expect(openOptions(Object.values(DEFAULT_STYLE), ["leaf:seaglass"]).map((o) => o.item.id)).toEqual(["leaf:seaglass"]);
    expect(mapTreeColor({ ...DEFAULT_STYLE, leaf: "leaf:kelp" }, "m", 5)).toBe("#5C7330");
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

describe("openOptions and openGifts", () => {
  const owned = [...Object.values(DEFAULT_STYLE), "leaf:mint"];

  it("keeps the gift's order and each option's stored index, leaving out owned, default and unknown ids", () => {
    const open = openOptions(owned, ["leaf:autumn", "leaf:mint", "leaf:nope", "shape:round", "leaf:gold"]);
    expect(open.map((o) => [o.index, o.item.id])).toEqual([
      [0, "leaf:autumn"],
      [4, "leaf:gold"],
    ]);
  });

  it("skips a gift whose every option the team owns, and keeps the others in order", () => {
    const gifts = [
      { id: "a", options: ["leaf:mint"] },
      { id: "b", options: ["leaf:mint", "bark:birch"] },
      { id: "c", options: ["leaf:nope"] },
      { id: "d", options: ["bloom:peach"] },
    ];
    expect(openGifts(owned, gifts).map((g) => g.id)).toEqual(["b", "d"]);
    expect(openGifts([...owned, "bark:birch", "bloom:peach"], gifts)).toEqual([]);
  });
});
