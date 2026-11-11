import { fireEvent, render, screen, within } from "@testing-library/react";

import { keynoteQuest } from "@/lib/supabase/shift-quests/board";

import { IDS, MAIN_TITLES, makeBoard } from "../__fixtures__/board";
import { QuestBoard } from "../QuestBoard";

function renderBoard(overrides: Partial<Parameters<typeof QuestBoard>[0]> = {}) {
  const board = makeBoard();
  const onOpen = jest.fn();
  const onPropose = jest.fn();
  const utils = render(
    <QuestBoard
      board={board}
      stage={1}
      goal={null}
      keynote={keynoteQuest(board)}
      onOpen={onOpen}
      onPropose={onPropose}
      {...overrides}
    />,
  );
  return { ...utils, board, onOpen, onPropose };
}

const tile = (title: string, chip: string) => screen.getByRole("button", { name: new RegExp(`^${title}, ${chip}`) });

describe("QuestBoard", () => {
  it("renders all ten tile states with their chips", () => {
    renderBoard();
    expect(tile(MAIN_TITLES[0], "ทำได้เลย")).toHaveAttribute("data-status", "available");
    expect(tile(MAIN_TITLES[1], "กำลังทำ")).toHaveAttribute("data-status", "active");
    expect(tile(MAIN_TITLES[2], "ผ่านแล้ว")).toHaveAttribute("data-status", "done");
    expect(tile(MAIN_TITLES[3], "มิ้นต์ ทำอยู่")).toHaveAttribute("data-status", "held");
    expect(tile(MAIN_TITLES[4], "รอพี่เลี้ยงดู")).toHaveAttribute("data-status", "submitted");
    expect(tile(MAIN_TITLES[5], "ลองส่งใหม่ได้")).toHaveAttribute("data-status", "declined");
    expect(tile(MAIN_TITLES[6], "พักไว้")).toHaveAttribute("data-status", "paused");
    expect(tile("ฟังเสียงจริงอีก 5 คน", "ขอข้อมูลเพิ่ม")).toHaveAttribute("data-status", "clarification");
    expect(tile("ให้คนอื่นเปิดได้จากมือถือ", "ล็อกอยู่")).toHaveAttribute("data-status", "locked");

    // The appealed side quest is for another route: it shows under ทุกเส้นทาง.
    fireEvent.click(screen.getByRole("radio", { name: "ทุกเส้นทาง" }));
    expect(tile("ตัวอย่าง 30 วินาที", "อุทธรณ์อยู่")).toHaveAttribute("data-status", "appealed");
  });

  it("puts the seven main quests in the ring with no numbers", () => {
    const { container } = renderBoard();
    const ring = container.querySelector("ul");
    expect(ring).not.toBeNull();
    const tiles = within(ring as HTMLElement).getAllByRole("button");
    expect(tiles).toHaveLength(7);
    for (const t of tiles) expect(t.textContent ?? "").not.toMatch(/\d/);
  });

  it("names the seven main quests in a legend under the ring, each opening its quest", () => {
    const { onOpen } = renderBoard();
    const legend = screen.getByRole("list", { name: "ชื่อเควสต์หลัก" });
    const items = within(legend).getAllByRole("button");
    expect(items.map((b) => b.textContent)).toEqual(MAIN_TITLES);
    fireEvent.click(within(legend).getByRole("button", { name: MAIN_TITLES[3] }));
    expect(onOpen).toHaveBeenCalledWith({ kind: "main", milestone: 4 });
  });

  it("marks at most one tile as the gold keynote: the clarification quest", () => {
    const { container } = renderBoard();
    const gold = container.querySelectorAll('[data-keynote="true"]');
    expect(gold).toHaveLength(1);
    expect(gold[0]).toHaveAccessibleName(/^ฟังเสียงจริงอีก 5 คน, ขอข้อมูลเพิ่ม/);
  });

  it("has no gold tile when there is no keynote", () => {
    const { container } = renderBoard({ keynote: null });
    expect(container.querySelectorAll('[data-keynote="true"]')).toHaveLength(0);
  });

  it("flags a quest that already has a help request", () => {
    renderBoard();
    expect(tile(MAIN_TITLES[1], "กำลังทำ")).toHaveAccessibleName(`${MAIN_TITLES[1]}, กำลังทำ, ขอความช่วยเหลือแล้ว`);
    expect(tile(MAIN_TITLES[0], "ทำได้เลย")).toHaveAccessibleName(`${MAIN_TITLES[0]}, ทำได้เลย`);
  });

  it("keeps a locked tile working (it opens the unlock rule), with the lock in its name and description", () => {
    const { onOpen } = renderBoard();
    const locked = tile("ให้คนอื่นเปิดได้จากมือถือ", "ล็อกอยู่");
    expect(locked).not.toHaveAttribute("aria-disabled");
    expect(locked).not.toBeDisabled();
    fireEvent.click(locked);
    expect(onOpen).toHaveBeenCalledWith({ kind: "side", templateId: IDS.sidePhone });
    expect(locked).toHaveAccessibleDescription(`ปลดล็อกเมื่อผ่าน ${MAIN_TITLES[1]}`);
    expect(screen.getByText(`ปลดล็อกเมื่อผ่าน ${MAIN_TITLES[1]}`)).toBeInTheDocument();
  });

  it("starts the route filter on the project's route and hides other routes until ทุกเส้นทาง", () => {
    renderBoard();
    expect(screen.getByRole("radio", { name: "ซอฟต์แวร์" })).toHaveAttribute("data-state", "on");
    expect(screen.queryByRole("button", { name: /^ตัวอย่าง 30 วินาที/ })).toBeNull();
    expect(screen.getByRole("button", { name: /^ให้คนอื่นเปิดได้จากมือถือ/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^ฟังเสียงจริงอีก 5 คน/ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("radio", { name: "ทุกเส้นทาง" }));
    expect(screen.getByRole("button", { name: /^ตัวอย่าง 30 วินาที/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^ให้คนอื่นเปิดได้จากมือถือ/ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("radio", { name: "งานสร้างสรรค์" }));
    expect(screen.getByRole("button", { name: /^ตัวอย่าง 30 วินาที/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^ให้คนอื่นเปิดได้จากมือถือ/ })).toBeNull();
    // Quests for every route show under every chip.
    expect(screen.getByRole("button", { name: /^ฟังเสียงจริงอีก 5 คน/ })).toBeInTheDocument();
  });

  it("groups side quests under the main quest they branch from", () => {
    renderBoard();
    expect(screen.getByRole("heading", { name: `ต่อจาก ${MAIN_TITLES[0]}` })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: `ต่อจาก ${MAIN_TITLES[1]}` })).toBeInTheDocument();
  });

  it("shows the community quest and the island goal in the ทั้งเกาะ lane", () => {
    renderBoard({
      goal: { milestone: 3, target: 20, count: 12, deadline: "2026-12-15", unlock: "ดนตรีสดที่ Demo Day", reached: false },
    });
    const lane = screen.getByRole("region", { name: "ทั้งเกาะ" });
    expect(within(lane).getByText(/^ทั้งเกาะช่วยกัน: ให้คนจริงลอง 12\/20 ภายใน 15 ธ\.ค\.$/)).toBeInTheDocument();
    expect(within(lane).getByText("ถึงเป้าแล้วได้: ดนตรีสดที่ Demo Day")).toBeInTheDocument();
    expect(within(lane).getByRole("button", { name: /^ช่วยดูงานเพื่อนหนึ่งชิ้น, ทำได้เลย/ })).toBeInTheDocument();
    // Not repeated as a branch.
    expect(screen.getAllByRole("button", { name: /^ช่วยดูงานเพื่อนหนึ่งชิ้น/ })).toHaveLength(1);
  });

  it("opens quests by reference and the propose sheet", () => {
    const { onOpen, onPropose } = renderBoard();
    fireEvent.click(tile(MAIN_TITLES[0], "ทำได้เลย"));
    expect(onOpen).toHaveBeenLastCalledWith({ kind: "main", milestone: 1 });
    fireEvent.click(tile("ให้คนอื่นเปิดได้จากมือถือ", "ล็อกอยู่"));
    expect(onOpen).toHaveBeenLastCalledWith({ kind: "side", templateId: IDS.sidePhone });
    fireEvent.click(screen.getByRole("button", { name: /^ทำแผนที่ร้านอาหารในซอย, กำลังทำ/ }));
    expect(onOpen).toHaveBeenLastCalledWith({ kind: "proposed", instanceId: IDS.proposed });
    fireEvent.click(screen.getByRole("button", { name: "เสนอเควสต์ของฉัน" }));
    expect(onPropose).toHaveBeenCalledTimes(1);
  });
});
