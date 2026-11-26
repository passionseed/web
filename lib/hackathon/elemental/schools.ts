import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";

import { rankSchools, type SchoolRow } from "./share";

/**
 * The school list built from Thai government open data by
 * scripts/build-elemental-schools.mjs. Read from disk, not imported, so the
 * 1 MB list stays out of the type checker and the client bundle.
 */
type SchoolList = { builtOn: string; sources: Record<string, number>; schools: SchoolRow[] };

let list: Promise<{ rows: SchoolRow[]; byKey: Map<string, SchoolRow> }> | undefined;

function load() {
  return (list ??= readFile(path.join(process.cwd(), "lib/hackathon/elemental/schools/schools.json"), "utf8").then((text) => {
    const rows = (JSON.parse(text) as SchoolList).schools;
    return { rows, byKey: new Map(rows.map((r) => [r[0], r])) };
  }));
}

export async function searchSchools(query: string, limit = 12): Promise<SchoolRow[]> {
  return rankSchools((await load()).rows, query, limit);
}

export async function findSchool(key: string): Promise<SchoolRow | null> {
  return (await load()).byKey.get(key) ?? null;
}
