/**
 * Checks the whiteboard SQL against the cases the TypeScript copy is tested
 * with (lib/whiteboard/canvas-trust.cases.ts), plus a few things only the
 * database does. Starts a throwaway Postgres in Docker, applies every
 * whiteboard migration in order on small stubs of the Supabase schemas they
 * use, runs each case through whiteboard_merge_elements inside a transaction
 * that is rolled back, and removes the container. Never touches a real
 * database, so it needs no credentials.
 *
 *   pnpm test:whiteboard-sql
 *
 * WHITEBOARD_SQL_IMAGE picks the Postgres image (default postgres:17-alpine) and
 * WHITEBOARD_SQL_USER the superuser to run as (default postgres; supabase_admin
 * for Supabase's own image, public.ecr.aws/supabase/postgres).
 */
import { execFileSync, spawnSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { BOARD_EDITORS, BOARD_ID, BOARD_OWNER, checkFields, PEOPLE, SITE_ADMINS, trustCases } from "../lib/whiteboard/canvas-trust.cases";
import { stampAuthor } from "../lib/whiteboard/core";

const IMAGE = process.env.WHITEBOARD_SQL_IMAGE ?? "postgres:17-alpine";
const USER = process.env.WHITEBOARD_SQL_USER ?? "postgres";
const PASSWORD = "check";
const CONTAINER = `whiteboard-sql-check-${process.pid}`;
/** docker exec arguments for psql, over TCP with the throwaway password. */
const CONNECT = ["-e", `PGPASSWORD=${PASSWORD}`, CONTAINER, "psql", "-h", "127.0.0.1", "-U", USER, "-d", "postgres"];
const MIGRATIONS = join(__dirname, "..", "supabase", "migrations");

/** The parts of Supabase's own schemas the whiteboard migrations use (already there in Supabase's image). */
const STUBS = `
DO $$
DECLARE r TEXT;
BEGIN
  FOREACH r IN ARRAY ARRAY['anon', 'authenticated', 'service_role'] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN EXECUTE format('CREATE ROLE %I NOLOGIN', r); END IF;
  END LOOP;
END $$;
CREATE SCHEMA IF NOT EXISTS auth;
CREATE TABLE IF NOT EXISTS auth.users (id UUID PRIMARY KEY);
CREATE OR REPLACE FUNCTION auth.uid() RETURNS UUID LANGUAGE sql STABLE AS $$ SELECT NULL::UUID $$;
CREATE TABLE IF NOT EXISTS public.user_roles (user_id UUID NOT NULL, role TEXT NOT NULL);
CREATE SCHEMA IF NOT EXISTS realtime;
CREATE TABLE IF NOT EXISTS realtime.messages (topic TEXT, extension TEXT, event TEXT, payload JSONB, private BOOLEAN);
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION realtime.topic() RETURNS TEXT LANGUAGE sql STABLE AS $$ SELECT NULL::TEXT $$;
`;

function psql(sql: string): string {
  const run = spawnSync(
    "docker",
    ["exec", "-i", ...CONNECT, "-X", "-q", "-At", "-v", "ON_ERROR_STOP=1", "--single-transaction"],
    { input: sql, encoding: "utf8" },
  );
  if (run.status !== 0) throw new Error(run.stderr || `psql exited with ${run.status}`);
  return run.stdout.trim();
}

const json = (value: unknown) => `$json$${JSON.stringify(value)}$json$::jsonb`;
const quote = (text: string) => `'${text.replace(/'/g, "''")}'`;

function startDatabase() {
  execFileSync("docker", ["run", "-d", "--rm", "--name", CONTAINER, "-e", `POSTGRES_PASSWORD=${PASSWORD}`, IMAGE], { stdio: "ignore" });
  // Over TCP: while the image sets itself up it runs a temporary server on the socket only.
  for (let i = 0; i < 120; i++) {
    const ready = spawnSync(
      "docker",
      ["exec", ...CONNECT, "-c", "SELECT 1"],
      { stdio: "ignore" },
    );
    if (ready.status === 0) return;
    execFileSync("sleep", ["0.5"]);
  }
  throw new Error("Postgres did not start");
}

function applyMigrations(): string[] {
  psql(STUBS);
  const files = readdirSync(MIGRATIONS)
    .filter((f) => /whiteboard/.test(f) && f.endsWith(".sql"))
    .sort();
  for (const file of files) psql(readFileSync(join(MIGRATIONS, file), "utf8"));
  // Migrations must be safe to run twice.
  psql(readFileSync(join(MIGRATIONS, files.at(-1)!), "utf8"));
  return files;
}

type Stored = { id: string; version: number; customData?: Record<string, unknown> | null };
type Outcome = { result: { corrected: Stored[]; dropped: string[] }; stored: Stored[]; projects: Record<string, string> | null };

/** A board with the cases' people, as saved, then one save. Rolled back afterwards. */
function runSave(saved: unknown[], saver: string, save: unknown[], projects: Record<string, string> = {}): Outcome {
  const people = Object.values(PEOPLE);
  const sql = `
    INSERT INTO auth.users (id) VALUES ${people.map((p) => `(${quote(p)})`).join(", ")};
    INSERT INTO public.user_roles (user_id, role) VALUES ${SITE_ADMINS.map((p) => `(${quote(PEOPLE[p])}, 'admin')`).join(", ")};
    INSERT INTO public.whiteboards (id, owner_id, elements) VALUES (${quote(BOARD_ID)}, ${quote(PEOPLE[BOARD_OWNER])}, ${json(saved)});
    INSERT INTO public.whiteboard_members (whiteboard_id, user_id, role)
      VALUES ${BOARD_EDITORS.map((p) => `(${quote(BOARD_ID)}, ${quote(PEOPLE[p])}, 'editor')`).join(", ")};
    ${Object.entries(projects)
      .map(([project, owner]) => `INSERT INTO public.whiteboard_projects (id, owner_id) VALUES (${quote(project)}, ${quote(owner)});`)
      .join("\n")}
    -- Its own statement: a query only sees what was there when it started.
    CREATE TEMP TABLE merged ON COMMIT DROP AS
      SELECT public.whiteboard_merge_elements(${quote(BOARD_ID)}, ${json(stampAuthor(save as object[], saver))}) AS result;
    SELECT json_build_object(
      'result', (SELECT result FROM merged),
      'stored', (SELECT elements FROM public.whiteboards WHERE id = ${quote(BOARD_ID)}),
      'projects', (SELECT json_object_agg(id, owner_id) FROM public.whiteboard_projects)
    );
    ROLLBACK;`;
  return JSON.parse(psql(`BEGIN;${sql}`)) as Outcome;
}

function checkCases(): string[] {
  const failures: string[] = [];
  for (const c of trustCases()) {
    const saver = PEOPLE[c.saver];
    const projects = Object.fromEntries(Object.entries(c.projects ?? {}).map(([p, who]) => [p, PEOPLE[who]]));
    const problems: string[] = [];
    try {
      const { result, stored, projects: after } = runSave(c.saved, saver, c.save, projects);
      const expectedDropped = c.sqlDropped ?? c.dropped;
      const dropped = [...result.dropped].sort();
      if (JSON.stringify(dropped) !== JSON.stringify([...expectedDropped].sort())) {
        problems.push(`dropped ${JSON.stringify(dropped)}, expected ${JSON.stringify(expectedDropped)}`);
      }
      const byId = new Map(stored.map((el) => [el.id, el]));
      // What was left out is stored as it was before the save.
      for (const id of expectedDropped) {
        const before = c.saved.find((el) => el.id === id);
        if (byId.get(id)?.version !== before?.version) problems.push(`${id} was left out but changed`);
      }
      const keptIds = new Set(c.save.map((el) => el.id).filter((id) => !expectedDropped.includes(id)));
      const kept = new Map([...byId].filter(([id]) => keptIds.has(id)));
      problems.push(...checkFields(kept, c.expect), ...checkFields(kept, c.sqlOnly));
      for (const [project, who] of Object.entries(c.projectsAfter ?? {})) {
        if (after?.[project] !== PEOPLE[who]) problems.push(`project ${project} belongs to ${after?.[project]}, expected ${who}`);
      }
    } catch (error) {
      problems.push(String(error));
    }
    console.log(`${problems.length ? "✕" : "✓"} ${c.name}`);
    if (problems.length) failures.push(`${c.name}:\n    ${problems.join("\n    ")}`);
  }
  return failures;
}

/** Things only the database does, beyond the shared cases. */
function checkDatabaseOnly(): string[] {
  const failures: string[] = [];
  const check = (name: string, ok: () => boolean | string) => {
    let problem: string | null = null;
    try {
      const result = ok();
      if (result !== true) problem = result === false ? "failed" : result;
    } catch (error) {
      problem = String(error);
    }
    console.log(`${problem ? "✕" : "✓"} ${name}`);
    if (problem) failures.push(`${name}: ${problem}`);
  };
  const owner = PEOPLE.owner;

  check("versions past 32 bits merge, and the next edit still saves", () => {
    const big = { id: "B", type: "rectangle", version: 3_000_000_000, customData: { createdBy: owner } };
    const { stored } = runSave([big], owner, [{ ...big, version: 3_000_000_001, x: 1 }]);
    return stored.find((el) => el.id === "B")?.version === 3_000_000_001 || JSON.stringify(stored);
  });

  check("the answer lists what was left out, with its saved copy", () => {
    const frame = { id: "F", type: "frame", version: 1, customData: { project: "p", owner, editors: [] } };
    const note = { id: "N", type: "rectangle", version: 1, frameId: "F", customData: { createdBy: owner } };
    const { result } = runSave([frame, note], PEOPLE.other, [{ ...note, version: 2 }, { id: "X", type: "text", version: 1, frameId: "F" }]);
    const ok = JSON.stringify([...result.dropped].sort()) === '["N","X"]' && result.corrected.some((el) => el.id === "N" && el.version === 1);
    return ok || JSON.stringify(result);
  });

  check("the answer lists elements kept differently from how they were sent", () => {
    const loose = { id: "L", type: "rectangle", version: 1, customData: { createdBy: PEOPLE.mate } };
    const { result } = runSave([loose], PEOPLE.other, [{ ...loose, version: 2, customData: { createdBy: PEOPLE.other } }]);
    return result.corrected.some((el) => el.id === "L" && el.customData?.createdBy === PEOPLE.mate) || JSON.stringify(result);
  });

  check("an untouched save has nothing to correct", () => {
    const loose = { id: "L", type: "rectangle", version: 1, customData: { createdBy: owner } };
    const { result } = runSave([loose], owner, [{ ...loose, version: 2, x: 5 }]);
    return (result.corrected.length === 0 && result.dropped.length === 0) || JSON.stringify(result);
  });

  check("whiteboard_elements_by_id returns the saved copies asked for", () => {
    const els = [
      { id: "A", type: "rectangle", version: 1 },
      { id: "B", type: "rectangle", version: 2 },
    ];
    const out = psql(`BEGIN;
      INSERT INTO auth.users (id) VALUES (${quote(owner)});
      INSERT INTO public.whiteboards (id, owner_id, elements) VALUES (${quote(BOARD_ID)}, ${quote(owner)}, ${json(els)});
      SELECT public.whiteboard_elements_by_id(${quote(BOARD_ID)}, ARRAY['B', 'missing']);
      ROLLBACK;`);
    return out === '[{"id": "B", "type": "rectangle", "version": 2}]' || out;
  });

  check("a note version with a malformed number is ignored, not an error", () => {
    const note = { id: "N", type: "rectangle", version: 1, customData: { createdBy: owner, versions: [] } };
    const bad = { v: "abc", text: "x", at: new Date().toISOString(), by: owner };
    const { stored } = runSave([note], owner, [{ ...note, version: 2, customData: { createdBy: owner, versions: [bad] } }]);
    return JSON.stringify(stored[0]?.customData?.versions) === "[]" || JSON.stringify(stored);
  });

  check("clients cannot call the whiteboard functions; the service role can", () => {
    const out = psql(`
      SELECT string_agg(p.proname || ':' || has_function_privilege('authenticated', p.oid, 'EXECUTE')
                        || has_function_privilege('anon', p.oid, 'EXECUTE')
                        || has_function_privilege('service_role', p.oid, 'EXECUTE'), ',' ORDER BY p.proname)
      FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname IN (
        'whiteboard_merge_elements', 'whiteboard_elements_by_id', 'whiteboard_card_versions',
        'whiteboard_canvas_editors', 'whiteboard_is_card_version', 'whiteboard_try_timestamptz');`);
    const wrong = out.split(",").filter((row) => !row.endsWith(":falsefalsetrue"));
    return wrong.length === 0 || `wrong privileges: ${wrong.join(", ")}`;
  });

  check("saving drops deleted elements older than a day, and keeps the rest", () => {
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    const els = [
      { id: "old-dead", type: "freedraw", version: 2, isDeleted: true, updated: now - 2 * day },
      { id: "new-dead", type: "freedraw", version: 2, isDeleted: true, updated: now - 60_000 },
      { id: "old-live", type: "freedraw", version: 1, isDeleted: false, updated: now - 2 * day },
      { id: "dead-no-time", type: "line", version: 2, isDeleted: true },
    ];
    const edit = { id: "E", type: "rectangle", version: 1, updated: now, customData: { createdBy: owner } };
    const { stored } = runSave(els.map((el) => ({ ...el, customData: { createdBy: owner } })), owner, [edit]);
    const ids = stored.map((el) => el.id).sort().join(",");
    return ids === "E,dead-no-time,new-dead,old-live" || ids;
  });

  check("the projects table has row level security", () => {
    const out = psql(`SELECT relrowsecurity FROM pg_class WHERE oid = 'public.whiteboard_projects'::regclass;`);
    return out === "t" || out;
  });

  return failures;
}

function main() {
  let failures: string[] = [];
  try {
    startDatabase();
    const files = applyMigrations();
    console.log(`Applied ${files.length} whiteboard migrations to ${IMAGE}, the last one twice.\n`);
    failures = [...checkCases(), ...checkDatabaseOnly()];
  } finally {
    spawnSync("docker", ["rm", "-f", CONTAINER], { stdio: "ignore" });
  }
  if (failures.length) {
    console.error(`\n${failures.length} failed:\n  ${failures.join("\n  ")}`);
    process.exit(1);
  }
  console.log("\nAll whiteboard SQL checks passed.");
}

main();
