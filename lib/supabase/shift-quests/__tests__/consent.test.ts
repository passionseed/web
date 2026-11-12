/** @jest-environment node */
import { QuestDbError, QuestError, type QuestApi } from "@/bot/src/quests/api";

const maybeSingle = jest.fn();
interface Query {
  select: jest.Mock<Query, unknown[]>;
  eq: jest.Mock<Query, unknown[]>;
  order: jest.Mock<Query, unknown[]>;
  limit: jest.Mock<Query, unknown[]>;
  maybeSingle: () => unknown;
}
const query: Query = {
  select: jest.fn(() => query),
  eq: jest.fn(() => query),
  order: jest.fn(() => query),
  limit: jest.fn(() => query),
  maybeSingle: () => maybeSingle(),
};
const createAdminClient = jest.fn(() => ({ from: () => query }));
jest.mock("@/utils/supabase/admin", () => ({ createAdminClient: () => createAdminClient() }));

import { consentOf, isParentLinkToken, needsShiftImport, parseConsent, parseParentView, readConsent } from "../consent";

const ACTOR = "123456789012345678";
const USER = "0b7f4a52-5c1e-4c9b-9f27-6f0f3c1d2e3a";
const VIEWER = { actor: ACTOR, userId: USER };

const raw = (over: Record<string, unknown> = {}) => ({
  required: true,
  state: "none",
  basis: null,
  ai: false,
  ok: false,
  link_expires_at: null,
  adult_age: 20,
  ...over,
});

const AGREED_APP = {
  birth_date: "2010-03-01",
  consent_notice_version: "2026-11-08",
  parent_consented_at: "2026-11-02T03:00:00Z",
  parent_declined_at: null,
  parent_withdrawn_at: null,
  parent_ai_consented_at: null,
  created_at: "2026-11-01T02:00:00Z",
};

const call = jest.fn();
const api = { call, rows: jest.fn() } as unknown as QuestApi;
let errorLog: jest.SpyInstance;

beforeEach(() => {
  call.mockReset();
  maybeSingle.mockReset().mockResolvedValue({ data: null, error: null });
  createAdminClient.mockReset().mockImplementation(() => ({ from: () => query }));
  errorLog = jest.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => errorLog.mockRestore());

const logged = () => errorLog.mock.calls.flat().map(String).join("\n");

describe("parseConsent", () => {
  it("maps the database shape", () => {
    expect(parseConsent(raw({ state: "waiting", link_expires_at: "2026-11-25T05:00:00Z", adult_age: 18 }))).toEqual({
      required: true,
      state: "waiting",
      basis: null,
      ok: false,
      ai: false,
      linkExpiresAt: "2026-11-25T05:00:00Z",
      adultAge: 18,
      parentSaidNo: false,
    });
  });

  it("fails safe: unclear means required and not ok, ai only with ok", () => {
    expect(parseConsent(raw({ required: "yes", ok: "true", ai: true }))).toMatchObject({ required: true, ok: false, ai: false });
    expect(parseConsent(raw({ state: "granted", basis: "parent", ok: true, ai: true }))).toMatchObject({ ok: true, ai: true });
    // The kill switch never turns AI news on: only the database's own ai answer does.
    expect(parseConsent(raw({ required: false }))).toMatchObject({ ok: true, ai: false });
    expect(parseConsent(raw({ state: "granted", basis: "shift_parent", ok: true, ai: false, parent_said_no: true }))).toMatchObject({
      ai: false,
      parentSaidNo: true,
    });
  });

  it("keeps the link date only while waiting, and a sane adult age", () => {
    expect(parseConsent(raw({ state: "declined", link_expires_at: "2026-11-25T05:00:00Z" }))?.linkExpiresAt).toBeNull();
    expect(parseConsent(raw({ adult_age: 99 }))?.adultAge).toBe(20);
    expect(parseConsent(raw({ basis: "school" }))?.basis).toBeNull();
  });

  it.each([[null], [[]], ["granted"], [{ state: "maybe" }], [{}]])("is null for %p", (value) => {
    expect(parseConsent(value)).toBeNull();
  });
});

describe("needsShiftImport", () => {
  it("re-checks SHIFT unless the island itself already granted", () => {
    const base = parseConsent(raw())!;
    expect(needsShiftImport(base)).toBe(true);
    expect(needsShiftImport({ ...base, state: "granted", basis: "parent", ok: true })).toBe(false);
    expect(needsShiftImport({ ...base, state: "granted", basis: "adult", ok: true })).toBe(false);
    expect(needsShiftImport({ ...base, state: "granted", basis: "shift_parent", ok: true })).toBe(true);
    expect(needsShiftImport({ ...base, state: "granted", basis: "shift_adult", ok: true })).toBe(true);
  });

  it("re-checks a waiting link or an imported withdrawal, never an island decline or withdrawal", () => {
    const base = parseConsent(raw())!;
    expect(needsShiftImport({ ...base, state: "waiting" })).toBe(true);
    expect(needsShiftImport({ ...base, state: "withdrawn", basis: "shift_parent" })).toBe(true);
    expect(needsShiftImport({ ...base, state: "declined" })).toBe(false);
    expect(needsShiftImport({ ...base, state: "withdrawn", basis: "parent" })).toBe(false);
  });
});

describe("consentOf", () => {
  it("reads shift_quest_consent_get with the actor and skips SHIFT when the island granted it", async () => {
    call.mockResolvedValue(raw({ state: "granted", basis: "parent", ok: true, ai: true }));
    expect(await consentOf(api, VIEWER)).toMatchObject({ state: "granted", basis: "parent", ok: true });
    expect(call).toHaveBeenCalledTimes(1);
    expect(call).toHaveBeenCalledWith("shift_quest_consent_get", ACTOR);
    expect(createAdminClient).not.toHaveBeenCalled();
  });

  it("imports a SHIFT parent's agreement and returns the fresh state", async () => {
    maybeSingle.mockResolvedValue({ data: AGREED_APP, error: null });
    call
      .mockResolvedValueOnce(raw())
      .mockResolvedValueOnce(raw({ state: "granted", basis: "shift_parent", ok: true, ai: false }));
    expect(await consentOf(api, VIEWER)).toMatchObject({ state: "granted", basis: "shift_parent", ok: true, ai: false });
    expect(call).toHaveBeenLastCalledWith("shift_quest_consent_import", ACTOR, "shift_parent", AGREED_APP.parent_consented_at, false, false);
  });

  it("keeps what the island has when there is nothing to import", async () => {
    call.mockResolvedValue(raw({ state: "waiting", link_expires_at: "2026-11-25T05:00:00Z" }));
    expect(await consentOf(api, VIEWER)).toMatchObject({ state: "waiting", linkExpiresAt: "2026-11-25T05:00:00Z" });
    expect(call).toHaveBeenCalledTimes(1);
  });

  it("keeps what the island has when the import fails, logging only a code", async () => {
    maybeSingle.mockResolvedValue({ data: null, error: { message: "row for Mint" } });
    call.mockResolvedValue(raw());
    expect(await consentOf(api, VIEWER)).toMatchObject({ state: "none", ok: false });
    expect(logged()).toContain("consent read failed: import lookup_failed");
    expect(logged()).not.toContain("Mint");

    errorLog.mockClear();
    maybeSingle.mockResolvedValue({ data: AGREED_APP, error: null });
    call.mockReset().mockResolvedValueOnce(raw()).mockRejectedValueOnce(new QuestError("bad_input"));
    expect(await consentOf(api, VIEWER)).toMatchObject({ state: "none" });
    expect(logged()).toContain("import sq:bad_input");
  });

  it("is null when the read fails, logging a missing function only once per process", async () => {
    call.mockRejectedValue(new QuestDbError("shift_quest_consent_get", "42883"));
    expect(await consentOf(api, VIEWER)).toBeNull();
    expect(await consentOf(api, VIEWER)).toBeNull();
    expect(errorLog.mock.calls.filter((c) => String(c[0]).includes("SQLSTATE 42883"))).toHaveLength(1);

    call.mockRejectedValue(new QuestDbError("shift_quest_consent_get", "08006"));
    expect(await consentOf(api, VIEWER)).toBeNull();
    expect(await consentOf(api, VIEWER)).toBeNull();
    expect(errorLog.mock.calls.filter((c) => String(c[0]).includes("SQLSTATE 08006"))).toHaveLength(2);
  });

  it("is null for a malformed answer, and for a refusal", async () => {
    call.mockResolvedValue({ nope: true });
    expect(await consentOf(api, VIEWER)).toBeNull();
    expect(logged()).toContain("consent read failed: malformed");
    call.mockRejectedValue(new QuestError("not_started"));
    expect(await consentOf(api, VIEWER)).toBeNull();
    expect(logged()).toContain("sq:not_started");
  });
});

describe("readConsent", () => {
  it("throws a failed read so the action gate can map it", async () => {
    call.mockRejectedValue(new QuestError("not_found"));
    await expect(readConsent(api, VIEWER)).rejects.toBeInstanceOf(QuestError);
    call.mockResolvedValue("nope");
    await expect(readConsent(api, VIEWER)).rejects.toThrow("consent_malformed");
  });
});

describe("parent link helpers", () => {
  it("accepts only token-shaped links", () => {
    expect(isParentLinkToken("A".repeat(43))).toBe(true);
    expect(isParentLinkToken("short")).toBe(false);
    expect(isParentLinkToken("../".repeat(20))).toBe(false);
    expect(isParentLinkToken(undefined)).toBe(false);
  });

  it("maps the parent view and keeps only the nickname", () => {
    expect(
      parseParentView({ state: "waiting", student_label: "  มิ้นต์  ", expires_at: "2026-11-25T05:00:00Z", answerable: true, withdrawable: false, extra: "x" }),
    ).toEqual({ state: "waiting", studentLabel: "มิ้นต์", expiresAt: "2026-11-25T05:00:00Z", answerable: true, withdrawable: false, aiOnly: false });
    expect(parseParentView({ state: "granted", student_label: "มิ้นต์", expires_at: "2026-11-25T05:00:00Z", answerable: true, ai_only: true })?.aiOnly).toBe(true);
    expect(parseParentView(null)).toBeNull();
    expect(parseParentView({ state: "none" })).toBeNull();
  });
});
