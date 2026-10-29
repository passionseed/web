/** @jest-environment node */

import type { SupabaseClient, User } from "@supabase/supabase-js";

import { joinShiftGuild, removeShiftCohortRole } from "@/lib/shift/discordGuild";
import { createAdminClient } from "@/utils/supabase/admin";
import type { ShiftApplicationRow } from "@/types/shift";

import { admitPaidStudent, completeShiftJoin, isJoinable, revokeShiftDiscord } from "../join";

jest.mock("@/utils/supabase/admin", () => ({ createAdminClient: jest.fn() }));
jest.mock("@/lib/shift/discordGuild", () => ({
  joinShiftGuild: jest.fn(),
  removeShiftCohortRole: jest.fn(),
}));

const TOKEN = "abcdefghijklmnopqrstuvwx";
const USER_ID = "test-user";
const DISCORD_ID = "test-discord";

function application(overrides: Partial<ShiftApplicationRow> = {}): ShiftApplicationRow {
  return {
    id: "test-application",
    cohort: "SHIFT[3]",
    full_name: "Test Applicant",
    nickname: "Test",
    grade: "m5",
    target_track: null,
    problem: "A problem long enough to pass the schema",
    availability: "all_days",
    ig_handle: "test_ig",
    discord_handle: null,
    parent_contact: "test parent contact",
    consent: true,
    birth_date: null,
    consent_notice_version: null,
    parent_email: null,
    parent_token_hash: null,
    parent_email_sent_at: null,
    parent_name: null,
    parent_relationship: null,
    parent_consented_at: null,
    parent_declined_at: null,
    parent_withdrawn_at: null,
    parent_consent_ip: null,
    parent_consent_user_agent: null,
    parent_ai_consented_at: null,
    parent_ai_notice_version: null,
    source: null,
    found_via: "instagram",
    status: "new",
    paid_at: null,
    admin_note: null,
    join_token: TOKEN,
    user_id: null,
    discord_user_id: null,
    discord_username: null,
    linked_at: null,
    discord_joined_at: null,
    discord_error: null,
    created_at: "2026-10-27T00:00:00.000Z",
    updated_at: "2026-10-27T00:00:00.000Z",
    ...overrides,
  };
}

type Call = { table: string; method: string; args: unknown[] };

/** Every query resolves to `rows[table]`; calls are recorded per table. */
function fakeSupabase(rows: Record<string, unknown> = {}) {
  const calls: Call[] = [];
  const from = jest.fn((table: string) => {
    const builder: object = new Proxy(
      {},
      {
        get(_target, prop) {
          if (prop === "then") {
            return (resolve: (value: unknown) => void) => resolve({ data: rows[table] ?? null, error: null });
          }
          return (...args: unknown[]) => {
            calls.push({ table, method: String(prop), args });
            return builder;
          };
        },
      },
    );
    return builder;
  });
  const client = { from } as unknown as SupabaseClient;
  const tables = () => [...new Set(calls.map((c) => c.table))];
  const writes = (table: string) =>
    calls.filter((c) => c.table === table && ["insert", "update", "upsert"].includes(c.method));
  return { client, calls, tables, writes };
}

const CAMP = { id: "camp", name: "SHIFT[3]", classroom_id: "class", community_id: "community", map_id: "map" };

// SHIFT[3] takes applications until 7 Nov 2026 and ends 15 Nov 2026. Only
// Date is faked, so promises and fetch mocks run normally.
beforeAll(() => {
  jest.useFakeTimers({
    now: new Date("2026-10-27T05:00:00Z"),
    doNotFake: [
      "nextTick", "setImmediate", "clearImmediate", "setTimeout", "clearTimeout",
      "setInterval", "clearInterval", "queueMicrotask", "hrtime", "performance",
    ],
  });
});

afterAll(() => {
  jest.useRealTimers();
});

describe("isJoinable", () => {
  it("opens the link as soon as someone applies, before any payment", () => {
    expect(isJoinable(application())).toBe(true);
    expect(isJoinable(application({ paid_at: "2026-10-27T01:00:00.000Z" }))).toBe(true);
  });

  it("closes it for missing and declined applications", () => {
    expect(isJoinable(null)).toBe(false);
    expect(isJoinable(application({ status: "declined", paid_at: "2026-10-27T01:00:00.000Z" }))).toBe(false);
  });

  it("closes unpaid links once their round is over, so old payment messages grant nothing", () => {
    expect(isJoinable(application({ cohort: "SHIFT[2]" }))).toBe(false);
    expect(isJoinable(application({ cohort: "SHIFT[3]" }), "2026-11-16")).toBe(false);
    expect(isJoinable(application({ cohort: "SHIFT[unknown]" }))).toBe(false);
  });

  it("keeps paid links working after the round, for students re-linking later", () => {
    expect(isJoinable(application({ cohort: "SHIFT[2]", paid_at: "2026-10-10T01:00:00.000Z" }))).toBe(true);
  });
});

describe("completeShiftJoin", () => {
  const user = {
    id: USER_ID,
    identities: [{ provider: "discord", id: DISCORD_ID, identity_data: { user_name: "test_discord" } }],
  } as unknown as User;
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue(new Response(JSON.stringify({ id: DISCORD_ID }), { status: 200 }));
    (joinShiftGuild as jest.Mock).mockResolvedValue({ ok: true, state: "joined" });
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  function linkedAs(overrides: Partial<ShiftApplicationRow>) {
    const db = fakeSupabase({
      shift_applications: application({ user_id: USER_ID, discord_user_id: DISCORD_ID, ...overrides }),
      shift_camp_cohorts: [CAMP],
    });
    (createAdminClient as jest.Mock).mockReturnValue(db.client);
    return db;
  }

  it("gives an unpaid applicant their account and round role, but not the tracker or camp", async () => {
    const db = linkedAs({});
    expect(await completeShiftJoin({ token: TOKEN, user, providerToken: "test-oauth" })).toBeNull();

    const link = db.writes("shift_applications")[0];
    expect(link.args[0]).toEqual(expect.objectContaining({ user_id: USER_ID, discord_user_id: DISCORD_ID }));
    expect(joinShiftGuild).toHaveBeenCalledWith(
      expect.objectContaining({ discordUserId: DISCORD_ID, cohortName: "SHIFT[3]", accessToken: "test-oauth" }),
    );
    expect(db.tables()).not.toContain("shift_students");
    expect(db.tables()).not.toContain("shift_camp_enrollments");
  });

  it("also admits a student who paid before linking", async () => {
    const db = linkedAs({ paid_at: "2026-10-27T01:00:00.000Z" });
    expect(await completeShiftJoin({ token: TOKEN, user, providerToken: "test-oauth" })).toBeNull();
    expect(db.writes("shift_students")).toHaveLength(1);
    expect(db.writes("shift_camp_enrollments")).toHaveLength(1);
    expect(joinShiftGuild).toHaveBeenCalled();
  });

  it("refuses a declined application without touching Discord", async () => {
    linkedAs({ status: "declined" });
    expect(await completeShiftJoin({ token: TOKEN, user, providerToken: "test-oauth" })).toBe("invalid");
    expect(joinShiftGuild).not.toHaveBeenCalled();
  });
});

describe("admitPaidStudent", () => {
  it.each([
    ["unpaid", { user_id: USER_ID }],
    ["not linked", { paid_at: "2026-10-27T01:00:00.000Z" }],
    ["declined", { user_id: USER_ID, paid_at: "2026-10-27T01:00:00.000Z", status: "declined" as const }],
  ])("does nothing for a %s application", async (_label, overrides) => {
    const db = fakeSupabase({ shift_camp_cohorts: [CAMP] });
    await admitPaidStudent(application(overrides), db.client);
    expect(db.calls).toHaveLength(0);
  });

  it("adds a linked, paid student to the tracker and their round's camp", async () => {
    const db = fakeSupabase({ shift_camp_cohorts: [CAMP] });
    await admitPaidStudent(application({ user_id: USER_ID, paid_at: "2026-10-27T01:00:00.000Z" }), db.client);
    expect(db.writes("shift_students")[0].args[0]).toEqual(
      expect.objectContaining({ application_id: "test-application", user_id: USER_ID }),
    );
    for (const table of ["shift_camp_enrollments", "classroom_memberships", "user_communities", "user_map_enrollments"]) {
      expect(db.writes(table)).toHaveLength(1);
    }
  });
});

describe("revokeShiftDiscord", () => {
  it("skips applicants who never linked Discord", async () => {
    const db = fakeSupabase();
    expect(await revokeShiftDiscord(application(), db.client)).toBeNull();
    expect(removeShiftCohortRole).not.toHaveBeenCalled();
  });

  it("removes the round role and clears the in-server mark", async () => {
    (removeShiftCohortRole as jest.Mock).mockResolvedValue({ ok: true, state: "removed" });
    const db = fakeSupabase();
    const app = application({ discord_user_id: DISCORD_ID, discord_joined_at: "2026-10-27T01:00:00.000Z" });
    expect(await revokeShiftDiscord(app, db.client)).toEqual({ ok: true, state: "removed" });
    expect(removeShiftCohortRole).toHaveBeenCalledWith({ discordUserId: DISCORD_ID, cohortName: "SHIFT[3]" });
    expect(db.writes("shift_applications")[0].args[0]).toEqual({ discord_joined_at: null, discord_error: null });
  });

  it("keeps the role when the same Discord account holds another active application for the round", async () => {
    const db = fakeSupabase({ shift_applications: { id: "test-other-application" } });
    const app = application({ discord_user_id: DISCORD_ID, discord_joined_at: "2026-10-27T01:00:00.000Z" });
    expect(await revokeShiftDiscord(app, db.client)).toEqual({ ok: true, state: "nothing_to_remove" });
    expect(removeShiftCohortRole).not.toHaveBeenCalled();
    const lookup = db.calls.filter((c) => c.table === "shift_applications").map((c) => [c.method, ...c.args]);
    expect(lookup).toEqual(expect.arrayContaining([
      ["eq", "discord_user_id", DISCORD_ID],
      ["neq", "status", "declined"],
      ["neq", "id", "test-application"],
    ]));
    expect(db.writes("shift_applications")[0].args[0]).toEqual({ discord_joined_at: null, discord_error: null });
  });

  it("keeps the in-server mark when Discord refuses, so admins see it", async () => {
    const log = jest.spyOn(console, "error").mockImplementation(() => {});
    (removeShiftCohortRole as jest.Mock).mockResolvedValue({ ok: false, state: "error", message: "Discord 403" });
    const db = fakeSupabase();
    const result = await revokeShiftDiscord(application({ discord_user_id: DISCORD_ID }), db.client);
    expect(result).toEqual(expect.objectContaining({ ok: false }));
    expect(db.writes("shift_applications")).toHaveLength(0);
    log.mockRestore();
  });
});
