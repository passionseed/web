import { PALETTE } from "@/bot/assets/island/sprites";

import { buildAtlasData } from "../atlas";
import { gradeKey, gradeMultiply, gradeRgb, gradedWater } from "../grade";
import { paletteRgb, waterColor } from "../lighting";

const luma = ([r, g, b]: readonly number[]) => 0.299 * r + 0.587 * g + 0.114 * b;

describe("the web's grade of the hour", () => {
  it("leaves day alone, so a daytime canvas still matches the bot's picture", () => {
    for (const key of Object.keys(PALETTE)) expect(gradeKey(key, "day")).toEqual(paletteRgb(key));
    expect(gradeRgb([12, 200, 99], "day")).toEqual([12, 200, 99]);
    expect(gradedWater("day")).toBe(waterColor("day"));
    expect(gradeMultiply("day")).toEqual([255, 255, 255]);
    // The day atlas is the same with or without the grade.
    expect(buildAtlasData("day", undefined, [], gradeRgb).data).toEqual(buildAtlasData("day").data);
  });

  it("darkens the land at night but keeps its colour, and keeps the sea below the land", () => {
    for (const key of ["g", "h", "s", "a", "c"]) {
      const day = paletteRgb(key)!;
      const night = gradeKey(key, "night");
      expect(luma(night)).toBeLessThan(luma(day));
      // Not a grey wash: some channel still differs from the others.
      expect(Math.max(...night) - Math.min(...night)).toBeGreaterThan(18);
    }
    expect(luma(gradeKey("w", "night"))).toBeLessThan(luma(gradeKey("g", "night")));
    expect(luma(gradeKey("w", "night"))).toBeLessThan(luma(gradeKey("s", "night")));
  });

  it("gives dawn and dusk their own light: dusk warmer than dawn on the sand, dawn's sea greener", () => {
    const [dr, , db] = gradeKey("s", "dusk");
    const [ar, , ab] = gradeKey("s", "dawn");
    expect(dr - db).toBeGreaterThan(ar - ab);
    expect(gradeKey("w", "dawn")[1]).toBeGreaterThan(gradeKey("w", "dusk")[1]);
  });

  it("keeps a floor at night: soil outlines and leaves stay apart from the moonlit grass", () => {
    const lin = (c: number) => ((c /= 255) <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
    const lum = ([r, g, b]: readonly number[]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
    const contrast = (a: readonly number[], b: readonly number[]) => {
      const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
      return (hi + 0.05) / (lo + 0.05);
    };
    const grass = gradeKey("g", "night");
    // The mound's outline and the tree's darkest leaves: at least twice and 1.8 times the grass's contrast.
    expect(contrast(gradeKey("b", "night"), grass)).toBeGreaterThan(2);
    expect(contrast(gradeKey("l", "night"), grass)).toBeGreaterThan(1.8);
    // The soil stays warmer than the grass (mauve against teal), not the same grey-blue.
    const [sr, , sb] = gradeKey("c", "night");
    const [gr, , gb] = grass;
    expect(sr - sb).toBeGreaterThan(gr - gb);
  });

  it("gives dusk a dusty rose sand rather than a strong orange-peach", () => {
    const sat = ([r, g, b]: readonly number[]) => (Math.max(r, g, b) - Math.min(r, g, b)) / Math.max(r, g, b);
    for (const key of ["s", "d", "i"]) expect([key, sat(gradeKey(key, "dusk")) < 0.34]).toEqual([key, true]);
  });

  it("is a pure function of the colour and the hour", () => {
    expect(gradeRgb([120, 80, 40], "dusk")).toEqual(gradeRgb([120, 80, 40], "dusk"));
    expect(gradedWater("night")).toMatch(/^#[0-9a-f]{6}$/);
  });
});
