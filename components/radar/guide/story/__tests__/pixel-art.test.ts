import { BADGE_GLYPHS, gridRuns, gridSize, HOST_GRID, HOST_GRIDS, HOST_PALETTE, avatarPalette } from "../pixel-art";

const BADGE_ICONS = [
  "bug",
  "key",
  "shield",
  "radar",
  "chat",
  "ladder",
  "coin",
  "compass",
  "map",
  "terminal",
  "flag",
  "star",
  "heart",
  "eye",
] as const;

describe("host sprite grids", () => {
  it.each(Object.keys(HOST_GRIDS) as (keyof typeof HOST_GRIDS)[])("%s is %dx%d with known colours", (frame) => {
    const grid = HOST_GRIDS[frame];
    expect(gridSize(grid)).toEqual({ w: HOST_GRID.w, h: HOST_GRID.h });
    for (const row of grid) {
      for (const ch of row) {
        if (ch !== ".") expect(HOST_PALETTE[ch]).toBeDefined();
      }
    }
  });

  it("talk differs from idle only around the mouth", () => {
    const changed = HOST_GRIDS.idle.map((row, y) => (row === HOST_GRIDS.talk[y] ? null : y)).filter((y) => y !== null);
    expect(changed.length).toBeGreaterThan(0);
    for (const y of changed) expect(y).toBeGreaterThanOrEqual(11);
    for (const y of changed) expect(y).toBeLessThanOrEqual(13);
  });

  it("the avatar drops the headset and wears the accent", () => {
    const pal = avatarPalette("#5cff5c");
    expect(pal.O).toBe("transparent");
    expect(pal.J).toBe("#5cff5c");
    const runs = gridRuns(HOST_GRIDS.idle, pal);
    expect(runs.some((r) => r.color === "#5cff5c")).toBe(true);
    expect(runs.some((r) => r.color === HOST_PALETTE.O)).toBe(false); // no headset or mic
  });
});

describe("badge glyphs", () => {
  it.each(BADGE_ICONS)("%s is 8x8", (icon) => {
    expect(gridSize(BADGE_GLYPHS[icon])).toEqual({ w: 8, h: 8 });
    expect(BADGE_GLYPHS[icon].join("")).toMatch(/[#o]/);
  });
});

describe("gridRuns", () => {
  it("merges same-colour runs and skips transparent cells", () => {
    expect(gridRuns(["AAB.", ".BB."], { A: "#111111", B: "#222222" })).toEqual([
      { x: 0, y: 0, w: 2, color: "#111111" },
      { x: 2, y: 0, w: 1, color: "#222222" },
      { x: 1, y: 1, w: 2, color: "#222222" },
    ]);
  });

  it("rejects ragged grids", () => {
    expect(() => gridSize(["..", "..."])).toThrow(/ragged/);
  });
});
