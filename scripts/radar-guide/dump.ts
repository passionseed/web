/**
 * pnpm radar:dump <slug> [--fixture] [--allow-dashes]
 *
 * Reads a published Career Radar field (row, cards, sources, published skills
 * and their start options) with the ANON key, so it sees exactly what visitors
 * see, and writes .cache/radar-guide/<slug>.json (gitignored). Fails when card
 * copy contains dashes (spec 7.1); warns when the first start option breaks
 * the "free, under 2 hours, makes something" rule.
 *
 *   --fixture       read lib/radar-guide/__fixtures__/<slug>.json instead of the
 *                   database (offline; skills are not in the fixtures)
 *   --allow-dashes  write the dump anyway and exit 0 (the dashes are still listed)
 *
 * Refresh a fixture after the content sweep: copy the dump over the fixture.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, relative } from "node:path";

import { findCardCopyDashes, formatFinding } from "./lib/card-copy";
import { assertSlug, fail, parseArgs, paths, REPO_ROOT, runMain } from "./lib/cli";
import type { DumpSkill, DumpStartOption, RadarDump } from "./lib/dump";
import { checkFirstStartOption } from "./lib/start-options";
import { anonClient } from "./lib/supabase";

const USAGE = "pnpm radar:dump <slug> [--fixture] [--allow-dashes]";

async function fromDatabase(slug: string): Promise<RadarDump> {
  const supabase = anonClient();
  const { data: field, error } = await supabase
    .from("radar_fields")
    .select("*, radar_cards(*), radar_sources(*)")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();
  if (error) fail(`Reading radar_fields failed: ${error.message}`);
  if (!field) fail(`No published radar field "${slug}". Unpublished fields are not dumped (the anon key cannot read them).`);

  const { data: links, error: skillsError } = await supabase
    .from("radar_field_skills")
    .select("is_primary, sort_order, radar_skills(id, slug, name_th, name_en, description_th, is_published)")
    .eq("field_id", field.id)
    .order("sort_order", { ascending: true });
  if (skillsError) fail(`Reading radar_field_skills failed: ${skillsError.message}`);

  const skills: DumpSkill[] = [];
  for (const link of (links ?? []) as Array<Record<string, unknown>>) {
    const skill = link.radar_skills as Record<string, unknown> | null;
    if (!skill || skill.is_published !== true) continue;
    skills.push({
      id: String(skill.id),
      slug: String(skill.slug),
      name_th: String(skill.name_th),
      name_en: String(skill.name_en),
      description_th: typeof skill.description_th === "string" ? skill.description_th : null,
      is_primary: link.is_primary === true,
      sort_order: typeof link.sort_order === "number" ? link.sort_order : null,
      start_options: [],
    });
  }

  if (skills.length) {
    const { data: options, error: optionsError } = await supabase
      .from("radar_skill_start_options")
      .select("id, skill_id, kind, title_th, summary_th, provider, destination_url, metadata, sort_order")
      .in("skill_id", skills.map((s) => s.id))
      .eq("is_published", true)
      .order("sort_order", { ascending: true });
    if (optionsError) fail(`Reading radar_skill_start_options failed: ${optionsError.message}`);
    for (const row of (options ?? []) as Array<Record<string, unknown>>) {
      const skill = skills.find((s) => s.id === row.skill_id);
      if (!skill) continue;
      const option: DumpStartOption = {
        id: String(row.id),
        kind: String(row.kind),
        title_th: String(row.title_th),
        summary_th: typeof row.summary_th === "string" ? row.summary_th : null,
        provider: typeof row.provider === "string" ? row.provider : null,
        destination_url: typeof row.destination_url === "string" ? row.destination_url : null,
        sort_order: typeof row.sort_order === "number" ? row.sort_order : null,
        metadata: row.metadata && typeof row.metadata === "object" ? (row.metadata as Record<string, unknown>) : {},
      };
      skill.start_options.push(option);
    }
  }

  const dump = field as RadarDump;
  dump.radar_cards = (dump.radar_cards ?? []).slice().sort((a, b) => a.position - b.position);
  dump.radar_sources = (dump.radar_sources ?? []).slice().sort((a, b) => a.ref - b.ref);
  dump.radar_skills = skills;
  return dump;
}

function fromFixture(slug: string): RadarDump {
  const path = paths.fixture(slug);
  if (!existsSync(path)) fail(`No fixture for "${slug}" at ${relative(REPO_ROOT, path)}.`);
  return JSON.parse(readFileSync(path, "utf8")) as RadarDump;
}

async function main() {
  const args = parseArgs(process.argv.slice(2), { bool: ["fixture", "allow-dashes"] });
  const slug = assertSlug(args.positional[0], USAGE);

  const dump = args.flags.fixture ? fromFixture(slug) : await fromDatabase(slug);
  dump.dumped_at = new Date().toISOString();

  const out = paths.dump(slug);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, `${JSON.stringify(dump, null, 2)}\n`);
  const visible = dump.radar_cards.filter((c) => !c.is_hidden).length;
  console.log(
    `Wrote ${relative(REPO_ROOT, out)}: ${dump.radar_cards.length} cards (${visible} visible), ` +
      `${dump.radar_sources.length} sources, ${dump.radar_skills?.length ?? 0} skills${args.flags.fixture ? " (from fixture)" : ""}.`
  );

  const start = checkFirstStartOption(dump.radar_skills);
  if (!args.flags.fixture || dump.radar_skills) {
    for (const warning of start.warnings) console.warn(`warning: ${warning}`);
  }

  const findings = findCardCopyDashes(dump);
  const blocking = findings.filter((f) => !f.hidden);
  for (const f of findings.filter((f) => f.hidden)) console.warn(`warning: dash ${formatFinding(f)}`);
  if (blocking.length) {
    console.error(`\n${blocking.length} dash${blocking.length > 1 ? "es" : ""} in card copy (no em or en dashes in user-facing copy):`);
    for (const f of blocking) console.error(`  ${formatFinding(f)}`);
    console.error("\nFix them in the admin card editor, then dump again.");
    if (!args.flags["allow-dashes"]) process.exit(1);
  } else {
    console.log("Card copy: no dashes.");
  }
}

runMain(main);
