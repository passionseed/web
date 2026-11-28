/** @jest-environment node */
import { NextRequest } from "next/server";

import { POST } from "@/app/api/hackathon/elemental/register/route";
import {
  createRegistration,
  createTeam,
  getBuddyPass,
  getTeamByInviteCode,
  type BuddyPassLookup,
} from "@/lib/supabase/hackathon-event-registrations";

jest.mock("next/server", () => ({
  ...jest.requireActual("next/server"),
  after: jest.fn(),
}));
jest.mock("@/lib/hackathon/elemental/notify", () => ({ notifyElementalSignup: jest.fn() }));
jest.mock("@/lib/supabase/hackathon-event-registrations", () => ({
  createRegistration: jest.fn(),
  createTeam: jest.fn(),
  getBuddyPass: jest.fn(),
  getTeamByInviteCode: jest.fn(),
  isUniqueViolation: (e: unknown) => (e as { code?: string } | null)?.code === "23505",
}));
jest.mock("@/lib/hackathon/elemental/registration-email", () => ({ sendRegistrationEmail: jest.fn() }));
jest.mock("@/lib/hackathon/elemental/registration", () => ({
  ...jest.requireActual("@/lib/hackathon/elemental/registration"),
  elementalRegistrationOpen: () => true,
}));

const mockedCreate = jest.mocked(createRegistration);
const mockedPass = jest.mocked(getBuddyPass);

const friend = {
  members: [{ fullName: "Mew Friend", nickname: "Mew", age: 21, school: "Chula" }],
  contactEmail: "mew@example.com",
  contactPhone: "0899999999",
  noRefundAck: true,
};

const pass = (patch: Partial<BuddyPassLookup> = {}): BuddyPassLookup => ({
  state: "available",
  registrationId: "sender-1",
  senderName: "Big",
  contactEmail: "big@example.com",
  contactPhone: "0812345678",
  ...patch,
});

function post(body: unknown) {
  return POST(
    new NextRequest("http://localhost/api/hackathon/elemental/register", {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    }),
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedCreate.mockResolvedValue({ id: "friend-1", payToken: "f".repeat(32) });
});

describe("buddy pass sign-up", () => {
  const body = { ...friend, teamMode: "buddy", passCode: "0123456789ab", buddyOwe: "mala" };

  it("charges ฿99 whatever the client sends, and links the friend to the sender", async () => {
    mockedPass.mockResolvedValue(pass());
    const res = await post({ ...body, amountBaht: 1 });
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ payToken: "f".repeat(32), amountBaht: 99 });
    expect(mockedCreate).toHaveBeenCalledWith(
      "elemental-2026",
      expect.objectContaining({ teamMode: "buddy", source: "buddy" }),
      99,
      null,
      { fromRegistrationId: "sender-1", owe: "mala" },
    );
  });

  it.each(["locked", "used", "invalid"] as const)("refuses a %s pass", async (state) => {
    mockedPass.mockResolvedValue(pass({ state }));
    const res = await post(body);
    expect(res.status).toBe(409);
    await expect(res.json()).resolves.toEqual({ error: `pass_${state}` });
    expect(mockedCreate).not.toHaveBeenCalled();
  });

  it("refuses the sender using their own pass", async () => {
    mockedPass.mockResolvedValue(pass({ contactPhone: "0899999999" }));
    const res = await post(body);
    await expect(res.json()).resolves.toEqual({ error: "pass_self" });
    expect(mockedCreate).not.toHaveBeenCalled();
  });

  it("turns a lost race (unique index) into pass_used", async () => {
    mockedPass.mockResolvedValue(pass());
    mockedCreate.mockRejectedValue({ code: "23505" });
    const res = await post(body);
    expect(res.status).toBe(409);
    await expect(res.json()).resolves.toEqual({ error: "pass_used" });
  });

  it("is for one person only", async () => {
    const res = await post({ ...body, members: [friend.members[0], friend.members[0]] });
    expect(res.status).toBe(400);
    expect(mockedPass).not.toHaveBeenCalled();
  });

  it("needs a well-formed pass code", async () => {
    const res = await post({ ...body, passCode: "nope" });
    expect(res.status).toBe(400);
  });
});

describe("existing modes are unchanged", () => {
  it("solo pays ฿199 and never touches a pass", async () => {
    const res = await post({ ...friend, teamMode: "solo", passCode: "0123456789ab" });
    await expect(res.json()).resolves.toMatchObject({ amountBaht: 199 });
    expect(mockedPass).not.toHaveBeenCalled();
    expect(mockedCreate).toHaveBeenCalledWith("elemental-2026", expect.anything(), 199, null);
  });

  it("create pays ฿149", async () => {
    jest.mocked(createTeam).mockResolvedValue({ id: "t1", inviteCode: "0123456789ab" });
    const res = await post({ ...friend, teamMode: "create", teamName: "Fire" });
    await expect(res.json()).resolves.toMatchObject({ amountBaht: 149 });
  });

  it("join pays ฿149", async () => {
    jest.mocked(getTeamByInviteCode).mockResolvedValue({
      id: "t1",
      name: "Fire",
      inviteCode: "0123456789ab",
      roster: [],
      spotsLeft: 4,
    });
    const res = await post({ ...friend, teamMode: "join", inviteCode: "0123456789ab" });
    await expect(res.json()).resolves.toMatchObject({ amountBaht: 149 });
  });
});
