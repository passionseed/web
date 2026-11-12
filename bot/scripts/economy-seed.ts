/**
 * Prints the SQL that applies the DRAFT island economy in
 * lib/content/shift-island-economy.ts to a quest SANDBOX database, through
 * the same admin functions /admin uses (shift_quest_admin_set, _rule,
 * _template_rule, _role, _catalog, _catalog_gate). Never run it against
 * production: there the founder applies each number with /admin commands.
 *
 *   pnpm exec tsx bot/scripts/economy-seed.ts [core|side|all] |
 *     psql -h 127.0.0.1 -p <sandbox port> -U postgres -d postgres -v ON_ERROR_STOP=1 -v admin=<admin Discord id>
 *
 * core: the terms, every reward rule, the main (1..5) and community (6, 7)
 *   template pins, the stand-in fulfillment role, the shop items and their
 *   gates, then awards and redemption on. Run it before any quest is chosen,
 *   so the quests pin the rules.
 * side: the side quest pins. Run it after the side quests are published.
 * all (the default): core then side.
 *
 * Idempotent: a term, a pin or a switch is set only when it differs; a rule
 * is published again only when its published version differs from the DRAFT;
 * a shop item is created once (by name) with its stock, switched off until
 * its gates are stored, then on; its price, description and gates follow the
 * DRAFT afterwards (and a sandbox item switched off by hand is switched on
 * again).
 * bot/quests-sandbox.sh runs it by default (Season 1 coins on in the sandbox).
 */
import {
  COMMUNITY_RULE_MILESTONES,
  ECONOMY_RULES_DRAFT,
  ECONOMY_TERMS_DRAFT,
  MAIN_RULE_MILESTONES,
  SHOP_ITEMS_DRAFT,
  type EconomyRuleDraft,
  type RuleTarget,
} from "../../lib/content/shift-island-economy";

export type SeedPhase = "core" | "side" | "all";

/** The sandbox's stand-in reviewer (bot/quests-sandbox.sh), who also handles redemptions there. */
export const SANDBOX_FULFILLMENT_ID = "100000000000000701";

/** A SQL string literal: single quotes doubled. Refuses a NUL byte, which Postgres text cannot hold. */
export function sqlLiteral(value: string): string {
  if (value.includes("\u0000")) throw new Error("economy seed: a NUL byte in DRAFT text");
  return `'${value.replace(/'/g, "''")}'`;
}

function sqlNullable(value: string | number | null): string {
  if (value === null) return "NULL";
  return typeof value === "number" ? String(Math.trunc(value)) : sqlLiteral(value);
}

function assertWhole(n: number, min: number, max: number, what: string): number {
  if (!Number.isInteger(n) || n < min || n > max) throw new Error(`economy seed: ${what} must be a whole number ${min}..${max}, got ${n}`);
  return n;
}

/** The first DRAFT rule for a target (main, community, side), or null. */
function ruleFor(target: RuleTarget): EconomyRuleDraft | null {
  return ECONOMY_RULES_DRAFT.find((r) => r.target === target) ?? null;
}

function termsSql(): string[] {
  const terms: [string, string][] = [
    ["reward_terms", ECONOMY_TERMS_DRAFT.rewardTerms],
    ["redemption_terms", ECONOMY_TERMS_DRAFT.redemptionTerms],
    ["fulfillment_process", ECONOMY_TERMS_DRAFT.fulfillmentProcess],
    ["fulfillment_owner", ECONOMY_TERMS_DRAFT.fulfillmentOwner],
  ];
  return terms.map(
    ([key, text]) =>
      `SELECT public.shift_quest_admin_set(:'admin', ${sqlLiteral(key)}, ${sqlLiteral(text)})\n` +
      `WHERE (SELECT ${key} FROM public.shift_quest_settings WHERE id) IS DISTINCT FROM ${sqlLiteral(text)};`
  );
}

/** Switches a feature on unless it is on already (each switch refuses an incomplete setup). */
function switchOnSql(feature: "awards" | "redemption"): string {
  return `SELECT public.shift_quest_admin_set(:'admin', '${feature}', 'on')\nWHERE NOT (SELECT ${feature}_enabled FROM public.shift_quest_settings WHERE id);`;
}

function ruleSql(rule: EconomyRuleDraft): string {
  if (!/^[a-z0-9-]{2,40}$/.test(rule.key)) throw new Error(`economy seed: bad rule key ${rule.key}`);
  const amount = assertWhole(rule.amount, 1, 100000, `${rule.key} amount`);
  const cap = rule.cap === null ? null : assertWhole(rule.cap, 1, 1000, `${rule.key} cap`);
  const [key, eligibility, review, reversal] = [rule.key, rule.eligibility, rule.review, rule.reversal].map(sqlLiteral);
  const team = sqlNullable(rule.teamAllocation);
  return [
    `SELECT public.shift_quest_admin_rule(:'admin', ${key}, ${amount}, ${sqlNullable(cap)}, ${team}, ${eligibility}, ${review}, ${reversal})`,
    "WHERE NOT EXISTS (",
    "  SELECT 1 FROM public.shift_quest_reward_rules r",
    `  WHERE r.key = ${key} AND r.status = 'published' AND r.amount = ${amount}`,
    `    AND r.cap_per_member IS NOT DISTINCT FROM ${sqlNullable(cap)}::integer AND r.team_allocation IS NOT DISTINCT FROM ${team}::text`,
    `    AND r.eligibility = ${eligibility} AND r.review_process = ${review} AND r.reversal_policy = ${reversal}`,
    ");",
  ].join("\n");
}

/** Pins a rule on every published template the filter matches, unless it is pinned already. */
function pinSql(rule: EconomyRuleDraft | null, filter: string): string[] {
  if (!rule) return [];
  return [
    [
      `SELECT public.shift_quest_admin_template_rule(:'admin', t.slug, ${sqlLiteral(rule.key)})`,
      "FROM (SELECT DISTINCT slug FROM public.shift_quest_templates",
      `      WHERE status = 'published' AND ${filter} AND reward_rule_key IS DISTINCT FROM ${sqlLiteral(rule.key)}) t`,
      "ORDER BY t.slug;",
    ].join("\n"),
  ];
}

function milestoneList(milestones: readonly number[]): string {
  return milestones.map((m) => assertWhole(m, 1, 7, "milestone")).join(", ");
}

function shopSql(): string[] {
  return SHOP_ITEMS_DRAFT.flatMap((item) => {
    if (!item.name.trim() || item.name.length > 80) throw new Error(`economy seed: item name must be 1..80 characters: ${item.name}`);
    const name = sqlLiteral(item.name);
    const description = sqlLiteral(item.description);
    const cost = assertWhole(item.cost, 1, 10_000_000, `${item.name} cost`);
    const stock = assertWhole(item.stock, 0, 100000, `${item.name} stock`);
    const minStage = assertWhole(item.minStage, 0, 7, `${item.name} minStage`);
    const community = item.requiresCommunity ? "true" : "false";
    return [
      `-- ${item.name.replace(/\n/g, " ")}: ${cost} coins, tree stage ${minStage}+${item.requiresCommunity ? ", a community quest first" : ""}.`,
      // Created switched off, gated, then switched on: an item never goes live without its gates.
      `SELECT public.shift_quest_admin_catalog(:'admin', NULL, ${name}, ${description}, ${cost}, ${stock}, false)\nWHERE NOT EXISTS (SELECT 1 FROM public.shift_quest_catalog WHERE name = ${name});`,
      `SELECT public.shift_quest_admin_catalog(:'admin', c.id, NULL, ${description}, ${cost}, NULL, NULL)\nFROM public.shift_quest_catalog c WHERE c.name = ${name} AND (c.cost <> ${cost} OR c.description IS DISTINCT FROM ${description});`,
      `SELECT public.shift_quest_admin_catalog_gate(:'admin', c.id, ${minStage}::smallint, ${community})\nFROM public.shift_quest_catalog c WHERE c.name = ${name} AND (c.min_stage <> ${minStage} OR c.requires_community <> ${community});`,
      `SELECT public.shift_quest_admin_catalog(:'admin', c.id, NULL, NULL, NULL, NULL, true)\nFROM public.shift_quest_catalog c WHERE c.name = ${name} AND NOT c.active;`,
    ];
  });
}

function coreSql(): string[] {
  return [
    "-- The terms students read, and who hands items over.",
    ...termsSql(),
    "-- Every reward rule, published again only when the DRAFT changed.",
    ...ECONOMY_RULES_DRAFT.map(ruleSql),
    "-- Main quests (milestones 1 to 5) and community quests (6, 7) earn under their rules.",
    ...pinSql(ruleFor("main"), `milestone IN (${milestoneList(MAIN_RULE_MILESTONES)})`),
    ...pinSql(ruleFor("community"), `milestone IN (${milestoneList(COMMUNITY_RULE_MILESTONES)})`),
    "-- The sandbox's stand-in reviewer also handles redemptions.",
    `SELECT public.shift_quest_admin_role(:'admin', ${sqlLiteral(SANDBOX_FULFILLMENT_ID)}, 'Sandbox reviewer', 'fulfillment', true)`,
    `WHERE NOT EXISTS (SELECT 1 FROM public.shift_quest_members WHERE discord_user_id = ${sqlLiteral(SANDBOX_FULFILLMENT_ID)} AND 'fulfillment' = ANY (roles));`,
    "-- The shop ladder: created once by name with its stock; price, description and gates follow the DRAFT.",
    ...shopSql(),
    "-- Season 1 coins on in the sandbox: awards, then redemption (each refuses an incomplete setup).",
    switchOnSql("awards"),
    switchOnSql("redemption"),
  ];
}

function sideSql(): string[] {
  return ["-- Side quests earn under the side rule (after they are published).", ...pinSql(ruleFor("side"), "side")];
}

/** The seed SQL for one phase. Uses the psql variable :'admin' (the admin's Discord id). */
export function economySeedSql(phase: SeedPhase = "all"): string {
  const parts = [
    "-- DRAFT island economy from lib/content/shift-island-economy.ts (sandbox seed, bot/scripts/economy-seed.ts).",
    "-- Needs psql -v admin=<the sandbox admin's Discord id>. Never for production: use /admin there.",
    ...(phase === "side" ? [] : coreSql()),
    ...(phase === "core" ? [] : sideSql()),
  ];
  return `${parts.join("\n")}\n`;
}

function main(argv: string[]): void {
  const phase = (argv[0] ?? "all") as SeedPhase;
  if (!["core", "side", "all"].includes(phase) || argv.length > 1) {
    console.error("usage: tsx bot/scripts/economy-seed.ts [core|side|all]");
    process.exit(2);
  }
  process.stdout.write(economySeedSql(phase));
}

// Run only as a script (tsx bot/scripts/economy-seed.ts), never when a test imports it.
if (/economy-seed\.ts$/.test(process.argv[1] ?? "")) main(process.argv.slice(2));
