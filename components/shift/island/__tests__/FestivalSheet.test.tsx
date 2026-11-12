import { fireEvent, render, screen, within } from "@testing-library/react";

import { festivalOf } from "@/lib/shift-island/festival";
import type { SeasonGoal, SeasonView } from "@/lib/supabase/shift-quests/types";

import { FestivalSheet } from "../FestivalSheet";

// vaul needs layout APIs jsdom lacks; the sheet only has to show its content when open.
jest.mock("../IslandSheet", () => {
  const { createElement } = jest.requireActual<typeof import("react")>("react");
  return {
    IslandSheet: ({ open, title, children }: { open: boolean; title: string; children: unknown }) =>
      open ? createElement("div", { role: "dialog", "aria-label": title }, children as never) : null,
  };
});

const GOAL: SeasonGoal = { milestone: 2, target: 10, count: 4, deadline: "2026-11-25", unlock: null, reached: false };

function season(over: Partial<SeasonView> = {}): SeasonView {
  return {
    name: "Season 1",
    demo_day: "2026-11-28",
    days_to_demo: 17,
    table_bar: 3,
    stage_bar: 5,
    stage_at_cutoff: 2,
    qualifies: null,
    goal: GOAL,
    unlocks: [],
    ...over,
  };
}

function show(view: SeasonView, goal: SeasonGoal | null = view.goal) {
  const festival = festivalOf(view, null, []);
  if (!festival) throw new Error("no festival");
  render(<FestivalSheet open onClose={jest.fn()} season={view} festival={festival} goal={goal} />);
  return screen.getByRole("dialog", { name: "เวที Demo Day" });
}

const legend = (sheet: HTMLElement) =>
  within(within(sheet).getByRole("heading", { name: "ที่ลานกลางเกาะ" }).closest("section") as HTMLElement).getAllByRole("listitem");

describe("FestivalSheet", () => {
  it("leads with the sign's line, not the whole season panel", () => {
    const sheet = show(season());
    expect(within(sheet).getByRole("region", { name: "Season 1" })).toHaveTextContent("Demo Day 28 พ.ย. · อีก 17 วัน");
    // The meter and the unlocks stay in the project sheet.
    expect(within(sheet).queryByRole("img", { name: "นับได้ 2 จาก 7 ขั้น" })).toBeNull();
    expect(within(sheet).queryByRole("heading", { name: "ของปลดล็อก" })).toBeNull();
  });

  it("explains the table and stage with the season's own bars, and that only teams showing their name are flagged", () => {
    const sheet = show(season({ table_bar: 4, stage_bar: 6 }));
    const lines = legend(sheet).map((line) => line.textContent);
    expect(lines).toContain("โต๊ะโชว์งาน: นับได้ 4 ขั้น และผ่านเควสต์ 2 เห็นเฉพาะทีมที่โชว์ชื่อบนเกาะ");
    expect(lines).toContain("ขึ้นเวที: นับได้ 6 ขั้น และผ่านเควสต์ 3 เห็นเฉพาะทีมที่โชว์ชื่อบนเกาะ");
  });

  it("ties the lanterns to the island goal", () => {
    const sheet = show(season());
    expect(legend(sheet).map((line) => line.textContent)).toContain("โคมที่ลานสว่างขึ้นทีละดวง ตามเป้าหมายของทั้งเกาะ 4/10");
  });

  it("keeps at most three legend lines, and leaves the lanterns out without a goal", () => {
    expect(legend(show(season()))).toHaveLength(3);
    document.body.innerHTML = "";
    const sheet = show(season({ goal: null }), null);
    expect(legend(sheet)).toHaveLength(2);
    expect(sheet.textContent).not.toMatch(/โคมที่ลาน/);
  });

  it("draws each piece of the plaza beside its line, hidden from screen readers", () => {
    const sheet = show(season());
    for (const line of legend(sheet)) {
      const glyph = line.querySelector("[aria-hidden='true']");
      expect(glyph?.querySelector("svg")).not.toBeNull();
    }
  });

  it("links to the project sheet for the unlocks", () => {
    const view = season();
    const festival = festivalOf(view, null, []);
    if (!festival) throw new Error("no festival");
    const onOpenProject = jest.fn();
    render(<FestivalSheet open onClose={jest.fn()} season={view} festival={festival} goal={view.goal} onOpenProject={onOpenProject} />);
    fireEvent.click(screen.getByRole("button", { name: "ดูของปลดล็อกในหน้าตัวละครของฉัน" }));
    expect(onOpenProject).toHaveBeenCalledTimes(1);
  });

  it("never ranks or names anyone", () => {
    const sheet = show(season({ qualifies: "table" }));
    expect(sheet.textContent).not.toMatch(/อันดับ|ที่ 1|leader/i);
    expect(within(sheet).getByText("ได้โต๊ะโชว์งานใน Demo Day แล้ว")).toBeInTheDocument();
  });
});
