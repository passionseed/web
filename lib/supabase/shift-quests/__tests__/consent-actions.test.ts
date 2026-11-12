/** @jest-environment node */
import { createHash } from "node:crypto";

import { QuestDbError, QuestError } from "@/bot/src/quests/api";

const call = jest.fn();
const resolveIslandViewer = jest.fn();
const refresh = jest.fn();
const sendIslandParentEmail = jest.fn();
const maybeSingle = jest.fn();

jest.mock("next/cache", () => ({ refresh: () => refresh() }));
jest.mock("@/lib/supabase/shift-quests/db", () => ({
  questApi: () => ({ call, rows: jest.fn() }),
}));
jest.mock("@/lib/supabase/shift-quests/viewer", () => ({
  resolveIslandViewer: () => resolveIslandViewer(),
}));
jest.mock("@/lib/shift-island/consent/email", () => ({
  sendIslandParentEmail: (input: unknown) => sendIslandParentEmail(input),
}));
jest.mock("@/utils/supabase/admin", () => {
  const query: Record<string, unknown> = {};
  for (const name of ["select", "eq", "order", "limit"]) query[name] = () => query;
  query.maybeSingle = () => maybeSingle();
  return { createAdminClient: () => ({ from: () => query }) };
});

import { confirmAdult, loadConsent, requestParentLink } from "@/app/shift/island/consent-actions";
import { ISLAND_CONSENT_VERSION } from "@/lib/supabase/shift-quests/playerTypes";

const ACTOR = "123456789012345678";
const USER = "0b7f4a52-5c1e-4c9b-9f27-6f0f3c1d2e3a";
const PARENT = "parent@example.com";
const EXPIRES = "2026-11-25T05:00:00.000Z";
const me = { name: "Mint", avatarUrl: null, staff: false };
const ready = { state: "ready", me, actor: ACTOR, userId: USER, session: { onboarded: true, roles: [], unread: 0 } };
const SITE = "https://island.example";

const granted = {
  required: true,
  state: "granted",
  basis: "adult",
  ai: true,
  ok: true,
  link_expires_at: null,
  adult_age: 20,
};

const savedSite = process.env.NEXT_PUBLIC_SITE_URL;

beforeEach(() => {
  call.mockReset();
  refresh.mockReset();
  sendIslandParentEmail.mockReset().mockResolvedValue(true);
  maybeSingle.mockReset().mockResolvedValue({ data: null, error: null });
  resolveIslandViewer.mockReset().mockResolvedValue(ready);
  process.env.NEXT_PUBLIC_SITE_URL = SITE;
  jest.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  jest.restoreAllMocks();
  if (savedSite === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
  else process.env.NEXT_PUBLIC_SITE_URL = savedSite;
});

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

describe("loadConsent", () => {
  it("reads the viewer's consent without refreshing the page", async () => {
    call.mockResolvedValue({ ...granted, basis: "parent" });
    const result = await loadConsent();
    expect(result).toEqual({
      ok: true,
      data: { required: true, state: "granted", basis: "parent", ok: true, ai: true, linkExpiresAt: null, adultAge: 20, parentSaidNo: false },
    });
    expect(call).toHaveBeenCalledWith("shift_quest_consent_get", ACTOR);
    expect(refresh).not.toHaveBeenCalled();
  });

  it("refuses a signed-out viewer before any database call", async () => {
    resolveIslandViewer.mockResolvedValue({ state: "signed_out" });
    expect(await loadConsent()).toMatchObject({ ok: false, code: "signed_out" });
    expect(call).not.toHaveBeenCalled();
  });
});

describe("confirmAdult", () => {
  it("sends the birth date with the island notice version and refreshes the page", async () => {
    call.mockResolvedValue(granted);
    const result = await confirmAdult({ birthDate: " 2001-04-30 " });
    expect(result).toMatchObject({ ok: true, data: { state: "granted", basis: "adult", ok: true } });
    expect(call).toHaveBeenCalledWith("shift_quest_consent_adult", ACTOR, "2001-04-30", ISLAND_CONSENT_VERSION);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it.each([["2001-02-30"], ["30/04/2001"], [""], ["1899-12-31"], ["2999-01-01"], [null]])(
    "refuses %p before calling the database",
    async (birthDate) => {
      expect(await confirmAdult({ birthDate: birthDate as string })).toMatchObject({ ok: false, code: "invalid_input" });
      expect(call).not.toHaveBeenCalled();
    },
  );

  it("passes the database's too-young refusal through by code", async () => {
    call.mockRejectedValue(new QuestError("consent_too_young"));
    expect(await confirmAdult({ birthDate: "2010-01-01" })).toMatchObject({ ok: false, code: "consent_too_young" });
  });

  it("maps a database failure to the generic line", async () => {
    call.mockRejectedValue(new QuestDbError("shift_quest_consent_adult", "42883"));
    expect(await confirmAdult({ birthDate: "2001-04-30" })).toMatchObject({ ok: false, code: "unknown" });
  });

  it("refuses a typed adult age when the student's own SHIFT application says they are younger", async () => {
    call.mockResolvedValue(granted);
    maybeSingle.mockResolvedValue({ data: { birth_date: "2010-05-01", created_at: "2026-10-01T00:00:00Z" }, error: null });
    expect(await confirmAdult({ birthDate: "2001-04-30" })).toMatchObject({ ok: false, code: "consent_too_young" });
    expect(call).not.toHaveBeenCalledWith("shift_quest_consent_adult", expect.anything(), expect.anything(), expect.anything());
  });

  it("goes ahead when the SHIFT application agrees the student is old enough", async () => {
    call.mockResolvedValue(granted);
    maybeSingle.mockResolvedValue({ data: { birth_date: "2001-04-30", created_at: "2026-10-01T00:00:00Z" }, error: null });
    expect(await confirmAdult({ birthDate: "2001-04-30" })).toMatchObject({ ok: true });
    expect(call).toHaveBeenCalledWith("shift_quest_consent_adult", ACTOR, "2001-04-30", ISLAND_CONSENT_VERSION);
  });

  it("refuses while the SHIFT lookup fails, so a hiccup never lets a minor through", async () => {
    call.mockResolvedValue(granted);
    maybeSingle.mockResolvedValue({ data: null, error: { message: "down" } });
    expect(await confirmAdult({ birthDate: "2001-04-30" })).toMatchObject({ ok: false, code: "unavailable" });
    expect(call).not.toHaveBeenCalledWith("shift_quest_consent_adult", expect.anything(), expect.anything(), expect.anything());
  });

  it("passes a parent's no through by code", async () => {
    call.mockImplementation(async (fn: string) => {
      if (fn === "shift_quest_consent_adult") throw new QuestError("consent_parent_said_no");
      return granted;
    });
    expect(await confirmAdult({ birthDate: "2001-04-30" })).toMatchObject({ ok: false, code: "consent_parent_said_no" });
  });
});

describe("requestParentLink", () => {
  it("stores only the token's hash and returns the parent page URL", async () => {
    call.mockResolvedValue({ expires_at: EXPIRES });
    const result = await requestParentLink({ nickname: "  มิ้นต์  " });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const match = /^https:\/\/island\.example\/shift\/island\/parent\/([A-Za-z0-9_-]{43})$/.exec(result.data.url);
    expect(match).not.toBeNull();
    const token = match![1];
    expect(call).toHaveBeenCalledWith("shift_quest_consent_link", ACTOR, sha256(token), "มิ้นต์", ISLAND_CONSENT_VERSION);
    expect(JSON.stringify(call.mock.calls)).not.toContain(token);
    expect(result.data).toEqual({ url: result.data.url, expiresAt: EXPIRES, emailed: false });
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("makes a new token every time", async () => {
    call.mockResolvedValue({ expires_at: EXPIRES });
    const a = await requestParentLink({ nickname: "Mint" });
    const b = await requestParentLink({ nickname: "Mint" });
    expect(a.ok && b.ok && a.data.url !== b.data.url).toBe(true);
  });

  it("emails the link when an address is given, and never stores or logs the address", async () => {
    call.mockResolvedValue({ expires_at: EXPIRES });
    const result = await requestParentLink({ nickname: "Mint", parentEmail: ` ${PARENT} ` });
    expect(result).toMatchObject({ ok: true, data: { emailed: true } });
    expect(sendIslandParentEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: PARENT, nickname: "Mint", expiresAt: EXPIRES, url: result.ok ? result.data.url : "" }),
    );
    expect(JSON.stringify(call.mock.calls)).not.toContain(PARENT);
    expect(JSON.stringify((console.error as jest.Mock).mock.calls)).not.toContain(PARENT);
  });

  it("still returns the link when the email fails", async () => {
    call.mockResolvedValue({ expires_at: EXPIRES });
    sendIslandParentEmail.mockResolvedValue(false);
    expect(await requestParentLink({ nickname: "Mint", parentEmail: PARENT })).toMatchObject({ ok: true, data: { emailed: false } });
  });

  it("treats an empty address as none", async () => {
    call.mockResolvedValue({ expires_at: EXPIRES });
    expect(await requestParentLink({ nickname: "Mint", parentEmail: "  " })).toMatchObject({ ok: true, data: { emailed: false } });
    expect(sendIslandParentEmail).not.toHaveBeenCalled();
  });

  it.each([
    ["an empty nickname", { nickname: "   " }],
    ["a nickname with nothing but digits and symbols", { nickname: "1234 :// ." }],
    ["a nickname over 40 characters", { nickname: "ก".repeat(41) }],
    ["a malformed address", { nickname: "Mint", parentEmail: "not-an-email" }],
    ["an address with markup", { nickname: "Mint", parentEmail: "<a>@x.com" }],
  ])("refuses %s before calling the database", async (_name, input) => {
    expect(await requestParentLink(input)).toMatchObject({ ok: false, code: "invalid_input" });
    expect(call).not.toHaveBeenCalled();
    expect(sendIslandParentEmail).not.toHaveBeenCalled();
  });

  it("cuts a nickname to plain letters before storing it", async () => {
    call.mockResolvedValue({ expires_at: EXPIRES });
    await requestParentLink({ nickname: "Mint https://evil.example" });
    const label = call.mock.calls[0][3] as string;
    expect(label).not.toMatch(/[:/.]/);
  });

  it("passes the rate limit and 'not needed' refusals through by code, sending nothing", async () => {
    call.mockRejectedValue(new QuestError("consent_rate_limited"));
    expect(await requestParentLink({ nickname: "Mint", parentEmail: PARENT })).toMatchObject({ ok: false, code: "consent_rate_limited" });
    call.mockRejectedValue(new QuestError("consent_not_needed"));
    expect(await requestParentLink({ nickname: "Mint" })).toMatchObject({ ok: false, code: "consent_not_needed" });
    expect(sendIslandParentEmail).not.toHaveBeenCalled();
  });

  it("fails without a usable expiry rather than returning a link the database did not store", async () => {
    call.mockResolvedValue({ expires_at: "soon" });
    expect(await requestParentLink({ nickname: "Mint", parentEmail: PARENT })).toMatchObject({ ok: false, code: "unknown" });
    expect(sendIslandParentEmail).not.toHaveBeenCalled();
  });
});
