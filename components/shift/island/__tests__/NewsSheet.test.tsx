import { act, fireEvent, render, screen, within } from "@testing-library/react";

import type { IslandNews, TeamNews } from "@/lib/supabase/shift-quests/playerTypes";

import { NEWS } from "../news/copy";
import { NewsSheet } from "../news/NewsSheet";
import { TeamCard } from "../news/TeamCard";

const hideTeamNews = jest.fn();

jest.mock("@/app/shift/island/news-actions", () => ({
  hideTeamNews: (input: unknown) => hideTeamNews(input),
}));

jest.mock("../IslandSheet", () => {
  const { createElement } = jest.requireActual<typeof import("react")>("react");
  return {
    IslandSheet: ({ open, title, description, children }: { open: boolean; title: string; description?: string; children: unknown }) =>
      open
        ? createElement("div", { role: "dialog", "aria-label": title }, createElement("p", null, description), children as never)
        : null,
  };
});

function team(over: Partial<TeamNews> = {}): TeamNews {
  return {
    slot: 3,
    name: "ร้านขนม",
    day: { summary: "ทีมทดสอบต้นแบบกับลูกค้า 5 คน", noUpdate: false, at: "2026-11-12T13:00:05Z", day: null },
    week: null,
    ...over,
  };
}

function news(over: Partial<IslandNews> = {}): IslandNews {
  return {
    enabled: true,
    day: "2026-11-12",
    weekOf: null,
    teams: [
      team(),
      team({ slot: 7, name: "เกมฝึกภาษา", day: { summary: null, noUpdate: true, at: "2026-11-12T13:00:06Z", day: null } }),
    ],
    ...over,
  };
}

beforeEach(() => {
  hideTeamNews.mockReset().mockResolvedValue({ ok: true, data: null });
});

describe("NewsSheet", () => {
  it("always shows the AI label and the opt-in note, then a card per team with news and one line for the rest", () => {
    render(<NewsSheet open onClose={jest.fn()} news={news()} staff={false} />);
    const sheet = screen.getByRole("dialog", { name: NEWS.title });
    expect(within(sheet).getByText(NEWS.aiLabel)).toBeInTheDocument();
    expect(within(sheet).getByText(NEWS.optInNote)).toBeInTheDocument();
    const cards = within(within(sheet).getByRole("list", { name: NEWS.listLabel })).getAllByRole("article");
    expect(cards).toHaveLength(1);
    expect(within(cards[0]).getByRole("heading", { name: NEWS.plot(3, "ร้านขนม") })).toBeInTheDocument();
    expect(cards[0]).toHaveTextContent("ทีมทดสอบต้นแบบกับลูกค้า 5 คน");
    expect(within(sheet).getByText(NEWS.quiet(NEWS.quietPlot(7)))).toBeInTheDocument();
  });

  it("puts teams with news first and gives staff a card for every team (to hide one)", () => {
    const quietFirst = news({ teams: [team({ slot: 1, name: "เงียบ", day: null }), team({ slot: 9, name: "มีข่าว" })] });
    render(<NewsSheet open onClose={jest.fn()} news={quietFirst} staff />);
    const cards = within(screen.getByRole("list", { name: NEWS.listLabel })).getAllByRole("article");
    expect(cards.map((c) => within(c).getByRole("heading", { level: 3 }).textContent)).toEqual([NEWS.plot(9, "มีข่าว"), NEWS.plot(1, "เงียบ")]);
  });

  it("labels each summary by the day it is for: today, an earlier date, last week's recap", () => {
    const { rerender } = render(
      <TeamCard team={team({ day: { summary: "ข่าว", noUpdate: false, at: "", day: "2026-11-12" } })} staff={false} today="2026-11-12" />,
    );
    expect(screen.getByText(NEWS.today)).toBeInTheDocument();
    rerender(
      <TeamCard
        team={team({
          day: { summary: "ข่าว", noUpdate: false, at: "", day: "2026-11-11" },
          week: { summary: "สรุป", noUpdate: false, at: "", day: "2026-11-08" },
        })}
        staff={false}
        today="2026-11-12"
      />,
    );
    expect(screen.queryByText(NEWS.today)).toBeNull();
    expect(screen.getByText(NEWS.lastWeek)).toBeInTheDocument();
    rerender(<TeamCard team={team({ week: { summary: "สรุป", noUpdate: false, at: "", day: "2026-11-15" } })} staff={false} today="2026-11-15" />);
    expect(screen.getByText(NEWS.week)).toBeInTheDocument();
  });

  it("says so when no team is in the news yet", () => {
    render(<NewsSheet open onClose={jest.fn()} news={news({ teams: [] })} staff={false} />);
    expect(screen.getByText(NEWS.empty)).toBeInTheDocument();
    expect(screen.queryByRole("list")).toBeNull();
  });

  it("shows no staff controls and no hidden list to students, even if a hidden list arrived", () => {
    render(<NewsSheet open onClose={jest.fn()} news={news({ hidden: [{ slot: 9, name: "ทีมเงียบ" }] })} staff={false} />);
    expect(screen.queryByRole("button", { name: NEWS.hide })).toBeNull();
    expect(screen.queryByText(NEWS.hiddenHeading)).toBeNull();
    expect(screen.queryByText(/ทีมเงียบ/)).toBeNull();
  });

  it("gives staff a hide button per team and the hidden list with show buttons", async () => {
    render(<NewsSheet open onClose={jest.fn()} news={news({ hidden: [{ slot: 9, name: "ทีมเงียบ" }] })} staff />);
    expect(screen.getAllByRole("button", { name: NEWS.hide })).toHaveLength(2);
    expect(screen.getByRole("heading", { name: NEWS.hiddenHeading })).toBeInTheDocument();
    expect(screen.getByText(NEWS.plot(9, "ทีมเงียบ"))).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: NEWS.show }));
    });
    expect(hideTeamNews).toHaveBeenCalledWith({ slot: 9, hidden: false });
    expect(screen.getByRole("status")).toHaveTextContent(NEWS.shown);
  });

  it("renders nothing while closed", () => {
    render(<NewsSheet open={false} onClose={jest.fn()} news={news()} staff={false} />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

describe("TeamCard", () => {
  it("shows today's summary and the weekly recap with the AI line, and nothing about people", () => {
    render(
      <TeamCard
        team={team({ week: { summary: "สัปดาห์นี้ทีมผ่านเควสต์ที่ 2", noUpdate: false, at: "2026-11-08T13:00:00Z", day: null } })}
        staff={false}
      />
    );
    const card = screen.getByRole("article", { name: NEWS.plot(3, "ร้านขนม") });
    expect(card).toHaveTextContent("ทีมทดสอบต้นแบบกับลูกค้า 5 คน");
    expect(within(card).getByRole("heading", { name: NEWS.week })).toBeInTheDocument();
    expect(card).toHaveTextContent("สัปดาห์นี้ทีมผ่านเควสต์ที่ 2");
    expect(card).toHaveTextContent(NEWS.aiShort);
    expect(within(card).queryByRole("link")).toBeNull();
    expect(within(card).queryByRole("img")).toBeNull();
  });

  it("says there is no update yet when the day has no summary or no row", () => {
    const { rerender } = render(<TeamCard team={team({ day: { summary: null, noUpdate: true, at: "", day: null } })} staff={false} />);
    expect(screen.getByText(NEWS.noUpdate)).toBeInTheDocument();
    rerender(<TeamCard team={team({ day: null })} staff={false} />);
    expect(screen.getByText(NEWS.noUpdate)).toBeInTheDocument();
    expect(screen.getByText(NEWS.aiShort)).toBeInTheDocument();
  });

  it("lets staff hide a team with an optional reason", async () => {
    render(<TeamCard team={team()} staff />);
    fireEvent.click(screen.getByRole("button", { name: NEWS.hide }));
    fireEvent.change(screen.getByLabelText(NEWS.hideReason), { target: { value: "  สรุปไม่ตรงกับงาน  " } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: NEWS.hideConfirm }));
    });
    expect(hideTeamNews).toHaveBeenCalledWith({ slot: 3, hidden: true, reason: "สรุปไม่ตรงกับงาน" });
    expect(screen.getByRole("status")).toHaveTextContent(NEWS.hidden);
  });

  it("shows the database's refusal in Thai and keeps the form", async () => {
    hideTeamNews.mockResolvedValue({ ok: false, code: "not_authorized", error: "ส่วนนี้สำหรับทีมพี่เลี้ยงที่ได้รับสิทธิ์เท่านั้น" });
    render(<TeamCard team={team()} staff />);
    fireEvent.click(screen.getByRole("button", { name: NEWS.hide }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: NEWS.hideConfirm }));
    });
    expect(hideTeamNews).toHaveBeenCalledWith({ slot: 3, hidden: true, reason: null });
    expect(screen.getByRole("alert")).toHaveTextContent("ส่วนนี้สำหรับทีมพี่เลี้ยงที่ได้รับสิทธิ์เท่านั้น");
    expect(screen.getByRole("button", { name: NEWS.hideConfirm })).toBeInTheDocument();
  });

  it("can cancel the hide form", () => {
    render(<TeamCard team={team()} staff />);
    fireEvent.click(screen.getByRole("button", { name: NEWS.hide }));
    fireEvent.click(screen.getByRole("button", { name: NEWS.cancel }));
    expect(screen.getByRole("button", { name: NEWS.hide })).toBeInTheDocument();
    expect(hideTeamNews).not.toHaveBeenCalled();
  });
});
