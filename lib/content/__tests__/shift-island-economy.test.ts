import { lintText } from "@/lib/marketing/copyRules";

import {
  COMMUNITY_RULE_MILESTONES,
  ECONOMY_RULES_DRAFT,
  ECONOMY_STATUS,
  ECONOMY_TERMS_DRAFT,
  ISLAND_PRIZES_DRAFT,
  MAIN_RULE_MILESTONES,
  SHOP_ITEMS_DRAFT,
} from "../shift-island-economy";

/** Every string in the content file except the prize emoji, with a path for failures. */
function strings(): [string, string][] {
  const out: [string, string][] = [];
  ECONOMY_RULES_DRAFT.forEach((rule) => {
    out.push([`${rule.key}.eligibility`, rule.eligibility]);
    out.push([`${rule.key}.review`, rule.review]);
    out.push([`${rule.key}.reversal`, rule.reversal]);
  });
  SHOP_ITEMS_DRAFT.forEach((item, i) => {
    out.push([`shop[${i}].name`, item.name]);
    out.push([`shop[${i}].description`, item.description]);
  });
  for (const [key, value] of Object.entries(ECONOMY_TERMS_DRAFT)) out.push([`terms.${key}`, value]);
  out.push(["prizes.title", ISLAND_PRIZES_DRAFT.title]);
  ISLAND_PRIZES_DRAFT.prizes.forEach((prize, i) => {
    out.push([`prizes[${i}].title`, prize.title]);
    out.push([`prizes[${i}].reward`, prize.reward]);
  });
  out.push(["prizes.moneyNote", ISLAND_PRIZES_DRAFT.moneyNote]);
  out.push(["prizes.judging", ISLAND_PRIZES_DRAFT.judging]);
  out.push(["prizes.consentNote", ISLAND_PRIZES_DRAFT.consentNote]);
  return out;
}

const ALL = strings();

describe("shift island economy content", () => {
  it("is marked DRAFT", () => {
    expect(ECONOMY_STATUS).toBe("DRAFT");
  });

  it("has the five rules with the DRAFT amounts and caps", () => {
    const byKey = Object.fromEntries(ECONOMY_RULES_DRAFT.map((r) => [r.key, r]));
    expect(Object.keys(byKey).sort()).toEqual(
      ["community-quest", "helped-most", "main-quest", "side-quest", "taught-next-shift"].sort(),
    );
    expect(byKey["main-quest"]).toMatchObject({ amount: 300, cap: 5, teamAllocation: "each_confirmed", target: "main" });
    expect(byKey["community-quest"]).toMatchObject({
      amount: 500,
      cap: 4,
      teamAllocation: "each_confirmed",
      target: "community",
    });
    expect(byKey["side-quest"]).toMatchObject({ amount: 100, cap: 11, teamAllocation: "each_confirmed", target: "side" });
    expect(byKey["taught-next-shift"]).toMatchObject({ amount: 3000, cap: 1, teamAllocation: null, target: "staff" });
    expect(byKey["helped-most"]).toMatchObject({ amount: 1000, cap: 1, teamAllocation: null, target: "staff" });
  });

  it("fits what shift_quest_admin_rule accepts", () => {
    for (const rule of ECONOMY_RULES_DRAFT) {
      expect(rule.key).toMatch(/^[a-z0-9-]{2,40}$/);
      expect(rule.amount).toBeGreaterThanOrEqual(1);
      expect(rule.amount).toBeLessThanOrEqual(100000);
      if (rule.cap !== null) expect(rule.cap).toBeGreaterThanOrEqual(1);
      for (const text of [rule.eligibility, rule.review, rule.reversal]) {
        expect(text.trim().length).toBeGreaterThan(0);
        expect(text.length).toBeLessThanOrEqual(300);
      }
    }
  });

  it("pays main quests 1 to 5 and community quests 6 and 7", () => {
    expect([...MAIN_RULE_MILESTONES]).toEqual([1, 2, 3, 4, 5]);
    expect([...COMMUNITY_RULE_MILESTONES]).toEqual([6, 7]);
  });

  it("ladders the shop from the sticker to the shirt, gating money-value items by progress and community value", () => {
    expect(SHOP_ITEMS_DRAFT.map((i) => [i.name, i.cost, i.minStage, i.requiresCommunity])).toEqual([
      ["สติกเกอร์ SHIFT High", 300, 0, false],
      ["มัทฉะ", 8000, 5, true],
      ["เสื้อ PassionSeed", 12000, 6, true],
    ]);
    // Cheapest first; the sticker is the easiest item: one approved main quest, no gate.
    const costs = SHOP_ITEMS_DRAFT.map((i) => i.cost);
    expect(costs).toEqual([...costs].sort((a, b) => a - b));
    const mainQuest = ECONOMY_RULES_DRAFT.find((r) => r.key === "main-quest")!;
    expect(SHOP_ITEMS_DRAFT[0].cost).toBeLessThanOrEqual(mainQuest.amount);
    for (const item of SHOP_ITEMS_DRAFT) {
      expect(item.name.length).toBeLessThanOrEqual(80);
      expect(item.description.length).toBeLessThanOrEqual(1000);
      expect(item.stock).toBeGreaterThan(0);
      expect(item.minStage).toBeGreaterThanOrEqual(0);
      expect(item.minStage).toBeLessThanOrEqual(7);
    }
  });

  it("says coins come from approved progress and community value, not hours", () => {
    expect(ECONOMY_TERMS_DRAFT.rewardTerms).toContain("งานที่ผ่านการตรวจและการช่วยชุมชน");
    expect(ECONOMY_TERMS_DRAFT.rewardTerms).toContain("ไม่ได้นับจากเวลาที่ใช้");
    expect(ECONOMY_TERMS_DRAFT.rewardTerms).toContain("300 coin");
    for (const value of Object.values(ECONOMY_TERMS_DRAFT)) {
      expect(value.trim().length).toBeGreaterThan(0);
      expect(value.length).toBeLessThanOrEqual(3000);
    }
  });

  it("lists the four Demo Day prizes with the 18+ money note and the judging line", () => {
    expect(ISLAND_PRIZES_DRAFT.title).toBe("รางวัล Demo Day");
    expect(ISLAND_PRIZES_DRAFT.prizes.map((p) => [p.emoji, p.title, p.reward, p.money])).toEqual([
      ["🥇", "ไปได้ไกลที่สุด มีหลักฐานจริง", "$100", true],
      ["🧪", "บทเรียนที่ดีที่สุดจากการทดสอบที่ล้ม", "$50", true],
      ["🤝", "ช่วยเพื่อนมากที่สุด", "Passioncoin พิเศษ", false],
      ["🌱", "ทุกคน", "Passioncoin ทุกเควสต์ที่ผ่าน แลกของในร้าน", false],
    ]);
    expect(ISLAND_PRIZES_DRAFT.moneyNote).toBe(
      "รางวัลเงินเป็นเครดิต Claude สำหรับผู้มีอายุ 18 ปีขึ้นไป ถ้ายังไม่ถึง 18 เลือกรางวัลอื่นมูลค่าเท่ากันได้",
    );
    expect(ISLAND_PRIZES_DRAFT.moneyMinAge).toBe(18);
    expect(ISLAND_PRIZES_DRAFT.judging).toBe("Demo Day ตัดสินตามเกณฑ์ที่เขียนไว้ ไม่มีกระดานจัดอันดับ");
    expect(ISLAND_PRIZES_DRAFT.consentNote).toBe("รับรางวัลได้เมื่อผู้ปกครองยินยอมแล้ว หรือยืนยันอายุเองแล้ว");
  });

  it("collects every string", () => {
    expect(ALL.length).toBeGreaterThan(25);
  });

  it.each(ALL)("%s passes the marketing copy rules", (path, text) => {
    expect(lintText(text, path, "instagram")).toEqual([]);
  });

  it.each(ALL)("%s has no em dash, emoji or markdown", (_path, text) => {
    expect(text).not.toMatch(/[—–]/);
    expect(text).not.toMatch(/\p{Extended_Pictographic}/u);
    expect(text).not.toMatch(/\*\*|__|`|^#|\[[^\]]*\]\(/);
  });

  it.each(ALL)("%s never talks down", (_path, text) => {
    expect(text).not.toMatch(/น้อง|ลูก(?!ค้า)|เด็ก/);
    expect(text).not.toMatch(/สตรีค|streak|ติดต่อกัน \d+ วัน/i);
  });

  it("keeps emoji only on the prizes", () => {
    for (const prize of ISLAND_PRIZES_DRAFT.prizes) expect(prize.emoji).toMatch(/^\p{Extended_Pictographic}/u);
  });
});
