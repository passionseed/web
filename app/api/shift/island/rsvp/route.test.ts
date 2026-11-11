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
  });
});

test("existing member RSVPs without creating a member", async () => {
  state({ kind: "canRsvp" }, { member: { nickname: "Pim", cohort: "SHIFT[2]", status: "pending" } });
  const res = await POST();
  expect(createAlumniMember).not.toHaveBeenCalled();
  expect(addIslandRsvp).toHaveBeenCalledWith("u1", "Season 1");
  expect((await res.json()).ticket).toEqual({ nickname: "Pim", cohort: "SHIFT[2]" });
});

test("admin without a member gets the mentor ticket", async () => {
  state({ kind: "canRsvp" }, { isAdmin: true });
  const res = await POST();
  expect(createAlumniMember).not.toHaveBeenCalled();
  expect((await res.json()).ticket).toEqual(MENTOR_TICKET);
});

test("already going returns the same ticket without a second insert", async () => {
  const ticket = { nickname: "Mint", cohort: "SHIFT[1]" };
  state({ kind: "going", ticket, discordUrl: null });
  const res = await POST();
  expect(res.status).toBe(200);
  expect(await res.json()).toEqual({ ok: true, ticket, discordUrl: null });
  expect(addIslandRsvp).not.toHaveBeenCalled();
  expect(createAlumniMember).not.toHaveBeenCalled();
});

test("500 when the insert throws", async () => {
  state({ kind: "canRsvp" }, { isAdmin: true });
  (addIslandRsvp as jest.Mock).mockRejectedValue(new Error("db down"));
  const res = await POST();
  expect(res.status).toBe(500);
  expect(await res.json()).not.toHaveProperty("ticket");
});
