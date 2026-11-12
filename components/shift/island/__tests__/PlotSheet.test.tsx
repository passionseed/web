import { render, screen, within } from "@testing-library/react";

import type { IslandHotspot } from "@/lib/shift-island/picture";
import type { TeamNews } from "@/lib/supabase/shift-quests/playerTypes";

import { PLOT } from "../copy";
import { NEWS } from "../news/copy";
import { PlotSheet } from "../PlotSheet";

jest.mock("@/app/shift/island/news-actions", () => ({ hideTeamNews: jest.fn() }));

jest.mock("../IslandSheet", () => {
  const { createElement } = jest.requireActual<typeof import("react")>("react");
  return {
    IslandSheet: ({ open, title, children }: { open: boolean; title: string; children: unknown }) =>
      open ? createElement("div", { role: "dialog", "aria-label": title }, children as never) : null,
  };
});

function spot(over: Partial<IslandHotspot> = {}): IslandHotspot {
  return { slot: 3, mine: false, plain: false, stage: 2, name: "ร้านขนม", x: 10, y: 10, w: 5, h: 5, ...over };
}

const TEAM: TeamNews = {
  slot: 3,
  name: "ร้านขนม",
  day: { summary: "ทีมทดสอบต้นแบบกับลูกค้า 5 คน", noUpdate: false, at: "2026-11-12T13:00:05Z", day: null },
  week: null,
};

describe("PlotSheet", () => {
  it("shows the plot as before when there is no team card", () => {
    render(<PlotSheet hotspot={spot()} onClose={jest.fn()} />);
    const sheet = screen.getByRole("dialog", { name: PLOT.heading(3) });
    expect(sheet).toHaveTextContent(PLOT.sign("ร้านขนม"));
    expect(within(sheet).queryByRole("article")).toBeNull();
    expect(sheet).not.toHaveTextContent(NEWS.aiShort);
  });

  it("adds the team's AI card under the plot info when the team is in the news", () => {
    render(<PlotSheet hotspot={spot()} onClose={jest.fn()} team={TEAM} />);
    const card = screen.getByRole("article", { name: NEWS.plot(3, "ร้านขนม") });
    expect(card).toHaveTextContent("ทีมทดสอบต้นแบบกับลูกค้า 5 คน");
    expect(card).toHaveTextContent(NEWS.aiShort);
    expect(within(card).queryByRole("button")).toBeNull();
  });

  it("shows no card when the team given is for another plot", () => {
    render(<PlotSheet hotspot={spot({ slot: 4 })} onClose={jest.fn()} team={TEAM} />);
    expect(screen.queryByRole("article")).toBeNull();
  });

  it("shows the hide control to staff only", () => {
    const { rerender } = render(<PlotSheet hotspot={spot()} onClose={jest.fn()} team={TEAM} staff={false} />);
    expect(screen.queryByRole("button", { name: NEWS.hide })).toBeNull();
    rerender(<PlotSheet hotspot={spot()} onClose={jest.fn()} team={TEAM} staff />);
    expect(screen.getByRole("button", { name: NEWS.hide })).toBeInTheDocument();
  });

  it("keeps the student's own plot leading to their board, with the card too", () => {
    render(<PlotSheet hotspot={spot({ mine: true })} onClose={jest.fn()} onBoard={jest.fn()} team={TEAM} />);
    expect(screen.getByRole("dialog", { name: PLOT.mine(3) })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: PLOT.toBoard })).toBeInTheDocument();
    expect(screen.getByRole("article")).toBeInTheDocument();
  });

  it("never shows a sign for a plot that does not show its name", () => {
    render(<PlotSheet hotspot={spot({ name: null, plain: true, stage: 0 })} onClose={jest.fn()} />);
    expect(screen.getByText(PLOT.noSign)).toBeInTheDocument();
  });
});
