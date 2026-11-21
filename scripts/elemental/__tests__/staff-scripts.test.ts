/**
 * @jest-environment node
 *
 * Unit tests for the Elemental staff scripts, with no database: the seed's
 * event dates against facts.ts, config checks, the CSV and messages formats,
 * and set-role-password with a fake database (nothing secret printed). The
 * same scripts run against a real Postgres in staff-scripts.int.test.ts.
 */
import { ELEMENTAL } from "@/components/hackathon/poster/elemental/facts";

import { adminClientConfig, describeError, elCode, UsageError, type DbClient, type Deps } from "../admin-db";
import { claimsCsv, claimsMessages, csvCell, parseArgs as issueArgs, type ClaimRow } from "../issue-claims";
import { dayRange, EVENT_DEFAULTS, eventSchedule, parseArgs as seedArgs, parseConfig, scheduleProblems } from "../seed";
import { roleClientConfig, run as setRolePassword } from "../set-role-password";

const GUILD = "800000000000000001";
const OTHER = "800000000000000002";
const BOARD = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const ELEMENTS = ["water", "earth", "air", "fire", "aether"];

function guild(guildId: string, edition: string, extra: Record<string, unknown> = {}) {
  const base = edition === "elemental-2026" ? 0 : 10;
  return {
    guild_id: guildId,
    edition,
    boards: Object.fromEntries(ELEMENTS.map((el, i) => [el, [BOARD(base + i)]])),
    ...extra,
  };
}

describe("seed: event dates", () => {
  it("defaults to the programme in facts.ts (ELEMENTAL.schedule)", () => {
    const open = ELEMENTAL.schedule.filter((item) => item.kind === "open");
    expect(open).toHaveLength(1);
    expect(EVENT_DEFAULTS.openingDay).toBe(open[0].date);
    expect(EVENT_DEFAULTS.openingAt).toBe(open[0].time);

    const dates = ELEMENTAL.schedule.map((item) => item.date).sort();
    expect(EVENT_DEFAULTS.firstDay).toBe(dates[0]);
    expect(EVENT_DEFAULTS.lastDay).toBe(dates[dates.length - 1]);
    expect(EVENT_DEFAULTS.lastDay).toBe(ELEMENTAL.endDate);

    const schedule = eventSchedule(seedArgs([]).dates);
    for (const date of dates) expect(schedule[date]).toBeDefined();
    expect(Object.keys(schedule)).toEqual(dayRange(dates[0], dates[dates.length - 1]));
    expect(Object.values(schedule).filter((day) => day.opening_at)).toEqual([
      { opening_at: open[0].time, call_at: EVENT_DEFAULTS.callAt, card_at: EVENT_DEFAULTS.cardAt },
    ]);
    expect(scheduleProblems(schedule)).toEqual([]);
  });

  it("takes the dates as flags", () => {
    const { dates } = seedArgs(["--opening", "2026-12-05T18:30", "--days", "2026-12-05,2026-12-06", "--call-at=20:00", "--card-at", "21:00"]);
    expect(eventSchedule(dates)).toEqual({
      "2026-12-05": { opening_at: "18:30", call_at: "20:00", card_at: "21:00" },
      "2026-12-06": { call_at: "20:00", card_at: "21:00" },
    });
    expect(() => seedArgs(["--opening", "2026-12-09T19:00"])).toThrow(/must fall on one of --days/);
    expect(() => seedArgs(["--card-at", "8pm"])).toThrow(UsageError);
    expect(() => seedArgs(["--days", "2026-12-07..2026-12-04"])).toThrow(/before the first/);
  });
});

describe("seed: config", () => {
  it("accepts a real guild and a rehearsal guild", () => {
    const { config, warnings } = parseConfig({
      real_guild_id: GUILD,
      guilds: [
        guild(GUILD, "elemental-2026", { team_create_opens_at: null, tester_cap: 12 }),
        guild(OTHER, "elemental-dryrun", { schedule: { "2026-12-02": { call_at: "19:55", card_at: "20:30" } } }),
      ],
    });
    expect(config.guilds.map((g) => [g.guildId, g.edition])).toEqual([
      [GUILD, "elemental-2026"],
      [OTHER, "elemental-dryrun"],
    ]);
    expect(config.guilds[0].optional).toEqual({ team_create_opens_at: null, tester_cap: 12 });
    expect(warnings.join("\n")).toMatch(/no role_ids/);
  });

  it("names a missing element board", () => {
    const g = guild(GUILD, "elemental-2026");
    delete (g.boards as Record<string, string[]>).aether;
    expect(() => parseConfig({ real_guild_id: GUILD, guilds: [g] })).toThrow(
      `guild ${GUILD}.boards.aether: missing; every element needs at least one whiteboard id`,
    );
  });

  it("refuses the real guild on a rehearsal edition, and any other guild on the event", () => {
    expect(() => parseConfig({ real_guild_id: GUILD, guilds: [guild(GUILD, "elemental-dryrun")] })).toThrow(
      /refusing to map the real hackathon guild/,
    );
    expect(() => parseConfig({ real_guild_id: GUILD, guilds: [guild(OTHER, "elemental-2026")] })).toThrow(
      /only real_guild_id may use the event edition/,
    );
    expect(() => parseConfig({ guilds: [guild(GUILD, "elemental-2026")] })).toThrow(/set real_guild_id/);
  });

  it("refuses a schedule on the event guild, bad ids, unknown keys and an offset-less window", () => {
    const problems = (() => {
      try {
        parseConfig({
          real_guild_id: GUILD,
          guilds: [
            guild(GUILD, "elemental-2026", {
              schedule: {},
              role_ids: { host: "123", boss: GUILD },
              team_create_opens_at: "2026-12-04T20:00",
              colour: "red",
            }),
          ],
        });
        return "";
      } catch (error) {
        return (error as Error).message;
      }
    })();
    expect(problems).toMatch(/schedule: the event guild's schedule comes from the flags/);
    expect(problems).toMatch(/role_ids\.host: must be a Discord id string/);
    expect(problems).toMatch(/role_ids: unknown key boss/);
    expect(problems).toMatch(/team_create_opens_at: must be an ISO time with an offset/);
    expect(problems).toMatch(/unknown key colour/);
  });

  it("mirrors the SQL schedule check", () => {
    expect(scheduleProblems({ "2026-12-02": { call_at: "19:55" } })).toEqual(["2026-12-02: card_at is required"]);
    expect(scheduleProblems({ "2026-02-30": { call_at: "19:55", card_at: "24:00" } })).toEqual([
      "2026-02-30: not a YYYY-MM-DD day",
      '2026-02-30.card_at: must be "HH:MM"',
    ]);
  });
});

describe("issue-claims: formats", () => {
  const rows: ClaimRow[] = [
    { registration_id: "r-1", team_name: "Team, \"A\"", position: 2, code: "BBBBBBBB", state: "new" },
    { registration_id: "r-1", team_name: "Team, \"A\"", position: 1, code: "AAAAAAAA", state: "existing" },
    { registration_id: "r-2", team_name: "=HYPERLINK(1)", position: 6, code: null, state: "over_cap" },
  ];

  it("writes exactly four columns, quoted and formula-safe", () => {
    expect(claimsCsv(rows).split("\n")).toEqual([
      "registration_id,team_name,position,code",
      'r-1,"Team, ""A""",2,BBBBBBBB',
      'r-1,"Team, ""A""",1,AAAAAAAA',
      "r-2,'=HYPERLINK(1),6,",
      "",
    ]);
    expect(csvCell("-1")).toBe("'-1");
    expect(csvCell(null)).toBe("");
  });

  it("writes messages with codes by position and no team name", () => {
    const text = claimsMessages(rows);
    expect(text).not.toContain("Team");
    expect(text).not.toContain("HYPERLINK");
    expect(text).not.toContain("r-2");
    expect(text.indexOf("AAAAAAAA")).toBeLessThan(text.indexOf("BBBBBBBB"));
    expect(text).toMatch(/คนที่ 1: AAAAAAAA\n.*คนที่ 2: BBBBBBBB/);
    expect(text).toContain("[TH-REVIEW]");
  });

  it("refuses --rehearsal on elemental-2026 and defaults rehearsal to elemental-dryrun", () => {
    expect(() => issueArgs(["--rehearsal", "5", "--edition", "elemental-2026"])).toThrow(/Refusing --rehearsal on elemental-2026/);
    expect(issueArgs(["--rehearsal", "5"])).toMatchObject({ edition: "elemental-dryrun", rehearsal: 5 });
    expect(issueArgs([])).toMatchObject({ edition: "elemental-2026", rehearsal: null });
    expect(() => issueArgs(["--rehearsal", "201"])).toThrow(/1 to 200/);
  });
});

describe("admin connection", () => {
  const PW = "admin-pw-9f8e7d6c5b4a";
  const URL_ = `postgresql://postgres.abcdefghijklmnopqrst:${PW}@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres?sslmode=disable`;

  it("keeps TLS on whatever the URL says, and refuses the bot's own login", () => {
    const config = adminClientConfig(URL_, "test");
    expect(config.ssl).toMatchObject({ rejectUnauthorized: true });
    expect(roleClientConfig(config, "p".repeat(40)).user).toBe("elemental_bot.abcdefghijklmnopqrst");
    expect(() => adminClientConfig("postgresql://elemental_bot:x@127.0.0.1/postgres", "test")).toThrow(/not as elemental_bot/);
    expect(() => adminClientConfig("nope", "test")).toThrow(/ELEMENTAL_ADMIN_DATABASE_URL is not a valid URL/);
  });

  it("blanks secrets in errors and reads el: codes", () => {
    expect(describeError({ code: "28P01", message: `bad password ${PW}` }, [PW])).toBe("SQLSTATE 28P01: bad password ***");
    expect(elCode(new Error("el:not_rehearsal"))).toBe("not_rehearsal");
    expect(elCode(new Error("other"))).toBeNull();
  });
});

describe("set-role-password with a fake database", () => {
  const PW = "admin-pw-9f8e7d6c5b4a";
  const BOT_PW = "b".repeat(16) + "0123456789abcdef0123456789abcdef";
  const ADMIN = `postgresql://postgres:${PW}@db.example.invalid:5432/postgres`;

  function fake(opts: { canLogin?: boolean; exposed?: number; loginFails?: boolean } = {}) {
    const out: string[] = [];
    const err: string[] = [];
    const statements: string[] = [];
    let canLogin = opts.canLogin ?? false;
    const deps: Deps = {
      env: { ELEMENTAL_ADMIN_DATABASE_URL: ADMIN, ELEMENTAL_BOT_PASSWORD: BOT_PW },
      async connect(config): Promise<DbClient> {
        const asBot = String(config.user).startsWith("elemental_bot");
        if (asBot && (opts.loginFails || !canLogin)) throw Object.assign(new Error(`password authentication failed ${BOT_PW}`), { code: "28P01" });
        return {
          async query(sql: string) {
            statements.push(sql);
            if (asBot) return { rows: [{ who: "elemental_bot", settings_ok: true, reads_claims: false, functions: 30 }] };
            if (sql.includes("pg_roles")) return { rows: [{ rolname: "elemental_bot", rolcanlogin: canLogin, rolconnlimit: 10 }] };
            if (sql.includes("granted")) return { rows: [{ total: 30, granted: 30 }] };
            if (sql.includes("definer function")) {
              return { rows: Array.from({ length: opts.exposed ?? 0 }, () => ({ kind: "definer function", object: "public.f()" })) };
            }
            if (/^ALTER ROLE/.test(sql)) canLogin = true;
            return { rows: [] };
          },
          async end() {},
        };
      },
      out: (line) => out.push(line),
      err: (line) => err.push(line),
    };
    return { deps, out, err, statements, all: () => [...out, ...err].join("\n") };
  }

  it("sets a SCRAM verifier, logs in, and never prints a secret", async () => {
    const f = fake();
    expect(await setRolePassword([], f.deps)).toBe(0);
    const alter = f.statements.find((s) => s.startsWith("ALTER ROLE"))!;
    expect(alter).toMatch(/^ALTER ROLE "elemental_bot" WITH LOGIN PASSWORD 'SCRAM-SHA-256\$4096:/);
    expect(alter).not.toContain(BOT_PW);
    expect(f.all()).toMatch(/login ok as elemental_bot/);
    for (const secret of [PW, BOT_PW, ADMIN]) expect(f.all()).not.toContain(secret);
  });

  it("refuses to set when the role can reach other definer functions", async () => {
    const f = fake({ exposed: 1 });
    expect(await setRolePassword([], f.deps)).toBe(1);
    expect(f.statements.some((s) => s.startsWith("ALTER ROLE"))).toBe(false);
    expect(await setRolePassword(["--accept-exposure"], fake({ exposed: 1 }).deps)).toBe(0);
  });

  it("--check changes nothing and blanks the password in a failed login", async () => {
    const f = fake({ canLogin: true, loginFails: true });
    expect(await setRolePassword(["--check"], f.deps)).toBe(1);
    expect(f.statements.some((s) => s.startsWith("ALTER ROLE"))).toBe(false);
    expect(f.all()).toMatch(/login FAILED \(SQLSTATE 28P01: password authentication failed \*\*\*\)/);
    for (const secret of [PW, BOT_PW, ADMIN]) expect(f.all()).not.toContain(secret);
  });

  it("explains a missing or weak password without echoing it", async () => {
    const f = fake();
    f.deps.env.ELEMENTAL_BOT_PASSWORD = "short-secret";
    expect(await setRolePassword([], f.deps)).toBe(2);
    expect(f.all()).toMatch(/must be 32 to 128 characters/);
    expect(f.all()).not.toContain("short-secret");
    f.deps.env.ELEMENTAL_BOT_PASSWORD = undefined;
    expect(await setRolePassword([], f.deps)).toBe(2);
    expect(f.all()).toMatch(/Missing required environment variable: ELEMENTAL_BOT_PASSWORD/);
  });
});
