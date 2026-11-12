import { fireEvent, render, screen } from "@testing-library/react";

import type { BoardRef } from "@/lib/supabase/shift-quests/board";

import { IDS, makeBoard } from "../__fixtures__/board";
import { questView } from "../model";
import { QuestCard, QuestTile, cardPin, type QuestTileProps } from "../QuestTile";

function renderTile(overrides: Partial<QuestTileProps> = {}) {
  const onOpen = jest.fn();
  render(<QuestTile layout="card" status="available" icon="compass" title="หาเรื่องที่อยากแก้" onOpen={onOpen} {...overrides} />);
  return { onOpen, button: screen.getByRole("button") };
}

function renderCard(ref: BoardRef, keynote: BoardRef | null = null) {
  const view = questView(makeBoard(), ref);
  if (!view) throw new Error("no such quest in the fixture");
  const onOpen = jest.fn();
  render(<QuestCard view={view} keynote={keynote} onOpen={onOpen} />);
  return { onOpen, button: screen.getByRole("button") };
}

const COMMUNITY = "เควสต์ชุมชน: ช่วยเพื่อน หรือพัฒนาชุมชน";

describe("QuestTile card", () => {
  it("is one button named by its title and stamp, with the title and stamp on the note", () => {
    const { button, onOpen } = renderTile();
    expect(button).toHaveAttribute("data-layout", "card");
    expect(button).toHaveAccessibleName("หาเรื่องที่อยากแก้, ทำได้เลย");
    expect(screen.getByText("หาเรื่องที่อยากแก้")).toBeInTheDocument();
    const stamp = screen.getByText("ทำได้เลย");
    expect(stamp).toHaveAttribute("data-status", "available");
    fireEvent.click(button);
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it("names the teammate on a held quest's stamp", () => {
    renderTile({ status: "held", owner: "มิ้นต์" });
    expect(screen.getByText("มิ้นต์ ทำอยู่")).toHaveAttribute("data-status", "held");
  });

  it("is cream-pinned by default and takes the pin it is given", () => {
    expect(renderTile().button).toHaveAttribute("data-pin", "main");
  });

  it.each(["active", "side"] as const)("takes a %s pin", (pin) => {
    expect(renderTile({ pin }).button).toHaveAttribute("data-pin", pin);
  });

  it("keeps the unlock rule as the description, off the note itself", () => {
    const { button } = renderTile({ status: "locked", note: "ปลดล็อกเมื่อผ่าน ลงมือสร้างชิ้นแรก" });
    expect(button).toHaveAccessibleDescription("ปลดล็อกเมื่อผ่าน ลงมือสร้างชิ้นแรก");
    expect(screen.getByText("ปลดล็อกเมื่อผ่าน ลงมือสร้างชิ้นแรก")).toHaveClass("sr-only");
    expect(button).not.toHaveAttribute("aria-disabled");
  });

  it("reads a community quest's meaning before any unlock rule", () => {
    const { button } = renderTile({ community: true, note: "ปลดล็อกเมื่อผ่าน ลงมือสร้างชิ้นแรก" });
    expect(button).toHaveAccessibleDescription(`${COMMUNITY} ปลดล็อกเมื่อผ่าน ลงมือสร้างชิ้นแรก`);
  });

  it("puts a help request in the name and the flag on the icon, with no extra line on the note", () => {
    const { button } = renderTile({ status: "active", help: true });
    expect(button).toHaveAccessibleName("หาเรื่องที่อยากแก้, กำลังทำ, ขอความช่วยเหลือแล้ว");
    expect(screen.queryByText("ขอความช่วยเหลือแล้ว")).toBeNull();
  });

  it("is gold only when the keynote quest has a halo (active or clarification)", () => {
    expect(renderTile({ status: "clarification", keynote: true }).button).toHaveAttribute("data-keynote", "true");
  });

  it("is not gold on a keynote without a halo", () => {
    expect(renderTile({ status: "submitted", keynote: true }).button).not.toHaveAttribute("data-keynote");
  });

  it("has no digits on a main quest card", () => {
    const { button } = renderTile({ community: true, status: "done" });
    expect(button.textContent ?? "").not.toMatch(/\d/);
  });
});

describe("QuestTile row", () => {
  it("shows the note and the help line on screen", () => {
    renderTile({ layout: "row", status: "active", help: true, note: "ปลดล็อกเมื่อผ่าน ลงมือสร้างชิ้นแรก" });
    expect(screen.getByText("ขอความช่วยเหลือแล้ว")).toBeInTheDocument();
    expect(screen.getByText("ปลดล็อกเมื่อผ่าน ลงมือสร้างชิ้นแรก")).not.toHaveClass("sr-only");
    expect(screen.getByRole("button")).not.toHaveAttribute("data-pin");
  });
});

describe("cardPin", () => {
  it("is gold for the caller's open quests, else cream for main and proposed and teal for side", () => {
    for (const status of ["active", "clarification", "paused", "submitted", "appealed"] as const) {
      expect(cardPin({ kind: "side", status })).toBe("active");
    }
    expect(cardPin({ kind: "main", status: "available" })).toBe("main");
    expect(cardPin({ kind: "main", status: "done" })).toBe("main");
    expect(cardPin({ kind: "proposed", status: "declined" })).toBe("main");
    expect(cardPin({ kind: "side", status: "locked" })).toBe("side");
    expect(cardPin({ kind: "side", status: "done" })).toBe("side");
  });
});

describe("QuestCard", () => {
  it.each([6, 7])("marks main quest %i as a community quest", (milestone) => {
    expect(renderCard({ kind: "main", milestone }).button).toHaveAccessibleDescription(COMMUNITY);
  });

  it.each<BoardRef>([
    { kind: "main", milestone: 1 },
    { kind: "side", templateId: IDS.sideFriend },
  ])("does not mark %o as a community quest", (ref) => {
    renderCard(ref);
    expect(screen.queryByText(COMMUNITY)).toBeNull();
  });

  it("describes a locked side quest by what unlocks it and opens it by reference", () => {
    const { button, onOpen } = renderCard({ kind: "side", templateId: IDS.sidePhone });
    expect(button).toHaveAccessibleDescription("ปลดล็อกเมื่อผ่าน ลงมือสร้างชิ้นแรก");
    expect(button).toHaveAttribute("data-pin", "side");
    fireEvent.click(button);
    expect(onOpen).toHaveBeenCalledWith({ kind: "side", templateId: IDS.sidePhone });
  });

  it("is gold when it is the keynote", () => {
    const ref: BoardRef = { kind: "side", templateId: IDS.sideVoices };
    expect(renderCard(ref, ref).button).toHaveAttribute("data-keynote", "true");
  });
});
