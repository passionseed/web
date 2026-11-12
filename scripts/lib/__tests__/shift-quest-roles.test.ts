/** @jest-environment node */
import crypto from "node:crypto";

import type pg from "pg";

import {
  adminClientConfig,
  alterRoleSql,
  ENV,
  EXPOSURE_SQL,
  LOGIN_SQL,
  parseArgs,
  ROLE_STATE_SQL,
  roleClientConfig,
  run,
  SCHEMA_SQL,
  scramVerifier,
  UsageError,
  validatePassword,
  type DbClient,
  type Deps,
} from "../shift-quest-roles";

// pg's own SCRAM client, to prove the verifier is one a server would accept.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const sasl = require("pg/lib/crypto/sasl") as {
  startSession(mechanisms: string[]): { clientNonce: string; response: string; message: string };
  continueSession(session: object, password: string, serverData: string): Promise<void>;
  finalizeSession(session: object, serverData: string): void;
};

const ADMIN_PW = "admin-pw-9f8e7d6c5b4a";
const ADMIN_URL = `postgresql://postgres.abcdefghijklmnopqrst:${ADMIN_PW}@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres`;
const BOT_PW = "b".repeat(16) + "0123456789abcdef0123456789abcdef";
const WEB_PW = "w".repeat(16) + "fedcba9876543210fedcba9876543210";

interface FakeDb {
  roles: Array<{ rolname: string; rolcanlogin: boolean; rolconnlimit: number }>;
  schema: number;
  exposed: Array<{ role: string; object: string; kind: string }>;
  /** Users that refuse to log in, by connection user. */
  refuse: Set<string>;
  adminFails?: boolean;
}

function setup(env: Record<string, string | undefined>, db: Partial<FakeDb> = {}) {
  const state: FakeDb = {
    roles: [
      { rolname: "shift_quest_bot", rolcanlogin: false, rolconnlimit: 5 },
      { rolname: "shift_quest_web", rolcanlogin: false, rolconnlimit: 20 },
    ],
    schema: 7,
    exposed: [],
    refuse: new Set(),
    ...db,
  };
  const out: string[] = [];
  const err: string[] = [];
  const statements: Array<{ user: string; sql: string; params?: unknown[] }> = [];
  const connects: pg.ClientConfig[] = [];

  const deps: Deps = {
    env: env as NodeJS.ProcessEnv,
    out: (line) => out.push(line),
    err: (line) => err.push(line),
    async connect(config) {
      connects.push(config);
      const user = String(config.user);
      if (user.startsWith("postgres") && state.adminFails) {
        throw Object.assign(new Error(`password authentication failed (${String(config.password)})`), { code: "28P01" });
      }
      if (state.refuse.has(user)) {
        throw Object.assign(new Error(`password authentication failed for user "${user}"`), { code: "28P01" });
      }
      const client: DbClient = {
        async query(sql, params) {
          statements.push({ user, sql, params });
          if (sql === ROLE_STATE_SQL) {
            const wanted = (params?.[0] as string[]) ?? [];
            return { rows: state.roles.filter((r) => wanted.includes(r.rolname)) };
          }
          if (sql === SCHEMA_SQL) return { rows: [{ v: state.schema }] };
          if (sql === EXPOSURE_SQL) return { rows: state.exposed };
          if (sql === LOGIN_SQL) return { rows: [{ who: user.split(".")[0], v: state.schema }] };
          if (sql.startsWith("ALTER ROLE")) {
            const role = /^ALTER ROLE "([a-z_]+)"/.exec(sql)?.[1];
            const row = state.roles.find((r) => r.rolname === role);
            if (row) row.rolcanlogin = true;
            return { rows: [] };
          }
          throw new Error(`unexpected SQL: ${sql}`);
        },
        end: jest.fn().mockResolvedValue(undefined),
      };
      return client;
    },
  };
  return { deps, out, err, statements, connects, state };
}

const FULL_ENV = { [ENV.adminUrl]: ADMIN_URL, [ENV.bot]: BOT_PW, [ENV.web]: WEB_PW };

function allOutput(t: { out: string[]; err: string[] }): string {
  return [...t.out, ...t.err].join("\n");
}

function expectNoSecrets(text: string) {
  for (const secret of [ADMIN_PW, BOT_PW, WEB_PW]) expect(text).not.toContain(secret);
}

describe("parseArgs", () => {
  it("defaults to setting both roles", () => {
    expect(parseArgs([])).toEqual({ check: false, roles: ["bot", "web"], acceptExposure: false, help: false });
  });

  it("reads --check, --only and --accept-exposure", () => {
    expect(parseArgs(["--check", "--only", "web"])).toMatchObject({ check: true, roles: ["web"] });
    expect(parseArgs(["--only=bot", "--accept-exposure"])).toMatchObject({ roles: ["bot"], acceptExposure: true });
  });

  it("refuses anything else", () => {
    expect(() => parseArgs(["--only", "postgres"])).toThrow(UsageError);
    expect(() => parseArgs(["--force"])).toThrow("unknown argument: --force");
  });
});

describe("validatePassword", () => {
  it("accepts openssl rand -hex 32", () => {
    expect(() => validatePassword(ENV.web, crypto.randomBytes(32).toString("hex"))).not.toThrow();
  });

  it.each(["short", "a".repeat(31), "a".repeat(40) + "'; drop role x; --", "a".repeat(40) + "@host", "a".repeat(40) + " "])(
    "refuses %j without echoing it",
    (value) => {
      let message = "";
      try {
        validatePassword(ENV.web, value);
      } catch (error) {
        message = (error as Error).message;
      }
      expect(message).toContain(ENV.web);
      expect(message).not.toContain(value);
    }
  );
});

describe("scramVerifier", () => {
  it("has Postgres's SCRAM-SHA-256 format", () => {
    expect(scramVerifier(WEB_PW)).toMatch(/^SCRAM-SHA-256\$4096:[A-Za-z0-9+/=]{24}\$[A-Za-z0-9+/=]{44}:[A-Za-z0-9+/=]{44}$/);
  });

  it("uses a fresh salt every time and never contains the password", () => {
    const a = scramVerifier(WEB_PW);
    const b = scramVerifier(WEB_PW);
    expect(a).not.toBe(b);
    expect(a).not.toContain(WEB_PW);
  });

  it("is accepted by pg's own SCRAM client, as a Postgres server would", async () => {
    const verifier = scramVerifier(WEB_PW);
    const [, iterations, salt, storedKey, serverKey] = /^SCRAM-SHA-256\$(\d+):([^$]+)\$([^:]+):(.+)$/.exec(verifier)!;

    // Play the server's side of the exchange with only the stored verifier.
    const session = sasl.startSession(["SCRAM-SHA-256"]);
    const nonce = session.clientNonce + crypto.randomBytes(12).toString("base64");
    const serverFirst = `r=${nonce},s=${salt},i=${iterations}`;
    await sasl.continueSession(session, WEB_PW, serverFirst);
    const clientFinal = (session as unknown as { response: string }).response;
    const withoutProof = clientFinal.replace(/,p=[^,]+$/, "");
    const proof = Buffer.from(/,p=([^,]+)$/.exec(clientFinal)![1], "base64");
    const authMessage = `n=*,r=${session.clientNonce},${serverFirst},${withoutProof}`;

    const clientSignature = crypto.createHmac("sha256", Buffer.from(storedKey, "base64")).update(authMessage).digest();
    const clientKey = Buffer.from(proof.map((byte, i) => byte ^ clientSignature[i]));
    expect(crypto.createHash("sha256").update(clientKey).digest().toString("base64")).toBe(storedKey);

    const serverSignature = crypto.createHmac("sha256", Buffer.from(serverKey, "base64")).update(authMessage).digest("base64");
    expect(() => sasl.finalizeSession(session, `v=${serverSignature}`)).not.toThrow();
  });

  it("is refused for the wrong password", async () => {
    const verifier = scramVerifier(WEB_PW);
    const [, iterations, salt, storedKey] = /^SCRAM-SHA-256\$(\d+):([^$]+)\$([^:]+):(.+)$/.exec(verifier)!;
    const session = sasl.startSession(["SCRAM-SHA-256"]);
    const serverFirst = `r=${session.clientNonce}xyz,s=${salt},i=${iterations}`;
    await sasl.continueSession(session, BOT_PW, serverFirst);
    const clientFinal = (session as unknown as { response: string }).response;
    const proof = Buffer.from(/,p=([^,]+)$/.exec(clientFinal)![1], "base64");
    const authMessage = `n=*,r=${session.clientNonce},${serverFirst},${clientFinal.replace(/,p=[^,]+$/, "")}`;
    const clientSignature = crypto.createHmac("sha256", Buffer.from(storedKey, "base64")).update(authMessage).digest();
    const clientKey = Buffer.from(proof.map((byte, i) => byte ^ clientSignature[i]));
    expect(crypto.createHash("sha256").update(clientKey).digest().toString("base64")).not.toBe(storedKey);
  });
});

describe("alterRoleSql", () => {
  it("quotes the role as an identifier and the verifier as a literal", () => {
    expect(alterRoleSql("shift_quest_web", "SCRAM-SHA-256$4096:abc$def:ghi")).toBe(
      `ALTER ROLE "shift_quest_web" WITH LOGIN PASSWORD 'SCRAM-SHA-256$4096:abc$def:ghi'`
    );
  });

  it("cannot be broken out of", () => {
    expect(alterRoleSql("shift_quest_web", "x'; DROP ROLE postgres; --")).toBe(
      `ALTER ROLE "shift_quest_web" WITH LOGIN PASSWORD 'x''; DROP ROLE postgres; --'`
    );
  });
});

describe("connection settings", () => {
  it("verifies TLS against Supabase's CA whatever sslmode says", () => {
    const config = adminClientConfig(`${ADMIN_URL}?sslmode=disable`);
    expect(config).toMatchObject({
      host: "aws-0-ap-southeast-1.pooler.supabase.com",
      port: 5432,
      user: "postgres.abcdefghijklmnopqrst",
      database: "postgres",
      ssl: { rejectUnauthorized: true, ca: expect.stringContaining("BEGIN CERTIFICATE") },
    });
    expect(config).not.toHaveProperty("connectionString");
  });

  it("skips TLS only on loopback", () => {
    expect(adminClientConfig("postgresql://postgres:pw@127.0.0.1:55451/postgres").ssl).toBe(false);
  });

  it.each([
    ["not a url", "not a valid URL"],
    ["https://postgres:pw@host/postgres", "postgresql:// URL"],
    ["postgresql://shift_quest_web:pw@host/postgres", "admin"],
    ["postgresql://shift_quest_bot.ref:pw@host/postgres", "admin"],
  ])("refuses %s", (url, message) => {
    expect(() => adminClientConfig(url)).toThrow(message);
  });

  it("logs the role in through the pooler as <role>.<project ref>", () => {
    const admin = adminClientConfig(ADMIN_URL);
    expect(roleClientConfig(admin, "shift_quest_web", WEB_PW)).toMatchObject({
      host: admin.host,
      port: admin.port,
      user: "shift_quest_web.abcdefghijklmnopqrst",
      password: WEB_PW,
      ssl: admin.ssl,
    });
  });

  it("logs the role in by its bare name on a direct connection", () => {
    const admin = adminClientConfig("postgresql://postgres:pw@db.abcdefghijklmnopqrst.supabase.co:5432/postgres");
    expect(roleClientConfig(admin, "shift_quest_bot", BOT_PW).user).toBe("shift_quest_bot");
  });
});

describe("run: usage", () => {
  it("exits 2 naming the admin URL variable when it is missing", async () => {
    const t = setup({ [ENV.bot]: BOT_PW, [ENV.web]: WEB_PW });
    expect(await run([], t.deps)).toBe(2);
    expect(t.err[0]).toBe(`Missing required environment variable: ${ENV.adminUrl}`);
    expect(t.connects).toHaveLength(0);
  });

  it("exits 2 naming a missing password variable", async () => {
    const t = setup({ [ENV.adminUrl]: ADMIN_URL, [ENV.bot]: BOT_PW });
    expect(await run([], t.deps)).toBe(2);
    expect(t.err[0]).toContain(`Missing required environment variable: ${ENV.web}`);
    expect(t.connects).toHaveLength(0);
    expectNoSecrets(allOutput(t));
  });

  it("refuses the same password for both roles", async () => {
    const t = setup({ [ENV.adminUrl]: ADMIN_URL, [ENV.bot]: WEB_PW, [ENV.web]: WEB_PW });
    expect(await run([], t.deps)).toBe(2);
    expect(t.err[0]).toContain("must be different");
    expectNoSecrets(allOutput(t));
  });

  it("prints help without touching the database", async () => {
    const t = setup({});
    expect(await run(["--help"], t.deps)).toBe(0);
    expect(t.out[0]).toContain("usage:");
    expect(t.connects).toHaveLength(0);
  });
});

describe("run: set", () => {
  it("gives both roles LOGIN with a SCRAM verifier, then logs in as each", async () => {
    const t = setup(FULL_ENV);
    expect(await run([], t.deps)).toBe(0);

    const alters = t.statements.filter((s) => s.sql.startsWith("ALTER ROLE"));
    expect(alters.map((s) => s.sql.split(" WITH")[0])).toEqual(['ALTER ROLE "shift_quest_bot"', 'ALTER ROLE "shift_quest_web"']);
    for (const alter of alters) {
      expect(alter.user).toBe("postgres.abcdefghijklmnopqrst");
      expect(alter.sql).toMatch(/WITH LOGIN PASSWORD 'SCRAM-SHA-256\$4096:/);
    }

    expect(t.connects.map((c) => c.user)).toEqual([
      "postgres.abcdefghijklmnopqrst",
      "shift_quest_bot.abcdefghijklmnopqrst",
      "shift_quest_web.abcdefghijklmnopqrst",
    ]);
    expect(t.connects[2].password).toBe(WEB_PW);
    expect(t.out.join("\n")).toContain("shift_quest_web: login ok as shift_quest_web, sees schema 7");
  });

  it("never sends or prints a plain password", async () => {
    const t = setup(FULL_ENV);
    await run([], t.deps);
    const sent = JSON.stringify(t.statements);
    expect(sent).not.toContain(BOT_PW);
    expect(sent).not.toContain(WEB_PW);
    expectNoSecrets(allOutput(t));
  });

  it("--only web needs and touches only the web role", async () => {
    const t = setup({ [ENV.adminUrl]: ADMIN_URL, [ENV.web]: WEB_PW });
    expect(await run(["--only", "web"], t.deps)).toBe(0);
    const alters = t.statements.filter((s) => s.sql.startsWith("ALTER ROLE"));
    expect(alters).toHaveLength(1);
    expect(alters[0].sql).toContain('"shift_quest_web"');
    expect(t.state.roles.find((r) => r.rolname === "shift_quest_bot")!.rolcanlogin).toBe(false);
  });

  it("refuses when the migrations are not applied", async () => {
    const t = setup(FULL_ENV, { roles: [] });
    expect(await run([], t.deps)).toBe(1);
    expect(t.err.join("\n")).toContain("Apply the migrations first");
    expect(t.statements.some((s) => s.sql.startsWith("ALTER"))).toBe(false);
  });

  it("refuses an older quest schema", async () => {
    const t = setup(FULL_ENV, { schema: 5 });
    expect(await run([], t.deps)).toBe(1);
    expect(t.err.join("\n")).toContain("Quest schema 5 is older than 6");
    expect(t.statements.some((s) => s.sql.startsWith("ALTER"))).toBe(false);
  });

  it("refuses LOGIN while the roles reach objects through PUBLIC, and lists them", async () => {
    const exposed = [{ role: "shift_quest_web", object: "some_definer_fn(uuid)", kind: "definer function" }];
    const t = setup(FULL_ENV, { exposed });
    expect(await run([], t.deps)).toBe(1);
    expect(t.err.join("\n")).toContain("shift_quest_web  definer function  some_definer_fn(uuid)");
    expect(t.statements.some((s) => s.sql.startsWith("ALTER"))).toBe(false);

    const accepted = setup(FULL_ENV, { exposed });
    expect(await run(["--accept-exposure"], accepted.deps)).toBe(0);
    expect(accepted.statements.filter((s) => s.sql.startsWith("ALTER"))).toHaveLength(2);
  });

  it("reports a login that fails after setting, without the password", async () => {
    const t = setup(FULL_ENV, { refuse: new Set(["shift_quest_web.abcdefghijklmnopqrst"]) });
    expect(await run([], t.deps)).toBe(1);
    expect(t.err.join("\n")).toContain("shift_quest_web: login FAILED (SQLSTATE 28P01");
    expectNoSecrets(allOutput(t));
  });

  it("blanks the admin password out of a connection error", async () => {
    const t = setup(FULL_ENV, { adminFails: true });
    expect(await run([], t.deps)).toBe(1);
    expect(t.err[0]).toContain("Could not connect as the admin user (SQLSTATE 28P01");
    expect(t.err[0]).toContain("***");
    expectNoSecrets(allOutput(t));
  });
});

describe("run: --check", () => {
  it("changes nothing and reports LOGIN off", async () => {
    const t = setup({ [ENV.adminUrl]: ADMIN_URL });
    expect(await run(["--check"], t.deps)).toBe(1);
    expect(t.statements.some((s) => /^\s*(alter|grant|revoke|create|drop)/i.test(s.sql))).toBe(false);
    expect(t.out).toContain("  shift_quest_bot: LOGIN off, connection limit 5");
    expect(t.out).toContain(`  shift_quest_web: login not tried (set ${ENV.web} to try it)`);
    expect(t.connects).toHaveLength(1);
  });

  it("passes once both roles can log in, trying each password it has", async () => {
    const t = setup(FULL_ENV, {
      roles: [
        { rolname: "shift_quest_bot", rolcanlogin: true, rolconnlimit: 5 },
        { rolname: "shift_quest_web", rolcanlogin: true, rolconnlimit: 20 },
      ],
    });
    expect(await run(["--check"], t.deps)).toBe(0);
    expect(t.out.at(-1)).toBe("Check passed.");
    expect(t.connects.map((c) => c.user)).toHaveLength(3);
    expect(t.statements.some((s) => s.sql.startsWith("ALTER"))).toBe(false);
    expectNoSecrets(allOutput(t));
  });

  it("fails when exposure through PUBLIC remains", async () => {
    const t = setup({ [ENV.adminUrl]: ADMIN_URL }, {
      roles: [
        { rolname: "shift_quest_bot", rolcanlogin: true, rolconnlimit: 5 },
        { rolname: "shift_quest_web", rolcanlogin: true, rolconnlimit: 20 },
      ],
      exposed: [{ role: "shift_quest_bot", object: "public.some_table", kind: "table or view" }],
    });
    expect(await run(["--check"], t.deps)).toBe(1);
  });
});
