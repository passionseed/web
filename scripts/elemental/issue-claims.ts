/**
 * Issues the Elemental /join codes: one single-use code per member row of
 * every PAID registration for the event (elemental_issue_claims; at most 5
 * per registration). Safe to run again: codes already issued come back as
 * they were, and new paid registrations get new ones.
 *
 *   read -rs ELEMENTAL_ADMIN_DATABASE_URL && export ELEMENTAL_ADMIN_DATABASE_URL
 *   pnpm exec tsx scripts/elemental/issue-claims.ts --dry-run   # counts only, issues nothing
 *   pnpm exec tsx scripts/elemental/issue-claims.ts
 *   pnpm exec tsx scripts/elemental/issue-claims.ts --rehearsal 40   # rehearsal codes (elemental-dryrun)
 *
 * Writes, in git-ignored scripts/elemental/local/ (or --out-dir):
 *   claims-<date>.csv            registration_id,team_name,position,code
 *   claims-<date>-messages.txt   one paste-ready block per registration, codes by position
 *   rehearsal-<date>.csv         code   (with --rehearsal)
 * <date> is today in Bangkok; a later run the same day replaces the files with
 * a superset. No names or contacts are read or written, and codes are never
 * printed to the terminal. The admin URL is never printed.
 */
import fs from "node:fs";
import path from "node:path";

import { bangkokDay } from "../../lib/elemental/core";

import {
  ADMIN_URL_ENV,
  LOCAL_DIR,
  StopError,
  UsageError,
  describeError,
  elCode,
  readAdmin,
  runMain,
  usageFailure,
  type DbClient,
  type Deps,
} from "./admin-db";

export const EVENT_EDITION = "elemental-2026";
export const REHEARSAL_EDITION = "elemental-dryrun";
export const CSV_HEADER = "registration_id,team_name,position,code";

export const USAGE = `usage: pnpm exec tsx scripts/elemental/issue-claims.ts [--edition KEY] [--dry-run] [--out-dir DIR]
       pnpm exec tsx scripts/elemental/issue-claims.ts --rehearsal N [--edition KEY] [--dry-run] [--out-dir DIR]

  (no flag)      issue codes for every paid registration of ${EVENT_EDITION} (or --edition)
  --rehearsal N  issue N (1 to 200) rehearsal codes with no registration, for ${REHEARSAL_EDITION}
                 (or --edition); refused on ${EVENT_EDITION}
  --dry-run      run it in a transaction, print the counts, roll back, write no file
  --out-dir DIR  where the files go (default scripts/elemental/local, git-ignored)

environment (never printed):
  ${ADMIN_URL_ENV}  admin Postgres URL (the postgres user)`;

export interface Options {
  edition: string;
  rehearsal: number | null;
  dryRun: boolean;
  outDir: string;
  help: boolean;
}

export function parseArgs(argv: string[]): Options {
  let edition: string | null = null;
  const options: Options = { edition: EVENT_EDITION, rehearsal: null, dryRun: false, outDir: LOCAL_DIR, help: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const eq = arg.indexOf("=");
    const flag = arg.startsWith("--") && eq > 0 ? arg.slice(0, eq) : arg;
    const value = () => {
      const v = eq > 0 && arg.startsWith("--") ? arg.slice(eq + 1) : argv[++i];
      if (v === undefined || v === "") throw new UsageError(`${flag} needs a value`);
      return v;
    };
    if (flag === "--dry-run") options.dryRun = true;
    else if (flag === "--help" || flag === "-h") options.help = true;
    else if (flag === "--edition") {
      edition = value();
      if (!/^[a-z0-9][a-z0-9-]{2,39}$/.test(edition)) throw new UsageError("--edition takes an edition key such as elemental-2026");
    } else if (flag === "--out-dir") options.outDir = path.resolve(value());
    else if (flag === "--rehearsal") {
      const n = Number(value());
      if (!Number.isInteger(n) || n < 1 || n > 200) throw new UsageError("--rehearsal takes a count from 1 to 200");
      options.rehearsal = n;
    } else throw new UsageError(`unknown argument: ${arg}`);
  }
  options.edition = edition ?? (options.rehearsal !== null ? REHEARSAL_EDITION : EVENT_EDITION);
  if (options.rehearsal !== null && options.edition === EVENT_EDITION) {
    throw new UsageError(
      `Refusing --rehearsal on ${EVENT_EDITION}: rehearsal codes have no registration and belong only to a rehearsal edition (${REHEARSAL_EDITION}).`,
    );
  }
  return options;
}

export interface ClaimRow {
  registration_id: string;
  team_name: string | null;
  position: number;
  code: string | null;
  state: "new" | "existing" | "over_cap";
}

/** One CSV cell: quoted when needed, and never read as a formula by a spreadsheet. */
export function csvCell(value: string | number | null): string {
  let text = value === null ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** registration_id,team_name,position,code. Over-cap rows have an empty code. */
export function claimsCsv(rows: ClaimRow[]): string {
  const lines = rows.map((r) => [r.registration_id, r.team_name, r.position, r.code].map(csvCell).join(","));
  return [CSV_HEADER, ...lines].join("\n") + "\n";
}

/**
 * Paste-ready text per registration, codes by position. It carries no team
 * name, person name or contact: only the registration id (on the staff
 * marker lines, outside the block) and the codes.
 */
export function claimsMessages(rows: ClaimRow[]): string {
  const byRegistration = new Map<string, ClaimRow[]>();
  for (const row of rows) {
    if (!row.code) continue;
    const list = byRegistration.get(row.registration_id) ?? [];
    list.push(row);
    byRegistration.set(row.registration_id, list);
  }
  const blocks = [...byRegistration.entries()].map(([registrationId, list]) => {
    const codes = [...list].sort((a, b) => a.position - b.position);
    return [
      `----- registration ${registrationId}: copy from the next line -----`,
      // [TH-REVIEW] Functional placeholder: "Each person's Discord code (one use each)".
      "โค้ดเข้า Discord ของแต่ละคน (ใช้ได้คนละ 1 ครั้ง)",
      // [TH-REVIEW] Functional placeholder: "In #start-here type /join code: then your own code".
      "ในห้อง #start-here พิมพ์ /join code: ตามด้วยโค้ดของตัวเอง",
      // [TH-REVIEW] Functional placeholder: "Member <n>" (the order the group signed up in).
      ...codes.map((r) => `สมาชิกคนที่ ${r.position}: ${r.code}`),
      "----- end -----",
    ].join("\n");
  });
  const header = [
    "# Elemental /join codes, one block per paid registration. Staff only: do not forward this file.",
    "# Paste each block into that group's Discord invite message. Member numbers follow the sign-up form order.",
    "# [TH-REVIEW] The Thai lines are functional placeholders: check the wording before sending.",
  ];
  return `${header.join("\n")}\n\n${blocks.join("\n\n")}\n`;
}

function writePrivate(file: string, content: string): void {
  fs.writeFileSync(file, content, { encoding: "utf8", mode: 0o600 });
  fs.chmodSync(file, 0o600);
}

function failure(error: unknown, secrets: string[], options: Options): string {
  const code = elCode(error);
  if (code === "not_rehearsal") return `Refused: ${options.edition} is not a rehearsal edition, so it cannot have rehearsal codes.`;
  if (code === "edition_not_event") return `Refused: ${options.edition} is a rehearsal edition; use --rehearsal N for its codes.`;
  if (code === "unknown_edition") return `Unknown edition ${options.edition}. Run scripts/elemental/seed.ts first.`;
  if (code === "bad_count") return "Refused: --rehearsal takes a count from 1 to 200.";
  return `Database call failed (${describeError(error, secrets)})`;
}

/** Runs the script. Returns the exit code: 0 ok, 1 refused or failed, 2 usage. */
export async function run(argv: string[], deps: Deps, now: () => Date = () => new Date()): Promise<number> {
  let options: Options;
  let admin: ReturnType<typeof readAdmin>;
  try {
    options = parseArgs(argv);
    if (options.help) {
      deps.out(USAGE);
      return 0;
    }
    admin = readAdmin(deps.env, "elemental-issue-claims");
  } catch (error) {
    if (error instanceof UsageError) return usageFailure(deps, error, USAGE);
    throw error;
  }

  if (!options.dryRun) {
    try {
      fs.mkdirSync(options.outDir, { recursive: true });
      fs.accessSync(options.outDir, fs.constants.W_OK);
    } catch {
      deps.err(`Cannot write to ${options.outDir}`);
      return 1;
    }
  }

  let client: DbClient;
  try {
    client = await deps.connect(admin.config);
  } catch (error) {
    deps.err(`Could not connect as the admin user (${describeError(error, admin.secrets)})`);
    return 1;
  }

  let open = false;
  let claims: ClaimRow[] = [];
  let rehearsalCodes: string[] = [];
  try {
    await client.query("BEGIN");
    open = true;
    if (options.rehearsal !== null) {
      const { rows } = await client.query("SELECT code FROM public.elemental_issue_rehearsal_claims($1, $2)", [
        options.edition,
        options.rehearsal,
      ]);
      rehearsalCodes = rows.map((r) => String(r.code));
    } else {
      const { rows } = await client.query(
        `SELECT registration_id::text AS registration_id, team_name, "position", code, state
         FROM public.elemental_issue_claims($1)`,
        [options.edition],
      );
      claims = rows.map((r) => ({
        registration_id: String(r.registration_id),
        team_name: r.team_name === null || r.team_name === undefined ? null : String(r.team_name),
        position: Number(r.position),
        code: r.code === null || r.code === undefined ? null : String(r.code),
        state: r.state as ClaimRow["state"],
      }));
    }
    await client.query(options.dryRun ? "ROLLBACK" : "COMMIT");
    open = false;
  } catch (error) {
    if (open) await client.query("ROLLBACK").catch(() => undefined);
    deps.err(error instanceof StopError ? error.message : failure(error, admin.secrets, options));
    deps.err("Nothing was issued.");
    return 1;
  } finally {
    await client.end().catch(() => undefined);
  }

  const day = bangkokDay(now());
  const prefix = options.dryRun ? "Dry run (rolled back, no file written): would issue" : "Issued";

  if (options.rehearsal !== null) {
    deps.out(`${prefix} ${rehearsalCodes.length} rehearsal codes for ${options.edition}.`);
    if (options.dryRun) return 0;
    const file = path.join(options.outDir, `rehearsal-${day}.csv`);
    const existing = fs.existsSync(file) ? fs.readFileSync(file, "utf8").split("\n").slice(1).filter(Boolean) : [];
    writePrivate(file, ["code", ...existing, ...rehearsalCodes].join("\n") + "\n");
    deps.out(`  ${path.relative(process.cwd(), file) || file} (${existing.length + rehearsalCodes.length} codes today)`);
    return 0;
  }

  const registrations = new Set(claims.map((c) => c.registration_id)).size;
  const count = (state: ClaimRow["state"]) => claims.filter((c) => c.state === state).length;
  deps.out(
    `${prefix} codes for ${options.edition}: ${registrations} paid registrations, ` +
      `${count("new")} new, ${count("existing")} already issued, ${count("over_cap")} over the 5-person cap.`,
  );
  const overCap = new Map<string, number[]>();
  for (const c of claims) {
    if (c.state !== "over_cap") continue;
    overCap.set(c.registration_id, [...(overCap.get(c.registration_id) ?? []), c.position]);
  }
  for (const [registrationId, positions] of overCap) {
    deps.err(`  registration ${registrationId}: positions ${positions.join(", ")} have no code (5 per registration); sort these out by hand`);
  }
  if (options.dryRun) return 0;

  const csv = path.join(options.outDir, `claims-${day}.csv`);
  const messages = path.join(options.outDir, `claims-${day}-messages.txt`);
  writePrivate(csv, claimsCsv(claims));
  writePrivate(messages, claimsMessages(claims));
  deps.out(`  ${path.relative(process.cwd(), csv) || csv}`);
  deps.out(`  ${path.relative(process.cwd(), messages) || messages}`);
  return 0;
}

if (require.main === module) runMain((argv, deps) => run(argv, deps));
