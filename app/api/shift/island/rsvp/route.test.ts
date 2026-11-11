/** @jest-environment node */
import { POST } from "./route";
import { loadIslandViewer } from "@/lib/supabase/shift-island-viewer";
import { addIslandRsvp } from "@/lib/supabase/shift-island-rsvps";
import { createAlumniMember } from "@/lib/supabase/shift-alumni-members";
import { SEAL } from "@/lib/content/shift-island-invite";
import { MENTOR_TICKET, type IslandViewer, type IslandViewerInput } from "@/lib/shift/islandInvite";

jest.mock("@/lib/supabase/shift-island-viewer", () => ({ loadIslandViewer: jest.fn() }));
jest.mock("@/lib/supabase/shift-island-rsvps", () => ({ addIslandRsvp: jest.fn() }));
jest.mock("@/lib/supabase/shift-alumni-members", () => ({ createAlumniMember: jest.fn() }));

const baseInput: IslandViewerInput = {
  user: { anonymous: false },
  isAdmin: false,
  member: null,
  linkedApplication: null,
  rsvp: false,
  phase: "running",
};

function state(viewer: IslandViewer, input: Partial<IslandViewerInput> = {}, userId: string | null = "u1") {
  (loadIslandViewer as jest.Mock).mockResolvedValue({ viewer, userId, input: { ...baseInput, ...input } });
}

beforeEach(() => {
  jest.clearAllMocks();
  delete process.env.DISCORD_SHIFT_ISLAND_CHANNEL_URL;
  (addIslandRsvp as jest.Mock).mockResolvedValue({});
});

test("401 when signed out", async () => {
  state({ kind: "signedOut" }, { user: null }, null);
  const res = await POST();
  expect(res.status).toBe(401);
  expect(addIslandRsvp).not.toHaveBeenCalled();
});

test("403 when not alumni", async () => {
  state({ kind: "notAlumni" });
  const res = await POST();
  expect(res.status).toBe(403);
  expect(await res.json()).toEqual({ error: SEAL.notAlumni });
  expect(addIslandRsvp).not.toHaveBeenCalled();
});

test("422 when closed", async () => {
  state({ kind: "closed" });
  const res = await POST();
  expect(res.status).toBe(422);
  expect(await res.json()).toEqual({ error: SEAL.closed });
  expect(addIslandRsvp).not.toHaveBeenCalled();
});

test("canRsvp with a linked application creates the confirmed member first", async () => {
  process.env.DISCORD_SHIFT_ISLAND_CHANNEL_URL = "https://discord.example/island";
  state({ kind: "canRsvp" }, { linkedApplication: { nickname: "Mint", cohort: "SHIFT[1]" } });
  const order: string[] = [];
  (createAlumniMember as jest.Mock).mockImplementation(async () => {
    order.push("member");
    return { nickname: "Mint", cohort: "SHIFT[1]", status: "confirmed" };
  });
  (addIslandRsvp as jest.Mock).mockImplementation(async () => {
    order.push("rsvp");
    return {};
  });
  const res = await POST();
  expect(createAlumniMember).toHaveBeenCalledWith("u1", { nickname: "Mint", cohort: "SHIFT[1]" });
  expect(addIslandRsvp).toHaveBeenCalledWith("u1", "Season 1");
  expect(order).toEqual(["member", "rsvp"]);
  expect(res.status).toBe(200);
  expect(res.headers.get("Cache-Control")).toBe("no-store");
  expect(await res.json()).toEqual({
    ok: true,
    ticket: { nickname: "Mint", cohort: "SHIFT[1]" },
    discordUrl: "https://discord.example/island",
    confirmed: true,
  });
});

test("a member created as pending gets no Discord link", async () => {
  process.env.DISCORD_SHIFT_ISLAND_CHANNEL_URL = "https://discord.example/island";
  state({ kind: "canRsvp" }, { linkedApplication: { nickname: "Mint", cohort: "SHIFT[1]" } });
  (createAlumniMember as jest.Mock).mockResolvedValue({ nickname: "Mint", cohort: "SHIFT[1]", status: "pending" });
  const res = await POST();
  expect(res.status).toBe(200);
  expect(await res.json()).toMatchObject({ ok: true, discordUrl: null, confirmed: false });
});

test("existing pending member RSVPs without creating a member, and gets no Discord link", async () => {
  process.env.DISCORD_SHIFT_ISLAND_CHANNEL_URL = "https://discord.example/island";
  state({ kind: "canRsvp" }, { member: { nickname: "Pim", cohort: "SHIFT[2]", status: "pending" } });
  const res = await POST();
  expect(createAlumniMember).not.toHaveBeenCalled();
  expect(addIslandRsvp).toHaveBeenCalledWith("u1", "Season 1");
  expect(await res.json()).toEqual({
    ok: true,
    ticket: { nickname: "Pim", cohort: "SHIFT[2]" },
    discordUrl: null,
    confirmed: false,
  });
});

test("existing confirmed member gets the Discord link", async () => {
  process.env.DISCORD_SHIFT_ISLAND_CHANNEL_URL = "https://discord.example/island";
  state({ kind: "canRsvp" }, { member: { nickname: "Pim", cohort: "SHIFT[2]", status: "confirmed" } });
  const res = await POST();
  expect(await res.json()).toMatchObject({ discordUrl: "https://discord.example/island", confirmed: true });
});

test("admin without a member gets the mentor ticket and the Discord link", async () => {
  process.env.DISCORD_SHIFT_ISLAND_CHANNEL_URL = "https://discord.example/island";
  state({ kind: "canRsvp" }, { isAdmin: true });
  const res = await POST();
  expect(createAlumniMember).not.toHaveBeenCalled();
  expect(await res.json()).toEqual({
    ok: true,
    ticket: MENTOR_TICKET,
    discordUrl: "https://discord.example/island",
    confirmed: true,
  });
});

test("already going returns the same ticket without a second insert", async () => {
  const ticket = { nickname: "Mint", cohort: "SHIFT[1]" };
  state({ kind: "going", ticket, discordUrl: null, confirmed: false });
  const res = await POST();
  expect(res.status).toBe(200);
  expect(await res.json()).toEqual({ ok: true, ticket, discordUrl: null, confirmed: false });
  expect(addIslandRsvp).not.toHaveBeenCalled();
  expect(createAlumniMember).not.toHaveBeenCalled();
});

test("500 when the insert throws, logged under the island tag", async () => {
  const log = jest.spyOn(console, "error").mockImplementation(() => {});
  state({ kind: "canRsvp" }, { isAdmin: true });
  const failure = new Error("db down");
  (addIslandRsvp as jest.Mock).mockRejectedValue(failure);
  const res = await POST();
  expect(res.status).toBe(500);
  expect(await res.json()).not.toHaveProperty("ticket");
  expect(log).toHaveBeenCalledWith("[island-rsvp]", failure);
  log.mockRestore();
});
