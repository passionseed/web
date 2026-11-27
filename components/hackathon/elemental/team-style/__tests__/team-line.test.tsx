import { render, screen } from "@testing-library/react";

import { DEFAULT_STYLE, TEAM_STYLE_TIERS, type TeamStyleCardData } from "@/lib/hackathon/elemental/team-style";

import { demoStyleCard } from "../demo";
import { TeamLine, teamLineParts } from "../TeamLine";

const base: TeamStyleCardData = {
  key: "tabc",
  boardName: "ไฟป่า",
  solo: false,
  style: DEFAULT_STYLE,
  devices: 0,
  paid: 0,
  rank: null,
  teamsOnBoard: 23,
  editable: true,
  final: false,
  shareHref: null,
};

describe("the team line's text", () => {
  it("asks for a name first", () => {
    expect(teamLineParts({ ...base, boardName: null, devices: 6 })).toEqual(["ตั้งชื่อเพื่อขึ้นกระดาน"]);
  });

  it("says one device puts a named team on the board", () => {
    expect(teamLineParts(base)).toEqual(["ยังไม่ขึ้นกระดาน", "อีก 1 เครื่องขึ้นกระดาน"]);
  });

  it("gives the rank, the last unlock and what unlocks next, as text (no meter)", () => {
    expect(teamLineParts({ ...base, rank: 5, devices: TEAM_STYLE_TIERS.font + 6 })).toEqual([
      "อันดับ 5 จาก 23",
      "ปลดล็อกฟอนต์แล้ว",
      `อีก ${TEAM_STYLE_TIERS.effect - TEAM_STYLE_TIERS.font - 6} เครื่อง ปลดล็อกเอฟเฟกต์`,
    ]);
    expect(teamLineParts({ ...base, rank: 19, devices: 4 })).toEqual(["อันดับ 19 จาก 23", `อีก ${TEAM_STYLE_TIERS.color - 4} เครื่อง ปลดล็อกสี`]);
    expect(teamLineParts({ ...base, rank: 1, devices: 142 })).toEqual(["อันดับ 1 จาก 23", "ปลดล็อกครบแล้ว"]);
  });

  it("says final after close, and whether names can still change", () => {
    expect(teamLineParts({ ...base, rank: 1, devices: 142, final: true })).toEqual(["ผลสุดท้าย อันดับ 1 จาก 23", "ปิดนับแล้ว แต่งชื่อได้ถึงวัน Demo Day"]);
    expect(teamLineParts({ ...base, rank: 1, devices: 142, final: true, editable: false })).toEqual(["ผลสุดท้าย อันดับ 1 จาก 23", "ปิดแก้ไขแล้ว"]);
  });
});

describe("TeamLine", () => {
  it("links to the team editor route and the board, and keeps the pay token out of the board link", () => {
    render(<TeamLine token={"a".repeat(32)} data={{ ...base, rank: 5, devices: 31 }} />);
    expect(screen.getByRole("link", { name: /แต่งชื่อ/ }).getAttribute("href")).toBe(`/hackathon/join/${"a".repeat(32)}/team`);
    const board = screen.getByRole("link", { name: /กระดาน/ }).getAttribute("href");
    expect(board).toBe("/hackathon/elemental/leaderboard#tabc");
    expect(screen.getByText("ไฟป่า")).toBeTruthy();
  });

  it("offers no edit link once names can't change, and uses the demo's own editor link", () => {
    const { unmount } = render(<TeamLine token="demo" demo data={demoStyleCard("closed", { solo: false })} />);
    expect(screen.queryByRole("link", { name: /แต่งชื่อ/ })).toBeNull();
    unmount();
    render(<TeamLine token="demo" demo data={demoStyleCard("fonts", { solo: true })} />);
    expect(screen.getByRole("link", { name: /แต่งชื่อ/ }).getAttribute("href")).toBe("/hackathon/join/demo/team?style=fonts&mode=solo");
  });
});
