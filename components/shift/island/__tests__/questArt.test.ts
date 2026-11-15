import { questGuide } from "@/lib/shift-island/quest-canvas";

import { MAIN_SLUGS } from "../__fixtures__/board";
import { QUEST_PITFALLS } from "../copy";
import { checkIcon, exampleArt, HELPER_ICONS, PITFALL_ICONS } from "../questArt";
import { WEB_SPRITES, iconGrid, type IconKey } from "../sprites";

/** An icon that resolves to its own art, not the seed fallback. */
function drawn(key: IconKey): boolean {
  return key === "seed" || iconGrid(key) !== WEB_SPRITES.seed;
}

describe("quest page pictures", () => {
  it("gives every main quest checklist item its own picture", () => {
    for (const slug of MAIN_SLUGS) {
      for (const item of questGuide({ kind: "main", slug }).checklist) {
        const icon = checkIcon(item.id);
        expect([slug, item.id, icon]).not.toEqual([slug, item.id, "check"]);
        expect(drawn(icon)).toBe(true);
      }
    }
  });

  it("gives every pitfall a picture that is drawn", () => {
    const pitfalls = Object.values(QUEST_PITFALLS).flat();
    expect(pitfalls.length).toBeGreaterThan(0);
    for (const pitfall of pitfalls) expect(drawn(pitfall.icon)).toBe(true);
    // No two pitfalls share a picture: each one reads on its own.
    expect(new Set(pitfalls.map((p) => p.icon)).size).toBe(pitfalls.length);
  });

  it("draws the section and row icons", () => {
    for (const key of [...Object.values(PITFALL_ICONS), ...Object.values(HELPER_ICONS)]) expect(drawn(key)).toBe(true);
  });

  it("pictures an example by the route it names, and a bulb otherwise", () => {
    expect(exampleArt("ซอฟต์แวร์: หน้าเว็บที่ทำได้อย่างเดียว")).toEqual({ icon: "gear", route: "ซอฟต์แวร์", text: "หน้าเว็บที่ทำได้อย่างเดียว" });
    expect(exampleArt("งานสร้างสรรค์: ฉากเดียว").icon).toBe("paint");
    expect(exampleArt("บริการ: ลองให้บริการจริงหนึ่งครั้ง").icon).toBe("megaphone");
    expect(exampleArt("คุยกับบรรณารักษ์ 15 นาที")).toEqual({ icon: "bulb", route: null, text: "คุยกับบรรณารักษ์ 15 นาที" });
  });

  it("draws every web icon on a 16 by 16 grid", () => {
    for (const [name, grid] of Object.entries(WEB_SPRITES)) {
      expect([name, grid.length]).toEqual([name, 16]);
      for (const row of grid) expect([name, row.length]).toEqual([name, 16]);
    }
  });
});
