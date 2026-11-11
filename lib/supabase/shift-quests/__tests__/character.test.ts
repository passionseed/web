/** @jest-environment node */
import { QuestDbError, QuestError, type QuestApi } from "@/bot/src/quests/api";

import { characterOf, toCharacter } from "../character";

const ACTOR = "123456789012345678";

const ROW = {
  stage: 4,
  main: { team: 4, mine: 3 },
  side: { team: 2, mine: 1 },
  community: { milestones: 1, mine: 2, thanks: 6 },
  checkins: { days_active: 15, this_week: 4, run: 5 },
  coins: { live: true, shop_live: true, balance: 2300, reserved: 300 },
};

function api(answer: unknown): { api: QuestApi; call: jest.Mock } {
  const call = jest.fn(async () => {
    if (answer instanceof Error) throw answer;
    return answer;
  });
  return { api: { call, rows: jest.fn() } as unknown as QuestApi, call };
}

const logged = () => (console.error as jest.Mock).mock.calls.flat().map(String);

beforeEach(() => {
  jest.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => jest.restoreAllMocks());

describe("toCharacter", () => {
  it("maps the database's snake_case counts to the sheet's numbers", () => {
    expect(toCharacter(ROW)).toEqual({
      stage: 4,
      main: { team: 4, mine: 3 },
      side: { team: 2, mine: 1 },
      community: { milestones: 1, mine: 2, thanks: 6 },
      checkins: { daysActive: 15, thisWeek: 4, run: 5 },
      coins: { live: true, shopLive: true, balance: 2300, reserved: 300 },
    });
  });

  it("clamps every count to what the sheet can show, and keeps a negative balance as the ledger has it", () => {
    const stats = toCharacter({
      stage: 12,
      main: { team: 9, mine: -2 },
      side: { team: "3", mine: "x" },
      community: { milestones: 5, mine: 1.7, thanks: null },
      checkins: { days_active: Infinity, this_week: 10, run: -1 },
      coins: { live: "yes", shop_live: 1, balance: -50, reserved: "20" },
    });
    expect(stats).toEqual({
      stage: 7,
      main: { team: 7, mine: 0 },
      side: { team: 3, mine: 0 },
      community: { milestones: 2, mine: 1, thanks: 0 },
      checkins: { daysActive: 0, thisWeek: 7, run: 0 },
      // Only a real true switches coins on.
      coins: { live: false, shopLive: false, balance: -50, reserved: 20 },
    });
  });

  it("reads missing groups as zero", () => {
    expect(toCharacter({ stage: 1 })).toEqual({
      stage: 1,
      main: { team: 0, mine: 0 },
      side: { team: 0, mine: 0 },
      community: { milestones: 0, mine: 0, thanks: 0 },
      checkins: { daysActive: 0, thisWeek: 0, run: 0 },
      coins: { live: false, shopLive: false, balance: 0, reserved: 0 },
    });
  });

  it.each([null, undefined, "text", 3, [ROW]])("is null for %p", (raw) => {
    expect(toCharacter(raw)).toBeNull();
  });

  it("never carries anything but counts, whatever the database adds", () => {
    const stats = toCharacter({ ...ROW, member_id: "m1", name: "Mint", discord_user_id: ACTOR, main: { ...ROW.main, names: ["Ploy"] } });
    const json = JSON.stringify(stats);
    for (const secret of ["m1", "Mint", ACTOR, "Ploy"]) expect(json).not.toContain(secret);
  });
});

describe("characterOf", () => {
  it("reads shift_quest_character for the actor", async () => {
    const { api: quests, call } = api(ROW);
    await expect(characterOf(quests, ACTOR)).resolves.toMatchObject({ stage: 4, coins: { balance: 2300 } });
    expect(call).toHaveBeenCalledWith("shift_quest_character", ACTOR);
  });

  it.each([
    ["a refusal", new QuestError("not_started"), "sq:not_started"],
    ["a database failure", new QuestDbError("shift_quest_character", "57014"), "SQLSTATE 57014"],
    ["an unexpected error", new TypeError("student text in a message"), "TypeError"],
    ["malformed data", "not an object", "malformed"],
  ])("is null on %s and logs only a code", async (_label, answer, code) => {
    await expect(characterOf(api(answer).api, ACTOR)).resolves.toBeNull();
    expect(logged().join("\n")).toContain(`character read failed: ${code}`);
    expect(logged().join("\n")).not.toContain("student text");
    expect(logged().join("\n")).not.toContain(ACTOR);
  });

  it.each(["42883", "42501"])("logs a missing function or grant (%s) once per process", async (sqlstate) => {
    // A fresh module (and its own error classes), so earlier tests have logged nothing yet.
    let isolated: typeof import("../character") | undefined;
    let errors: typeof import("@/bot/src/quests/api") | undefined;
    jest.isolateModules(() => {
      isolated = jest.requireActual<typeof import("../character")>("../character");
      errors = jest.requireActual<typeof import("@/bot/src/quests/api")>("@/bot/src/quests/api");
    });
    const failing = api(new errors!.QuestDbError("shift_quest_character", sqlstate)).api;
    await expect(isolated!.characterOf(failing, ACTOR)).resolves.toBeNull();
    await expect(isolated!.characterOf(failing, ACTOR)).resolves.toBeNull();
    await expect(isolated!.characterOf(failing, ACTOR)).resolves.toBeNull();
    expect(logged().filter((line) => line.includes(`SQLSTATE ${sqlstate}`))).toHaveLength(1);
  });

  it("logs other database failures every time", async () => {
    const failing = api(new QuestDbError("shift_quest_character", "08006")).api;
    await characterOf(failing, ACTOR);
    await characterOf(failing, ACTOR);
    expect(logged().filter((line) => line.includes("SQLSTATE 08006"))).toHaveLength(2);
  });
});
