/**
 * pnpm radar:check [slug] [--max-age 45] [--db]
 *
 * The full content check for code guides (docs/features/radar-guides-in-code.md
 * sections 1.3 and 6). Stricter than Jest, which only fails on what would break
 * every PR:
 *   - guide-lint over every guide (or one), with clips.json and the VTT files
 *   - --max-age N: pages older than N days are errors (CI passes 45 on PRs that
 *     touch lib/radar-guides/** and in the weekly scheduled run)
 *   - a required cutscene clip missing on a live guide is an error
 *   - demo reels: each page's demo steps ascend and the reel fits 8 to 45s;
 *     a page whose reel plan is "demo" must have a demoScript
 *   - --db: every guide slug is a published radar_fields row (anon key; read only)
 * Prints warnings too. Exits 1 on any error. Writes nothing.
 */
import { buildDemoReelPlan, demoReelProblems } from "../../components/radar/reel/demoReel";
import { formatIssues, lintErrors, lintGuide, type LintIssue } from "../../lib/radar-guide/guide-lint";
import type { CareerGuide } from "../../lib/radar-guide/guide-types";
import { fail, flagString, parseArgs, runMain } from "./lib/cli";
import { allGuides, GLOBAL_BANNED, readClipManifest, readGuideFile, requireGuide, SHARED_FACTS } from "./lib/guides";
import { anonClient } from "./lib/supabase";

const USAGE = "pnpm radar:check [slug] [--max-age 45] [--db]";

/** Demo-reel problems for every page that has demo steps or plans a demo reel. */
function demoIssues(guide: CareerGuide): LintIssue[] {
  const issues: LintIssue[] = [];
  for (const page of guide.pages) {
    const plan = buildDemoReelPlan({ slug: guide.meta.slug, alias: guide.meta.alias, platform: "ig", page });
    const wantsDemo = page.reel?.format === "demo";
    if (!plan.steps.length && !wantsDemo) continue;
    for (const problem of demoReelProblems(plan)) {
      issues.push({ level: "error", pageKey: page.key, path: "demoScript", message: problem });
    }
  }
  return issues;
}

async function publishedSlugs(): Promise<Set<string>> {
  const { data, error } = await anonClient().from("radar_fields").select("slug").eq("is_published", true);
  if (error) fail(`Reading radar_fields failed: ${error.message}`);
  return new Set((data ?? []).map((row: { slug: string }) => row.slug));
}

async function main() {
  const args = parseArgs(process.argv.slice(2), { bool: ["db"], value: ["max-age"] });
  const maxAgeRaw = flagString(args, "max-age");
  const maxAgeDays = maxAgeRaw === undefined ? undefined : Number(maxAgeRaw);
  if (maxAgeDays !== undefined && (!Number.isInteger(maxAgeDays) || maxAgeDays < 1)) fail(`--max-age must be a whole number of days.\nUsage: ${USAGE}`);

  const slug = args.positional[0];
  const guides = slug ? [requireGuide(slug)] : [...allGuides()];
  if (!guides.length) fail("No code guides in lib/radar-guides.");
  const published = args.flags.db ? await publishedSlugs() : null;

  let errors = 0;
  let warnings = 0;
  for (const guide of guides) {
    const s = guide.meta.slug;
    const issues: LintIssue[] = [
      ...lintGuide(guide, {
        sharedFacts: SHARED_FACTS,
        globalBanned: GLOBAL_BANNED,
        maxAgeDays,
        requireClips: true,
        clips: { manifest: readClipManifest(s), readVtt: (file) => readGuideFile(s, file) },
      }),
      ...demoIssues(guide),
    ];
    if (published && !published.has(s)) {
      issues.push({ level: "error", pageKey: null, path: "meta.slug", message: `"${s}" is not a published radar_fields row; events and visits would be rejected` });
    }
    const e = lintErrors(issues);
    const w = issues.filter((i) => i.level === "warn");
    errors += e.length;
    warnings += w.length;
    const clips = Object.keys(readClipManifest(s)).length;
    const slots = guide.pages.filter((p) => p.clip).length;
    console.log(`\n${s} (${guide.meta.status}, asOf ${guide.meta.asOf}, ${guide.pages.length} levels, ${clips}/${slots} cutscenes recorded)`);
    if (issues.length) console.log(formatIssues([...e, ...w]));
    else console.log("  clean");
  }
  console.log(`\n${errors} error${errors === 1 ? "" : "s"}, ${warnings} warning${warnings === 1 ? "" : "s"}.`);
  if (errors) fail("radar:check found errors.");
}

runMain(main);
