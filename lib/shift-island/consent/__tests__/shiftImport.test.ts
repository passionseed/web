/** @jest-environment node */
import type { QuestApi } from "@/bot/src/quests/api";
import type { IslandConsent } from "@/lib/supabase/shift-quests/playerTypes";

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
const from = jest.fn(() => query);
const createAdminClient = jest.fn(() => ({ from }));

jest.mock("@/utils/supabase/admin", () => ({ createAdminClient: () => createAdminClient() }));

import {
  ShiftImportError,
  ageOn,
  importIsNoop,
  importShiftConsent,
  lookupShiftConsent,
  shiftImportFor,
  type ShiftConsentRow,
} from "../shiftImport";

const NOW = Date.parse("2026-11-11T05:00:00Z");
const ACTOR = "123456789012345678";
const USER = "0b7f4a52-5c1e-4c9b-9f27-6f0f3c1d2e3a";

const base: ShiftConsentRow = {
  birth_date: "2010-03-01",
  consent_notice_version: "2026-11-08",
  parent_consented_at: null,
  parent_declined_at: null,
  parent_withdrawn_at: null,
  parent_ai_consented_at: null,
  created_at: "2026-11-01T02:00:00Z",
};

const consent = (over: Partial<IslandConsent> = {}): IslandConsent => ({
  required: true,
  state: "none",
  basis: null,
  ok: false,
  ai: false,
  linkExpiresAt: null,
  adultAge: 20,
  parentSaidNo: false,
  ...over,
});

const call = jest.fn();
const api = { call, rows: jest.fn() } as unknown as QuestApi;

beforeEach(() => {
  call.mockReset();
  maybeSingle.mockReset();
  createAdminClient.mockReset().mockImplementation(() => ({ from }));
  from.mockClear();
  query.eq.mockClear();
});

describe("shiftImportFor", () => {
  it("imports a SHIFT parent's agreement, without the AI line when the parent did not tick it", () => {
    const row = { ...base, parent_consented_at: "2026-11-02T03:00:00Z" };
    expect(shiftImportFor(row, NOW)).toEqual({ basis: "shift_parent", decidedAt: "2026-11-02T03:00:00Z", ai: false, withdrawn: false });
  });

  it("never imports AI news, even when the parent ticked SHIFT's separate AI tick (a different use)", () => {
    const row = { ...base, parent_consented_at: "2026-11-02T03:00:00Z", parent_ai_consented_at: "2026-11-02T03:00:00Z" };
    expect(shiftImportFor(row, NOW)).toMatchObject({ basis: "shift_parent", ai: false });
  });

  it("imports an applicant who was 20 or older as shift_adult, dated when they applied", () => {
    const row = { ...base, birth_date: "2000-01-01" };
    expect(shiftImportFor(row, NOW)).toEqual({ basis: "shift_adult", decidedAt: base.created_at, ai: false, withdrawn: false });
  });

  it("withdraws when the SHIFT parent withdrew, even after agreeing", () => {
    const row = { ...base, parent_consented_at: "2026-11-02T03:00:00Z", parent_withdrawn_at: "2026-11-05T03:00:00Z" };
    expect(shiftImportFor(row, NOW)).toEqual({ basis: "shift_parent", decidedAt: "2026-11-05T03:00:00Z", ai: false, withdrawn: true });
  });

  it.each([
    ["legacy (before the notice existed)", { ...base, consent_notice_version: null }],
    ["waiting for the parent", base],
    ["declined", { ...base, parent_declined_at: "2026-11-02T03:00:00Z" }],
  ])("records nothing for %s", (_name, row) => {
    expect(shiftImportFor(row, NOW)).toBeNull();
  });

  it("records nothing without an application", () => {
    expect(shiftImportFor(null, NOW)).toBeNull();
  });
});

describe("importIsNoop", () => {
  const agreed = { basis: "shift_parent" as const, decidedAt: "x", ai: true, withdrawn: false };

  it("skips the write when the island already has the same import", () => {
    expect(importIsNoop(consent({ state: "granted", basis: "shift_parent", ok: true, ai: true }), agreed)).toBe(true);
    expect(importIsNoop(consent({ state: "granted", basis: "shift_adult", ok: true, ai: true }), { ...agreed, basis: "shift_adult", ai: false })).toBe(true);
  });

  it("writes when the state or basis differs; AI news never matters (an import never carries it)", () => {
    expect(importIsNoop(consent(), agreed)).toBe(false);
    expect(importIsNoop(consent({ state: "withdrawn", basis: "shift_parent" }), agreed)).toBe(false);
    expect(importIsNoop(consent({ state: "granted", basis: "shift_adult", ok: true }), agreed)).toBe(false);
    expect(importIsNoop(consent({ state: "granted", basis: "shift_parent", ok: true, ai: false }), agreed)).toBe(true);
    expect(importIsNoop(consent({ required: false, state: "granted", basis: "shift_parent", ok: true, ai: false }), agreed)).toBe(true);
  });

  it("works out a whole age in years on a Bangkok day", () => {
    expect(ageOn("2006-11-12", "2026-11-12")).toBe(20);
    expect(ageOn("2006-11-13", "2026-11-12")).toBe(19);
    expect(ageOn("2008-02-29", "2026-11-12")).toBe(18);
    expect(ageOn(null, "2026-11-12")).toBeNull();
    expect(ageOn("not a date", "2026-11-12")).toBeNull();
  });

  it("only withdraws an imported consent that is not withdrawn yet", () => {
    const withdraw = { ...agreed, withdrawn: true };
    expect(importIsNoop(consent(), withdraw)).toBe(true);
    expect(importIsNoop(consent({ state: "granted", basis: "parent", ok: true }), withdraw)).toBe(true);
    expect(importIsNoop(consent({ state: "withdrawn", basis: "shift_parent" }), withdraw)).toBe(true);
    expect(importIsNoop(consent({ state: "granted", basis: "shift_parent", ok: true }), withdraw)).toBe(false);
  });
});

describe("lookupShiftConsent", () => {
  it("reads only consent columns of the viewer's newest application", async () => {
    maybeSingle.mockResolvedValue({ data: base, error: null });
    expect(await lookupShiftConsent(USER)).toEqual(base);
    expect(from).toHaveBeenCalledWith("shift_applications");
    const columns = String((query.select.mock.calls as unknown[][]).at(-1)?.[0]);
    expect(columns).not.toMatch(/name|email|contact|ig_handle|discord/);
    expect(query.eq).toHaveBeenCalledWith("user_id", USER);
    expect(query.order).toHaveBeenCalledWith("created_at", { ascending: false });
  });

  it("throws a code on a lookup error, and when the service key is missing", async () => {
    maybeSingle.mockResolvedValue({ data: null, error: { message: "boom" } });
    await expect(lookupShiftConsent(USER)).rejects.toEqual(new ShiftImportError("lookup_failed"));
    createAdminClient.mockImplementation(() => {
      throw new Error("Missing env.SUPABASE_SERVICE_ROLE_KEY");
    });
    await expect(lookupShiftConsent(USER)).rejects.toMatchObject({ code: "unconfigured" });
  });
});

describe("importShiftConsent", () => {
  it("records an agreed SHIFT parent with the actor, never the user id", async () => {
    maybeSingle.mockResolvedValue({ data: { ...base, parent_consented_at: "2026-11-02T03:00:00Z" }, error: null });
    call.mockResolvedValue({ state: "granted" });
    expect(await importShiftConsent(api, { actor: ACTOR, userId: USER }, consent())).toEqual({ state: "granted" });
    expect(call).toHaveBeenCalledWith("shift_quest_consent_import", ACTOR, "shift_parent", "2026-11-02T03:00:00Z", false, false);
  });

  it("calls nothing when there is no application or nothing to change", async () => {
    maybeSingle.mockResolvedValue({ data: null, error: null });
    expect(await importShiftConsent(api, { actor: ACTOR, userId: USER }, consent())).toBeNull();
    maybeSingle.mockResolvedValue({ data: { ...base, birth_date: "2000-01-01" }, error: null });
    expect(
      await importShiftConsent(api, { actor: ACTOR, userId: USER }, consent({ state: "granted", basis: "shift_adult", ok: true, ai: true })),
    ).toBeNull();
    expect(call).not.toHaveBeenCalled();
  });

  it("passes a lookup failure up for the caller to log", async () => {
    maybeSingle.mockResolvedValue({ data: null, error: { message: "boom" } });
    await expect(importShiftConsent(api, { actor: ACTOR, userId: USER }, consent())).rejects.toBeInstanceOf(ShiftImportError);
    expect(call).not.toHaveBeenCalled();
  });
});
