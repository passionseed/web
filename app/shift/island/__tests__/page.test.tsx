/** @jest-environment node */
import type { ReactElement } from "react";

import { IslandApp } from "@/components/shift/island/IslandApp";
import { IslandGate } from "@/components/shift/island/IslandGate";
import { IslandInvite } from "@/components/shift/island/IslandInvite";
import { StartCard } from "@/components/shift/island/StartCard";
import type { IslandViewer as InviteViewer } from "@/lib/shift/islandInvite";
import type { IslandViewer as GameViewer } from "@/lib/supabase/shift-quests/types";

const loadIslandViewer = jest.fn();
const resolveIslandViewer = jest.fn();
const getIslandPage = jest.fn();

jest.mock("@/lib/supabase/shift-island-viewer", () => ({ loadIslandViewer: () => loadIslandViewer() }));
jest.mock("@/lib/supabase/shift-quests/viewer", () => ({ resolveIslandViewer: () => resolveIslandViewer() }));
jest.mock("@/lib/supabase/shift-quests/page", () => ({ getIslandPage: (v: unknown) => getIslandPage(v) }));
jest.mock("@/lib/shift-island/picture", () => ({ islandPicture: () => null }));

import Page from "../page";

const going: InviteViewer = {
  kind: "going",
  ticket: { nickname: "มิ้นต์", cohort: "SHIFT รุ่น 3" },
  discordUrl: null,
  confirmed: true,
};
const me = { name: "มิ้นต์", avatarUrl: null, staff: false };

function invite(viewer: InviteViewer) {
  loadIslandViewer.mockResolvedValue({ viewer, userId: viewer.kind === "signedOut" ? null : "u1", input: {} });
}

function game(viewer: Partial<GameViewer> & { state: GameViewer["state"] }) {
  resolveIslandViewer.mockResolvedValue(viewer);
}

/** Walks the page's server tree down to the invitation, the game or one of its cards. */
async function find(params: Record<string, string> = {}) {
  let node = (await Page({ searchParams: Promise.resolve(params) })) as ReactElement<Record<string, unknown>>;
  const wanted = new Set<unknown>([IslandInvite, IslandApp, IslandGate, StartCard]);
  for (let i = 0; i < 6 && !wanted.has(node.type); i++) {
    // The page's own Invitation wrapper is rendered; frames (IslandShell) are looked into.
    if (typeof node.type === "function" && node.type.name === "Invitation") {
      node = (node.type as (p: unknown) => ReactElement<Record<string, unknown>>)(node.props);
    } else {
      node = node.props.children as ReactElement<Record<string, unknown>>;
    }
  }
  return node;
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, "error").mockImplementation(() => {});
});

describe("/shift/island: one page for the invitation and the game", () => {
  it("shows a signed-out visitor the invitation, without asking the game", async () => {
    invite({ kind: "signedOut" });
    const node = await find();
    expect(node.type).toBe(IslandInvite);
    expect(node.props.door).toBeNull();
    expect(resolveIslandViewer).not.toHaveBeenCalled();
  });

  it("keeps an eligible student who has not RSVPed on the invitation", async () => {
    invite({ kind: "canRsvp" });
    game({ state: "not_started", me, actor: "a", userId: "u1" } as GameViewer);
    expect((await find()).type).toBe(IslandInvite);
  });

  it("opens the game's start card for an RSVPed, eligible student", async () => {
    invite(going);
    game({ state: "not_started", me, actor: "a", userId: "u1" } as GameViewer);
    expect((await find()).type).toBe(StartCard);
  });

  it("opens the game for an RSVPed player who has started", async () => {
    invite(going);
    game({ state: "ready", me, actor: "a", userId: "u1", session: {} } as GameViewer);
    getIslandPage.mockResolvedValue({ me, island: { project: null }, board: null, map: null });
    expect((await find()).type).toBe(IslandApp);
  });

  it("lets staff into the game without an RSVP", async () => {
    invite({ kind: "notAlumni" });
    game({ state: "not_started", me: { ...me, staff: true }, actor: "a", userId: "u1" } as GameViewer);
    expect((await find()).type).toBe(StartCard);
  });

  it("puts the right door under the ticket when the game does not let an RSVPed visitor in yet", async () => {
    invite(going);
    game({ state: "no_discord", accountLabel: null } as GameViewer);
    expect((await find()).props.door).toBe("discord");

    game({ state: "not_eligible", reason: "no_role", me } as GameViewer);
    expect((await find()).props.door).toBe("waiting");

    game({ state: "unavailable", reason: "not_configured" } as GameViewer);
    expect((await find()).props.door).toBe("closed");
  });

  it("opens on the letter when sent back to the seal", async () => {
    invite({ kind: "canRsvp" });
    game({ state: "no_discord", accountLabel: null } as GameViewer);
    expect((await find({ at: "seal" })).props.initialScene).toBe("letter");
    expect((await find({ at: "elsewhere" })).props.initialScene).toBeUndefined();
  });

  it("shows a failed Discord sign-in from the ticket's door on the game's card", async () => {
    invite(going);
    game({ state: "no_discord", accountLabel: null } as GameViewer);
    const node = await find({ auth_error: "discord_auth" });
    expect(node.type).toBe(IslandGate);
    expect(node.props.authError).toBe("discord_auth");
    // An unknown code is ignored: the invitation, with its door.
    expect((await find({ auth_error: "made_up" })).type).toBe(IslandInvite);
  });
});
