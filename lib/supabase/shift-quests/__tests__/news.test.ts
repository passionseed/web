/** @jest-environment node */
import { QuestDbError, QuestError, type QuestApi } from "@/bot/src/quests/api";

import { newsFrom, newsOf } from "../news";

const ACTOR = "123456789012345678";
const call = jest.fn();
const api: QuestApi = { call, rows: jest.fn() } as unknown as QuestApi;

const RAW = {
  enabled: true,
  day: "2026-11-11",
  week_of: "2026-11-09",
  teams: [
    {
      slot: 5,
      name: "ร้านขนม",
      day: { summary: "ทีมทดสอบต้นแบบกับลูกค้า 5 คน", no_update: false, created_at: "2026-11-11T13:00:05Z", day: "2026-11-11" },
      week: null,
    },
    {
      slot: 2,
      name: " เกมฝึกภาษา ",
      day: { summary: null, no_update: true, created_at: "2026-11-11T13:00:06Z" },
      week: { summary: "สัปดาห์นี้ทีมผ่านเควสต์ที่ 2", no_update: false, created_at: "2026-11-08T13:00:00Z" },
    },
  ],
};

let errorLog: jest.SpyInstance;
beforeEach(() => {
  call.mockReset();
  errorLog = jest.spyOn(console, "error").mockImplementation(() => undefined);
});
afterEach(() => errorLog.mockRestore());

const logged = () => errorLog.mock.calls.flat().map(String).join("\n");

describe("newsFrom", () => {
  it("maps snake_case to IslandNews, by plot order, trimming names", () => {
    expect(newsFrom(RAW)).toEqual({
      enabled: true,
      day: "2026-11-11",
      weekOf: "2026-11-09",
      teams: [
        {
          slot: 2,
          name: "เกมฝึกภาษา",
          day: { summary: null, noUpdate: true, at: "2026-11-11T13:00:06Z", day: null },
          week: { summary: "สัปดาห์นี้ทีมผ่านเควสต์ที่ 2", noUpdate: false, at: "2026-11-08T13:00:00Z", day: null },
        },
        { slot: 5, name: "ร้านขนม", day: { summary: "ทีมทดสอบต้นแบบกับลูกค้า 5 คน", noUpdate: false, at: "2026-11-11T13:00:05Z", day: "2026-11-11" }, week: null },
      ],
    });
  });

  it("keeps the hidden list only when the database sent one (staff)", () => {
    expect(newsFrom(RAW)).not.toHaveProperty("hidden");
    expect(newsFrom({ ...RAW, hidden: [{ slot: 7, name: "ทีมเงียบ" }, { slot: "x" }, null] })?.hidden).toEqual([{ slot: 7, name: "ทีมเงียบ" }]);
  });

  it("drops malformed teams and treats a summary without text as no update", () => {
    const news = newsFrom({
      ...RAW,
      teams: [{ slot: 0, name: "x" }, { slot: 1, name: "" }, "junk", { slot: 3, name: "ทีม", day: { summary: "  ", no_update: false }, week: "bad" }],
    });
    expect(news?.teams).toEqual([{ slot: 3, name: "ทีม", day: { summary: null, noUpdate: true, at: "", day: null }, week: null }]);
  });

  it.each([[null], ["x"], [[]], [{}], [{ enabled: "yes" }]])("is null for a malformed answer (%p)", (raw) => {
    expect(newsFrom(raw)).toBeNull();
  });
});

describe("newsOf", () => {
  it("calls shift_quest_island_news with the actor", async () => {
    call.mockResolvedValue(RAW);
    expect((await newsOf(api, ACTOR))?.teams).toHaveLength(2);
    expect(call).toHaveBeenCalledWith("shift_quest_island_news", ACTOR);
    expect(errorLog).not.toHaveBeenCalled();
  });

  it("is null, quietly, while the digest is off", async () => {
    call.mockResolvedValue({ enabled: false, day: "2026-11-11", week_of: null, teams: [] });
    expect(await newsOf(api, ACTOR)).toBeNull();
    expect(errorLog).not.toHaveBeenCalled();
  });

  it("is null for malformed data and logs it each time", async () => {
    call.mockResolvedValue("nope");
    expect(await newsOf(api, ACTOR)).toBeNull();
    expect(await newsOf(api, ACTOR)).toBeNull();
    expect(errorLog.mock.calls.filter((c) => String(c[0]).includes("malformed"))).toHaveLength(2);
  });

  it.each([
    ["a refusal", new QuestError("not_eligible"), "sq:not_eligible"],
    ["a dropped connection", new QuestDbError("shift_quest_island_news", "08006"), "SQLSTATE 08006"],
    ["an unexpected error", new TypeError("student text in a message"), "TypeError"],
  ])("fails soft on %s and logs only a code", async (_label, error, code) => {
    call.mockRejectedValue(error);
    expect(await newsOf(api, ACTOR)).toBeNull();
    expect(logged()).toContain(`news read failed: ${code}`);
    expect(logged()).not.toContain("student text");
    expect(logged()).not.toContain(ACTOR);
  });

  it.each([["42883"], ["42501"]])("fails soft when the function is missing or not granted (%s) and logs it once per process", async (sqlstate) => {
    call.mockRejectedValue(new QuestDbError("shift_quest_island_news", sqlstate));
    expect(await newsOf(api, ACTOR)).toBeNull();
    expect(await newsOf(api, ACTOR)).toBeNull();
    expect(await newsOf(api, ACTOR)).toBeNull();
    expect(errorLog.mock.calls.filter((c) => String(c[0]).includes(sqlstate))).toHaveLength(1);
  });
});
