/** @jest-environment node */
import { QuestDbError, QuestError, type QuestApi } from "@/bot/src/quests/api";

import { visitorsOf } from "../visitors";

const ACTOR = "123456789012345678";

function api(answers: Record<string, unknown>): { api: QuestApi; call: jest.Mock } {
  const call = jest.fn(async (fn: string) => {
    const value = answers[fn];
    if (value instanceof Error) throw value;
    return value;
  });
  return { api: { call, rows: jest.fn() } as unknown as QuestApi, call };
}

beforeEach(() => {
  jest.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => jest.restoreAllMocks());

describe("visitorsOf", () => {
  it("reads two integers for the actor from schema 17", async () => {
    const { api: a, call } = api({ shift_quest_schema_version: 17, shift_quest_island_visitors: { count: 4, team: 1 } });
    expect(await visitorsOf(a, ACTOR)).toEqual({ count: 4, team: 1 });
    expect(call).toHaveBeenCalledWith("shift_quest_island_visitors", ACTOR);
  });

  it("never calls before schema 17", async () => {
    const { api: a, call } = api({ shift_quest_schema_version: 16 });
    expect(await visitorsOf(a, ACTOR)).toBeNull();
    expect(call).not.toHaveBeenCalledWith("shift_quest_island_visitors", ACTOR);
  });

  it("fails soft, logging a code once and never a message or the actor", async () => {
    const errors = [new QuestDbError("shift_quest_island_visitors", "42501"), new QuestError("not_started"), new Error(ACTOR)];
    for (const error of errors) {
      const { api: a } = api({ shift_quest_schema_version: 17, shift_quest_island_visitors: error });
      expect(await visitorsOf(a, ACTOR)).toBeNull();
    }
    const logged = (console.error as jest.Mock).mock.calls.map((c) => String(c[0]));
    expect(logged.length).toBeLessThanOrEqual(1);
    for (const line of logged) {
      expect(line).toMatch(/^\[shift-island\] visitors read failed: /);
      expect(line).not.toContain(ACTOR);
    }
  });
});
