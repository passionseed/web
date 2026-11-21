/**
 * @jest-environment node
 *
 * Setting up the ops board: the environment it needs, the one command it
 * registers (an upsert that leaves other modules' commands alone), the
 * database calls it makes and the migration's safety rules.
 */
import { readFileSync } from "node:fs";
import path from "node:path";

import { Routes } from "discord.js";

import { loadEnv } from "../../env";
import { createOpsApi, OpsDbError, OpsError } from "../api";
import { opsCommand, registerOpsCommands } from "../commands";

const IDS = {
  HACKATHON_OPS_GUILD_ID: "100000000000000001",
  HACKATHON_OPS_CHANNEL_ID: "100000000000000002",
  HACKATHON_OPS_STAFF_ROLE_ID: "100000000000000003",
};

describe("environment", () => {
  const saved = { ...process.env };
  afterEach(() => {
    process.env = { ...saved };
  });

  function setEnv(values: Record<string, string | undefined>) {
    process.env = { ...saved };
    for (const key of Object.keys(process.env)) {
      if (/^(HACKATHON_OPS_|DISCORD_|BOT_MODULES)/.test(key)) delete process.env[key];
    }
    for (const [key, value] of Object.entries(values)) if (value !== undefined) process.env[key] = value;
  }

  it("needs the server, channel, staff role and database login", () => {
    const base = { BOT_MODULES: "hackathon-ops", DISCORD_BOT_TOKEN: "test-token", ...IDS, HACKATHON_OPS_DATABASE_URL: "postgresql://x@127.0.0.1/db" };
    setEnv(base);
    expect(loadEnv().hackathonOps).toEqual({
      guildId: IDS.HACKATHON_OPS_GUILD_ID,
      channelId: IDS.HACKATHON_OPS_CHANNEL_ID,
      staffRoleId: IDS.HACKATHON_OPS_STAFF_ROLE_ID,
      databaseUrl: "postgresql://x@127.0.0.1/db",
      board: "hackathon",
    });
    for (const key of [...Object.keys(IDS), "HACKATHON_OPS_DATABASE_URL"]) {
      setEnv({ ...base, [key]: undefined });
      expect(() => loadEnv()).toThrow(key);
    }
    setEnv({ ...base, HACKATHON_OPS_CHANNEL_ID: "#ai" });
    expect(() => loadEnv()).toThrow(/Discord ID/);
    setEnv({ ...base, HACKATHON_OPS_BOARD: "Bad Board" });
    expect(() => loadEnv()).toThrow(/HACKATHON_OPS_BOARD/);
  });

  it("is off unless named in BOT_MODULES, and rides on the process's token", () => {
    setEnv({ BOT_MODULES: "projectseed", DISCORD_BOT_TOKEN: "shared" });
    expect(() => loadEnv()).toThrow(); // projectseed's own variables are missing
    setEnv({ BOT_MODULES: "hackathon-ops", DISCORD_SHIFT_BOT_TOKEN: "shift", ...IDS, HACKATHON_OPS_DATABASE_URL: "u" });
    expect(loadEnv().core.discordToken).toBe("shift");
    setEnv({ BOT_MODULES: "hackathon-ops", DISCORD_BOT_TOKEN: "shared", DISCORD_SHIFT_BOT_TOKEN: "shift", ...IDS, HACKATHON_OPS_DATABASE_URL: "u" });
    expect(loadEnv().core.discordToken).toBe("shared");
  });
});

describe("registration", () => {
  it("upserts /ops in the one server and never replaces or deletes other commands", async () => {
    const rest = {
      get: jest.fn().mockResolvedValue({ id: "app" }),
      post: jest.fn().mockResolvedValue({}),
      put: jest.fn(),
      delete: jest.fn(),
    };
    jest.spyOn(console, "log").mockImplementation(() => undefined);
    await registerOpsCommands("token", IDS.HACKATHON_OPS_GUILD_ID, rest as never);
    expect(rest.post).toHaveBeenCalledTimes(1);
    expect(rest.post).toHaveBeenCalledWith(Routes.applicationGuildCommands("app", IDS.HACKATHON_OPS_GUILD_ID), {
      body: opsCommand(),
    });
    expect(rest.put).not.toHaveBeenCalled();
    expect(rest.delete).not.toHaveBeenCalled();
  });

  it("projectseed's registration upserts too, so it can no longer wipe /ops", () => {
    const source = readFileSync(path.join(__dirname, "..", "..", "commands.ts"), "utf8");
    expect(source).not.toMatch(/rest\.put\(/);
    expect(source).toMatch(/rest\.post\(/);
  });

  it("defines /ops for servers only, with the five subcommands", () => {
    const json = opsCommand();
    expect(json.name).toBe("ops");
    expect(json.contexts).toEqual([0]);
    expect(json.options?.map((o) => o.name)).toEqual(["board", "show", "claim", "done", "status"]);
    expect(JSON.stringify(json)).not.toContain("—");
  });
});

describe("database calls", () => {
  it("passes the board first and maps refusals and failures", async () => {
    const query = jest.fn().mockResolvedValue({ rows: [{ value: [] }] });
    const api = createOpsApi({ query } as never, "test-board");
    await api.setStep("snack-run", 2, true, "Sam");
    expect(query).toHaveBeenCalledWith("SELECT public.hackathon_ops_step_set($1, $2, $3, $4, $5) AS value", [
      "test-board",
      "snack-run",
      2,
      true,
      "Sam",
    ]);

    query.mockRejectedValueOnce(Object.assign(new Error("ops:not_found"), { code: "P0001" }));
    await expect(api.show("nope")).rejects.toEqual(new OpsError("not_found"));

    jest.spyOn(console, "error").mockImplementation(() => undefined);
    query.mockRejectedValueOnce(Object.assign(new Error("connection refused, with details"), { code: "08006" }));
    const failure = await api.board().catch((e: unknown) => e);
    expect(failure).toBeInstanceOf(OpsDbError);
    expect((failure as Error).message).not.toContain("details");
  });
});

describe("migration", () => {
  const sql = readFileSync(
    path.join(__dirname, "..", "..", "..", "..", "supabase", "migrations", "20261120100000_hackathon_ops_board.sql"),
    "utf8"
  );

  it("is additive and idempotent", () => {
    expect(sql).not.toMatch(/\bDROP\s+(TABLE|COLUMN|FUNCTION|ROLE)\b/i);
    for (const create of sql.match(/CREATE TABLE [^\n]+/g) ?? []) expect(create).toContain("IF NOT EXISTS");
    for (const create of sql.match(/CREATE INDEX [^\n]+/g) ?? []) expect(create).toContain("IF NOT EXISTS");
    for (const fn of sql.match(/CREATE (OR REPLACE )?FUNCTION/g) ?? []) expect(fn).toBe("CREATE OR REPLACE FUNCTION");
  });

  it("turns on row level security for every table and opens nothing to the Data API", () => {
    const tables = [...sql.matchAll(/CREATE TABLE IF NOT EXISTS public\.(\w+)/g)].map((m) => m[1]);
    expect(tables).toEqual(["hackathon_ops", "hackathon_ops_steps", "hackathon_ops_morning"]);
    for (const table of tables) {
      expect(sql).toContain(`ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY;`);
      expect(sql).toContain(`REVOKE ALL ON public.${table} FROM PUBLIC, anon, authenticated;`);
    }
    expect(sql).not.toMatch(/GRANT [^;]* TO (anon|authenticated|PUBLIC)\b/i);
    expect(sql).not.toMatch(/GRANT (SELECT|INSERT|UPDATE|DELETE|ALL)[^;]*ON (TABLE )?public\.hackathon_ops/i);
  });

  it("holds no password", () => {
    expect(sql).not.toMatch(/PASSWORD '[^<]/);
  });
});
