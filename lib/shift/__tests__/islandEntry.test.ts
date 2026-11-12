import { islandEntry, needsGameViewer, type GameState } from "@/lib/shift/islandEntry";
import type { IslandViewer } from "@/lib/shift/islandInvite";

const going: IslandViewer = {
  kind: "going",
  ticket: { nickname: "มิ้นต์", cohort: "SHIFT รุ่น 3" },
  discordUrl: null,
  confirmed: true,
};
const notGoing: IslandViewer[] = [{ kind: "signedOut" }, { kind: "notAlumni" }, { kind: "closed" }, { kind: "canRsvp" }];
const allGame: GameState[] = ["signed_out", "no_discord", "not_eligible", "unavailable", "not_started", "ready"];

describe("islandEntry: one address for the invitation and the game", () => {
  it.each(["ready", "not_started"] as const)("opens the game for an RSVPed, eligible player (%s)", (state) => {
    expect(islandEntry(going, { state })).toEqual({ show: "game" });
  });

  it("shows the invitation, with no door, to everyone who has not RSVPed", () => {
    for (const invite of notGoing) {
      for (const state of allGame) {
        expect(islandEntry(invite, { state })).toEqual({ show: "invite", door: null });
      }
    }
  });

  it("keeps an eligible student who has not RSVPed on the invitation", () => {
    expect(islandEntry({ kind: "canRsvp" }, { state: "ready", staff: false })).toEqual({ show: "invite", door: null });
  });

  it("lets staff the game lets in skip the RSVP", () => {
    expect(islandEntry({ kind: "notAlumni" }, { state: "ready", staff: true })).toEqual({ show: "game" });
    expect(islandEntry({ kind: "canRsvp" }, { state: "not_started", staff: true })).toEqual({ show: "game" });
    // Staff the game keeps out (left the server, say) are not let in by the flag alone.
    expect(islandEntry({ kind: "notAlumni" }, { state: "not_eligible", staff: true })).toEqual({ show: "invite", door: null });
  });

  it("puts a door under the ticket of an RSVPed visitor the game does not let in yet", () => {
    expect(islandEntry(going, { state: "no_discord" })).toEqual({ show: "invite", door: "discord" });
    expect(islandEntry(going, { state: "signed_out" })).toEqual({ show: "invite", door: "discord" });
    expect(islandEntry(going, { state: "not_eligible" })).toEqual({ show: "invite", door: "waiting" });
    expect(islandEntry(going, { state: "unavailable" })).toEqual({ show: "invite", door: "closed" });
  });

  it("asks the game only about visitors who are signed in", () => {
    expect(needsGameViewer({ kind: "signedOut" })).toBe(false);
    expect(needsGameViewer(going)).toBe(true);
    expect(needsGameViewer({ kind: "notAlumni" })).toBe(true);
  });
});
