/** @jest-environment node */
const poolInstances: Array<{ config: Record<string, unknown>; query: jest.Mock; on: jest.Mock; end: jest.Mock }> = [];

jest.mock("pg", () => {
  class Pool {
    config: Record<string, unknown>;
    query = jest.fn();
    on = jest.fn();
    end = jest.fn().mockResolvedValue(undefined);
    constructor(config: Record<string, unknown>) {
      this.config = config;
      poolInstances.push(this);
    }
  }
  return { __esModule: true, default: { Pool }, Pool };
});

import { SUPABASE_CA } from "../ca";
import { ensureSchema, questApi, REQUIRED_SCHEMA } from "../db";

const ENV = { ...process.env };
const LOCAL = "postgresql://shift_quest_web:sandbox@127.0.0.1:55451/postgres";
const REMOTE = "postgresql://shift_quest_web.abcdefghijklmnopqrst:secret@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?sslmode=disable";

function reset() {
  poolInstances.length = 0;
  delete (globalThis as { __shiftQuestWebPool?: unknown }).__shiftQuestWebPool;
}

beforeEach(() => {
  reset();
  process.env = { ...ENV };
  delete process.env.SHIFT_QUEST_DATABASE_URL;
  jest.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  process.env = ENV;
  jest.restoreAllMocks();
});

describe("questApi", () => {
  it("creates no pool on import", () => {
    expect(poolInstances).toHaveLength(0);
  });

  it("throws shift_quest_db_not_configured when the URL is missing", () => {
    expect(() => questApi()).toThrow("shift_quest_db_not_configured");
    expect(poolInstances).toHaveLength(0);
  });

  it.each([
    "postgresql://shift_quest_bot:pw@127.0.0.1:5432/postgres",
    "postgresql://postgres:pw@127.0.0.1:5432/postgres",
    "postgresql://service_role:pw@db.example.com:5432/postgres",
    "postgresql://shift_quest_web_admin:pw@127.0.0.1:5432/postgres",
    "https://shift_quest_web:pw@127.0.0.1/postgres",
    "not a url",
  ])("refuses any login but shift_quest_web: %s", (url) => {
    process.env.SHIFT_QUEST_DATABASE_URL = url;
    expect(() => questApi()).toThrow("shift_quest_db_not_configured");
    expect(poolInstances).toHaveLength(0);
    // The log names the variable, never the URL (it holds a password).
    for (const [line] of (console.error as jest.Mock).mock.calls) {
      expect(String(line)).not.toContain("pw@");
    }
  });

  it("connects to a loopback sandbox without TLS", () => {
    process.env.SHIFT_QUEST_DATABASE_URL = LOCAL;
    questApi();
    expect(poolInstances).toHaveLength(1);
    expect(poolInstances[0].config).toEqual(
      expect.objectContaining({
        host: "127.0.0.1",
        port: 55451,
        user: "shift_quest_web",
        password: "sandbox",
        database: "postgres",
        ssl: false,
        max: 2,
        idleTimeoutMillis: 10_000,
        connectionTimeoutMillis: 5_000,
        application_name: "shift-island-web",
      })
    );
    expect(poolInstances[0].on).toHaveBeenCalledWith("error", expect.any(Function));
  });

  it("treats localhost and ::1 as loopback", () => {
    process.env.SHIFT_QUEST_DATABASE_URL = "postgresql://shift_quest_web:pw@localhost:5432/postgres";
    questApi();
    process.env.SHIFT_QUEST_DATABASE_URL = "postgresql://shift_quest_web:pw@[::1]:5432/postgres";
    questApi();
    expect(poolInstances.map((p) => [p.config.host, p.config.ssl])).toEqual([
      ["localhost", false],
      ["::1", false],
    ]);
  });

  it("verifies TLS against the Supabase CA off loopback, whatever sslmode the URL says", () => {
    process.env.SHIFT_QUEST_DATABASE_URL = REMOTE;
    questApi();
    const config = poolInstances[0].config;
    expect(config.ssl).toEqual({ ca: SUPABASE_CA, rejectUnauthorized: true });
    expect(config.user).toBe("shift_quest_web.abcdefghijklmnopqrst");
    expect(config.port).toBe(6543);
    expect(config).not.toHaveProperty("connectionString");
    expect(SUPABASE_CA).toContain("BEGIN CERTIFICATE");
  });

  it("reuses one pool per URL and replaces it when the URL changes", () => {
    process.env.SHIFT_QUEST_DATABASE_URL = LOCAL;
    const first = questApi();
    expect(questApi()).toBe(first);
    expect(poolInstances).toHaveLength(1);

    process.env.SHIFT_QUEST_DATABASE_URL = LOCAL.replace("55451", "55452");
    expect(questApi()).not.toBe(first);
    expect(poolInstances).toHaveLength(2);
    expect(poolInstances[0].end).toHaveBeenCalled();
  });
});

describe("ensureSchema", () => {
  beforeEach(() => {
    process.env.SHIFT_QUEST_DATABASE_URL = LOCAL;
  });

  it("needs schema 5 (the SHIFT canvas link)", () => {
    expect(REQUIRED_SCHEMA).toBe(5);
  });

  it("accepts schema 5 and checks only once per pool", async () => {
    questApi();
    poolInstances[0].query.mockResolvedValue({ rows: [{ r: 5 }] });
    await ensureSchema();
    await ensureSchema();
    expect(poolInstances[0].query).toHaveBeenCalledTimes(1);
    expect(poolInstances[0].query).toHaveBeenCalledWith("select public.shift_quest_schema_version() as r", []);
  });

  it("refuses an older schema and checks again next time", async () => {
    questApi();
    poolInstances[0].query.mockResolvedValueOnce({ rows: [{ r: 4 }] }).mockResolvedValueOnce({ rows: [{ r: 5 }] });
    await expect(ensureSchema()).rejects.toThrow("shift_quest_schema_outdated");
    await expect(ensureSchema()).resolves.toBeUndefined();
    expect(poolInstances[0].query).toHaveBeenCalledTimes(2);
  });

  it("passes a database failure through and retries next time", async () => {
    questApi();
    poolInstances[0].query.mockRejectedValueOnce(Object.assign(new Error("boom"), { code: "08006" }));
    await expect(ensureSchema()).rejects.toMatchObject({ name: "QuestDbError", sqlstate: "08006" });
    poolInstances[0].query.mockResolvedValueOnce({ rows: [{ r: 5 }] });
    await expect(ensureSchema()).resolves.toBeUndefined();
  });
});
