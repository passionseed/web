/**
 * @jest-environment node
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { SPRITES } from "../../../assets/island/sprites";
import { TILE_BY_CODE, TILE_CODES, buildScene, glyphFor, inkTop, layoutFor, plotBoxes, renderIsland, type IslandPlot } from "../island/render";

function plots(n: number): IslandPlot[] {
  return Array.from({ length: n }, (_, k) => ({
    slot: k + 1,
    stage: k % 8,
    visitor: k % 8 >= 3,
    key: k % 5 === 0,
    helper: k % 4 === 0,
    lantern: k % 7 === 0,
    name: `โปรเจกต์ ${k + 1}`,
    mine: k === 2,
  }));
}

describe("buildScene", () => {
  it("is the size of the picture and agrees with plotBoxes", () => {
    for (const n of [0, 1, 6, 24, 40, 120, 200]) {
      const input = plots(n);
      const scene = buildScene(input, { markMine: true, festival: true });
      const boxes = plotBoxes(input);
      const png = renderIsland(input, { scale: 1 });
      expect([n, scene.width, scene.height]).toEqual([n, boxes.width, boxes.height]);
      expect([n, scene.width, scene.height]).toEqual([n, png.width, png.height]);
      expect([scene.cols * 16, scene.rows * 16, scene.tile]).toEqual([scene.width, scene.height, 16]);
      expect(scene.tiles).toHaveLength(scene.cols * scene.rows);
      expect(scene.glyph).toBe(glyphFor(scene.cols));
      expect(scene.trees.map((t) => t.slot)).toEqual(boxes.boxes.map((b) => b.slot));
      expect(scene.tags.map((t) => t.slot)).toEqual(boxes.boxes.map((b) => b.slot));
      // Every tree's 32 x 40 sprite and its tag lie inside its tap box.
      scene.trees.forEach((tree, k) => {
        const box = boxes.boxes[k];
        const tag = scene.tags[k];
        const inside = (x: number, y: number, w: number, h: number) =>
          x >= box.left && y >= box.top && x + w <= box.left + box.width && y + h <= box.top + box.height;
        expect([n, tree.slot, tree.w, tree.h, inside(tree.left, tree.top, tree.w, tree.h), inside(tag.x, tag.y, tag.w, tag.h)]).toEqual([
          n,
          tree.slot,
          32,
          40,
          true,
          true,
        ]);
      });
    }
  });

  it("only uses known tile codes and sprite names", () => {
    const scene = buildScene(plots(40), { festival: true });
    const codes = new Set<string>(Object.values(TILE_CODES));
    for (const ch of scene.tiles) expect(codes.has(ch)).toBe(true);
    for (const [code, name] of Object.entries(TILE_BY_CODE)) expect([code, Boolean(SPRITES[name])]).toEqual([code, true]);
    for (const tree of scene.trees) expect(SPRITES[tree.sprite]).toBeDefined();
    expect(new Set(scene.paths).size).toBe(scene.paths.length);
    for (const cell of scene.paths) {
      expect(cell).toBeGreaterThanOrEqual(0);
      expect(cell).toBeLessThan(scene.tiles.length);
      // Paths only cross land.
      expect(["a", "b"]).not.toContain(scene.tiles[cell]);
    }
  });

  it("keeps the boat lane on open water across the whole width, and the gull lane in the top rows", () => {
    for (const n of [0, 1, 24, 40, 200]) {
      const scene = buildScene(plots(n));
      const { boatY, gullY } = scene.lanes;
      expect([n, boatY >= scene.height - 32, boatY + 12 <= scene.height]).toEqual([n, true, true]);
      expect([n, gullY >= 0, gullY + 5 + 4 <= 32]).toEqual([n, true, true]);
      const water = (row: number) => [...scene.tiles.slice(row * scene.cols, (row + 1) * scene.cols)].every((c) => c === "a" || c === "b");
      for (let row = Math.floor(boatY / 16); row <= Math.floor((boatY + 11) / 16); row++) expect([n, row, water(row)]).toEqual([n, row, true]);
      for (const row of [0, 1]) expect([n, row, water(row)]).toEqual([n, row, true]);
    }
  });

  it("records the decorations where the PNG draws them", () => {
    const input = plots(8);
    const scene = buildScene(input, { markMine: true, festival: true });
    const layout = layoutFor(8);
    for (const tree of scene.trees) {
      const plot = input.find((p) => p.slot === tree.slot)!;
      expect(tree.key).toEqual(plot.key ? { x: tree.left - 6, y: tree.top + tree.h - 22 } : null);
      expect(tree.visitor).toEqual(plot.visitor ? { x: tree.left + tree.w - 2, y: tree.top + tree.h - 18 } : null);
      expect(tree.lantern).toEqual(plot.lantern ? { x: tree.left + tree.w + 6, y: tree.top + tree.h - 20 } : null);
    }
    expect(scene.well).toEqual({ x: layout.pcx * 16 - 12, y: layout.pcy * 16 - 12 });
    expect(scene.banner).toEqual({ x: layout.pcx * 16 - 24, y: layout.plaza.y * 16 - 20 + 4 });
    expect(scene.boatStill).toEqual({ x: 32, y: scene.height - 32 - 12 });
    const mine = scene.trees.find((t) => t.mine)!;
    expect(scene.marker).toMatchObject({ scale: scene.glyph });
    expect(scene.marker!.y + 9 * scene.marker!.scale).toBeLessThan(mine.top + inkTop(mine.sprite));
    expect(buildScene(input).marker).toBeNull();
    expect(buildScene(input).banner).toBeNull();
  });

  it("draws plain plots empty and carries no names", () => {
    const input = plots(6).map((p) => (p.slot === 4 ? { ...p, stage: 6, key: true, lantern: true, visitor: true, plain: true } : p));
    const scene = buildScene(input, { markMine: true });
    expect(scene.trees.find((t) => t.slot === 4)).toMatchObject({ stage: 0, sprite: "stage_0", key: null, visitor: null, lantern: null });
    expect(JSON.stringify(scene)).not.toContain("โปรเจกต์");
    // Plain JSON: a server component can hand it to the browser as is.
    expect(JSON.parse(JSON.stringify(scene))).toEqual(scene);
  });

  it("imports nothing from Node, the DOM or Buffer", () => {
    const source = readFileSync(join(__dirname, "../island/scene.ts"), "utf8");
    const imports = [...source.matchAll(/^import[^;]*from\s+"([^"]+)"/gm)].map((m) => m[1]);
    expect(imports).toEqual(["../../../assets/island/sprites"]);
    const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    expect(code).not.toMatch(/\bBuffer\b|node:|\bdocument\b|\bwindow\b|\brequire\(/);
  });
});
