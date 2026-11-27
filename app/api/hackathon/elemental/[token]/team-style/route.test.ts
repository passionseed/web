/**
 * @jest-environment node
 */
import { NextRequest } from "next/server";

const getRegistrationByToken = jest.fn();
const saveNameStyle = jest.fn();
const teamLinkNumbers = jest.fn();
const teamMemberIds = jest.fn();

jest.mock("@/lib/supabase/hackathon-event-registrations", () => ({
  getRegistrationByToken: (...args: unknown[]) => getRegistrationByToken(...args),
}));
jest.mock("@/lib/supabase/hackathon-team-style", () => ({
  saveNameStyle: (...args: unknown[]) => saveNameStyle(...args),
  teamLinkNumbers: (...args: unknown[]) => teamLinkNumbers(...args),
  teamMemberIds: (...args: unknown[]) => teamMemberIds(...args),
}));
jest.mock("@/lib/hackathon/elemental/share", () => ({ shareOpen: () => true }));

import { TEAM_STYLE_TIERS } from "@/lib/hackathon/elemental/team-style";

import { POST } from "./route";

const TOKEN = "a".repeat(32);
const FULL = { font: "chakra", color: "water", effect: "gradient", color2: "aether" };

async function save(body: unknown, origin = "http://localhost") {
  const req = new NextRequest(`http://localhost/api/hackathon/elemental/${TOKEN}/team-style`, {
    method: "POST",
    headers: { "Content-Type": "application/json", origin },
    body: JSON.stringify(body),
  });
  const res = await POST(req, { params: Promise.resolve({ token: TOKEN }) });
  return { status: res.status, json: await res.json() };
}

beforeEach(() => {
  jest.clearAllMocks();
  getRegistrationByToken.mockResolvedValue({ id: "reg-1", status: "pending", team: { id: "team-1", name: "ไฟป่า" } });
  teamMemberIds.mockResolvedValue(["reg-1", "reg-2"]);
  saveNameStyle.mockResolvedValue(undefined);
});

it("saves a style the team has unlocked, for the whole team", async () => {
  teamLinkNumbers.mockResolvedValue({ devices: TEAM_STYLE_TIERS.effect, paid: 2 });
  const { status, json } = await save({ style: FULL });
  expect(status).toBe(200);
  expect(json.style).toEqual(FULL);
  expect(teamLinkNumbers).toHaveBeenCalledWith("elemental-2026", ["reg-1", "reg-2"]);
  expect(saveNameStyle).toHaveBeenCalledWith("elemental-2026", { id: "reg-1", teamId: "team-1" }, FULL, undefined);
});

it("refuses a part the team hasn't unlocked yet", async () => {
  teamLinkNumbers.mockResolvedValue({ devices: TEAM_STYLE_TIERS.font, paid: 0 });
  const { status, json } = await save({ style: FULL });
  expect(status).toBe(403);
  expect(json).toMatchObject({ error: "locked", parts: ["effect"] });
  expect(saveNameStyle).not.toHaveBeenCalled();
});

it("refuses anything that isn't on the lists", async () => {
  teamLinkNumbers.mockResolvedValue({ devices: 999, paid: 0 });
  expect((await save({ style: { ...FULL, color: "#f0f" } })).status).toBe(400);
  expect((await save({ style: { ...FULL, css: "x" } })).status).toBe(400);
  expect(saveNameStyle).not.toHaveBeenCalled();
});

it("lets a sign-up without a team pick its board name, with the word check", async () => {
  getRegistrationByToken.mockResolvedValue({ id: "reg-9", status: "paid", team: null });
  teamLinkNumbers.mockResolvedValue({ devices: 0, paid: 0 });
  const style = { font: "trirong", color: "ink", effect: "solid", color2: "flame" };
  expect((await save({ style, name: "fuck this" })).json).toEqual({ error: "rude" });
  const ok = await save({ style, name: "  หมาป่าเดียวดาย " });
  expect(ok.status).toBe(200);
  expect(teamLinkNumbers).toHaveBeenLastCalledWith("elemental-2026", ["reg-9"]);
  expect(saveNameStyle).toHaveBeenCalledWith("elemental-2026", { id: "reg-9", teamId: null }, style, "หมาป่าเดียวดาย");
});

it("ignores a name sent for a team (teams rename on the team card)", async () => {
  teamLinkNumbers.mockResolvedValue({ devices: 0, paid: 0 });
  await save({ style: { font: "trirong", color: "ink", effect: "solid" }, name: "อื่น" });
  expect(saveNameStyle.mock.calls[0][3]).toBeUndefined();
});

it("refuses cross-site requests and cancelled sign-ups", async () => {
  expect((await save({ style: FULL }, "https://evil.example")).status).toBe(403);
  getRegistrationByToken.mockResolvedValue({ id: "reg-1", status: "cancelled", team: null });
  expect((await save({ style: FULL })).status).toBe(403);
  expect(saveNameStyle).not.toHaveBeenCalled();
});
