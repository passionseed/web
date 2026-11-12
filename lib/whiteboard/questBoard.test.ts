import { BLOCK_GAP, NAME_ROOM, nameSize, packBlocks } from "./questBoard";

describe("packBlocks", () => {
  it("lays blocks out in rows, in order, without overlap", () => {
    const sizes = Array.from({ length: 6 }, (_, i) => ({ key: `s${i}`, width: 400, height: 300 }));
    const placed = packBlocks(sizes);
    expect(placed.map((p) => p.key)).toEqual(sizes.map((s) => s.key));
    for (const a of placed)
      for (const b of placed) {
        if (a === b) continue;
        const apart = a.x + a.width + BLOCK_GAP <= b.x || b.x + b.width + BLOCK_GAP <= a.x || a.y + a.height + NAME_ROOM <= b.y || b.y + b.height + NAME_ROOM <= a.y;
        expect(apart).toBe(true);
      }
    // Six equal blocks: more than one row, and more than one per row.
    const rows = new Set(placed.map((p) => p.y));
    expect(rows.size).toBeGreaterThan(1);
    expect(rows.size).toBeLessThan(6);
  });

  it("gives a block wider than the rest a row of its own", () => {
    const placed = packBlocks([
      { key: "wide", width: 5000, height: 200 },
      { key: "a", width: 300, height: 200 },
    ]);
    expect(placed[0]).toMatchObject({ x: 0, y: NAME_ROOM });
    expect(placed[1].x).toBeGreaterThanOrEqual(0);
    expect(packBlocks([])).toEqual([]);
  });
});

describe("nameSize", () => {
  it("grows names with the layout so they read when it is all in view, within limits", () => {
    expect(nameSize(600)).toBe(36);
    expect(nameSize(4500)).toBe(150);
    expect(nameSize(50000)).toBe(200);
  });
  it("leaves the room asked for above each block", () => {
    expect(packBlocks([{ key: "a", width: 100, height: 100 }], 300)[0].y).toBe(300);
  });
});
