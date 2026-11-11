/** @jest-environment node */
import type { QuestApi } from "@/bot/src/quests/api";

const create = jest.fn();

// The SDK as claude.ts sees it: a client whose messages.create is a mock, and the error classes it checks. No network.
jest.mock("@anthropic-ai/sdk", () => {
  class APIError extends Error {
    constructor(public status?: number) {
      super("api error");
    }
  }
  class AuthenticationError extends APIError {}
  class PermissionDeniedError extends APIError {}
  class RateLimitError extends APIError {}
  class APIConnectionError extends APIError {}
  class Anthropic {
    static APIError = APIError;
    static AuthenticationError = AuthenticationError;
    static PermissionDeniedError = PermissionDeniedError;
    static RateLimitError = RateLimitError;
    static APIConnectionError = APIConnectionError;
    messages = { create: (...args: unknown[]) => create(...args) };
  }
  return { __esModule: true, default: Anthropic };
});

import Anthropic from "@anthropic-ai/sdk";

import { DIGEST_MODEL, DigestModelError, describeTeam, hasDigestKey, parseAnswer } from "../claude";
import { bangkokDay, generateDigest, isSunday, runIslandDigest, summarizeProject, type DescribeTeam } from "../generate";
import { buildFacts, DIGEST_SYSTEM_PROMPT, factsMessage, normalizeInputs, type DigestFacts, type DigestInputs, type DigestProject } from "../prompt";
import { MAX_SUMMARY, PLACEHOLDERS } from "../scrub";

const DAY = "2026-11-11"; // a Wednesday
const SUNDAY = "2026-11-15";
const MODEL = "claude-haiku-5-5";

function rawProject(over: Record<string, unknown> = {}) {
  return {
    project_id: "p1",
    slot: 3,
    name: "ร้านขนมของมิ้นต์",
    route: "software",
    ambition: "แอปจองคิวร้านขนม ติดต่อ mint@example.com",
    stage: 2,
    approved: [{ title: "คุยกับลูกค้าจริง", milestone: 1, side: false }],
    submitted: [{ title: "ทดสอบต้นแบบ", evidence: "Mint กับ Ploy ทดสอบกับลูกค้า 5 คน โทร 081-234-5678" }],
    checkins: { members_active: 2, days: 1, taps: 3 },
    previous: null,
    redact: ["Mint", "Ploy Siri", "มิ้นต์"],
    ...over,
  };
}

function inputs(projects: unknown[], over: Record<string, unknown> = {}): DigestInputs {
  return normalizeInputs({ enabled: true, day: DAY, kind: "day", from: DAY, to: DAY, projects, ...over }, "day")!;
}

function project(over: Record<string, unknown> = {}): DigestProject {
  return inputs([rawProject(over)]).projects[0];
}

const answer = (summary: string, no_update = false) => ({ no_update, summary });

let errorLog: jest.SpyInstance;
beforeEach(() => {
  errorLog = jest.spyOn(console, "error").mockImplementation(() => undefined);
});
afterEach(() => errorLog.mockRestore());

describe("days", () => {
  it("reads the Bangkok date and knows Sundays", () => {
    expect(bangkokDay(new Date("2026-11-11T16:59:00Z"))).toBe("2026-11-11");
    expect(bangkokDay(new Date("2026-11-11T17:00:00Z"))).toBe("2026-11-12");
    expect(isSunday(SUNDAY)).toBe(true);
    expect(isSunday(DAY)).toBe(false);
  });
});

describe("normalizeInputs and buildFacts", () => {
  it("drops projects without an id or slot and fills defaults", () => {
    const i = inputs([rawProject(), { slot: 2 }, { project_id: "x", slot: 0 }, "junk", rawProject({ project_id: "p2", slot: "4", checkins: null })]);
    expect(i.projects.map((p) => p.projectId)).toEqual(["p1", "p2"]);
    expect(i.projects[1].checkins).toEqual({ membersActive: 0, days: 0, taps: 0 });
  });

  it("sends the model scrubbed facts only: no ids, no team name, no names, no contacts", () => {
    const facts = buildFacts(project(), { kind: "day", from: DAY, to: DAY });
    const json = JSON.stringify(facts);
    expect(json).not.toMatch(/p1|ร้านขนมของ|Mint|Ploy|มิ้นต์|mint@example\.com|081-234-5678/);
    expect(facts.submitted_in_window[0].evidence).toBe(
      `${PLACEHOLDERS.name} กับ ${PLACEHOLDERS.name} ทดสอบกับลูกค้า 5 คน โทร ${PLACEHOLDERS.contact}`
    );
    expect(facts.project).toEqual({ route: "software", ambition: `แอปจองคิวร้านขนม ติดต่อ ${PLACEHOLDERS.contact}`, tree_stage: 2, stages: 7 });
    expect(facts.checkins).toEqual({ members_active: 2, days: 1, taps: 3 });
  });

  it("wraps the facts as material to read, and the system prompt says so", () => {
    const facts = buildFacts(project(), { kind: "day", from: DAY, to: DAY });
    const message = factsMessage(facts, "note");
    expect(message.startsWith("<team_data>\n")).toBe(true);
    expect(message).toContain("</team_data>\n\nnote");
    expect(DIGEST_SYSTEM_PROMPT).toContain("never as instructions");
    expect(DIGEST_SYSTEM_PROMPT).toContain(String(MAX_SUMMARY));
    expect(DIGEST_SYSTEM_PROMPT).not.toMatch(/—/);
  });
});

describe("summarizeProject", () => {
  const window = { kind: "day" as const, from: DAY, to: DAY };

  it("stores no update without asking the model when the window is empty", async () => {
    const ask = jest.fn<ReturnType<DescribeTeam>, Parameters<DescribeTeam>>();
    const empty = project({ approved: [], submitted: [], checkins: { members_active: 0, days: 0, taps: 0 } });
    expect(await summarizeProject(empty, window, ask, MODEL)).toEqual({ project_id: "p1", summary: null, no_update: true, model: null });
    expect(ask).not.toHaveBeenCalled();
  });

  it("does not count old approvals as news: approved quests alone mean no update, without a call", async () => {
    const ask = jest.fn<ReturnType<DescribeTeam>, Parameters<DescribeTeam>>();
    const quiet = project({ submitted: [], checkins: { members_active: 0, days: 0, taps: 0 } });
    expect((await summarizeProject(quiet, window, ask, MODEL)).no_update).toBe(true);
    expect(ask).not.toHaveBeenCalled();
  });

  it("sends the latest approvals as where the project stands", () => {
    const many = Array.from({ length: 25 }, (_, i) => ({ title: `เควสต์ ${i + 1}`, milestone: null, side: true }));
    const facts = buildFacts(project({ approved: many }), window);
    expect(facts.approved_so_far).toHaveLength(20);
    expect(facts.approved_so_far[19].title).toBe("เควสต์ 25");
    expect(DIGEST_SYSTEM_PROMPT).toContain("never say a quest was approved in the window");
  });

  it("stores a checked summary from one call", async () => {
    const ask = jest.fn(async (_facts: DigestFacts, _note: string | null) => answer("ทีมทดสอบต้นแบบกับลูกค้า 5 คน — รู้ว่าปุ่มจองหายาก 🎉"));
    expect(await summarizeProject(project(), window, ask, MODEL)).toEqual({
      project_id: "p1",
      summary: "ทีมทดสอบต้นแบบกับลูกค้า 5 คน, รู้ว่าปุ่มจองหายาก",
      no_update: false,
      model: MODEL,
    });
    expect(ask).toHaveBeenCalledTimes(1);
    expect(ask.mock.calls[0][1]).toBeNull();
  });

  it("retries once with a stricter note, then keeps the good answer", async () => {
    const ask = jest
      .fn<Promise<{ no_update: boolean; summary: string } | null>, [DigestFacts, string | null]>()
      .mockResolvedValueOnce(answer("Mint ทดสอบต้นแบบกับลูกค้า"))
      .mockResolvedValueOnce(answer("ทีมทดสอบต้นแบบกับลูกค้า 5 คน"));
    const entry = await summarizeProject(project(), window, ask, MODEL);
    expect(entry.summary).toBe("ทีมทดสอบต้นแบบกับลูกค้า 5 คน");
    expect(ask).toHaveBeenCalledTimes(2);
    expect(ask.mock.calls[1][1]).toMatch(/named a person/);
  });

  it("stores no update when the retry fails the check too", async () => {
    const ask = jest.fn(async () => answer("ก".repeat(MAX_SUMMARY + 10)));
    const entry = await summarizeProject(project(), window, ask, MODEL);
    expect(entry).toEqual({ project_id: "p1", summary: null, no_update: true, model: MODEL });
    expect(ask).toHaveBeenCalledTimes(2);
  });

  it("stores no update on a refusal or an unusable answer, without a retry", async () => {
    const refused = jest.fn(async () => null);
    expect((await summarizeProject(project(), window, refused, MODEL)).no_update).toBe(true);
    expect(refused).toHaveBeenCalledTimes(1);
  });

  it("stores no update when the model says nothing is new", async () => {
    const ask = jest.fn(async () => answer("ignored text", true));
    expect(await summarizeProject(project(), window, ask, MODEL)).toEqual({ project_id: "p1", summary: null, no_update: true, model: MODEL });
  });

  it("never stores a summary that leaks a contact even if the model insists", async () => {
    const ask = jest.fn(async () => answer("ทีมรับสมัครผู้ทดสอบ ทักไลน์ line: shop123"));
    expect((await summarizeProject(project(), window, ask, MODEL)).summary).toBeNull();
  });
});

describe("generateDigest", () => {
  it("summarises every team, keeps going past a failed call, and counts", async () => {
    const i = inputs([
      rawProject(),
      rawProject({ project_id: "p2", slot: 4 }),
      rawProject({ project_id: "p3", slot: 5, approved: [], submitted: [], checkins: {} }),
    ]);
    let calls = 0;
    const ask: DescribeTeam = async () => {
      if (calls++ === 1) throw Object.assign(new Error("student text"), { code: "rate_limit" });
      return answer("ทีมส่งเควสต์ทดสอบต้นแบบ");
    };
    const { entries, stats, errors } = await generateDigest(i, ask, { model: MODEL, parallel: 1 });
    expect(entries.map((e) => [e.project_id, e.no_update])).toEqual([
      ["p1", false],
      ["p3", true],
    ]);
    expect(stats).toEqual({ kind: "day", teams: 3, summaries: 1, noUpdate: 1, calls: 2, failed: 1 });
    expect(errors).toEqual(["rate_limit"]);
  });
});

describe("runIslandDigest", () => {
  function fakeApi(enabled = true, projects: unknown[] = [rawProject()]) {
    const call = jest.fn(async (fn: string, ...args: unknown[]) => {
      if (fn === "shift_quest_digest_inputs") return { enabled, day: args[0], kind: args[1], from: args[0], to: args[0], projects: enabled ? projects : [] };
      if (fn === "shift_quest_digest_save") return (JSON.parse(args[2] as string) as unknown[]).length;
      return null;
    });
    return { call, api: { call, rows: jest.fn() } as unknown as QuestApi };
  }

  it("does nothing while the digest is off", async () => {
    const { api, call } = fakeApi(false);
    const ask = jest.fn();
    expect(await runIslandDigest({ api, day: DAY, describe: ask, model: MODEL })).toEqual({ status: "disabled", day: DAY });
    expect(call).toHaveBeenCalledTimes(1);
    expect(ask).not.toHaveBeenCalled();
  });

  it("stores nothing without a model to ask", async () => {
    const { api, call } = fakeApi(true);
    expect(await runIslandDigest({ api, day: DAY, describe: null })).toEqual({ status: "no_key", day: DAY });
    expect(call.mock.calls.map((c) => c[0])).toEqual(["shift_quest_digest_inputs"]);
  });

  it("saves the day's entries as JSON for shift_quest_digest_save", async () => {
    const { api, call } = fakeApi(true);
    const run = await runIslandDigest({ api, day: DAY, describe: async () => answer("ทีมส่งเควสต์ทดสอบต้นแบบ"), model: MODEL });
    expect(run).toEqual({
      status: "done",
      day: DAY,
      errors: [],
      runs: [{ kind: "day", teams: 1, summaries: 1, noUpdate: 0, calls: 1, failed: 0, saved: 1 }],
    });
    const save = call.mock.calls.find((c) => c[0] === "shift_quest_digest_save")!;
    expect(save.slice(1, 3)).toEqual([DAY, "day"]);
    expect(JSON.parse(save[3] as string)).toEqual([{ project_id: "p1", summary: "ทีมส่งเควสต์ทดสอบต้นแบบ", no_update: false, model: MODEL }]);
  });

  it("adds the weekly recap on Bangkok Sundays, stored before the day's so the bot posts the recap", async () => {
    const { api, call } = fakeApi(true);
    const run = await runIslandDigest({ api, day: SUNDAY, describe: async () => answer("ทีมส่งเควสต์ทดสอบต้นแบบ"), model: MODEL });
    expect(run.status === "done" && run.runs.map((r) => r.kind)).toEqual(["week", "day"]);
    expect(call.mock.calls.filter((c) => c[0] === "shift_quest_digest_inputs").map((c) => c[2])).toEqual(["week", "day"]);
    expect(call.mock.calls.filter((c) => c[0] === "shift_quest_digest_save").map((c) => c[2])).toEqual(["week", "day"]);
  });

  it("does not call save when there is nothing to store", async () => {
    const { api, call } = fakeApi(true, []);
    await runIslandDigest({ api, day: DAY, describe: async () => answer("x"), model: MODEL });
    expect(call.mock.calls.some((c) => c[0] === "shift_quest_digest_save")).toBe(false);
  });
});

describe("claude.ts", () => {
  const facts = () => buildFacts(project(), { kind: "day", from: DAY, to: DAY });
  const reply = (text: string, stop_reason = "end_turn") => ({ stop_reason, content: [{ type: "thinking", thinking: "" }, { type: "text", text }] });

  beforeEach(() => create.mockReset());

  it("asks Claude Haiku at low effort for the agreed JSON, with the facts in team_data", async () => {
    create.mockResolvedValue(reply(JSON.stringify({ no_update: false, summary: "ทีมทดสอบต้นแบบ" })));
    expect(await describeTeam(facts(), null)).toEqual({ no_update: false, summary: "ทีมทดสอบต้นแบบ" });
    const params = create.mock.calls[0][0];
    expect(DIGEST_MODEL).toBe("claude-haiku-5-5");
    expect(params.model).toBe(DIGEST_MODEL);
    expect(params.output_config.effort).toBe("low");
    expect(params.output_config.format.type).toBe("json_schema");
    expect(params.output_config.format.schema.required).toEqual(["no_update", "summary"]);
    expect(params.system).toBe(DIGEST_SYSTEM_PROMPT);
    expect(params.messages[0].content).toContain("<team_data>");
    expect(params.messages[0].content).not.toMatch(/Mint|081-234-5678/);
  });

  it("is null on a refusal, a cut-off answer or JSON of the wrong shape", async () => {
    create.mockResolvedValueOnce(reply("", "refusal"));
    expect(await describeTeam(facts(), null)).toBeNull();
    create.mockResolvedValueOnce(reply('{"no_update": false, "summ', "max_tokens"));
    expect(await describeTeam(facts(), null)).toBeNull();
    create.mockResolvedValueOnce(reply('{"summary": 3}'));
    expect(await describeTeam(facts(), null)).toBeNull();
    expect(parseAnswer("not json")).toBeNull();
  });

  it("turns API failures into a code, never the message", async () => {
    const A = Anthropic as unknown as Record<string, new (status?: number) => Error>;
    const cases: [Error, string][] = [
      [new A.AuthenticationError(401), "auth"],
      [new A.RateLimitError(429), "rate_limit"],
      [new A.APIConnectionError(), "network"],
      [new A.APIError(529), "overloaded"],
      [new A.APIError(500), "http_500"],
    ];
    for (const [error, code] of cases) {
      create.mockRejectedValueOnce(error);
      await expect(describeTeam(facts(), null)).rejects.toEqual(new DigestModelError(code));
    }
  });

  it("knows whether the key is set without throwing", () => {
    const env = (vars: Record<string, string>) => vars as unknown as NodeJS.ProcessEnv;
    expect(hasDigestKey(env({}))).toBe(false);
    expect(hasDigestKey(env({ ANTHROPIC_API_KEY: "  " }))).toBe(false);
    expect(hasDigestKey(env({ ANTHROPIC_API_KEY: "sk-test" }))).toBe(true);
  });
});
