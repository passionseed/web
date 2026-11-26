/** @jest-environment node */
import { getBuddyPass, getRegistrationByToken } from "../hackathon-event-registrations";
import { createAdminClient } from "@/utils/supabase/admin";

jest.mock("@/utils/supabase/admin", () => ({ createAdminClient: jest.fn() }));

/** Every query method chains; maybeSingle answers from the queue in order. */
function database(results: Array<{ data: unknown; error: unknown }>) {
  const query: Record<string, jest.Mock> = {};
  for (const m of ["select", "eq", "neq", "limit"]) query[m] = jest.fn(() => query);
  query.maybeSingle = jest.fn();
  results.forEach((r) => query.maybeSingle.mockResolvedValueOnce(r));
  (createAdminClient as jest.Mock).mockReturnValue({ from: jest.fn(() => query) });
  return query;
}

const member = (nickname: string | null, full_name: string) => [{ position: 1, nickname, full_name }];

const soloRow = (status: string, patch: Record<string, unknown> = {}) => ({
  id: "sender-1",
  status,
  team_id: null,
  team_name: null,
  member_count: 1,
  amount_baht: 199,
  created_at: "2026-11-26T00:00:00Z",
  buddy_pass_code: "0123456789ab",
  buddy_pass_from_registration_id: null,
  buddy_pass_owe: null,
  contact_email: "big@example.com",
  contact_phone: "0812345678",
  hackathon_event_registration_members: member("Big", "Bunyasit Fang"),
  ...patch,
});

const TOKEN = "a".repeat(32);

describe("a solo payer's own page", () => {
  it.each(["pending", "review"])("keeps the pass locked, with no code, while %s", async (status) => {
    database([{ data: soloRow(status), error: null }]);
    const reg = await getRegistrationByToken(TOKEN);
    expect(reg?.buddyPass).toEqual({ state: "locked" });
    expect(JSON.stringify(reg)).not.toContain("0123456789ab");
  });

  it("shows no pass on a cancelled sign-up", async () => {
    database([{ data: soloRow("cancelled"), error: null }]);
    expect((await getRegistrationByToken(TOKEN))?.buddyPass).toBeNull();
  });

  it("shows the code once paid and nobody has used it", async () => {
    database([
      { data: soloRow("paid"), error: null },
      { data: null, error: null },
    ]);
    expect((await getRegistrationByToken(TOKEN))?.buddyPass).toEqual({ state: "available", code: "0123456789ab" });
  });

  it("names the friend who used it by first name only", async () => {
    database([
      { data: soloRow("paid"), error: null },
      { data: { status: "pending", buddy_pass_owe: "mala", hackathon_event_registration_members: member(null, "Mew Secret-Surname") }, error: null },
    ]);
    const reg = await getRegistrationByToken(TOKEN);
    expect(reg?.buddyPass).toEqual({ state: "claimed", code: "0123456789ab", friendName: "Mew", owe: "mala" });
    expect(JSON.stringify(reg)).not.toContain("Secret-Surname");
  });

  it("has no pass on a team member's or a friend's own sign-up", async () => {
    database([{ data: soloRow("paid", { amount_baht: 99, buddy_pass_from_registration_id: "x" }), error: null }, { data: { hackathon_event_registration_members: member("Big", "Bunyasit Fang") }, error: null }]);
    const reg = await getRegistrationByToken(TOKEN);
    expect(reg?.buddyPass).toBeNull();
    expect(reg?.buddyOf).toEqual({ name: "Big", owe: "boba" });
  });
});

describe("getBuddyPass", () => {
  it("rejects a malformed code without a query", async () => {
    const q = database([]);
    await expect(getBuddyPass("elemental-2026", "nope")).resolves.toMatchObject({ state: "invalid" });
    expect(q.maybeSingle).not.toHaveBeenCalled();
  });

  it("is locked while the sender hasn't paid", async () => {
    database([{ data: soloRow("review"), error: null }]);
    await expect(getBuddyPass("elemental-2026", "0123456789ab")).resolves.toMatchObject({ state: "locked", senderName: "Big" });
  });

  it("is used when a sign-up that isn't cancelled holds it", async () => {
    const q = database([
      { data: soloRow("paid"), error: null },
      { data: { status: "pending" }, error: null },
    ]);
    await expect(getBuddyPass("elemental-2026", "0123456789ab")).resolves.toMatchObject({ state: "used" });
    expect(q.neq).toHaveBeenCalledWith("status", "cancelled");
  });

  it("is available otherwise", async () => {
    database([
      { data: soloRow("paid"), error: null },
      { data: null, error: null },
    ]);
    await expect(getBuddyPass("elemental-2026", "0123456789ab")).resolves.toMatchObject({
      state: "available",
      registrationId: "sender-1",
    });
  });
});
