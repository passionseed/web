/**
 * Whiteboard save-contention load test, to decide how many Elemental teams share one board.
 *
 * Every save rewrites the whole board row, and whiteboard_merge_elements takes the row with
 * FOR UPDATE (supabase/migrations/20261110120000_whiteboard_canvas_trust.sql:236), so all saves
 * to one board run one at a time. This script builds boards of SHIFT-like project canvases
 * (about 2 MB of elements, docs/features/whiteboard.md), has N editors each save 1-2 of their own
 * notes every 1.2 s (useWhiteboardSync.ts SAVE_DEBOUNCE_MS), plus one bot tester note a second
 * stamped with the board owner (what elemental_bot_canvas_write will do), and reports the time
 * each save waited for the row lock and the time the merge itself took.
 *
 *   pnpm tsx scripts/elemental/whiteboard-load.ts
 *   pnpm tsx scripts/elemental/whiteboard-load.ts --teams 15,25,35 --editors 40,70,120 --seconds 20
 *
 * Options:
 *   --teams 15,25,35      project canvases per board
 *   --editors 40,70,120   editors saving on that board at the same time
 *   --matrix              run every teams x editors combination; by default teams[i] runs with
 *                         editors[i] (15/40, 25/70, 35/120: about 3 editors per team)
 *   --editors-per-team 3  how many of a team's 2-5 members save at once, to pick which scenario
 *                         judges each team count for the recommendation
 *   --seconds 20          how long each scenario runs
 *   --board-mb 2          size of each board's elements before the test
 *   --kb-per-team <kb>    instead, let the board grow with its teams (teams x kb)
 *   --save-every 1.2      seconds between one editor's saves (1.2 s is the debounce, so the most
 *                         a busy editor can save; real editors pause, so this is the worst case)
 *   --pool <n>            database connections the editors share (default: one per editor, so the
 *                         row lock is the only queue; set it to the API's pool size to see that too)
 *   --engine auto|docker|local
 *                         auto: Docker when its daemon answers, else a Homebrew Postgres
 *                         (initdb in a temp folder, Unix socket only, no TCP port)
 *
 * It measures the database only, not Supabase Realtime or the API route around the merge.
 *
 * Reading the result: one merge costs time in proportion to the board's size (about 85 ms per MB
 * on a laptop on 2026-11-22), whatever the number of teams, so a board takes at most
 * 1000 / merge-ms saves a second ("board max saves/s"). Once editors and the bot ask for more,
 * the lock wait grows without limit. Teams per board matter because more teams make a bigger
 * board and more editors.
 *
 * SAFETY: it only ever connects to a Postgres it started itself and removes it at the end. It
 * takes no connection string; one given with --db-url or WHITEBOARD_LOAD_DB_URL is refused and the
 * script exits 2. It never reads .env files.
 */
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { cpus, loadavg, tmpdir } from "node:os";
import { join } from "node:path";
import { performance } from "node:perf_hooks";

import { Client, Pool, type PoolConfig } from "pg";

import { stampAuthor } from "../../lib/whiteboard/core";

const MIGRATIONS = join(__dirname, "..", "..", "supabase", "migrations");
/** useWhiteboardSync.ts SAVE_DEBOUNCE_MS: an editor who keeps changing things saves at most this often. */
const SAVE_DEBOUNCE_MS = 1200;
const TESTER_INTERVAL_MS = 1000;
/** A save slower than one debounce means the editor's next save is already waiting behind it. */
const SLOW_SAVE_MS = SAVE_DEBOUNCE_MS;
const IMAGE = process.env.WHITEBOARD_LOAD_IMAGE ?? "postgres:17-alpine";

/* ------------------------------------------------------------------ safety */

/** Connection strings of databases this run started. Nothing else may be connected to. */
const started = new Set<string>();

class RefusedUrl extends Error {}

/** Throws unless the URL belongs to a throwaway database this process started. */
export function assertStartedHere(url: string): void {
  if (!started.has(url)) {
    throw new RefusedUrl(
      "Refusing to connect: this load test only runs on a throwaway Postgres it starts itself " +
        "(Docker or a temp Homebrew cluster). It never takes a connection string.",
    );
  }
}

function refuseGivenUrl(argv: string[]): void {
  const flag = argv.findIndex((a) => a === "--db-url" || a.startsWith("--db-url="));
  const given = flag >= 0 ? (argv[flag].split("=")[1] ?? argv[flag + 1] ?? "") : process.env.WHITEBOARD_LOAD_DB_URL;
  if (given === undefined) return;
  try {
    assertStartedHere(given);
  } catch (error) {
    console.error(String((error as Error).message));
    process.exit(2);
  }
}

/* --------------------------------------------------------------- database */

/** The parts of Supabase's own schemas the whiteboard migrations use (as in scripts/whiteboard-sql-check.ts). */
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

type Throwaway = { url: string; config: PoolConfig; label: string; stop: () => void };

const SERVER_FLAGS = ["-c", "max_connections=300", "-c", "shared_buffers=256MB"];

function dockerUp(): boolean {
  return spawnSync("docker", ["info"], { stdio: "ignore" }).status === 0;
}

function startDocker(): Throwaway {
  const name = `whiteboard-load-${process.pid}`;
  const password = "load";
  execFileSync(
    "docker",
    ["run", "-d", "--rm", "--name", name, "-e", `POSTGRES_PASSWORD=${password}`, "-p", "127.0.0.1::5432", IMAGE, ...SERVER_FLAGS],
    { stdio: "ignore" },
  );
  const stop = () => void spawnSync("docker", ["rm", "-f", name], { stdio: "ignore" });
  try {
    const mapped = execFileSync("docker", ["port", name, "5432/tcp"], { encoding: "utf8" }).trim().split("\n")[0];
    const port = Number(mapped.split(":").at(-1));
    const url = `postgresql://postgres:${password}@127.0.0.1:${port}/postgres`;
    started.add(url);
    return {
      url,
      config: { host: "127.0.0.1", port, user: "postgres", password, database: "postgres" },
      label: `Docker ${IMAGE} (container ${name})`,
      stop,
    };
  } catch (error) {
    stop();
    throw error;
  }
}

function homebrewBin(): string {
  const candidates = [
    process.env.WHITEBOARD_LOAD_PG_BIN,
    ...["17", "15", "16", "18"].flatMap((v) => [`/opt/homebrew/opt/postgresql@${v}/bin`, `/usr/local/opt/postgresql@${v}/bin`]),
    "/opt/homebrew/opt/postgresql/bin",
  ].filter((d): d is string => !!d);
  const found = candidates.find((dir) => existsSync(join(dir, "initdb")) && existsSync(join(dir, "pg_ctl")));
  if (!found) throw new Error("No Docker and no Homebrew Postgres (initdb, pg_ctl) found. Set WHITEBOARD_LOAD_PG_BIN.");
  return found;
}

/**
 * Removes temp clusters left by an earlier run that was killed (its postmaster is gone). Only
 * folders older than 10 minutes: a run started at the same time may still be inside initdb, with
 * no postmaster.pid yet.
 */
function sweepStale(base: string): void {
  for (const name of readdirSync(base).filter((n) => n.startsWith("wbload-"))) {
    const dir = join(base, name);
    try {
      if (Date.now() - statSync(dir).mtimeMs < 10 * 60 * 1000) continue;
    } catch {
      continue;
    }
    const pidFile = join(dir, "data", "postmaster.pid");
    const pid = existsSync(pidFile) ? Number(readFileSync(pidFile, "utf8").split("\n")[0]) : 0;
    let alive = false;
    try {
      if (pid > 0) alive = process.kill(pid, 0);
    } catch {
      alive = false;
    }
    if (!alive) rmSync(dir, { recursive: true, force: true });
  }
}

function startLocal(): Throwaway {
  const bin = homebrewBin();
  // Unix socket paths are limited to about 100 bytes, so fall back to /tmp when TMPDIR is long.
  const base = tmpdir().length < 60 ? tmpdir() : "/tmp";
  sweepStale(base);
  const dir = mkdtempSync(join(base, "wbload-"));
  const data = join(dir, "data");
  const port = 5432; // Socket only, in a private folder: no clash with any other server.
  const remove = () => rmSync(dir, { recursive: true, force: true });
  try {
    execFileSync(join(bin, "initdb"), ["-D", data, "-U", "postgres", "--auth=trust", "-E", "UTF8", "--no-locale"], { stdio: "ignore" });
    const options = ["-k", dir, "-c", "listen_addresses=", "-p", String(port), ...SERVER_FLAGS].join(" ");
    execFileSync(join(bin, "pg_ctl"), ["-D", data, "-o", options, "-l", join(dir, "log"), "-w", "start"], { stdio: "ignore" });
  } catch (error) {
    remove();
    throw error;
  }
  const version = execFileSync(join(bin, "postgres"), ["--version"], { encoding: "utf8" }).trim();
  const url = `postgresql:///postgres?host=${encodeURIComponent(dir)}&port=${port}&user=postgres`;
  started.add(url);
  return {
    url,
    config: { host: dir, port, user: "postgres", database: "postgres" },
    label: `${version}, temp cluster in ${dir} (socket only)`,
    stop: () => {
      spawnSync(join(bin, "pg_ctl"), ["-D", data, "-m", "immediate", "-w", "stop"], { stdio: "ignore" });
      remove();
    },
  };
}

function startThrowaway(engine: string): Throwaway {
  if (engine === "docker") return startDocker();
  if (engine === "local") return startLocal();
  return dockerUp() ? startDocker() : startLocal();
}

/**
 * Waits until the server answers over the connection the load test will use. The Docker image
 * first runs a temporary socket-only server while it sets itself up, so a TCP connect that works
 * means the real server is up (as in scripts/whiteboard-sql-check.ts).
 */
async function waitReady(db: Throwaway): Promise<void> {
  assertStartedHere(db.url);
  let last: unknown;
  for (let i = 0; i < 120; i++) {
    const client = new Client(db.config);
    try {
      await client.connect();
      await client.query("SELECT 1");
      await client.end();
      return;
    } catch (error) {
      last = error;
      await client.end().catch(() => undefined);
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  throw new Error(`Postgres did not start: ${String((last as Error)?.message ?? last)}`);
}

function openPool(db: Throwaway, max: number): Pool {
  assertStartedHere(db.url);
  return new Pool({ ...db.config, max, idleTimeoutMillis: 0 });
}

async function applyMigrations(pool: Pool): Promise<string[]> {
  await pool.query(STUBS);
  const files = readdirSync(MIGRATIONS)
    .filter((f) => /whiteboard/.test(f) && f.endsWith(".sql"))
    .sort();
  // A multi-statement simple query runs as one transaction, like psql --single-transaction.
  for (const file of files) await pool.query(readFileSync(join(MIGRATIONS, file), "utf8"));
  return files;
}

/* ------------------------------------------------------------------ board */

/** Deterministic random numbers, so every run builds the same boards. */
function prng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fake people: fixed UUIDs, no names. */
const person = (n: number) => `00000000-0000-4000-8000-${n.toString(16).padStart(12, "0")}`;
const uuidFrom = (prefix: number, n: number) =>
  `${prefix.toString(16).padStart(8, "0")}-0000-4000-8000-${n.toString(16).padStart(12, "0")}`;

type El = Record<string, unknown> & { id: string; version: number; customData?: Record<string, unknown> };

/** Fractional-index-like keys that sort in "C" collation (the merge orders by index). */
const indexKey = (n: number) => `a${n.toString(36).padStart(6, "0")}`;

/** Filler text for notes. Not copy: it is only there to give the board a realistic weight. */
const FILLER = ["note", "test", "idea", "user", "tried", "changed", "step", "result", "plan", "draft"];

type Team = { frameId: string; owner: string; members: string[]; x: number; y: number };
type Board = {
  id: string;
  owner: string;
  editors: string[];
  teams: Team[];
  elements: El[];
  /** Each editor's own notes: the rectangle and its text. */
  notesOf: Map<string, { rect: El; text: El }[]>;
  nextIndex: number;
  bytes: number;
};

function buildBoard(boardNo: number, teamCount: number, editorCount: number, targetBytes: number): Board {
  const rand = prng(boardNo * 7919 + teamCount * 31 + editorCount);
  const owner = person(boardNo * 100_000);
  const editors = Array.from({ length: editorCount }, (_, i) => person(boardNo * 100_000 + 1 + i));
  const elements: El[] = [];
  const notesOf = new Map<string, { rect: El; text: El }[]>();
  let nextIndex = 1;
  let seq = 0;
  const now = Date.now();
  const base = () => ({
    angle: 0,
    strokeColor: "#1e1e1e",
    backgroundColor: "transparent",
    fillStyle: "solid",
    strokeWidth: 2,
    strokeStyle: "solid",
    roughness: 1,
    opacity: 100,
    groupIds: [] as string[],
    seed: Math.floor(rand() * 2 ** 31),
    version: 1 + Math.floor(rand() * 40),
    versionNonce: Math.floor(rand() * 2 ** 31),
    isDeleted: false,
    updated: now,
    link: null,
    locked: false,
    index: indexKey(nextIndex++),
  });
  const words = (n: number) => Array.from({ length: n }, () => FILLER[Math.floor(rand() * FILLER.length)]).join(" ");

  const teams: Team[] = Array.from({ length: teamCount }, (_, t) => {
    const members = editors.filter((_, i) => i % teamCount === t);
    const teamOwner = members[0] ?? person(boardNo * 100_000 + 90_000 + t);
    const team: Team = {
      frameId: `frame-${boardNo}-${t}`,
      owner: teamOwner,
      members,
      x: (t % 6) * 1800,
      y: Math.floor(t / 6) * 1200,
    };
    elements.push({
      ...base(),
      id: team.frameId,
      type: "frame",
      x: team.x,
      y: team.y,
      width: 1600,
      height: 1000,
      name: `Project ${t + 1}`,
      boundElements: null,
      customData: {
        project: uuidFrom(boardNo, t + 1),
        owner: teamOwner,
        editors: members.slice(1),
        createdBy: teamOwner,
      },
    });
    return team;
  });

  const note = (team: Team, author: string, card: string): { rect: El; text: El } => {
    const id = `n${boardNo}-${seq++}`;
    const x = team.x + 40 + rand() * 1300;
    const y = team.y + 40 + rand() * 780;
    const body = words(8 + Math.floor(rand() * 30));
    const rect: El = {
      ...base(),
      id,
      type: "rectangle",
      x,
      y,
      width: 220,
      height: 160,
      backgroundColor: "#ffd8a8",
      roundness: { type: 3 },
      frameId: team.frameId,
      boundElements: [{ id: `${id}-t`, type: "text" }],
      customData: { card, createdBy: author },
    };
    const text: El = {
      ...base(),
      id: `${id}-t`,
      type: "text",
      x: x + 10,
      y: y + 10,
      width: 200,
      height: 140,
      frameId: team.frameId,
      containerId: id,
      boundElements: null,
      text: body,
      originalText: body,
      fontSize: 20,
      fontFamily: 5,
      textAlign: "center",
      verticalAlign: "middle",
      lineHeight: 1.25,
      autoResize: true,
      customData: { createdBy: author },
    };
    elements.push(rect, text);
    return { rect, text };
  };

  const stroke = (team: Team, author: string) => {
    const n = 60 + Math.floor(rand() * 120);
    let px = 0;
    let py = 0;
    const points: [number, number][] = [];
    for (let i = 0; i < n; i++) {
      points.push([Math.round(px * 100) / 100, Math.round(py * 100) / 100]);
      px += rand() * 6 - 1;
      py += rand() * 6 - 3;
    }
    elements.push({
      ...base(),
      id: `s${boardNo}-${seq++}`,
      type: "freedraw",
      x: team.x + rand() * 1400,
      y: team.y + rand() * 900,
      width: 200,
      height: 120,
      frameId: team.frameId,
      boundElements: null,
      points,
      pressures: [],
      simulatePressure: true,
      customData: { createdBy: author },
    });
  };

  // Every editor gets two notes of their own to move and edit during the test.
  const kinds = ["problem", "target", "interview", "idea", "test", "pivot", "daily"];
  for (const team of teams) {
    for (const member of team.members) {
      notesOf.set(member, [note(team, member, "idea"), note(team, member, "test")]);
    }
  }
  // Then fill the canvases round-robin up to the target size: three notes to one stroke.
  let size = JSON.stringify(elements).length;
  for (let i = 0; size < targetBytes; i++) {
    const team = teams[i % teams.length];
    const author = team.members.length ? team.members[Math.floor(rand() * team.members.length)] : team.owner;
    const before = elements.length;
    if (i % 4 === 3) stroke(team, author);
    else note(team, author, kinds[Math.floor(rand() * kinds.length)]);
    size += JSON.stringify(elements.slice(before)).length + 1;
  }

  return {
    id: uuidFrom(0xb0a4d, boardNo),
    owner,
    editors,
    teams,
    elements,
    notesOf,
    nextIndex,
    bytes: Buffer.byteLength(JSON.stringify(elements)),
  };
}

async function insertBoard(pool: Pool, board: Board): Promise<void> {
  const people = [board.owner, ...board.editors, ...board.teams.map((t) => t.owner)];
  await pool.query("INSERT INTO auth.users (id) SELECT unnest($1::uuid[]) ON CONFLICT DO NOTHING", [people]);
  await pool.query("INSERT INTO public.whiteboards (id, owner_id, elements) VALUES ($1, $2, $3::jsonb)", [
    board.id,
    board.owner,
    JSON.stringify(board.elements),
  ]);
  await pool.query(
    "INSERT INTO public.whiteboard_members (whiteboard_id, user_id, role) SELECT $1, unnest($2::uuid[]), 'editor'",
    [board.id, board.editors],
  );
}

/* ------------------------------------------------------------------- load */

type Sample = { poolWait: number; lockWait: number; merge: number; total: number };
type Tally = { samples: Sample[]; errors: number; errorSamples: string[]; dropped: number };

const newTally = (): Tally => ({ samples: [], errors: 0, errorSamples: [], dropped: 0 });

/** One save as the API makes it: one transaction around whiteboard_merge_elements. */
async function save(pool: Pool, boardId: string, elements: El[], tally: Tally): Promise<void> {
  const t0 = performance.now();
  let client;
  try {
    client = await pool.connect();
  } catch (error) {
    tally.errors++;
    if (tally.errorSamples.length < 3) tally.errorSamples.push(String((error as Error).message).slice(0, 200));
    return;
  }
  const t1 = performance.now();
  try {
    await client.query("BEGIN");
    // Take the row lock first, as the merge's own FOR UPDATE would, so the wait can be timed apart.
    await client.query("SELECT 1 FROM public.whiteboards WHERE id = $1 FOR UPDATE", [boardId]);
    const t2 = performance.now();
    const { rows } = await client.query<{ r: { dropped: string[] } }>(
      "SELECT public.whiteboard_merge_elements($1, $2::jsonb) AS r",
      [boardId, JSON.stringify(elements)],
    );
    await client.query("COMMIT");
    const t3 = performance.now();
    tally.dropped += rows[0]?.r?.dropped?.length ?? 0;
    tally.samples.push({ poolWait: t1 - t0, lockWait: t2 - t1, merge: t3 - t2, total: t3 - t0 });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    tally.errors++;
    if (tally.errorSamples.length < 3) tally.errorSamples.push(String((error as Error).message).slice(0, 200));
  } finally {
    client.release();
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Wait out the rest of the interval, but never past the end of the scenario (that would stretch it). */
const untilNext = (started: number, everyMs: number, until: number) =>
  Math.max(0, Math.min(everyMs - (performance.now() - started), until - performance.now()));

/** One editor: change one or two of their notes, save, wait out the rest of the interval, repeat. */
async function editorLoop(
  pool: Pool,
  board: Board,
  editor: string,
  everyMs: number,
  until: number,
  rand: () => number,
  tally: Tally,
) {
  const notes = board.notesOf.get(editor) ?? [];
  if (!notes.length) return;
  await sleep(rand() * everyMs);
  while (performance.now() < until) {
    const started = performance.now();
    const changed: El[] = [];
    for (const n of rand() < 0.3 ? notes : [notes[Math.floor(rand() * notes.length)]]) {
      n.rect = { ...n.rect, x: (n.rect.x as number) + 3, version: n.rect.version + 1, versionNonce: Math.floor(rand() * 2 ** 31), updated: Date.now() };
      changed.push(n.rect);
      if (rand() < 0.4) {
        const text = `${n.text.text as string} ${FILLER[Math.floor(rand() * FILLER.length)]}`.slice(-400);
        n.text = { ...n.text, text, originalText: text, version: n.text.version + 1, versionNonce: Math.floor(rand() * 2 ** 31), updated: Date.now() };
        changed.push(n.text);
      }
    }
    await save(pool, board.id, stampAuthor(changed, editor), tally);
    await sleep(untilNext(started, everyMs, until));
  }
}

/** The bot: one tester note (rectangle and bound text) a second, on the board owner's name. */
async function testerLoop(pool: Pool, board: Board, until: number, rand: () => number, tally: Tally) {
  let n = 0;
  while (performance.now() < until) {
    const started = performance.now();
    const team = board.teams[Math.floor(rand() * board.teams.length)];
    const id = `el-load-${n++}`;
    const x = team.x + 40 + rand() * 1300;
    const y = team.y + 840;
    const common = { angle: 0, groupIds: [], isDeleted: false, link: null, locked: false, opacity: 100, updated: Date.now(), frameId: team.frameId };
    const rect: El = {
      ...common,
      id,
      type: "rectangle",
      version: 1,
      versionNonce: n,
      x,
      y,
      width: 220,
      height: 140,
      backgroundColor: "#b2f2bb",
      index: indexKey(board.nextIndex++),
      boundElements: [{ id: `${id}-t`, type: "text" }],
      customData: { card: "test", source: "tester" },
    };
    const text: El = {
      ...common,
      id: `${id}-t`,
      type: "text",
      version: 1,
      versionNonce: n,
      x: x + 10,
      y: y + 10,
      width: 200,
      height: 120,
      index: indexKey(board.nextIndex++),
      containerId: id,
      text: "tester: tried it, changed one step",
      originalText: "tester: tried it, changed one step",
      fontSize: 16,
      fontFamily: 5,
      customData: {},
    };
    await save(pool, board.id, stampAuthor([rect, text], board.owner), tally);
    await sleep(untilNext(started, TESTER_INTERVAL_MS, until));
  }
}

/* ----------------------------------------------------------------- report */

export function percentile(values: number[], p: number): number {
  if (!values.length) return NaN;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1))];
}

type Result = {
  teams: number;
  editors: number;
  boardMb: number;
  offered: number;
  achieved: number;
  p50Merge: number;
  p95Merge: number;
  p50Lock: number;
  p95Lock: number;
  p95Pool: number;
  p95Total: number;
  /** Saves a second this board can take one at a time: 1000 / mean merge ms. */
  capacity: number;
  errors: number;
  dropped: number;
  ok: boolean;
};

function summarise(
  teams: number,
  editors: number,
  everyMs: number,
  board: Board,
  seconds: number,
  editorTally: Tally,
  testerTally: Tally,
): Result {
  const all = [...editorTally.samples, ...testerTally.samples];
  const offered = editors / (everyMs / 1000) + 1000 / TESTER_INTERVAL_MS;
  const meanMerge = all.reduce((sum, x) => sum + x.merge, 0) / Math.max(1, all.length);
  const achieved = all.length / seconds;
  const errors = editorTally.errors + testerTally.errors;
  const p95Total = percentile(all.map((s) => s.total), 95);
  return {
    teams,
    editors,
    boardMb: board.bytes / 1024 / 1024,
    offered,
    achieved,
    p50Merge: percentile(all.map((s) => s.merge), 50),
    p95Merge: percentile(all.map((s) => s.merge), 95),
    p50Lock: percentile(all.map((s) => s.lockWait), 50),
    p95Lock: percentile(all.map((s) => s.lockWait), 95),
    p95Pool: percentile(all.map((s) => s.poolWait), 95),
    p95Total,
    capacity: all.length ? 1000 / meanMerge : NaN,
    errors,
    dropped: editorTally.dropped + testerTally.dropped,
    // Healthy: nothing failed, the saves kept up, and a slow save still lands within one interval.
    ok: errors === 0 && achieved >= offered * 0.9 && p95Total <= SLOW_SAVE_MS,
  };
}

const ms = (v: number) => (Number.isNaN(v) ? "-" : `${Math.round(v)}`);

function printTable(results: Result[]): void {
  const head = ["teams/board", "editors", "board MB", "saves/s want", "saves/s done", "p50 merge ms", "p95 merge ms", "p50 lock ms", "p95 lock ms", "p95 pool ms", "p95 total ms", "board max saves/s", "errors", "dropped", "ok"];
  const rows = results.map((r) => [
    String(r.teams),
    String(r.editors),
    r.boardMb.toFixed(2),
    r.offered.toFixed(1),
    r.achieved.toFixed(1),
    ms(r.p50Merge),
    ms(r.p95Merge),
    ms(r.p50Lock),
    ms(r.p95Lock),
    ms(r.p95Pool),
    ms(r.p95Total),
    Number.isNaN(r.capacity) ? "-" : r.capacity.toFixed(1),
    String(r.errors),
    String(r.dropped),
    r.ok ? "yes" : "NO",
  ]);
  const widths = head.map((h, i) => Math.max(h.length, ...rows.map((row) => row[i].length)));
  const line = (cells: string[]) => cells.map((c, i) => c.padStart(widths[i])).join("  ");
  console.log(line(head));
  for (const row of rows) console.log(line(row));
}

/**
 * Largest team count that passed with as many editors as its teams bring: for each team count,
 * the scenario with the fewest editors at or above teams x editorsPerTeam (or the most editors
 * tried, if none is that high). Every smaller team count must pass too.
 */
export function recommendTeams(
  results: Pick<Result, "teams" | "editors" | "ok">[],
  editorsPerTeam: number,
): { teams: number | null; judged: { teams: number; editors: number; ok: boolean }[] } {
  const judged: { teams: number; editors: number; ok: boolean }[] = [];
  for (const teams of [...new Set(results.map((r) => r.teams))].sort((a, b) => a - b)) {
    const runs = results.filter((r) => r.teams === teams).sort((a, b) => a.editors - b.editors);
    const pick = runs.find((r) => r.editors >= teams * editorsPerTeam) ?? runs[runs.length - 1];
    judged.push({ teams, editors: pick.editors, ok: pick.ok });
  }
  let best: number | null = null;
  for (const j of judged) {
    if (!j.ok) break;
    best = j.teams;
  }
  return { teams: best, judged };
}

/**
 * Saves to one board run one at a time, so the lock holder needs a free CPU core: on a busy
 * machine every number here comes out inflated. Say so next to the results.
 */
function warnIfBusy(when: string): void {
  const load = loadavg()[0];
  const cores = cpus().length;
  if (load > cores * 0.75) {
    console.log(
      `WARNING (${when}): load average ${load.toFixed(0)} on ${cores} cores. Timings are inflated; ` +
        "rerun on a quiet machine before deciding on them.",
    );
  }
}

/* ------------------------------------------------------------------- main */

function flag(argv: string[], name: string, fallback: string): string {
  const i = argv.findIndex((a) => a === `--${name}` || a.startsWith(`--${name}=`));
  if (i < 0) return fallback;
  return argv[i].includes("=") ? argv[i].split("=").slice(1).join("=") : (argv[i + 1] ?? fallback);
}

const list = (value: string) =>
  value
    .split(",")
    .map((v) => Number(v.trim()))
    .filter((v) => Number.isFinite(v) && v > 0);

async function main(): Promise<number> {
  const argv = process.argv.slice(2);
  refuseGivenUrl(argv);
  const teamsList = list(flag(argv, "teams", "15,25,35"));
  const editorsList = list(flag(argv, "editors", "40,70,120"));
  const seconds = Number(flag(argv, "seconds", "20"));
  const boardMb = Number(flag(argv, "board-mb", "2"));
  const kbPerTeam = Number(flag(argv, "kb-per-team", "0"));
  const everyMs = Number(flag(argv, "save-every", String(SAVE_DEBOUNCE_MS / 1000))) * 1000;
  const poolFlag = flag(argv, "pool", "");
  const engine = flag(argv, "engine", "auto");
  const pairs = !argv.includes("--matrix");
  const editorsPerTeam = Number(flag(argv, "editors-per-team", "3"));
  if (!teamsList.length || !editorsList.length || !(seconds > 0) || !(boardMb > 0) || !(editorsPerTeam > 0) || !(everyMs > 0) || !(kbPerTeam >= 0)) {
    console.error("Bad options. Example: --teams 15,25,35 --editors 40,70,120 --seconds 20 --board-mb 2");
    return 2;
  }
  if (seconds * 1000 < everyMs * 3) {
    console.error("--seconds should cover at least 3 save intervals, or the save rate is not measured.");
    return 2;
  }
  if (pairs && teamsList.length !== editorsList.length) {
    console.error("Give as many --teams as --editors values, or add --matrix.");
    return 2;
  }
  const scenarios = pairs
    ? teamsList.map((teams, i) => ({ teams, editors: editorsList[i] }))
    : teamsList.flatMap((teams) => editorsList.map((editors) => ({ teams, editors })));

  const db = startThrowaway(engine);
  const stopOnce = (() => {
    let done = false;
    return () => {
      if (done) return;
      done = true;
      db.stop();
    };
  })();
  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.on(signal, () => {
      stopOnce();
      process.exit(130);
    });
  }

  const results: Result[] = [];
  try {
    console.log(`Database: ${db.label}`);
    await waitReady(db);
    warnIfBusy("before");
    const admin = openPool(db, 2);
    const files = await applyMigrations(admin);
    const sizeNote = kbPerTeam ? `${kbPerTeam} KB of elements per team` : `boards of about ${boardMb} MB`;
    console.log(`Applied ${files.length} whiteboard migrations. Each scenario: ${seconds}s, ${sizeNote}.`);
    console.log(`Editors save 1-2 own notes every ${everyMs / 1000}s; the bot writes 1 tester note per second.\n`);

    let boardNo = 1;
    for (const { teams, editors } of scenarios) {
      await admin.query("TRUNCATE public.whiteboard_changes, public.whiteboard_versions");
      await admin.query("DELETE FROM public.whiteboards");
      await admin.query("VACUUM ANALYZE public.whiteboards");
      const bytes = kbPerTeam ? kbPerTeam * 1024 * teams : boardMb * 1024 * 1024;
      const board = buildBoard(boardNo++, teams, editors, bytes);
      await insertBoard(admin, board);

      const poolSize = poolFlag ? Number(poolFlag) : editors + 1;
      const pool = openPool(db, poolSize);
      const rand = prng(teams * 1000 + editors);
      const editorTally = newTally();
      const testerTally = newTally();
      const until = performance.now() + seconds * 1000;
      process.stdout.write(`  running ${teams} teams, ${editors} editors... `);
      const startedAt = performance.now();
      await Promise.all([
        ...board.editors.map((editor) => editorLoop(pool, board, editor, everyMs, until, rand, editorTally)),
        testerLoop(pool, board, until, rand, testerTally),
      ]);
      const elapsed = (performance.now() - startedAt) / 1000;
      await pool.end();
      const result = summarise(teams, editors, everyMs, board, elapsed, editorTally, testerTally);
      results.push(result);
      console.log(`${editorTally.samples.length + testerTally.samples.length} saves, p95 ${ms(result.p95Total)} ms`);
      for (const message of [...editorTally.errorSamples, ...testerTally.errorSamples]) console.log(`    error: ${message}`);
    }
    await admin.end();
  } finally {
    stopOnce();
  }

  console.log("");
  warnIfBusy("after");
  printTable(results);
  const { teams: best, judged } = recommendTeams(results, editorsPerTeam);
  console.log(
    `\nA scenario is ok when nothing failed, at least 90% of the wanted saves happened, and p95 total ` +
      `(pool wait + lock wait + merge) is at most ${SLOW_SAVE_MS} ms (the save debounce, whatever --save-every is).`,
  );
  console.log(
    `Judged at ${editorsPerTeam} editors saving per team: ` +
      judged.map((j) => `${j.teams} teams with ${j.editors} editors ${j.ok ? "ok" : "NOT ok"}`).join(", ") +
      ".",
  );
  console.log(
    best === null
      ? "Recommended maximum teams per board: none of the tested sizes passed. Split boards further."
      : `Recommended maximum teams per board: ${best}.`,
  );
  const failed = results.filter((r) => r.errors > 0).length;
  return failed ? 1 : 0;
}

if (require.main === module) {
  main()
    .then((code) => process.exit(code))
    .catch((error) => {
      console.error(error instanceof Error ? error.message : error);
      process.exit(error instanceof RefusedUrl ? 2 : 1);
    });
}
