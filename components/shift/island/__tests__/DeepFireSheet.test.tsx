import { fireEvent, render, screen, within } from "@testing-library/react";

import type { DeepFire } from "@/lib/supabase/shift-quests/types";

import { DEEPFIRE } from "../copy";
import { DeepFireSheet } from "../DeepFireSheet";

// vaul needs layout APIs jsdom lacks; the sheet only has to show its content when open, and close on Escape.
jest.mock("../IslandSheet", () => {
  const { createElement } = jest.requireActual<typeof import("react")>("react");
  return {
    IslandSheet: ({
      open,
      onOpenChange,
      title,
      description,
      children,
    }: {
      open: boolean;
      onOpenChange: (open: boolean) => void;
      title: string;
      description?: string;
      children: unknown;
    }) =>
      open
        ? createElement(
            "div",
            { role: "dialog", "aria-label": title, onKeyDown: (event: KeyboardEvent) => event.key === "Escape" && onOpenChange(false) },
            createElement("p", { "data-testid": "sheet-description" }, description),
            children as never,
          )
        : null,
  };
});

const LOBBY = "https://discord.com/channels/111111111111111111/666666666666666666";
const LIT: DeepFire = { joinUrl: LOBBY, live: true };

function show(deepfire: DeepFire = LIT, cohortWeek?: boolean) {
  const onClose = jest.fn();
  render(<DeepFireSheet open onClose={onClose} deepfire={deepfire} cohortWeek={cohortWeek} />);
  return { sheet: screen.getByRole("dialog", { name: "กองไฟโฟกัส" }), onClose };
}

describe("DeepFireSheet", () => {
  it("says what happens in one line, with one way in: จุดไฟ to the lobby, in a new tab", () => {
    const { sheet } = show();
    expect(screen.getByTestId("sheet-description")).toHaveTextContent(DEEPFIRE.body);
    const link = within(sheet).getByRole("link", { name: "จุดไฟ" });
    expect(link).toHaveAttribute("href", LOBBY);
    expect(link).toHaveAttribute("target", "_blank");
    expect(link.getAttribute("rel")).toContain("noopener");
    expect(within(sheet).getAllByRole("link")).toHaveLength(1);
    expect(within(sheet).queryByRole("button", { name: "จุดไฟ" })).toBeNull();
    expect(within(sheet).queryByRole("status")).toBeNull();
  });

  it("greys the button while the keeper is away, and says to try again soon (never when)", () => {
    const { sheet } = show({ joinUrl: LOBBY, live: false });
    expect(within(sheet).queryByRole("link")).toBeNull();
    expect(within(sheet).getByRole("button", { name: "จุดไฟ" })).toBeDisabled();
    expect(within(sheet).getByRole("status")).toHaveTextContent(DEEPFIRE.asleep);
    expect(DEEPFIRE.asleep).not.toMatch(/พรุ่งนี้|\d/);
  });

  it("prints who can see the room, that nobody else can enter, that it goes when you leave and that nothing is kept", () => {
    const { sheet } = show();
    expect(within(sheet).getByText(DEEPFIRE.fine)).toBeInTheDocument();
    // No count, no names: nothing about who sits at any deep fire.
    expect(sheet.textContent).not.toMatch(/\d+ คน/);
  });

  it("says shift-voice records the room's voice time only in a SHIFT cohort week", () => {
    show(LIT, true);
    expect(screen.getByText(DEEPFIRE.cohort)).toBeInTheDocument();
  });

  it.each([[false], [undefined]])("says nothing about recorded time outside a cohort week (cohortWeek %p)", (cohortWeek) => {
    const { sheet } = show(LIT, cohortWeek);
    expect(within(sheet).queryByText(DEEPFIRE.cohort)).toBeNull();
  });

  it("closes when the sheet closes", () => {
    const { sheet, onClose } = show();
    fireEvent.keyDown(sheet, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("never claims nobody counts the time, and keeps the house copy rules", () => {
    const all = Object.values(DEEPFIRE).join(" ");
    expect(all).not.toMatch(/ไม่มีใครนับ/);
    expect(all).not.toMatch(/[—–]|น้อง|เด็ก|พรุ่งนี้/);
    expect(DEEPFIRE.title).toBe("กองไฟโฟกัส");
    expect(DEEPFIRE.join).toBe("จุดไฟ");
  });
});
