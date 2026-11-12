/**
 * pnpm radar:tcas <slug> [--dry-run] [--round TCAS70]
 *
 * Writes lib/radar-guides/<slug>/tcas.json: a committed snapshot of the mytcas
 * programmes a guide's `tcas` level lists. Names and links are never typed by
 * hand; they come from the public mytcas course feed. Network, local only:
 * CI and the build read the committed file and never fetch
 * (docs/features/radar-guides-in-code.md section 6.2).
 *
 * Review the diff in a PR. If the count of matching programmes changes, update
 * the fact that states it (cybersecurity: f.mytcas-9) in the same PR.
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";

import { fail, parseArgs, runMain } from "./lib/cli";

export const MYTCAS_FEED_URL = "https://my-tcas.s3.ap-southeast-1.amazonaws.com/mytcas/courses.json";
export const MYTCAS_PROGRAM_URL = "https://course.mytcas.com/programs/";
export const MYTCAS_PROGRAM_ID = /^\d{14}[A-Z]$/;

/** Which programmes each guide snapshots. Matched on the programme name only. */
export const TCAS_MATCHERS: Readonly<Record<string, { labelEn: string; test: (programTh: string) => boolean }>> = {
  cybersecurity: { labelEn: "programme name contains ไซเบอร์", test: (name) => name.includes("ไซเบอร์") },
};

export type TcasTrack = "thai" | "intl" | "special";

export interface TcasProgramme {
  id: string;
  uniTh: string;
  uniEn: string;
  campusTh: string;
  facultyTh: string;
  fieldTh: string;
  programTh: string;
  programEn: string;
  typeTh: string;
  track: TcasTrack;
  href: string;
}

export interface TcasSnapshot {
  round: string;
  source: string;
  fetchedAt: string;
  match: string;
  programmes: TcasProgramme[];
}

interface FeedRow {
  program_id?: unknown;
  university_name_th?: unknown;
  university_name_en?: unknown;
  campus_name_th?: unknown;
  faculty_name_th?: unknown;
  field_name_th?: unknown;
  program_name_th?: unknown;
  program_name_en?: unknown;
  program_type_name_th?: unknown;
}

const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

export function trackOf(typeTh: string): TcasTrack {
  if (typeTh.includes("นานาชาติ")) return "intl";
  if (typeTh.includes("พิเศษ")) return "special";
  return "thai";
}

/** Pure: filters and normalises feed rows into a sorted snapshot. */
export function snapshotFromFeed(
  feed: readonly FeedRow[],
  slug: string,
  opts: { round: string; fetchedAt: string }
): TcasSnapshot {
  const matcher = TCAS_MATCHERS[slug];
  if (!matcher) fail(`No mytcas matcher for "${slug}". Add one to TCAS_MATCHERS in scripts/radar-guide/tcas.ts.`);
  const seen = new Set<string>();
  const programmes: TcasProgramme[] = [];
  for (const row of feed) {
    const id = str(row.program_id);
    const programTh = str(row.program_name_th);
    if (!MYTCAS_PROGRAM_ID.test(id) || !matcher.test(programTh) || seen.has(id)) continue;
    seen.add(id);
    const typeTh = str(row.program_type_name_th);
    programmes.push({
      id,
      uniTh: str(row.university_name_th),
      uniEn: str(row.university_name_en),
      campusTh: str(row.campus_name_th),
      facultyTh: str(row.faculty_name_th),
      fieldTh: str(row.field_name_th),
      programTh,
      programEn: str(row.program_name_en),
      typeTh,
      track: trackOf(typeTh),
      href: `${MYTCAS_PROGRAM_URL}${id}`,
    });
  }
  programmes.sort((a, b) => a.id.localeCompare(b.id));
  return { round: opts.round, source: MYTCAS_FEED_URL, fetchedAt: opts.fetchedAt, match: matcher.labelEn, programmes };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2), { bool: ["dry-run"], value: ["round"] });
  const slug = args.positional[0];
  if (!slug) fail("Usage: pnpm radar:tcas <slug> [--dry-run] [--round TCAS70]");
  const round = typeof args.flags.round === "string" ? args.flags.round : "TCAS70";

  console.log(`Fetching ${MYTCAS_FEED_URL} ...`);
  const res = await fetch(MYTCAS_FEED_URL);
  if (!res.ok) fail(`mytcas feed returned HTTP ${res.status}`);
  const feed: unknown = await res.json();
  if (!Array.isArray(feed)) fail("mytcas feed is not a JSON array; the format may have changed.");

  const snapshot = snapshotFromFeed(feed as FeedRow[], slug, {
    round,
    fetchedAt: new Date().toISOString().slice(0, 10),
  });
  console.log(`${snapshot.programmes.length} programmes match "${snapshot.match}":`);
  for (const p of snapshot.programmes) console.log(`  ${p.id}  ${p.uniTh}  ${p.programTh} (${p.typeTh})`);

  const json = `${JSON.stringify(snapshot, null, 2)}\n`;
  if (args.flags["dry-run"]) {
    console.log("\n--dry-run: nothing written.");
    return;
  }
  const out = join(process.cwd(), "lib", "radar-guides", slug, "tcas.json");
  writeFileSync(out, json);
  console.log(`\nWrote ${out}. Commit it in a PR; if the count changed, update the count fact too.`);
}

if (/[\\/]tcas\.ts$/.test(process.argv[1] ?? "")) runMain(main);
