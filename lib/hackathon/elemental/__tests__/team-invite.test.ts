import { cleanFunnelEvent } from "../funnel";
import { parseTeamCode } from "../team-change";
import {
  INVITE_ASK,
  inviteAsk,
  inviteDetail,
  inviteSeats,
  lineShareUrl,
  paidInviteState,
  teamInviteMessage,
  teamInviteUrl,
} from "../team-invite";

describe("the team invite link", () => {
  it("is the sign-up link with the team's invite code, marked src=team", () => {
    const url = teamInviteUrl("https://passionseed.org", "0123456789ab");
    expect(url).toBe("https://passionseed.org/hackathon/join?team=0123456789ab&src=team");
    // A friend who has already signed up can paste the same link on their own page.
    expect(parseTeamCode(url)).toBe("0123456789ab");
  });

  it("goes out with the team's name, and LINE gets the whole message in one parameter", () => {
    const url = teamInviteUrl("https://passionseed.org", "0123456789ab");
    const message = teamInviteMessage("ไฟป่า", url);
    expect(message).toContain("ไฟป่า");
    expect(message).toContain(url);
    const line = new URL(lineShareUrl(message));
    expect(line.origin + line.pathname).toBe("https://line.me/R/share");
    expect(line.searchParams.get("text")).toBe(message);
  });
});

describe("inviteAsk", () => {
  it("asks for two friends, or the seats that are left", () => {
    expect(INVITE_ASK).toBe(2);
    expect(inviteAsk(4)).toBe(2);
    expect(inviteAsk(1)).toBe(1);
    expect(inviteAsk(0)).toBe(0);
    expect(inviteAsk(-1)).toBe(0);
  });
});

describe("paidInviteState", () => {
  const open = { teamChangeOpen: true, signUpOpen: true };

  it("sends the link when the team has seats left", () => {
    expect(paidInviteState({ ...open, team: { spotsLeft: 4 } })).toBe("invite");
    expect(paidInviteState({ ...open, team: { spotsLeft: 0 } })).toBeNull();
  });

  it("starts a team first while team changes are open", () => {
    expect(paidInviteState({ ...open, team: null })).toBe("start");
    expect(paidInviteState({ ...open, teamChangeOpen: false, team: null })).toBeNull();
  });

  it("still sends the link of a team after team changes close, while friends can sign up", () => {
    expect(paidInviteState({ ...open, teamChangeOpen: false, team: { spotsLeft: 3 } })).toBe("invite");
  });

  it("asks nothing once sign-up has closed", () => {
    expect(paidInviteState({ ...open, signUpOpen: false, team: { spotsLeft: 3 } })).toBeNull();
    expect(paidInviteState({ ...open, signUpOpen: false, team: null })).toBeNull();
  });
});

describe("inviteSeats", () => {
  it("shows the members, then the two friends asked for, then the open seats", () => {
    expect(inviteSeats([{ paid: true }], 5)).toEqual(["paid", "ask", "ask", "open", "open"]);
    expect(inviteSeats([{ paid: true }, { paid: false }], 5)).toEqual(["paid", "unpaid", "ask", "ask", "open"]);
  });

  it("asks for fewer when fewer seats are left, and none when the team is full", () => {
    expect(inviteSeats([{ paid: true }, { paid: true }, { paid: true }, { paid: true }], 5)).toEqual(["paid", "paid", "paid", "paid", "ask"]);
    expect(inviteSeats(Array.from({ length: 5 }, () => ({ paid: true })), 5)).toEqual(["paid", "paid", "paid", "paid", "paid"]);
  });

  it("counts a person without a team as the one paid seat", () => {
    expect(inviteSeats(null, 5)).toEqual(["paid", "ask", "ask", "open", "open"]);
  });
});

describe("inviteDetail", () => {
  const sid = "6f1c7c1e-1d2b-4c3a-9f00-0a1b2c3d4e5f";

  it("names the spot and the way, in a detail the tracking endpoint accepts", () => {
    for (const how of ["line", "share", "copy"] as const) {
      const detail = inviteDetail("paid", how);
      expect(detail).toBe(`paid:${how}`);
      expect(cleanFunnelEvent({ sid, step: "invite_shared", detail }, "passionseed.org")?.detail).toBe(detail);
    }
  });
});
