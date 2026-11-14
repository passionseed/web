import {
  CLOSEUP_SIZE,
  closeupGrid,
  gridToRgba,
  type CloseupInput,
  type PixelGrid,
} from "@/lib/shift-island/tree-closeup";
import { DEFAULT_STYLE, resolveStyle } from "@/lib/shift-island/tree-style";

const { ground } = CLOSEUP_SIZE;

function input(over: Partial<CloseupInput> = {}): CloseupInput {
  return { style: DEFAULT_STYLE, stage: 7, seeded: true, roots: { count: 5, recent: 0 }, ...over };
}

/** True when any pixel in rows [from, to) is the colour. */
function has(grid: PixelGrid, hex: string, from = 0, to = grid.length): boolean {
  return grid.slice(from, to).some((row) => row.includes(hex));
}

const sky = (g: PixelGrid) => JSON.stringify(g.slice(0, ground));
const soil = (g: PixelGrid) => JSON.stringify(g.slice(ground));

describe("closeupGrid", () => {
  it("is always 96 x 150 and fully painted, at every stage", () => {
    for (let stage = 0; stage <= 7; stage++) {
      for (const seeded of [false, true]) {
        const grid = closeupGrid(input({ stage, seeded }));
        expect(grid).toHaveLength(150);
        for (const row of grid) {
          expect(row).toHaveLength(96);
          expect(row).not.toContain(null);
        }
      }
    }
  });

  it("draws the same grid for the same input", () => {
    const a = closeupGrid(input({ roots: { count: 9, recent: 3 } }));
    const b = closeupGrid(input({ roots: { count: 9, recent: 3 } }));
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("puts a stage 0 seed underground and changes nothing above it", () => {
    const empty = closeupGrid(input({ stage: 0, seeded: false }));
    const seeded = closeupGrid(input({ stage: 0, seeded: true }));
    expect(sky(seeded)).toBe(sky(empty));
    expect(soil(seeded)).not.toBe(soil(empty));
  });

  it("draws no roots on an empty plot", () => {
    const none = closeupGrid(input({ stage: 0, seeded: false, roots: { count: 0, recent: 0 } }));
    const many = closeupGrid(input({ stage: 0, seeded: false, roots: { count: 15, recent: 15 } }));
    expect(JSON.stringify(many)).toBe(JSON.stringify(none));
  });

  it("flowers in the bloom colours at stage 7 only", () => {
    const sakura = { ...DEFAULT_STYLE, bloom: "bloom:sakura" };
    expect(has(closeupGrid(input({ style: sakura, stage: 7 })), "#F48FB1")).toBe(true);
    expect(has(closeupGrid(input({ style: sakura, stage: 5 })), "#F48FB1")).toBe(false);
  });

  it("paints the leaves in the leaf colours", () => {
    const grid = closeupGrid(input({ style: { ...DEFAULT_STYLE, leaf: "leaf:autumn" } }));
    expect(has(grid, "#C9603A")).toBe(true);
    expect(has(grid, "#50976B")).toBe(false);
  });

  it("draws one root per reflection, up to 15", () => {
    const at = (count: number) => closeupGrid(input({ roots: { count, recent: 0 } }));
    expect(soil(at(5))).not.toBe(soil(at(0)));
    expect(JSON.stringify(at(40))).toBe(JSON.stringify(at(15)));
  });

  it("lights root tips for recent reflections only", () => {
    const quiet = closeupGrid(input({ roots: { count: 5, recent: 0 } }));
    const recent = closeupGrid(input({ roots: { count: 5, recent: 2 } }));
    expect(has(quiet, "#F4C56A", ground)).toBe(false);
    expect(has(recent, "#F4C56A", ground)).toBe(true);
  });

  it("draws an unknown shape like the round default", () => {
    const round = JSON.stringify(closeupGrid(input()));
    const resolved = resolveStyle({ shape: "shape:nope" });
    expect(JSON.stringify(closeupGrid(input({ style: resolved })))).toBe(round);
    const raw = { ...DEFAULT_STYLE, shape: "shape:nope" };
    expect(JSON.stringify(closeupGrid(input({ style: raw })))).toBe(round);
  });
});

describe("gridToRgba", () => {
  it("scales the grid up into RGBA bytes", () => {
    const out = gridToRgba(closeupGrid(input()), 2);
    expect(out.width).toBe(192);
    expect(out.height).toBe(300);
    expect(out.data.length).toBe(192 * 300 * 4);
  });

  it("writes hex colours opaque and empty pixels transparent", () => {
    const { data } = gridToRgba([["#10203A", null]], 1);
    expect([...data]).toEqual([0x10, 0x20, 0x3a, 255, 0, 0, 0, 0]);
  });
});
