/**
 * The Elemental staff scripts against the throwaway Postgres (E01 harness):
 * seed.ts, issue-claims.ts and set-role-password.ts, each driven through its
 * run() with the real database, plus set-role-password as a real process so
 * its actual output can be searched for secrets.
 *
 *   pnpm test:elemental:integration scripts/elemental
 *
 * Fixtures are made up: guild ids 80000000000000000n, people "Fixture ...",
 * contacts on example.invalid. Nothing here touches a real database.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { Client } from "pg";

import { applyAll, connectionString, psql, ROOT, start, stop } from "@/scripts/elemental/harness";

import { connectPg, type Deps } from "../admin-db";
import { run as issueClaims } from "../issue-claims";
import { run as seed } from "../seed";
import { run as setRolePassword } from "../set-role-password";

const REAL_GUILD = "800000000000000001";
const DRYRUN_GUILD = "800000000000000002";
const OTHER_GUILD = "800000000000000003";
const BOT_PASSWORD = "elementalbotpw".padEnd(48, "7");
const HARNESS_PASSWORD = "elemental-harness";
const ELEMENTS = ["water", "earth", "air", "fire", "aether"] as const;
const id = (n: number) => `8${String(n).padStart(17, "0")}`;

/** Strings that must never reach a code or message file. */
const PERSONAL = [
  "Fixture Person",
  "Fixture Nick",
  "Fixture School",
  "Fixture Parent",
  "0811111111",
  "0822222222",
  "fixture@example.invalid",
  "Fixture Team",
];

let tmp: string;
let boards: string[];

function deps(env: Record<string, string | undefined> = { ELEMENTAL_ADMIN_DATABASE_URL: connectionString() }) {
  const out: string[] = [];
  const err: string[] = [];
  const d: Deps = { env, connect: connectPg, out: (l) => out.push(l), err: (l) => err.push(l) };
  return { d, out, err, all: () => [...out, ...err].join("\n") };
}

async function query<T extends Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
  const client = new Client({ connectionString: connectionString() });
  await client.connect();
  try {
    return (await client.query<T>(sql, params)).rows;
  } finally {
    await client.end();
  }
}

function guildConfig(guildId: string, edition: string, boardIds: string[], extra: Record<string, unknown> = {}) {
  return {
    guild_id: guildId,
    edition,
    role_ids: Object.fromEntries(
      ["host", "helper", "mentor", "judge", "safety", "paid", ...ELEMENTS].map((key, i) => [key, id(100 + i + (edition === "elemental-2026" ? 0 : 50))]),
    ),
    channel_ids: Object.fromEntries(["start_here", "news", "mirror", "reports", "campfire"].map((key, i) => [key, id(200 + i + (edition === "elemental-2026" ? 0 : 50))])),
    element_category_ids: Object.fromEntries(ELEMENTS.map((el, i) => [el, [id(300 + i + (edition === "elemental-2026" ? 0 : 50))]])),
    boards: Object.fromEntries(ELEMENTS.map((el, i) => [el, [boardIds[i]]])),
    ...extra,
  };
}

type GuildJson = ReturnType<typeof guildConfig> & Record<string, unknown>;

function baseConfig(): { real_guild_id: string; guilds: GuildJson[] } {
  return {
    real_guild_id: REAL_GUILD,
    guilds: [
      guildConfig(REAL_GUILD, "elemental-2026", boards.slice(0, 5), {
        team_create_opens_at: "2026-12-04T20:00:00+07:00",
        team_create_closes_at: null,
        retention_until: "2027-03-31T00:00:00+07:00",
      }),
      guildConfig(DRYRUN_GUILD, "elemental-dryrun", boards.slice(5, 10), {
        schedule: { "2026-12-02": { opening_at: "19:00", call_at: "19:55", card_at: "20:30" } },
        team_create_opens_at: "2026-12-02T19:30:00+07:00",
      }),
    ],
  };
}

function writeConfig(config: unknown, name = "seed.json"): string {
  const file = path.join(tmp, name);
  fs.writeFileSync(file, JSON.stringify(config, null, 2));
  return file;
}

/** Everything seed.ts writes, without timestamps. */
async function seededState() {
  return {
    editions: await query("SELECT key, kind, event_slug FROM public.elemental_editions ORDER BY key"),
    settings: await query(
      `SELECT guild_id, edition, role_ids, channel_ids, element_category_ids, schedule,
              team_create_opens_at, team_create_closes_at, retention_until, tester_cap, team_cap, card_override
       FROM public.elemental_settings ORDER BY guild_id`,
    ),
    boards: await query("SELECT edition, board_id::text, element FROM public.elemental_boards ORDER BY edition, board_id"),
  };
}

/** A paid (or other) registration with `n` members, all fixture data. */
function registration(slug: string, status: string, n: number): string {
  return psql(`
    WITH reg AS (
      INSERT INTO public.hackathon_event_registrations (event_slug, status, team_name, member_count, amount_baht, contact_email, contact_phone)
      VALUES ('${slug}', '${status}', 'Fixture Team, "One"', ${n}, 0, 'fixture@example.invalid', '0811111111')
      RETURNING id
    ), members AS (
      INSERT INTO public.hackathon_event_registration_members
        (registration_id, position, full_name, nickname, age, school, parent_name, parent_phone, parent_consent)
      SELECT reg.id, k, 'Fixture Person ' || k, 'Fixture Nick', 16, 'Fixture School', 'Fixture Parent', '0822222222', true
      FROM reg, generate_series(1, ${n}) AS k
    )
    SELECT id FROM reg;`);
}

beforeAll(async () => {
  await start();
  applyAll();
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "elemental-scripts-"));
  boards = psql(`
    INSERT INTO auth.users (id) VALUES ('00000000-0000-4000-8000-000000000001');
    INSERT INTO public.whiteboards (owner_id, title)
    SELECT '00000000-0000-4000-8000-000000000001', 'Fixture board ' || k FROM generate_series(1, 12) AS k;
    SELECT id FROM public.whiteboards ORDER BY title COLLATE "C";`).split("\n");
}, 240_000);

afterAll(() => {
  stop();
  if (tmp) fs.rmSync(tmp, { recursive: true, force: true });
});

describe("seed.ts", () => {
  it("seeds both guilds, and a second run gives the same state", async () => {
    const config = writeConfig(baseConfig());
    const first = deps();
    expect(await seed(["--config", config], first.d)).toBe(0);
    expect(first.all()).toMatch(/guild 800000000000000001 -> elemental-2026 \(event\): settings created/);
    const after1 = await seededState();

    const second = deps();
    expect(await seed(["--config", config], second.d)).toBe(0);
    expect(second.out.join("\n")).toMatch(/settings unchanged/);
    expect(second.out.join("\n")).toMatch(/0 added, 0 moved to another element, 5 unchanged/);
    expect(await seededState()).toEqual(after1);

    const real = after1.settings.find((s) => s.guild_id === REAL_GUILD)!;
    expect(real.edition).toBe("elemental-2026");
    expect(real.schedule).toEqual({
      "2026-12-04": { opening_at: "19:00", call_at: "19:55", card_at: "20:30" },
      "2026-12-05": { call_at: "19:55", card_at: "20:30" },
      "2026-12-06": { call_at: "19:55", card_at: "20:30" },
      "2026-12-07": { call_at: "19:55", card_at: "20:30" },
    });
    expect((real.team_create_opens_at as Date).toISOString()).toBe("2026-12-04T13:00:00.000Z");
    expect(real.team_create_closes_at).toBeNull();
    const dry = after1.settings.find((s) => s.guild_id === DRYRUN_GUILD)!;
    expect(dry.edition).toBe("elemental-dryrun");
    expect(Object.keys(dry.schedule as object)).toEqual(["2026-12-02"]);
    expect(after1.boards.filter((b) => b.edition === "elemental-2026")).toHaveLength(5);
    expect(after1.boards.filter((b) => b.edition === "elemental-dryrun")).toHaveLength(5);
  });

  it("gives the bot what it reads through elemental_bot_settings_get", async () => {
    const client = new Client({ connectionString: connectionString() });
    await client.connect();
    try {
      await client.query("SET ROLE elemental_bot");
      const { rows } = await client.query("SELECT public.elemental_bot_settings_get($1) AS s", [DRYRUN_GUILD]);
      expect(rows[0].s).toMatchObject({
        edition: "elemental-dryrun",
        edition_kind: "rehearsal",
        role_ids: { host: id(150), fire: id(159) },
        channel_ids: { start_here: id(250) },
        element_category_ids: { water: [id(350)] },
      });
    } finally {
      await client.end();
    }
  });

  it("changes nothing on --dry-run", async () => {
    const before = await seededState();
    const config = baseConfig();
    config.guilds[0].team_create_opens_at = "2026-12-05T09:00:00+07:00";
    const run = deps();
    expect(await seed(["--config", writeConfig(config, "dry.json"), "--dry-run"], run.d)).toBe(0);
    expect(run.out.join("\n")).toMatch(/settings updated/);
    expect(run.out.join("\n")).toMatch(/rolled back, nothing changed/);
    expect(await seededState()).toEqual(before);
  });

  it("keeps id maps that the JSON leaves out", async () => {
    const before = await seededState();
    const config = baseConfig();
    delete (config.guilds[0] as Partial<GuildJson>).channel_ids;
    delete (config.guilds[0] as Partial<GuildJson>).element_category_ids;
    const run = deps();
    expect(await seed(["--config", writeConfig(config, "no-channels.json")], run.d)).toBe(0);
    expect(run.err.join("\n")).toMatch(/no channel_ids \(left as it is in the database\)/);
    expect(run.out.join("\n")).toMatch(/guild 800000000000000001 -> elemental-2026 \(event\): settings unchanged/);
    expect(await seededState()).toEqual(before);
  });

  it("errors clearly when an element has no board", async () => {
    const before = await seededState();
    const config = baseConfig();
    delete (config.guilds[1].boards as Record<string, string[]>).fire;
    const run = deps();
    expect(await seed(["--config", writeConfig(config, "noboard.json")], run.d)).toBe(2);
    expect(run.err.join("\n")).toContain(`guild ${DRYRUN_GUILD}.boards.fire: missing; every element needs at least one whiteboard id`);
    expect(await seededState()).toEqual(before);
  });

  it("refuses to map the real guild to the rehearsal edition", async () => {
    const before = await seededState();
    // Named as the real guild in the config.
    const named = {
      real_guild_id: REAL_GUILD,
      guilds: [guildConfig(REAL_GUILD, "elemental-dryrun", boards.slice(5, 10))],
    };
    const a = deps();
    expect(await seed(["--config", writeConfig(named, "real-to-dry.json")], a.d)).toBe(2);
    expect(a.err.join("\n")).toMatch(/refusing to map the real hackathon guild \(real_guild_id\) to the rehearsal edition elemental-dryrun/);

    // Not named, but already bound to the event in the database.
    const unnamed = { guilds: [guildConfig(REAL_GUILD, "elemental-dryrun", boards.slice(5, 10))] };
    const b = deps();
    expect(await seed(["--config", writeConfig(unnamed, "real-to-dry-2.json")], b.d)).toBe(1);
    expect(b.err.join("\n")).toMatch(/Refusing: guild 800000000000000001 is bound to the event edition elemental-2026/);
    expect(await seededState()).toEqual(before);
  });

  it("refuses another guild on the event edition, boards shared between editions, and ids that are not boards", async () => {
    const before = await seededState();
    const other = { real_guild_id: REAL_GUILD, guilds: [guildConfig(OTHER_GUILD, "elemental-2026", boards.slice(0, 5))] };
    const a = deps();
    expect(await seed(["--config", writeConfig(other, "other.json")], a.d)).toBe(2);
    expect(a.err.join("\n")).toMatch(/only real_guild_id may use the event edition/);

    const shared = baseConfig();
    shared.guilds[1].boards.water = [boards[0]];
    const b = deps();
    expect(await seed(["--config", writeConfig(shared, "shared.json")], b.d)).toBe(2);
    expect(b.err.join("\n")).toMatch(/is already listed under guild 800000000000000001 water/);

    const crossEdition = baseConfig();
    crossEdition.guilds = [crossEdition.guilds[1]];
    crossEdition.guilds[0].boards.water = [boards[0]];
    const c = deps();
    expect(await seed(["--config", writeConfig(crossEdition, "cross.json")], c.d)).toBe(1);
    expect(c.err.join("\n")).toMatch(new RegExp(`refusing to share boards between editions: ${boards[0]} is a elemental-2026 board`));

    const notBoard = baseConfig();
    notBoard.guilds[1].boards.air = ["00000000-0000-4000-8000-00000000beef"];
    const d = deps();
    expect(await seed(["--config", writeConfig(notBoard, "notboard.json")], d.d)).toBe(1);
    expect(d.err.join("\n")).toMatch(/these board ids are not whiteboards: 00000000-0000-4000-8000-00000000beef/);
    expect(await seededState()).toEqual(before);
  });

  it("refuses event dates that differ from facts.ts unless told", async () => {
    const config = writeConfig(baseConfig());
    const a = deps();
    expect(await seed(["--config", config, "--card-at", "21:00", "--dry-run"], a.d)).toBe(2);
    expect(a.err.join("\n")).toMatch(/differ from components\/hackathon\/poster\/elemental\/facts\.ts/);
    const b = deps();
    expect(await seed(["--config", config, "--card-at", "21:00", "--allow-date-change", "--dry-run"], b.d)).toBe(0);
  });
});

describe("issue-claims.ts", () => {
  let out: string;
  let regA: string;
  let regB: string;

  beforeAll(() => {
    out = path.join(tmp, "claims");
    regA = registration("elemental-2026", "paid", 3);
    regB = registration("elemental-2026", "paid", 6);
    registration("elemental-2026", "pending", 2);
    registration("some-other-event", "paid", 2);
  });

  it("writes the 4-column CSV and messages with codes only", async () => {
    const run = deps();
    const now = () => new Date("2026-11-29T03:00:00Z");
    expect(await issueClaims(["--out-dir", out], run.d, now)).toBe(0);
    expect(run.out.join("\n")).toMatch(/2 paid registrations, 8 new, 0 already issued, 1 over the 5-person cap/);
    expect(run.err.join("\n")).toContain(`registration ${regB}: positions 6 have no code`);

    const csv = fs.readFileSync(path.join(out, "claims-2026-11-29.csv"), "utf8").trimEnd().split("\n");
    expect(csv[0]).toBe("registration_id,team_name,position,code");
    expect(csv).toHaveLength(1 + 9);
    expect(csv.filter((l) => l.startsWith(regA))).toHaveLength(3);
    expect(csv.find((l) => l.startsWith(regB) && /,6,$/.test(l))).toBeDefined();
    expect(csv[1]).toMatch(/^[0-9a-f-]{36},"Fixture Team, ""One""",1,[A-HJ-NP-Z2-9]{8}$/);

    const messages = fs.readFileSync(path.join(out, "claims-2026-11-29-messages.txt"), "utf8");
    for (const personal of PERSONAL) expect(messages).not.toContain(personal);
    expect(messages).not.toMatch(/@|\b0\d{8,9}\b/);
    expect(messages).toContain("[TH-REVIEW]");
    expect(messages.match(/----- registration /g)).toHaveLength(2);
    expect(messages.match(/: [A-HJ-NP-Z2-9]{8}$/gm)).toHaveLength(8);
    const codes = csv.slice(1).map((l) => l.split(",").pop()).filter(Boolean) as string[];
    for (const code of codes) expect(messages).toContain(code);
    // Codes stay out of the terminal.
    for (const code of codes) expect(run.all()).not.toContain(code);
    expect(fs.statSync(path.join(out, "claims-2026-11-29.csv")).mode & 0o777).toBe(0o600);

    // Idempotent: the same codes again.
    const again = deps();
    expect(await issueClaims(["--out-dir", out], again.d, now)).toBe(0);
    expect(again.out.join("\n")).toMatch(/0 new, 8 already issued/);
    expect(fs.readFileSync(path.join(out, "claims-2026-11-29.csv"), "utf8").trimEnd().split("\n")).toEqual(csv);
  });

  it("issues nothing when the files cannot be written", async () => {
    registration("elemental-2026", "paid", 1);
    const before = await query("SELECT count(*)::int AS n FROM public.elemental_claims");
    const blocked = path.join(tmp, "blocked");
    // A folder where the messages file goes: the CSV is written, the messages file fails.
    fs.mkdirSync(path.join(blocked, "claims-2026-11-30-messages.txt"), { recursive: true });
    const run = deps();
    expect(await issueClaims(["--out-dir", blocked], run.d, () => new Date("2026-11-30T03:00:00Z"))).toBe(1);
    expect(run.err.join("\n")).toMatch(/Could not write the output files/);
    expect(run.err.join("\n")).toMatch(/Nothing was issued\./);
    expect(fs.existsSync(path.join(blocked, "claims-2026-11-30.csv"))).toBe(false);
    expect(await query("SELECT count(*)::int AS n FROM public.elemental_claims")).toEqual(before);
  });

  it("issues nothing and writes nothing on --dry-run", async () => {
    registration("elemental-2026", "paid", 2);
    const before = await query<{ n: number }>("SELECT count(*)::int AS n FROM public.elemental_claims");
    const dryOut = path.join(tmp, "dry-claims");
    const run = deps();
    expect(await issueClaims(["--dry-run", "--out-dir", dryOut], run.d)).toBe(0);
    expect(run.out.join("\n")).toMatch(/Dry run .* 4 paid registrations, 3 new, 8 already issued/);
    expect(await query("SELECT count(*)::int AS n FROM public.elemental_claims")).toEqual(before);
    expect(fs.existsSync(dryOut)).toBe(false);
  });

  it("issues rehearsal codes for elemental-dryrun and refuses --rehearsal on elemental-2026", async () => {
    const run = deps();
    expect(await issueClaims(["--rehearsal", "3", "--out-dir", out], run.d, () => new Date("2026-12-02T05:00:00Z"))).toBe(0);
    const file = fs.readFileSync(path.join(out, "rehearsal-2026-12-02.csv"), "utf8").trimEnd().split("\n");
    expect(file[0]).toBe("code");
    expect(file.slice(1)).toHaveLength(3);
    const rows = await query<{ edition: string; kind: string }>(
      "SELECT edition, kind FROM public.elemental_claims WHERE code = ANY ($1)",
      [file.slice(1)],
    );
    expect(rows).toHaveLength(3);
    expect(rows.every((r) => r.edition === "elemental-dryrun" && r.kind === "rehearsal")).toBe(true);

    const before = await query("SELECT count(*)::int AS n FROM public.elemental_claims");
    const refused = deps();
    expect(await issueClaims(["--rehearsal", "3", "--edition", "elemental-2026", "--out-dir", out], refused.d)).toBe(2);
    expect(refused.err.join("\n")).toMatch(/Refusing --rehearsal on elemental-2026/);
    expect(await query("SELECT count(*)::int AS n FROM public.elemental_claims")).toEqual(before);

    // Event codes on the rehearsal edition: refused by SQL.
    const wrong = deps();
    expect(await issueClaims(["--edition", "elemental-dryrun", "--out-dir", out], wrong.d)).toBe(1);
    expect(wrong.err.join("\n")).toMatch(/elemental-dryrun is a rehearsal edition/);
  });
});

describe("set-role-password.ts", () => {
  const env = () => ({ ELEMENTAL_ADMIN_DATABASE_URL: connectionString(), ELEMENTAL_BOT_PASSWORD: BOT_PASSWORD });
  const secrets = () => [connectionString(), HARNESS_PASSWORD, BOT_PASSWORD];

  it("fails --check while elemental_bot is NOLOGIN, then sets it and passes --check", async () => {
    const before = deps(env());
    expect(await setRolePassword(["--check"], before.d)).toBe(1);
    expect(before.out.join("\n")).toMatch(/elemental_bot: LOGIN off/);

    const set = deps(env());
    expect(await setRolePassword([], set.d)).toBe(0);
    expect(set.out.join("\n")).toMatch(/exposure outside elemental_bot_\*: none/);
    expect(set.out.join("\n")).toMatch(/elemental_bot: login ok as elemental_bot, may execute \d+ elemental_bot_\* functions, reads no table/);

    const check = deps(env());
    expect(await setRolePassword(["--check"], check.d)).toBe(0);
    expect(check.out.join("\n")).toMatch(/Check passed\./);

    // The settings the migration gave the role survive the password change.
    expect(psql("SELECT rolcanlogin, rolconnlimit FROM pg_roles WHERE rolname = 'elemental_bot'")).toBe("t|10");
    for (const run of [before, set, check]) {
      for (const secret of secrets()) expect(run.all()).not.toContain(secret);
    }

    const wrong = deps({ ...env(), ELEMENTAL_BOT_PASSWORD: "x".repeat(40) });
    expect(await setRolePassword(["--check"], wrong.d)).toBe(1);
    expect(wrong.all()).toMatch(/login FAILED/);
    expect(wrong.all()).not.toContain("x".repeat(40));
  });

  it("prints no connection string or password as a real process", () => {
    const tsx = path.join(ROOT, "node_modules", ".bin", "tsx");
    const script = path.join(ROOT, "scripts", "elemental", "set-role-password.ts");
    const childEnv = { PATH: process.env.PATH, HOME: process.env.HOME, ...env() } as unknown as NodeJS.ProcessEnv;
    const check = spawnSync(tsx, [script, "--check"], { env: childEnv, encoding: "utf8", cwd: ROOT });
    const output = `${check.stdout}${check.stderr}`;
    expect(output).toMatch(/Check passed\./);
    expect(check.status).toBe(0);
    for (const secret of secrets()) expect(output).not.toContain(secret);
    expect(output).not.toMatch(/postgres(ql)?:\/\//);

    // A refused connection names no secret either.
    const badEnv: NodeJS.ProcessEnv = { ...childEnv, ELEMENTAL_ADMIN_DATABASE_URL: connectionString().replace(HARNESS_PASSWORD, "not-the-password") };
    const bad = spawnSync(tsx, [script, "--check"], { env: badEnv, encoding: "utf8", cwd: ROOT });
    const badOutput = `${bad.stdout}${bad.stderr}`;
    expect(bad.status).toBe(1);
    expect(badOutput).toMatch(/Could not connect as the admin user/);
    expect(badOutput).not.toContain("not-the-password");
    expect(badOutput).not.toMatch(/postgres(ql)?:\/\//);
  });
});
