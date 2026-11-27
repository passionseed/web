/** @jest-environment node */
import { loadImage } from "@napi-rs/canvas";

import { ELEMENTAL, prizeTotal, thaiDateLine } from "@/components/hackathon/poster/elemental/facts";
import { elementalShareDescription } from "@/lib/hackathon/elemental/share";
import { ELEMENTAL_OG_SIZE, elementalOgAlt, elementalOgDetails, renderElementalOg } from "../elemental-hackathon";

describe("Elemental link preview", () => {
  it("prints the dates, format, prize and group price from facts.ts", () => {
    expect(elementalOgDetails()).toEqual([
      thaiDateLine(),
      ELEMENTAL.formatShortTh,
      `รางวัลรวม ${prizeTotal()} บาท`,
      `มากับเพื่อน ฿${ELEMENTAL.groupPriceBaht}`,
    ]);
  });

  it("says the same in its alt text and the share description, never the old dates", () => {
    for (const text of [elementalOgAlt(), elementalShareDescription()]) {
      expect(text).toContain(thaiDateLine());
      expect(text).not.toMatch(/5 ถึง 7|5–7|5-7/);
      expect(text).not.toContain("—");
    }
  });

  it("draws a 1200x630 JPEG", async () => {
    const jpeg = await renderElementalOg();
    expect([...jpeg.subarray(0, 3)]).toEqual([0xff, 0xd8, 0xff]);
    const image = await loadImage(jpeg);
    expect({ width: image.width, height: image.height }).toEqual(ELEMENTAL_OG_SIZE);
    // A photo: keep it small enough for chat apps to fetch quickly.
    expect(jpeg.length).toBeLessThan(400_000);
  });
});
