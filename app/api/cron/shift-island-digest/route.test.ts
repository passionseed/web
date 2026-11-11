/** @jest-environment node */
import { NextRequest } from "next/server";

import { QuestDbError } from "@/bot/src/quests/api";

const call = jest.fn();
const describeTeam = jest.fn();

jest.mock("@/lib/supabase/shift-quests/db", () => ({ questApi: () => ({ call, rows: jest.fn() }) }));
jest.mock("@/lib/shift-island/digest/claude", () => ({
  ...jest.requireActual("@/lib/shift-island/digest/claude"),
  describeTeam: (...args: unknown[]) => describeTeam(...args),
}));

import { GET, maxDuration } from "./route";

const SECRET = "cron-secret";
const saved = { cron: process.env.CRON_SECRET, key: process.env.ANTHROPIC_API_KEY };

const request = (auth?: string) =>
  new NextRequest("http://localhost:3000/api/cron/shift-island-digest", auth ? { headers: { authorization: auth } } : undefined);

const PROJECT = {
  project_id: "p1",
  slot: 2,
  name: "ทีม",
  approved: [],
  submitted: [{ title: "ทดสอบ", evidence: "ทดสอบกับลูกค้า 3 คน" }],
  checkins: { members_active: 1, days: 1, taps: 1 },
  previous: null,
  redact: ["Mint"],
};

function inputsAnswer(enabled: boolean) {
  return async (fn: string, ...args: unknown[]) => {
    if (fn === "shift_quest_digest_inputs") return { enabled, day: args[0], kind: args[1], from: args[0], to: args[0], projects: enabled ? [PROJECT] : [] };
    if (fn === "shift_quest_digest_save") return 1;
    return null;
  };
}

let errorLog: jest.SpyInstance;
beforeEach(() => {
  call.mockReset();
  describeTeam.mockReset();
  process.env.CRON_SECRET = SECRET;
  process.env.ANTHROPIC_API_KEY = "sk-test";
  errorLog = jest.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  errorLog.mockRestore();
  for (const [env, value] of [
    ["CRON_SECRET", saved.cron],
    ["ANTHROPIC_API_KEY", saved.key],
  ] as const) {
    if (value === undefined) delete process.env[env];
    else process.env[env] = value;
  }
});

describe("GET /api/cron/shift-island-digest", () => {
  it("allows the 300 seconds the job may need", () => {
    expect(maxDuration).toBe(300);
  });

  it.each([[undefined], ["Bearer wrong"], [`Basic ${SECRET}`]])("is 401 without the cron secret (%p), reading nothing", async (auth) => {
    const res = await GET(request(auth));
    expect(res.status).toBe(401);
    expect(call).not.toHaveBeenCalled();
  });

  it("is 401 when no CRON_SECRET is configured", async () => {
    delete process.env.CRON_SECRET;
    const res = await GET(request("Bearer undefined"));
    expect(res.status).toBe(401);
  });

  it("skips quietly while the digest is off", async () => {
    call.mockImplementation(inputsAnswer(false));
    const res = await GET(request(`Bearer ${SECRET}`));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, skipped: "disabled" });
    expect(describeTeam).not.toHaveBeenCalled();
    expect(errorLog).not.toHaveBeenCalled();
  });

  it("without ANTHROPIC_API_KEY says why, stores nothing and still answers 200", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    call.mockImplementation(inputsAnswer(true));
    const res = await GET(request(`Bearer ${SECRET}`));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: false, reason: "no_key" });
    expect(call.mock.calls.some((c) => c[0] === "shift_quest_digest_save")).toBe(false);
    expect(describeTeam).not.toHaveBeenCalled();
    expect(errorLog.mock.calls.flat().join(" ")).toContain("ANTHROPIC_API_KEY is not set");
  });

  it("summarises and saves when on and keyed", async () => {
    call.mockImplementation(inputsAnswer(true));
    describeTeam.mockResolvedValue({ no_update: false, summary: "ทีมทดสอบต้นแบบกับลูกค้า 3 คน" });
    const res = await GET(request(`Bearer ${SECRET}`));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    // On a Bangkok Sunday the week recap runs first, so look the day's run up by kind.
    expect(body.runs.find((r: { kind: string }) => r.kind === "day")).toMatchObject({ kind: "day", teams: 1, summaries: 1, saved: 1 });
    expect(call.mock.calls.some((c) => c[0] === "shift_quest_digest_save")).toBe(true);
  });

  it("is 500 on a database failure and logs only the function and SQLSTATE", async () => {
    call.mockRejectedValue(new QuestDbError("shift_quest_digest_inputs", "42883"));
    const res = await GET(request(`Bearer ${SECRET}`));
    expect(res.status).toBe(500);
    expect(errorLog.mock.calls.flat().join(" ")).toContain("shift_quest_digest_inputs SQLSTATE 42883");
  });
});
