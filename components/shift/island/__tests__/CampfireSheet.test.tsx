import { render, screen, within } from "@testing-library/react";

import type { CampfireSummary } from "@/lib/supabase/shift-quests/types";

import { CampfireSheet } from "../CampfireSheet";
import type { CampfireNamesState } from "../useCampfire";

// vaul needs layout APIs jsdom lacks; the sheet only has to show its content when open.
jest.mock("../IslandSheet", () => {
  const { createElement } = jest.requireActual<typeof import("react")>("react");
  return {
    IslandSheet: ({ open, title, description, children }: { open: boolean; title: string; description?: string; children: unknown }) =>
      open
        ? createElement(
            "div",
            { role: "dialog", "aria-label": title },
            createElement("p", { "data-testid": "sheet-description" }, description),
            children as never,
          )
        : null,
  };
});

const JOIN = "https://discord.com/channels/111111111111111111/222222222222222222";
const SUMMARY: CampfireSummary = { count: 3, joinUrl: JOIN };

function show(names: CampfireNamesState, summary: CampfireSummary = SUMMARY) {
  const onClose = jest.fn();
  render(<CampfireSheet open onClose={onClose} summary={summary} names={names} />);
  return screen.getByRole("dialog", { name: "ห้อง coworking" });
}

describe("CampfireSheet", () => {
  it("lists who is in the room by name, with the count", () => {
    const sheet = show({ state: "ready", names: ["Ploy", "มิ้นต์", "Ploy"] });
    expect(screen.getByTestId("sheet-description")).toHaveTextContent("ทำงานไปด้วยกันในห้องเสียงของ SHIFT");
    expect(within(sheet).getByText("3 คนกำลังทำงานอยู่")).toBeInTheDocument();
    const list = within(sheet).getByRole("list", { name: "คนที่อยู่ในห้องตอนนี้" });
    // Display names can repeat; each person is one line.
    expect(within(list).getAllByRole("listitem").map((item) => item.textContent)).toEqual(["Ploy", "มิ้นต์", "Ploy"]);
  });

  it("counts everyone even when the server lists fewer names", () => {
    const sheet = show({ state: "ready", names: ["Ploy"] }, { count: 60, joinUrl: JOIN });
    expect(within(sheet).getByText("60 คนกำลังทำงานอยู่")).toBeInTheDocument();
  });

  it("invites the student in when nobody is there yet", () => {
    const sheet = show({ state: "ready", names: [] }, { count: 0, joinUrl: JOIN });
    expect(within(sheet).getByText("ตอนนี้ยังไม่มีใครในห้อง เข้าไปเริ่มก่อนได้")).toBeInTheDocument();
    expect(within(sheet).queryByRole("list")).toBeNull();
  });

  it("says the names did not load, and keeps the count and the way in", () => {
    const sheet = show({ state: "error", names: [] });
    expect(within(sheet).getByRole("status")).toHaveTextContent("ตอนนี้โหลดรายชื่อไม่ได้");
    expect(within(sheet).getByText("3 คนกำลังทำงานอยู่")).toBeInTheDocument();
    expect(within(sheet).getByRole("link", { name: "เข้าห้อง" })).toHaveAttribute("href", JOIN);
  });

  it("shows a loading line until the names arrive", () => {
    for (const state of ["idle", "loading"] as const) {
      const { unmount } = render(<CampfireSheet open onClose={jest.fn()} summary={SUMMARY} names={{ state, names: [] }} />);
      expect(screen.getByRole("status")).toHaveTextContent("กำลังโหลดรายชื่อ");
      expect(screen.queryByRole("list")).toBeNull();
      unmount();
    }
  });

  it("joins the voice channel in Discord, in a new tab", () => {
    const sheet = show({ state: "ready", names: ["Ploy"] });
    const join = within(sheet).getByRole("link", { name: "เข้าห้อง" });
    expect(join).toHaveAttribute("href", JOIN);
    expect(join).toHaveAttribute("target", "_blank");
    expect(join).toHaveAttribute("rel", "noopener noreferrer");
    expect(join).toHaveClass("ei-button-dawn");
    expect(within(sheet).getByText("กองไฟบนเกาะเก็บแค่ว่าใครอยู่ในห้องตอนนี้ และลบทันทีเมื่อออก")).toBeInTheDocument();
  });

  it("shows names only: no avatars, no Discord ids, no plots", () => {
    const sheet = show({ state: "ready", names: ["Ploy", "มิ้นต์"] });
    expect(sheet.querySelector("img")).toBeNull();
    expect(sheet.textContent).not.toMatch(/\d{15,}/);
    expect(sheet.textContent).not.toMatch(/แปลง|#\d/);
    // The only link is the room itself.
    expect(within(sheet).getAllByRole("link")).toHaveLength(1);
  });

  it("renders nothing while closed", () => {
    render(<CampfireSheet open={false} onClose={jest.fn()} summary={SUMMARY} names={{ state: "idle", names: [] }} />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
