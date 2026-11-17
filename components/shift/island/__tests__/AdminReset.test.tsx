import { act, fireEvent, render, screen, within } from "@testing-library/react";
import type { ComponentProps } from "react";

import { AdminReset, clearIslandKeys } from "../AdminReset";
import { ADMIN_RESET, HUD } from "../copy";
import { MenuSheet } from "../HudSheets";
import { STORY_SEEN_KEY } from "../story/useStorySeen";
import { DAY_INTENTION_KEY } from "../useDayIntention";
import { RESULTS_SEEN_KEY } from "../useResultsSeen";

const resetMyIsland = jest.fn();
jest.mock("@/app/shift/island/admin-actions", () => ({ resetMyIsland: () => resetMyIsland() }));
jest.mock("@/app/shift/island/actions", () => ({ setShowName: jest.fn() }));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock("../IslandDiscordButton", () => ({ IslandDiscordButton: () => null }));
jest.mock("../IslandSheet", () => {
  const { createElement } = jest.requireActual<typeof import("react")>("react");
  return {
    IslandSheet: ({ open, title, children }: { open: boolean; title: string; children: unknown }) =>
      open ? createElement("div", { role: "dialog", "aria-label": title }, children as never) : null,
  };
});

const PROJECT = { id: "55555555-5555-4555-8555-000000000001", show_name: false, name_visible: false };

function menu(me: ComponentProps<typeof MenuSheet>["me"]) {
  return render(
    <MenuSheet open onClose={jest.fn()} me={me} project={PROJECT} whole={false} onToggleWhole={jest.fn()} tiles={[]} />,
  );
}

beforeEach(() => {
  resetMyIsland.mockReset();
  window.localStorage.clear();
});

describe("MenuSheet: the admin's own reset", () => {
  it.each([
    ["a student", { name: "พลอย", avatarUrl: null, staff: false }],
    ["a reviewer", { name: "พี่เลี้ยง", avatarUrl: null, staff: true }],
    ["a staff card with admin false", { name: "พี่เลี้ยง", avatarUrl: null, staff: true, admin: false }],
  ])("is hidden from %s", (_label, me) => {
    menu(me);
    const sheet = screen.getByRole("dialog", { name: HUD.menu });
    expect(within(sheet).queryByRole("button", { name: ADMIN_RESET.open })).toBeNull();
    expect(within(sheet).queryByText(ADMIN_RESET.heading)).toBeNull();
  });

  it("shows to an admin, with the testing-only hint", () => {
    menu({ name: "บิ๊ก", avatarUrl: null, staff: true, admin: true });
    const button = screen.getByRole("button", { name: ADMIN_RESET.open });
    expect(button).toHaveAccessibleDescription(ADMIN_RESET.hint);
  });
});

describe("AdminReset", () => {
  it("asks first, listing what goes, and cancelling calls nothing", () => {
    render(<AdminReset reload={jest.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: ADMIN_RESET.open }));
    const group = screen.getByRole("group", { name: ADMIN_RESET.confirmTitle });
    for (const line of ADMIN_RESET.removes) expect(within(group).getByText(line)).toBeInTheDocument();
    expect(within(group).getByText(ADMIN_RESET.keeps)).toBeInTheDocument();
    fireEvent.click(within(group).getByRole("button", { name: ADMIN_RESET.cancel }));
    expect(resetMyIsland).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: ADMIN_RESET.open })).toBeInTheDocument();
  });

  it("resets, forgets the story, the day's intention and the envelope's mark, and reloads", async () => {
    window.localStorage.setItem(STORY_SEEN_KEY, "seen");
    window.localStorage.setItem(DAY_INTENTION_KEY, JSON.stringify({ day: 1, text: "คุย", who: "m1" }));
    window.localStorage.setItem(RESULTS_SEEN_KEY, JSON.stringify({ who: "m1", at: 1 }));
    resetMyIsland.mockResolvedValue({ ok: true, data: { project: "archived", quests: 2, keptQuests: 0 } });
    const reload = jest.fn();
    render(<AdminReset reload={reload} />);
    fireEvent.click(screen.getByRole("button", { name: ADMIN_RESET.open }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: ADMIN_RESET.confirm }));
    });
    expect(resetMyIsland).toHaveBeenCalledTimes(1);
    expect(window.localStorage.getItem(STORY_SEEN_KEY)).toBeNull();
    expect(window.localStorage.getItem(DAY_INTENTION_KEY)).toBeNull();
    expect(window.localStorage.getItem(RESULTS_SEEN_KEY)).toBeNull();
    expect(reload).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("status")).toHaveTextContent(ADMIN_RESET.done);
  });

  it("shows the refusal and keeps the story and the page", async () => {
    window.localStorage.setItem(STORY_SEEN_KEY, "seen");
    resetMyIsland.mockResolvedValue({ ok: false, code: "reset_blocked", error: "รีเซ็ตไม่ได้" });
    const reload = jest.fn();
    render(<AdminReset reload={reload} />);
    fireEvent.click(screen.getByRole("button", { name: ADMIN_RESET.open }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: ADMIN_RESET.confirm }));
    });
    expect(screen.getByRole("alert")).toHaveTextContent("รีเซ็ตไม่ได้");
    expect(window.localStorage.getItem(STORY_SEEN_KEY)).toBe("seen");
    expect(reload).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: ADMIN_RESET.confirm })).toBeEnabled();
  });

  it("clearIslandKeys survives storage that throws", () => {
    const storage = { removeItem: jest.fn(() => { throw new Error("private mode"); }) };
    expect(() => clearIslandKeys(storage)).not.toThrow();
    expect(storage.removeItem).toHaveBeenCalledWith(STORY_SEEN_KEY);
  });
});
