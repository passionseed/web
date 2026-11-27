/**
 * @jest-environment node
 */
import { NextRequest } from "next/server";

const getRegistrationByToken = jest.fn();
const saveNameStyle = jest.fn();
const teamLinkNumbers = jest.fn();
const teamMemberIds = jest.fn();
const teamHasStoryProof = jest.fn();
let editable = true;

jest.mock("@/lib/supabase/hackathon-event-registrations", () => ({
  getRegistrationByToken: (...args: unknown[]) => getRegistrationByToken(...args),
}));
jest.mock("@/lib/supabase/hackathon-team-style", () => ({
  saveNameStyle: (...args: unknown[]) => saveNameStyle(...args),
  teamLinkNumbers: (...args: unknown[]) => teamLinkNumbers(...args),
  teamMemberIds: (...args: unknown[]) => teamMemberIds(...args),
}));
jest.mock("@/lib/supabase/hackathon-story-proofs", () => ({
  teamHasStoryProof: (...args: unknown[]) => teamHasStoryProof(...args),
}));
jest.mock("@/lib/hackathon/elemental/team-style-phase", () => ({ teamStyleEditable: () => editable }));

import { TEAM_STYLE_TIERS } from "@/lib/hackathon/elemental/team-style";

import { POST } from "./route";

const TOKEN = "a".repeat(32);
const FULL = { font: "chakra", color: "water", effect: "gradient", pair: "river" };
const PLAIN = { font: "trirong", color: "ink", effect: "solid", pair: "fire" };

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
  editable = true;
  getRegistrationByToken.mockResolvedValue({ id: "reg-1", status: "pending", team: { id: "team-1", name: "ทีมมิว" } });
  teamMemberIds.mockResolvedValue(["reg-1", "reg-2"]);
  saveNameStyle.mockResolvedValue(undefined);
  teamHasStoryProof.mockResolvedValue(false);
});

it("saves a board name and a style the team has unlocked, for the whole team", async () => {
  teamLinkNumbers.mockResolvedValue({ devices: TEAM_STYLE_TIERS.effect, paid: 2 });
  const { status, json } = await save({ style: FULL, boardName: "  ไฟป่า " });
  expect(status).toBe(200);
  expect(json).toMatchObject({ style: FULL, boardName: "ไฟป่า" });
  expect(teamLinkNumbers).toHaveBeenCalledWith("elemental-2026", ["reg-1", "reg-2"]);
  expect(saveNameStyle).toHaveBeenCalledWith("elemental-2026", { id: "reg-1", teamId: "team-1" }, { style: FULL, boardName: "ไฟป่า" });
});

it("saves a board name alone without counting devices", async () => {
  const { status } = await save({ boardName: "ไฟป่า" });
  expect(status).toBe(200);
  expect(teamLinkNumbers).not.toHaveBeenCalled();
  expect(saveNameStyle).toHaveBeenCalledWith("elemental-2026", { id: "reg-1", teamId: "team-1" }, { style: undefined, boardName: "ไฟป่า" });
});

it("refuses a part the team hadn't unlocked", async () => {
  teamLinkNumbers.mockResolvedValue({ devices: TEAM_STYLE_TIERS.font, paid: 0 });
  const { status, json } = await save({ style: FULL });
  expect(status).toBe(403);
  expect(json).toMatchObject({ error: "locked", parts: ["effect"] });
  expect(saveNameStyle).not.toHaveBeenCalled();
});

it("lets a team with a member's live Instagram Story proof save every part, checked on the server", async () => {
  teamLinkNumbers.mockResolvedValue({ devices: 2, paid: 0 });
  teamHasStoryProof.mockResolvedValue(true);
  const { status, json } = await save({ style: FULL });
  expect(status).toBe(200);
  expect(json).toMatchObject({ style: FULL });
  expect(teamHasStoryProof).toHaveBeenCalledWith("elemental-2026", ["reg-1", "reg-2"]);
  expect(saveNameStyle).toHaveBeenCalledWith("elemental-2026", { id: "reg-1", teamId: "team-1" }, { style: FULL, boardName: undefined });
});

it("refuses anything that isn't on the lists, a free second colour included", async () => {
  teamLinkNumbers.mockResolvedValue({ devices: 999, paid: 0 });
  expect((await save({ style: { ...FULL, color: "#f0f" } })).status).toBe(400);
  expect((await save({ style: { ...FULL, color2: "aether" } })).status).toBe(400);
  expect((await save({})).status).toBe(400);
  expect(saveNameStyle).not.toHaveBeenCalled();
});

it("checks board names for rude words and length", async () => {
  expect((await save({ boardName: "fuck this" })).json).toEqual({ error: "rude" });
  expect((await save({ boardName: "   " })).json).toEqual({ error: "invalid_name" });
  expect((await save({ boardName: "ก".repeat(41) })).json).toEqual({ error: "invalid_name" });
  expect(saveNameStyle).not.toHaveBeenCalled();
});

it("saves a sign-up without a team on its own registration", async () => {
  getRegistrationByToken.mockResolvedValue({ id: "reg-9", status: "paid", team: null });
  teamLinkNumbers.mockResolvedValue({ devices: 0, paid: 0 });
  const ok = await save({ style: PLAIN, boardName: "หมาป่าเดียวดาย" });
  expect(ok.status).toBe(200);
  expect(teamLinkNumbers).toHaveBeenLastCalledWith("elemental-2026", ["reg-9"]);
  expect(saveNameStyle).toHaveBeenCalledWith("elemental-2026", { id: "reg-9", teamId: null }, { style: PLAIN, boardName: "หมาป่าเดียวดาย" });
});

it("refuses after Demo Day, cross-site requests and cancelled sign-ups", async () => {
  expect((await save({ boardName: "ไฟป่า" }, "https://evil.example")).status).toBe(403);
  editable = false;
  expect((await save({ boardName: "ไฟป่า" })).json).toEqual({ error: "closed" });
  editable = true;
  getRegistrationByToken.mockResolvedValue({ id: "reg-1", status: "cancelled", team: null });
  expect((await save({ boardName: "ไฟป่า" })).status).toBe(403);
  expect(saveNameStyle).not.toHaveBeenCalled();
});
