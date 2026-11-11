import { bayer, ditherLevel, hashCell, paintDawn, paintSky } from "../dither";

const frame = (cols: number, rows: number) => ({
  pixels: new Uint32Array(cols * rows),
  cols,
  rows,
  cell: 3,
  time: 0,
  scroll: 0,
});

describe("home page dither", () => {
  it("uses every Bayer threshold once per 8x8 tile", () => {
    const seen = new Set<number>();
    for (let y = 0; y < 8; y++)
      for (let x = 0; x < 8; x++) seen.add(bayer(x, y));
    expect(seen.size).toBe(64);
    expect(Math.min(...seen)).toBeGreaterThan(0);
    expect(Math.max(...seen)).toBeLessThan(1);
    expect(bayer(9, 17)).toBe(bayer(1, 1));
  });

  it("keeps empty sky empty and full light at the top level", () => {
    for (let i = 0; i < 64; i++) {
      expect(ditherLevel(0, i, i * 3, 4)).toBe(0);
      expect(ditherLevel(1, i, i * 3, 4)).toBe(3);
      expect(ditherLevel(-2, i, 0, 4)).toBe(0);
      expect(ditherLevel(9, i, 0, 4)).toBe(3);
    }
  });

  it("averages out to the light value over a tile", () => {
    for (const value of [0.1, 0.37, 0.5, 0.82]) {
      let sum = 0;
      for (let y = 0; y < 8; y++)
        for (let x = 0; x < 8; x++) sum += ditherLevel(value, x, y, 4);
      expect(sum / 64 / 3).toBeCloseTo(value, 1);
    }
  });

  it("hashes a cell the same way every frame", () => {
    expect(hashCell(12, 40)).toBe(hashCell(12, 40));
    expect(hashCell(12, 40)).not.toBe(hashCell(13, 40));
  });

  it("paints a sky that is mostly dark, so copy stays readable", () => {
    const sky = frame(480, 300);
    paintSky(sky);
    const lit = sky.pixels.filter((p) => p !== 0).length;
    expect(lit).toBeGreaterThan(sky.pixels.length * 0.05);
    expect(lit).toBeLessThan(sky.pixels.length * 0.6);
  });

  it("holds the sky still when time and scroll do not move", () => {
    const a = frame(120, 90);
    const b = frame(120, 90);
    paintSky(a);
    paintSky(b);
    expect(Array.from(a.pixels)).toEqual(Array.from(b.pixels));
  });

  it("puts the sun at the bottom of the closing section, not behind the copy", () => {
    const dawn = frame(400, 200);
    paintDawn(dawn);
    const litIn = (from: number, to: number) => {
      let lit = 0;
      for (let y = from; y < to; y++)
        for (let x = 0; x < 400; x++) if (dawn.pixels[y * 400 + x]) lit++;
      return lit / ((to - from) * 400);
    };
    expect(litIn(0, 60)).toBeLessThan(0.15);
    expect(litIn(170, 200)).toBeGreaterThan(0.9);
  });
});
