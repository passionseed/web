/**
 * @jest-environment node
 */
import fs from "node:fs";

import type { Client } from "discord.js";

import { QuestDbError, QuestError, type QuestApi } from "../api";
import { AWAY_SCHEMA, awayLineShown, awayReady, awaySettingFrom, enqueueAway, readAwaySetting } from "../away";
import { awayStep, startOutbox } from "../outbox";

/**
 * The come-back DM's bot side (schema 23): the minute block queues the DMs
 * only on a database that has them, reading the version again until it does,
 * and never lets a failure hold back the deliveries. /settings reads the
 * student's choice only where there is one to show.
 */

type Answer = unknown | ((...args: unknown[]) => unknown);

/** A quest api answering by function name: a value, an Error to throw, or a function of the arguments. */
function fakeApi(answers: Record<string, Answer> = {}): QuestApi & { call: jest.Mock; rows: jest.Mock } {
  const call = jest.fn(async (fn: string, ...args: unknown[]) => {
    const answer = answers[fn];
    if (answer instanceof Error) throw answer;
    return typeof answer === "function" ? (answer as (...a: unknown[]) => unknown)(...args) : (answer ?? null);
  });
  const rows = jest.fn(async () => []);
  return { call, rows } as unknown as QuestApi & { call: jest.Mock; rows: jest.Mock };
}

const names = (api: { call: jest.Mock }) => api.call.mock.calls.map((c) => c[0]);

const STATE = { enabled: true, days: 7, dm: null, ask_consent: true, ask_return: null };

describe("the schema gate", () => {
  it("is schema 23", () => {
    expect(AWAY_SCHEMA).toBe(23);
  });

  it("reads the version again on every check until the database has it, then remembers it", async () => {
    let version = 22;
    const api = fakeApi({ shift_quest_schema_version: () => version });
    expect(await awayReady(api)).toBe(false);
    expect(await awayReady(api)).toBe(false);
    expect(names(api)).toEqual(["shift_quest_schema_version", "shift_quest_schema_version"]);
    version = 23;
    expect(await awayReady(api)).toBe(true);
    expect(await awayReady(api)).toBe(true);
    // Seen once at 23: no more reads.
    expect(api.call).toHaveBeenCalledTimes(3);
  });

  it("treats a missing version function, a failed read or an odd answer as not yet, never an error", async () => {
    for (const answer of [new QuestDbError("shift_quest_schema_version", "42883"), new QuestDbError("shift_quest_schema_version", "08006"), null, "x"]) {
      await expect(awayReady(fakeApi({ shift_quest_schema_version: answer }))).resolves.toBe(false);
    }
    await expect(awayReady(fakeApi({ shift_quest_schema_version: 24 }))).resolves.toBe(true);
  });
});

describe("enqueueAway", () => {
  it("below schema 23 reads only the version and queues nothing", async () => {
    const api = fakeApi({ shift_quest_schema_version: 22 });
    await expect(enqueueAway(api)).resolves.toBeNull();
    expect(names(api)).toEqual(["shift_quest_schema_version"]);
  });

  it("at schema 23 calls shift_quest_enqueue_away with no argument (the database's now) and returns the count", async () => {
    const api = fakeApi({ shift_quest_schema_version: 23, shift_quest_enqueue_away: 2 });
    await expect(enqueueAway(api)).resolves.toBe(2);
    expect(api.call.mock.calls).toEqual([["shift_quest_schema_version"], ["shift_quest_enqueue_away"]]);
    await expect(enqueueAway(api)).resolves.toBe(2);
    expect(names(api)).toEqual(["shift_quest_schema_version", "shift_quest_enqueue_away", "shift_quest_enqueue_away"]);
  });

  it("lets a failed enqueue throw, for the loop to catch", async () => {
    const api = fakeApi({ shift_quest_schema_version: 23, shift_quest_enqueue_away: new QuestDbError("shift_quest_enqueue_away", "57014") });
    await expect(enqueueAway(api)).rejects.toBeInstanceOf(QuestDbError);
  });
});

describe("awayStep: the minute block's come-back step", () => {
  it("never throws, and logs a failure when its reason changes, with the code only", async () => {
    let answer: unknown = new QuestDbError("shift_quest_enqueue_away", "08006");
    const api = fakeApi({ shift_quest_schema_version: 23, shift_quest_enqueue_away: () => {
      if (answer instanceof Error) throw answer;
      return answer;
    } });
    const log = jest.fn();
    const step = awayStep(api, log);
    await expect(step()).resolves.toBeUndefined();
    await step();
    expect(log.mock.calls).toEqual([["[shift-quests] come-back DMs not queued this minute: SQLSTATE 08006"]]);
    answer = new QuestError("not_found");
    await step();
    expect(log).toHaveBeenLastCalledWith("[shift-quests] come-back DMs not queued this minute: sq:not_found");
    // Working again, then the first failure is news again.
    answer = 0;
    await step();
    answer = new QuestError("not_found");
    await step();
    expect(log).toHaveBeenCalledTimes(3);
  });

  it("says nothing below schema 23", async () => {
    const log = jest.fn();
    await awayStep(fakeApi({ shift_quest_schema_version: 22 }), log)();
    await awayStep(fakeApi({ shift_quest_schema_version: new QuestDbError("shift_quest_schema_version", "42883") }), log)();
    expect(log).not.toHaveBeenCalled();
  });
});

describe("the delivery loop's minute block", () => {
  const MINUTE = ["shift_quest_enqueue_reminders", "shift_quest_enqueue_island_post", "shift_quest_outbox_unblock"];
  let health: jest.SpyInstance;

  beforeEach(() => {
    jest.useFakeTimers();
    // The loop touches Docker's health file after each claim: not here.
    health = jest.spyOn(fs, "writeFileSync").mockImplementation(() => undefined);
  });
  afterEach(() => {
    jest.useRealTimers();
    health.mockRestore();
  });

  /** One tick of the loop (the first is a minute block), then a clean stop. */
  async function oneTick(api: QuestApi): Promise<void> {
    const loop = startOutbox({} as Client, api, () => true);
    jest.advanceTimersByTime(10_000);
    await loop.stop();
  }

  it("below schema 23 only reads the version again, and still claims", async () => {
    const api = fakeApi({ shift_quest_schema_version: 22 });
    await oneTick(api);
    expect(names(api)).toEqual([...MINUTE, "shift_quest_schema_version"]);
    expect(names(api)).not.toContain("shift_quest_enqueue_away");
    expect(api.rows).toHaveBeenCalledWith("shift_quest_outbox_claim", 10);
  });

  it("at schema 23 queues the come-back DMs each minute, before the claim", async () => {
    const api = fakeApi({ shift_quest_schema_version: 23, shift_quest_enqueue_away: 0 });
    await oneTick(api);
    expect(names(api)).toEqual([...MINUTE, "shift_quest_schema_version", "shift_quest_enqueue_away"]);
    expect(api.rows).toHaveBeenCalledWith("shift_quest_outbox_claim", 10);
  });

  it("re-reads the version once a minute, not every tick, and starts queueing once the migration is applied", async () => {
    let version = 22;
    const api = fakeApi({ shift_quest_schema_version: () => version, shift_quest_enqueue_away: 0 });
    const loop = startOutbox({} as Client, api, () => true);
    const count = (fn: string) => names(api).filter((n) => n === fn).length;
    try {
      await jest.advanceTimersByTimeAsync(10_000);
      expect(count("shift_quest_schema_version")).toBe(1);
      // Five more ticks inside the same minute: claims only.
      await jest.advanceTimersByTimeAsync(50_000);
      expect(count("shift_quest_schema_version")).toBe(1);
      expect(api.rows).toHaveBeenCalledTimes(6);
      // The migration lands; the next minute block sees it with no restart.
      version = 23;
      await jest.advanceTimersByTimeAsync(10_000);
      expect(count("shift_quest_schema_version")).toBe(2);
      expect(count("shift_quest_enqueue_away")).toBe(1);
      // From then on: the enqueue each minute, no version read.
      await jest.advanceTimersByTimeAsync(60_000);
      expect(count("shift_quest_schema_version")).toBe(2);
      expect(count("shift_quest_enqueue_away")).toBe(2);
    } finally {
      await loop.stop();
    }
  });

  it("still claims and delivers when the come-back enqueue fails", async () => {
    const error = jest.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      const api = fakeApi({ shift_quest_schema_version: 23, shift_quest_enqueue_away: new QuestDbError("shift_quest_enqueue_away", "08006") });
      await oneTick(api);
      expect(names(api)).toContain("shift_quest_enqueue_away");
      expect(api.rows).toHaveBeenCalledWith("shift_quest_outbox_claim", 10);
      expect(error).toHaveBeenCalledWith("[shift-quests] come-back DMs not queued this minute: SQLSTATE 08006");
      expect(error).not.toHaveBeenCalledWith(expect.stringContaining("outbox tick failed"), expect.anything());
    } finally {
      error.mockRestore();
    }
  });
});

describe("awaySettingFrom", () => {
  it("keeps the switch, the stretch length and the choice", () => {
    expect(awaySettingFrom(STATE)).toEqual({ enabled: true, days: 7, dm: null });
    expect(awaySettingFrom({ ...STATE, dm: true, days: 21 })).toEqual({ enabled: true, days: 21, dm: true });
    expect(awaySettingFrom({ ...STATE, enabled: false, dm: false, days: 3 })).toEqual({ enabled: false, days: 3, dm: false });
  });

  it("reads anything odd as off, unknown or never asked", () => {
    expect(awaySettingFrom(null)).toBeNull();
    expect(awaySettingFrom("on")).toBeNull();
    expect(awaySettingFrom({ enabled: "true", days: 2, dm: "yes" })).toEqual({ enabled: false, days: null, dm: null });
    expect(awaySettingFrom({ enabled: true, days: 7.5 })).toEqual({ enabled: true, days: null, dm: null });
    expect(awaySettingFrom({ enabled: true, days: 22 })).toEqual({ enabled: true, days: null, dm: null });
  });
});

describe("readAwaySetting: the /settings line's facts", () => {
  it("keeps a student's yes reachable while switched off, so it can always be turned off", async () => {
    const off = fakeApi({ shift_quest_schema_version: 23, shift_quest_away_state: { ...STATE, enabled: false, dm: true } });
    await expect(readAwaySetting(off, "1", [])).resolves.toEqual({ enabled: false, days: 7, dm: true });
    expect(awayLineShown({ enabled: false, days: 7, dm: true })).toBe(true);
    expect(awayLineShown({ enabled: false, days: 7, dm: false })).toBe(false);
    expect(awayLineShown({ enabled: false, days: 7, dm: null })).toBe(false);
    expect(awayLineShown({ enabled: true, days: 7, dm: null })).toBe(true);
    expect(awayLineShown(null)).toBe(false);
  });

  it("reads the student's state at schema 23 while the switch is on", async () => {
    const api = fakeApi({ shift_quest_schema_version: 23, shift_quest_away_state: { ...STATE, dm: true } });
    await expect(readAwaySetting(api, "1111111111", [])).resolves.toEqual({ enabled: true, days: 7, dm: true });
    expect(api.call.mock.calls).toEqual([["shift_quest_schema_version"], ["shift_quest_away_state", "1111111111"]]);
  });

  it("is null for staff without a database call", async () => {
    for (const roles of [["admin"], ["reviewer"], ["fulfillment"]]) {
      const api = fakeApi({ shift_quest_schema_version: 23, shift_quest_away_state: STATE });
      await expect(readAwaySetting(api, "1111111111", roles)).resolves.toBeNull();
      expect(api.call).not.toHaveBeenCalled();
    }
  });

  it("is null below schema 23 (no state read), while switched off without a yes, and when the read fails", async () => {
    const older = fakeApi({ shift_quest_schema_version: 22, shift_quest_away_state: STATE });
    await expect(readAwaySetting(older, "1", [])).resolves.toBeNull();
    expect(names(older)).toEqual(["shift_quest_schema_version"]);

    for (const dm of [false, null]) {
      const off = fakeApi({ shift_quest_schema_version: 23, shift_quest_away_state: { ...STATE, enabled: false, dm } });
      await expect(readAwaySetting(off, "1", [])).resolves.toBeNull();
    }

    for (const failure of [new QuestError("not_started"), new QuestDbError("shift_quest_away_state", "08006")]) {
      const api = fakeApi({ shift_quest_schema_version: 23, shift_quest_away_state: failure });
      await expect(readAwaySetting(api, "1", [])).resolves.toBeNull();
    }
  });
});
