/**
 * Loads operation pages (Markdown) from a local folder into the ops board
 * (hackathon_ops_seed, migration 20261120100000). The pages are private: they
 * are read here at run time and never committed to this repo.
 *
 *   HACKATHON_OPS_DATABASE_URL=... pnpm exec tsx bot/scripts/hackathon-ops-seed.ts <folder> [options]
 *
 *   --board <key>   which board to write (default: HACKATHON_OPS_BOARD, else "hackathon")
 *   --year <yyyy>   year for deadlines written without one (default: each page's `updated` year)
 *   --overwrite     take owner, status and ticks from the pages too, instead of
 *                   keeping what staff changed in Discord
 *   --dry-run       parse and print what would be written; no database
 *
 * Re-running it is safe. Titles, goals, deadlines, order and step text follow
 * the pages; by default an owner or status set in Discord is kept, and a step
 * ticked in Discord stays ticked while its text is unchanged. Operations no
 * longer in the folder are left alone and counted.
 *
 * It connects as the bot's own login (hackathon_ops_bot), which can call the
 * hackathon_ops_* functions and read no table. It prints counts, never the
 * database URL.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

import { DEFAULT_OPS_BOARD } from "../src/env";
import { createOpsApi } from "../src/ops/api";
import { parseFolder, type SeedOperation } from "../src/ops/parse";
import { createRolePool } from "../src/pg";

export interface SeedArgs {
  dir: string;
  board: string;
  year?: number;
  overwrite: boolean;
  dryRun: boolean;
}

export function parseArgs(argv: string[], env: Record<string, string | undefined> = process.env): SeedArgs {
  const args: SeedArgs = { dir: "", board: env.HACKATHON_OPS_BOARD?.trim() || DEFAULT_OPS_BOARD, overwrite: false, dryRun: false };
  for (let k = 0; k < argv.length; k++) {
    const arg = argv[k];
    if (arg === "--board") args.board = argv[++k] ?? "";
    else if (arg === "--year") args.year = Number(argv[++k]);
    else if (arg === "--overwrite") args.overwrite = true;
    else if (arg === "--dry-run") args.dryRun = true;
    else if (arg.startsWith("--")) throw new Error(`Unknown option ${arg}`);
    else if (!args.dir) args.dir = arg;
    else throw new Error(`Unexpected argument ${arg}`);
  }
  if (!args.dir) throw new Error("Usage: hackathon-ops-seed.ts <folder of operation pages> [--board key] [--year yyyy] [--overwrite] [--dry-run]");
  if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(args.board)) throw new Error("--board must be lowercase letters, digits and dashes");
  if (args.year !== undefined && (!Number.isInteger(args.year) || args.year < 2000 || args.year > 2100)) {
    throw new Error("--year must be a year like 2026");
  }
  return args;
}

export function readFolder(dir: string): Record<string, string> {
  if (!statSync(dir).isDirectory()) throw new Error(`${dir} is not a folder`);
  const files: Record<string, string> = {};
  for (const name of readdirSync(dir)) {
    if (name.toLowerCase().endsWith(".md")) files[name] = readFileSync(path.join(dir, name), "utf8");
  }
  return files;
}

/** One line per operation, for --dry-run on the person's own terminal. */
export function describe(ops: SeedOperation[]): string {
  return ops
    .map(
      (op) =>
        `${op.position}. ${op.slug}: ${op.steps.filter((s) => s.done).length}/${op.steps.length} steps, ` +
        `deadline ${op.deadline_on ?? "(none found)"}, owner ${op.owner ? "set" : "empty"}, status ${op.status ? "set" : "empty"}`
    )
    .join("\n");
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const ops = parseFolder(readFolder(args.dir), { year: args.year });
  if (ops.length === 0) throw new Error(`No operation pages in ${args.dir} (a page needs the field table or a "## Steps" list)`);

  if (args.dryRun) {
    console.log(`${ops.length} operation(s) for board "${args.board}" (dry run, nothing written):\n${describe(ops)}`);
    return;
  }

  const url = process.env.HACKATHON_OPS_DATABASE_URL?.trim();
  if (!url) throw new Error("Missing HACKATHON_OPS_DATABASE_URL (the hackathon_ops_bot login, see bot/README.md)");
  const pool = createRolePool(url, "hackathon-ops-seed");
  try {
    const result = await createOpsApi(pool, args.board).seed(ops, !args.overwrite);
    console.log(
      `Board "${args.board}": ${result.inserted} new, ${result.updated} updated, ${result.steps} step(s)` +
        (result.not_in_source ? `, ${result.not_in_source} operation(s) not in the folder left as they are` : "") +
        (args.overwrite ? " (owner, status and ticks taken from the pages)" : "")
    );
  } finally {
    await pool.end();
  }
}

if (/hackathon-ops-seed\.ts$/.test(process.argv[1] ?? "")) {
  main().catch((error: unknown) => {
    console.error(`hackathon-ops-seed: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  });
}
