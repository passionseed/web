/**
 * @jest-environment node
 *
 * The sandbox economy seed (bot/scripts/economy-seed.ts) prints SQL from the
 * DRAFT content file. These checks read the SQL as text: every DRAFT rule and
 * shop item reaches the database with its numbers and gates, staff keys are
 * never pinned on quests, and every statement is guarded so a rerun is a
 * no-op. The SQL itself runs in bot/quests-sandbox.sh.
 */
import { economySeedSql, sqlLiteral, SANDBOX_FULFILLMENT_ID } from "../../../scripts/economy-seed";
import {
  COMMUNITY_RULE_MILESTONES,
  ECONOMY_RULES_DRAFT,
  ECONOMY_TERMS_DRAFT,
  MAIN_RULE_MILESTONES,
  SHOP_ITEMS_DRAFT,
} from "../../../../lib/content/shift-island-economy";

/** Top-level statements, comments dropped: each ends with a semicolon at the end of a line. */
function statements(sql: string): string[] {
  return sql
    .split("\n")
    .filter((line) => !line.startsWith("--"))
    .join("\n")
    .split(/;\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

describe("economy seed", () => {
  const all = economySeedSql("all");
  const core = economySeedSql("core");
  const side = economySeedSql("side");

  it("publishes every DRAFT rule with its amount, cap and team allocation, only when it changed", () => {
    expect(ECONOMY_RULES_DRAFT.length).toBeGreaterThanOrEqual(5);
    for (const rule of ECONOMY_RULES_DRAFT) {
      const call =
        `SELECT public.shift_quest_admin_rule(:'admin', '${rule.key}', ${rule.amount}, ${rule.cap ?? "NULL"}, ` +
        `${rule.teamAllocation ? `'${rule.teamAllocation}'` : "NULL"}, ${sqlLiteral(rule.eligibility)}`;
      expect(core).toContain(call);
      const stmt = statements(core).find((s) => s.startsWith(call))!;
      expect(stmt).toContain("WHERE NOT EXISTS");
      expect(stmt).toContain(`r.amount = ${rule.amount}`);
    }
  });

  it("uses the founder's numbers: main 300, community 500, side 100, taught 3,000 (staff), helped 1,000 (staff)", () => {
    const byKey = Object.fromEntries(ECONOMY_RULES_DRAFT.map((r) => [r.key, r]));
    expect([byKey["main-quest"].amount, byKey["main-quest"].target]).toEqual([300, "main"]);
    expect([byKey["community-quest"].amount, byKey["community-quest"].target]).toEqual([500, "community"]);
    expect([byKey["side-quest"].amount, byKey["side-quest"].target]).toEqual([100, "side"]);
    expect([byKey["taught-next-shift"].amount, byKey["taught-next-shift"].target, byKey["taught-next-shift"].teamAllocation]).toEqual([3000, "staff", null]);
    expect([byKey["helped-most"].target, byKey["helped-most"].teamAllocation]).toEqual(["staff", null]);
  });

  it("pins main and community rules on their milestones in core, and the side rule in side only", () => {
    expect(core).toContain(`'main-quest')\nFROM (SELECT DISTINCT slug FROM public.shift_quest_templates`);
    expect(core).toContain(`milestone IN (${MAIN_RULE_MILESTONES.join(", ")}) AND reward_rule_key IS DISTINCT FROM 'main-quest'`);
    expect(core).toContain(`milestone IN (${COMMUNITY_RULE_MILESTONES.join(", ")}) AND reward_rule_key IS DISTINCT FROM 'community-quest'`);
    expect(core).not.toContain("admin_template_rule(:'admin', t.slug, 'side-quest')");
    expect(side).toContain("admin_template_rule(:'admin', t.slug, 'side-quest')");
    expect(side).toContain("AND side AND reward_rule_key IS DISTINCT FROM 'side-quest'");
    expect(side).not.toContain("shift_quest_admin_rule(");
    expect(all.indexOf("'main-quest')\nFROM")).toBeLessThan(all.indexOf("'side-quest')\nFROM"));
  });

  it("never pins a staff award key on a quest", () => {
    for (const key of ["taught-next-shift", "helped-most"]) {
      expect(all).not.toMatch(new RegExp(`admin_template_rule\\([^;]*'${key}'`));
    }
  });

  it("creates every shop item once by name, switched off, gates it, then switches it on", () => {
    expect(SHOP_ITEMS_DRAFT.length).toBeGreaterThanOrEqual(3);
    for (const item of SHOP_ITEMS_DRAFT) {
      const name = sqlLiteral(item.name);
      const create =
        `SELECT public.shift_quest_admin_catalog(:'admin', NULL, ${name}, ${sqlLiteral(item.description)}, ${item.cost}, ${item.stock}, false)\n` +
        `WHERE NOT EXISTS (SELECT 1 FROM public.shift_quest_catalog WHERE name = ${name});`;
      const gate =
        `SELECT public.shift_quest_admin_catalog_gate(:'admin', c.id, ${item.minStage}::smallint, ${item.requiresCommunity})\n` +
        `FROM public.shift_quest_catalog c WHERE c.name = ${name} AND (c.min_stage <> ${item.minStage} OR c.requires_community <> ${item.requiresCommunity});`;
      const on =
        `SELECT public.shift_quest_admin_catalog(:'admin', c.id, NULL, NULL, NULL, NULL, true)\n` +
        `FROM public.shift_quest_catalog c WHERE c.name = ${name} AND NOT c.active;`;
      expect(core).toContain(create);
      expect(core).toContain(gate);
      expect(core).toContain(on);
      // An item is never live before its gates are stored.
      expect(core.indexOf(create)).toBeLessThan(core.indexOf(gate));
      expect(core.indexOf(gate)).toBeLessThan(core.indexOf(on));
    }
  });

  it("follows the founder's shop ladder: sticker 300 open, matcha 8,000 at stage 5 with community, shirt 12,000 at stage 6 with community", () => {
    const ladder = SHOP_ITEMS_DRAFT.map((i) => [i.name, i.cost, i.minStage, i.requiresCommunity]);
    expect(ladder).toEqual([
      ["สติกเกอร์ SHIFT High", 300, 0, false],
      ["มัทฉะ", 8000, 5, true],
      ["เสื้อ PassionSeed", 12000, 6, true],
    ]);
  });

  it("sets the terms, the stand-in fulfillment role and both switches, each only when needed", () => {
    for (const [key, text] of [
      ["reward_terms", ECONOMY_TERMS_DRAFT.rewardTerms],
      ["redemption_terms", ECONOMY_TERMS_DRAFT.redemptionTerms],
      ["fulfillment_process", ECONOMY_TERMS_DRAFT.fulfillmentProcess],
      ["fulfillment_owner", ECONOMY_TERMS_DRAFT.fulfillmentOwner],
    ]) {
      expect(core).toContain(
        `SELECT public.shift_quest_admin_set(:'admin', '${key}', ${sqlLiteral(text)})\nWHERE (SELECT ${key} FROM public.shift_quest_settings WHERE id) IS DISTINCT FROM`
      );
    }
    expect(core).toContain(`shift_quest_admin_role(:'admin', '${SANDBOX_FULFILLMENT_ID}', 'Sandbox reviewer', 'fulfillment', true)`);
    // Redemption refuses to switch on before the terms, the role and an item exist.
    const order = ["'fulfillment_owner'", "'fulfillment', true)", "shift_quest_admin_catalog(", "'awards', 'on'", "'redemption', 'on'"];
    const at = order.map((s) => core.indexOf(s));
    expect(at.every((n) => n >= 0)).toBe(true);
    expect([...at].sort((a, b) => a - b)).toEqual(at);
  });

  it("guards every statement, so a rerun changes nothing", () => {
    for (const stmt of statements(all)) {
      expect([stmt.slice(0, 80), /\bWHERE\b/.test(stmt)]).toEqual([stmt.slice(0, 80), true]);
    }
  });

  it("only uses the admin psql variable and quotes text safely", () => {
    expect(sqlLiteral("it's")).toBe("'it''s'");
    expect(() => sqlLiteral("a\u0000b")).toThrow();
    expect(all.match(/:'[a-z_]+'/g)?.every((v) => v === ":'admin'")).toBe(true);
    expect(all).not.toMatch(/[—–]/);
  });

  it("defaults to all: core, then the side pins", () => {
    expect(economySeedSql()).toBe(all);
    expect(all).toBe(core + side.split("\n").slice(2).join("\n"));
  });
});
