/**
 * @jest-environment node
 */
import { NextRequest } from "next/server";

const getRegistrationByToken = jest.fn();
const getTeamByCode = jest.fn();
const createTeam = jest.fn();
const setRegistrationTeam = jest.fn();
const teamSeatsTaken = jest.fn();
const teamChangeOpen = jest.fn();

jest.mock("@/lib/supabase/hackathon-event-registrations", () => ({
  getRegistrationByToken: (...args: unknown[]) => getRegistrationByToken(...args),
  getTeamByCode: (...args: unknown[]) => getTeamByCode(...args),
  createTeam: (...args: unknown[]) => createTeam(...args),
  setRegistrationTeam: (...args: unknown[]) => setRegistrationTeam(...args),
  teamSeatsTaken: (...args: unknown[]) => teamSeatsTaken(...args),
}));
jest.mock("@/lib/hackathon/elemental/team-change", () => ({
  ...jest.requireActual("@/lib/hackathon/elemental/team-change"),
  teamChangeOpen: () => teamChangeOpen(),
}));

import { POST } from "./route";

const TOKEN = "a".repeat(32);
const CODE = "0123456789ab";
const URL = `http://localhost/api/hackathon/elemental/${TOKEN}/team`;

const solo = { id: "reg-1", status: "pending", memberCount: 1, amountBaht: 199, team: null, onBuddyPass: false };
const team = { id: "team-1", name: "ไฟป่า", inviteCode: CODE, roster: [{ name: "ต้น", paid: true }], spotsLeft: 4 };

async function post(payload: unknown, headers: Record<string, string> = { origin: "http://localhost" }) {
  const req = new NextRequest(URL, { method: "POST", body: JSON.stringify(payload), headers });
  const res = await POST(req, { params: Promise.resolve({ token: TOKEN }) });
  return { status: res.status, json: await res.json() };
}

beforeEach(() => {
  jest.clearAllMocks();
  getRegistrationByToken.mockResolvedValue(solo);
  getTeamByCode.mockResolvedValue(team);
  teamSeatsTaken.mockResolvedValue(2);
  teamChangeOpen.mockReturnValue(true);
  createTeam.mockResolvedValue({ id: "team-2", inviteCode: "ba9876543210" });
  setRegistrationTeam.mockResolvedValue(undefined);
});

describe("join", () => {
  it("puts an unpaid solo sign-up in the team at the group price", async () => {
    const res = await post({ action: "join", code: "0123 4567" });
    expect(res).toEqual({ status: 200, json: { team: { name: "ไฟป่า", inviteCode: CODE }, amountBaht: 149 } });
    expect(getTeamByCode).toHaveBeenCalledWith("elemental-2026", "01234567", 5);
    expect(setRegistrationTeam).toHaveBeenCalledWith("reg-1", { id: "team-1", name: "ไฟป่า" }, 149);
  });

  it("takes a pasted invite link", async () => {
    await post({ action: "join", code: `https://passionseed.org/hackathon/join?team=${CODE}&src=team` });
    expect(getTeamByCode).toHaveBeenCalledWith("elemental-2026", CODE, 5);
  });

  it("leaves what a paid sign-up paid as it is", async () => {
    getRegistrationByToken.mockResolvedValue({ ...solo, status: "paid" });
    expect((await post({ action: "join", code: CODE })).json.amountBaht).toBe(199);
    expect(setRegistrationTeam).toHaveBeenCalledWith("reg-1", { id: "team-1", name: "ไฟป่า" }, 199);
  });

  it("refuses a code no team has, without looking up something that isn't a code", async () => {
    expect(await post({ action: "join", code: "hello" })).toEqual({ status: 404, json: { error: "team_not_found" } });
    expect(getTeamByCode).not.toHaveBeenCalled();
    getTeamByCode.mockResolvedValue(null);
    expect(await post({ action: "join", code: CODE })).toEqual({ status: 404, json: { error: "team_not_found" } });
    expect(setRegistrationTeam).not.toHaveBeenCalled();
  });

  it("refuses a full team and a sign-up already in a team", async () => {
    getTeamByCode.mockResolvedValue({ ...team, spotsLeft: 0 });
    expect(await post({ action: "join", code: CODE })).toEqual({ status: 409, json: { error: "team_full" } });
    getRegistrationByToken.mockResolvedValue({ ...solo, team: { ...team, id: "team-0" } });
    expect(await post({ action: "join", code: CODE })).toEqual({ status: 409, json: { error: "in_team" } });
    expect(setRegistrationTeam).not.toHaveBeenCalled();
  });

  it("steps back out when someone else took the last seat at the same moment", async () => {
    teamSeatsTaken.mockResolvedValue(6);
    expect(await post({ action: "join", code: CODE })).toEqual({ status: 409, json: { error: "team_full" } });
    expect(setRegistrationTeam).toHaveBeenNthCalledWith(1, "reg-1", { id: "team-1", name: "ไฟป่า" }, 149);
    expect(setRegistrationTeam).toHaveBeenNthCalledWith(2, "reg-1", null, 199);
  });
});

describe("create", () => {
  it("starts a team and puts the sign-up in it", async () => {
    const res = await post({ action: "create", name: "  น้ำใส  " });
    expect(res).toEqual({ status: 200, json: { team: { name: "น้ำใส", inviteCode: "ba9876543210" }, amountBaht: 149 } });
    expect(createTeam).toHaveBeenCalledWith("elemental-2026", "น้ำใส");
    expect(setRegistrationTeam).toHaveBeenCalledWith("reg-1", { id: "team-2", name: "น้ำใส" }, 149);
  });

  it("refuses when the sign-up already has a team", async () => {
    getRegistrationByToken.mockResolvedValue({ ...solo, team });
    expect(await post({ action: "create", name: "น้ำใส" })).toEqual({ status: 409, json: { error: "in_team" } });
    expect(createTeam).not.toHaveBeenCalled();
  });
});

describe("leave", () => {
  it("takes an unpaid sign-up out of its team, back to the solo price", async () => {
    getRegistrationByToken.mockResolvedValue({ ...solo, amountBaht: 149, team });
    expect(await post({ action: "leave" })).toEqual({ status: 200, json: { team: null, amountBaht: 199 } });
    expect(setRegistrationTeam).toHaveBeenCalledWith("reg-1", null, 199);
  });

  it("keeps a buddy pass price and a paid amount", async () => {
    getRegistrationByToken.mockResolvedValue({ ...solo, amountBaht: 99, onBuddyPass: true, team });
    expect((await post({ action: "leave" })).json.amountBaht).toBe(99);
    getRegistrationByToken.mockResolvedValue({ ...solo, status: "paid", amountBaht: 149, team });
    expect((await post({ action: "leave" })).json.amountBaht).toBe(149);
  });

  it("refuses when there is no team to leave", async () => {
    expect(await post({ action: "leave" })).toEqual({ status: 409, json: { error: "not_in_team" } });
  });
});

describe("after the deadline", () => {
  it("refuses every team change", async () => {
    teamChangeOpen.mockReturnValue(false);
    expect(await post({ action: "join", code: CODE })).toEqual({ status: 410, json: { error: "closed" } });
    expect(await post({ action: "create", name: "น้ำใส" })).toEqual({ status: 410, json: { error: "closed" } });
    getRegistrationByToken.mockResolvedValue({ ...solo, team });
    expect(await post({ action: "leave" })).toEqual({ status: 410, json: { error: "closed" } });
    expect(setRegistrationTeam).not.toHaveBeenCalled();
    expect(createTeam).not.toHaveBeenCalled();
  });
});

describe("who may call", () => {
  it("refuses another site, an unknown token, a cancelled sign-up and a bad body", async () => {
    expect((await post({ action: "leave" }, { origin: "https://evil.example" })).status).toBe(403);
    expect(await post({ action: "dance" })).toEqual({ status: 400, json: { error: "invalid" } });
    getRegistrationByToken.mockResolvedValue({ ...solo, status: "cancelled", team });
    expect(await post({ action: "leave" })).toEqual({ status: 403, json: { error: "cancelled" } });
    getRegistrationByToken.mockResolvedValue(null);
    expect(await post({ action: "leave" })).toEqual({ status: 404, json: { error: "not_found" } });
    expect(setRegistrationTeam).not.toHaveBeenCalled();
  });
});
