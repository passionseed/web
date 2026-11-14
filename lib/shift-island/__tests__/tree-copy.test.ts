/**
 * @jest-environment node
 */
import { lintText } from "@/lib/marketing/copyRules";
import { TREE as BOT_TREE } from "@/bot/src/quests/island/copy";
import { TREE as WEB_TREE } from "@/components/shift/island/copy";

import { TREE_CLOSEUP, TREE_GIFT, TREE_PLANTED, TREE_SEEDS, TREE_WARDROBE } from "../tree-copy";

/** Every shared string, functions called with real arguments (roots for 0 and n > 0). */
function shared(): [string, string][] {
  const out: [string, string][] = [
    ["planted", TREE_PLANTED],
    ["roots(0)", TREE_CLOSEUP.roots(0)],
    ["roots(1)", TREE_CLOSEUP.roots(1)],
    ["roots(12)", TREE_CLOSEUP.roots(12)],
    ["picked", TREE_GIFT.picked("ซากุระ")],
  ];
  const walk = (prefix: string, v: unknown): void => {
    if (typeof v === "string") out.push([prefix, v]);
    else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) walk(`${prefix}.${k}`, x);
  };
  walk("seeds", TREE_SEEDS);
  walk("gift", TREE_GIFT);
  walk("wardrobe", TREE_WARDROBE);
  walk("closeup", TREE_CLOSEUP);
  return out;
}

describe("shared tree copy", () => {
  it.each(shared())("%s follows the house rules", (path, text) => {
    expect(lintText(text, path, "instagram")).toEqual([]);
    expect(text).not.toMatch(/—|–|น้องๆ|ปลูก|สตรีค|streak|เหี่ยว|อันดับ/i);
  });

  it("is the one source for both the website and the bot", () => {
    expect(WEB_TREE.seeds).toBe(TREE_SEEDS);
    expect(BOT_TREE.seeds).toBe(TREE_SEEDS);
    expect(WEB_TREE.seed.planted).toBe(TREE_PLANTED);
    expect(BOT_TREE.planted).toBe(TREE_PLANTED);
    for (const key of ["roundHeading", "questHeading", "sub", "keep", "picked"] as const) {
      expect(WEB_TREE.gift[key]).toBe(TREE_GIFT[key]);
      expect(BOT_TREE.gift[key]).toBe(TREE_GIFT[key]);
    }
    expect(WEB_TREE.wardrobe.heading).toBe(TREE_WARDROBE.heading);
    expect(BOT_TREE.wardrobe).toBe(TREE_WARDROBE);
    expect(WEB_TREE.closeup.roots(4)).toBe(TREE_CLOSEUP.roots(4));
    expect(BOT_TREE.closeup).toBe(TREE_CLOSEUP);
  });
});
