/**
 * @jest-environment node
 */
import { PALETTE } from "@/bot/assets/island/sprites";

import { buildAtlasData } from "../atlas";
import { allSprites } from "../atlas";
import { PHASE_TINT, bangkokMinutes, bangkokPhase, paletteRgb, tint, waterColor } from "../lighting";

/** A Bangkok wall-clock time (UTC+7) on 11 Nov 2026, as epoch ms. */
const bangkok = (h: number, m: number) => Date.UTC(2026, 10, 11, h - 7, m);

describe("bangkokPhase", () => {
  const zone = process.env.TZ;
  afterAll(() => {
    process.env.TZ = zone;
  });

  it.each(["America/Los_Angeles", "UTC", "Asia/Tokyo", "Pacific/Kiritimati"])("follows Bangkok time whatever the device zone (%s)", (tz) => {
    process.env.TZ = tz;
    const cases: [number, number, string][] = [
      [0, 0, "night"],
      [5, 29, "night"],
      [5, 30, "dawn"],
      [6, 59, "dawn"],
      [7, 0, "day"],
      [12, 0, "day"],
      [17, 29, "day"],
      [17, 30, "dusk"],
      [18, 59, "dusk"],
      [19, 0, "night"],
      [23, 59, "night"],
    ];
    for (const [h, m, phase] of cases) expect([h, m, bangkokPhase(bangkok(h, m))]).toEqual([h, m, phase]);
    expect(bangkokMinutes(bangkok(5, 30))).toBe(330);
  });

  it("handles times before 1970 and seconds inside a minute", () => {
    expect(bangkokPhase(bangkok(5, 29) + 59_999)).toBe("night");
    expect(bangkokPhase(Date.UTC(1969, 11, 31, 12 - 7, 0))).toBe("day");
  });
});

describe("tints", () => {
  it("leaves day untouched and darkens night", () => {
    for (const key of Object.keys(PALETTE)) {
      const rgb = paletteRgb(key)!;
      expect(tint(rgb, "day")).toEqual(rgb);
      const night = tint(rgb, "night");
      expect(night.every((v, i) => v <= rgb[i])).toBe(true);
    }
    expect(PHASE_TINT.day).toEqual([1, 1, 1]);
    expect(waterColor("day")).toBe(PALETTE.w.toLowerCase());
    expect(waterColor("night")).not.toBe(waterColor("day"));
  });

  it("keeps the day atlas on the palette's own colours, the pin and lantern glow untinted, lamp light lit", () => {
    const day = buildAtlasData("day");
    const night = buildAtlasData("night");
    const px = (data: Uint8ClampedArray, width: number, x: number, y: number) => Array.from(data.slice((y * width + x) * 4, (y * width + x) * 4 + 4));
    const sprites = allSprites();
    const check = (name: string, lit: string | "all" | "none") => {
      const r = day.rects.get(name)!;
      const rows = sprites[name];
      rows.forEach((row, j) =>
        [...row].forEach((ch, i) => {
          if (ch === ".") return;
          const d = px(day.data, day.width, r.x + i, r.y + j);
          const n = px(night.data, night.width, r.x + i, r.y + j);
          expect(d).toEqual([...paletteRgb(ch)!, 255]);
          const untinted = lit === "all" || (lit !== "none" && lit.includes(ch));
          if (untinted) expect([name, ch, n]).toEqual([name, ch, d]);
          else expect([name, ch, n]).toEqual([name, ch, [...tint(paletteRgb(ch)!, "night"), 255]]);
        })
      );
    };
    check("marker", "all");
    check("lantern_glow_0", "all");
    check("lamp_post", "yif");
    check("stage_5", "none");
    check("water_a", "none");
  });
});
