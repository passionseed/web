import { fireEvent, render, screen, within } from "@testing-library/react";

import { keynoteQuest, type BoardRef } from "@/lib/supabase/shift-quests/board";

import { IDS, MAIN_TITLES, makeBoard, withoutSideQuests } from "../__fixtures__/board";
import { clearAllDrafts } from "../drafts";
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
const nav = () => screen.getByRole("group", { name: "หมวดบนกระดานเควสต์" });
const laneButton = (name: string) => within(nav()).getByRole("button", { name: new RegExp(`^${name}`) });
const pressed = () => within(nav()).getAllByRole("button").filter((b) => b.getAttribute("aria-pressed") === "true");

/** The horizontal strip of lanes, with a fixed width (jsdom has no layout). */
function strip(width = 320): HTMLElement {
  const lanes = document.getElementById("island-lane-main")?.parentElement as HTMLElement;
  Object.defineProperty(lanes, "clientWidth", { configurable: true, value: width });
  return lanes;
}

function scrollStrip(lanes: HTMLElement, left: number) {
  lanes.scrollLeft = left;
  fireEvent.scroll(lanes);
}

beforeEach(() => {
  clearAllDrafts();
  // The lane follows the strip once per frame: run each frame at once.
  jest.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
    callback(0);
    return 1;
  });
});

afterEach(() => {
  jest.restoreAllMocks();
  delete (window as { matchMedia?: unknown }).matchMedia;
});

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

  it("puts the seven main quests first, as cards with no numbers, then the tree", () => {
    const { container } = renderBoard();
    // The lane buttons are not a list: the main lane's cards are the first list on the board.
    const main = container.querySelector("ul") as HTMLElement;
    expect(main.closest("section")).toHaveAttribute("id", "island-lane-main");
    const cards = within(main).getAllByRole("button");
    expect(cards).toHaveLength(7);
    expect(cards.map((card) => card.getAttribute("aria-label")?.split(", ")[0])).toEqual(MAIN_TITLES);
    for (const card of cards) {
      expect(card).toHaveAttribute("data-layout", "card");
      expect(card.textContent ?? "").not.toMatch(/\d/);
    }
    const cells = within(main).getAllByRole("listitem");
    expect(cells).toHaveLength(8);
    expect(cells[7]).toHaveTextContent("เมล็ด");
    expect(cells[7]).toHaveTextContent("ต้นไม้ขั้น 1 จาก 7");
    expect(within(cells[7]).queryByRole("button")).toBeNull();
  });

  it("marks the community quests, main 6 and 7, with words in their description", () => {
    renderBoard();
    expect(tile(MAIN_TITLES[5], "ลองส่งใหม่ได้")).toHaveAccessibleDescription("เควสต์ชุมชน: ช่วยเพื่อน หรือพัฒนาชุมชน");
    expect(tile(MAIN_TITLES[6], "พักไว้")).toHaveAccessibleDescription("เควสต์ชุมชน: ช่วยเพื่อน หรือพัฒนาชุมชน");
    expect(tile(MAIN_TITLES[0], "ทำได้เลย")).not.toHaveAccessibleDescription();
  });

  it("pins each card in the colour of the plaza's notes", () => {
    renderBoard();
    expect(tile(MAIN_TITLES[0], "ทำได้เลย")).toHaveAttribute("data-pin", "main");
    expect(tile(MAIN_TITLES[1], "กำลังทำ")).toHaveAttribute("data-pin", "active");
    expect(tile(MAIN_TITLES[2], "ผ่านแล้ว")).toHaveAttribute("data-pin", "main");
    expect(tile("ให้คนอื่นเปิดได้จากมือถือ", "ล็อกอยู่")).toHaveAttribute("data-pin", "side");
    expect(tile("ฟังเสียงจริงอีก 5 คน", "ขอข้อมูลเพิ่ม")).toHaveAttribute("data-pin", "active");
    expect(tile("ทำแผนที่ร้านอาหารในซอย", "กำลังทำ")).toHaveAttribute("data-pin", "active");
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

  it("starts the route filter on every route when the keynote is a side quest for another route", () => {
    renderBoard({ keynote: { kind: "side", templateId: IDS.sideCut } });
    expect(screen.getByRole("radio", { name: "ทุกเส้นทาง" })).toHaveAttribute("data-state", "on");
    expect(screen.getByRole("button", { name: /^ตัวอย่าง 30 วินาที/ })).toBeInTheDocument();
  });

  it("groups side quests under the main quest they branch from", () => {
    renderBoard();
    expect(screen.getByRole("heading", { name: `ต่อจาก ${MAIN_TITLES[0]}` })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: `ต่อจาก ${MAIN_TITLES[1]}` })).toBeInTheDocument();
  });

  it("says when no side quest is open yet, with no route chips and a way back to the main quests", () => {
    const board = withoutSideQuests(makeBoard());
    render(<QuestBoard board={board} stage={1} goal={null} keynote={null} onOpen={jest.fn()} onPropose={jest.fn()} />);
    const lane = screen.getByRole("region", { name: "เควสต์เสริม" });
    expect(within(lane).queryByRole("radio")).toBeNull();
    expect(within(lane).getByText("เควสต์เสริมยังไม่เปิด ระหว่างนี้ทำเควสต์หลักต่อได้เลย")).toBeInTheDocument();

    fireEvent.click(laneButton("เควสต์เสริม"));
    expect(laneButton("เควสต์เสริม")).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(within(lane).getByRole("button", { name: "ไปที่เควสต์หลัก" }));
    expect(laneButton("เควสต์หลัก")).toHaveAttribute("aria-pressed", "true");
  });

  it("moves focus to the chosen lane's heading, so a screen reader reads on in that lane", () => {
    renderBoard();
    strip();
    fireEvent.click(laneButton("เควสต์เสริม"));
    expect(document.getElementById("island-side-quests")).toHaveFocus();
    fireEvent.click(laneButton("เควสต์หลัก"));
    expect(document.getElementById("island-main-quests")).toHaveFocus();
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

describe("QuestBoard lanes", () => {
  it("has four lane buttons in a plain group, each controlling its own lane region", () => {
    renderBoard({ keynote: null });
    const buttons = within(nav()).getAllByRole("button");
    expect(buttons.map((b) => b.textContent)).toEqual(["เควสต์หลัก ผ่าน 1/7", "เควสต์เสริม", "ของฉัน", "ทั้งเกาะ"]);
    expect(screen.queryByRole("tablist")).toBeNull();
    expect(screen.queryByRole("tab")).toBeNull();

    const regions = ["เควสต์หลัก", "เควสต์เสริม", "เควสต์ที่ฉันเสนอ", "ทั้งเกาะ"].map((name) => screen.getByRole("region", { name }));
    expect(buttons.map((b) => b.getAttribute("aria-controls"))).toEqual(regions.map((r) => r.id));
    expect(pressed()).toEqual([buttons[0]]);
  });

  it("keeps every lane in the DOM and the accessibility tree, whichever is pressed", () => {
    renderBoard({ keynote: null });
    fireEvent.click(laneButton("ของฉัน"));
    for (const name of ["เควสต์หลัก", "เควสต์เสริม", "เควสต์ที่ฉันเสนอ", "ทั้งเกาะ"]) {
      const region = screen.getByRole("region", { name });
      expect(region).not.toHaveAttribute("hidden");
      expect(region).not.toHaveAttribute("aria-hidden");
      expect(region).not.toHaveAttribute("inert");
    }
    expect(screen.getAllByRole("button", { name: new RegExp(`^${MAIN_TITLES[0]}`) })).toHaveLength(1);
  });

  it("presses a lane at once on a tap and scrolls the strip to it", () => {
    renderBoard({ keynote: null });
    const lanes = strip();
    const scrollTo = jest.fn();
    lanes.scrollTo = scrollTo;

    fireEvent.click(laneButton("ทั้งเกาะ"));
    expect(pressed()).toEqual([laneButton("ทั้งเกาะ")]);
    expect(laneButton("เควสต์หลัก")).toHaveAttribute("aria-pressed", "false");
    expect(scrollTo).toHaveBeenLastCalledWith({ left: 960, behavior: "smooth" });

    fireEvent.click(laneButton("เควสต์เสริม"));
    expect(pressed()).toEqual([laneButton("เควสต์เสริม")]);
    expect(scrollTo).toHaveBeenLastCalledWith({ left: 320, behavior: "smooth" });
  });

  it("jumps without the smooth scroll under reduced motion", () => {
    window.matchMedia = jest.fn().mockImplementation((query: string) => ({
      matches: query.includes("prefers-reduced-motion"),
      media: query,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    }));
    renderBoard({ keynote: null });
    const lanes = strip();
    const scrollTo = jest.fn();
    lanes.scrollTo = scrollTo;
    fireEvent.click(laneButton("ของฉัน"));
    expect(scrollTo).toHaveBeenLastCalledWith({ left: 640, behavior: "auto" });
  });

  it("follows a swipe: the lane in view is the pressed one", () => {
    renderBoard({ keynote: null });
    const lanes = strip();
    scrollStrip(lanes, 640);
    expect(pressed()).toEqual([laneButton("ของฉัน")]);
    scrollStrip(lanes, 330);
    expect(pressed()).toEqual([laneButton("เควสต์เสริม")]);
    scrollStrip(lanes, 5000);
    expect(pressed()).toEqual([laneButton("ทั้งเกาะ")]);
  });

  it("does not flip the pressed lane while a tap's scroll passes the lanes in between", () => {
    renderBoard({ keynote: null });
    const lanes = strip();
    lanes.scrollTo = jest.fn();
    fireEvent.click(laneButton("ทั้งเกาะ"));
    scrollStrip(lanes, 320);
    scrollStrip(lanes, 640);
    expect(pressed()).toEqual([laneButton("ทั้งเกาะ")]);
    scrollStrip(lanes, 960);
    expect(pressed()).toEqual([laneButton("ทั้งเกาะ")]);
    // Landed: the student's own swipe moves it again.
    scrollStrip(lanes, 320);
    expect(pressed()).toEqual([laneButton("เควสต์เสริม")]);
  });

  it.each<[string, BoardRef | null, string]>([
    ["no keynote", null, "เควสต์หลัก"],
    ["a main quest", { kind: "main", milestone: 2 }, "เควสต์หลัก"],
    ["a side quest", { kind: "side", templateId: IDS.sideVoices }, "เควสต์เสริม"],
    ["a community side quest", { kind: "side", templateId: IDS.sideFriend }, "ทั้งเกาะ"],
    ["a proposed quest", { kind: "proposed", instanceId: IDS.proposed }, "ของฉัน"],
  ])("starts on the keynote's lane: %s", (_case, keynote, lane) => {
    renderBoard({ keynote });
    expect(pressed()).toEqual([laneButton(lane)]);
  });

  it("opens the strip on the starting lane without an animation", () => {
    jest.spyOn(Element.prototype, "clientWidth", "get").mockReturnValue(320);
    renderBoard({ keynote: { kind: "proposed", instanceId: IDS.proposed } });
    expect(document.getElementById("island-lane-main")?.parentElement?.scrollLeft).toBe(640);
  });

  it("keeps the lane and the route chip when the board closes and opens again", () => {
    const first = renderBoard();
    fireEvent.click(laneButton("ของฉัน"));
    fireEvent.click(screen.getByRole("radio", { name: "ทุกเส้นทาง" }));
    first.unmount();

    renderBoard();
    expect(pressed()).toEqual([laneButton("ของฉัน")]);
    expect(screen.getByRole("radio", { name: "ทุกเส้นทาง" })).toHaveAttribute("data-state", "on");
  });

  it("counts the main quests the team has passed on the main lane button", () => {
    const board = makeBoard();
    board.main = board.main.map((m) => (m.milestone <= 4 && !m.in_flight ? { ...m, done: true } : m));
    render(<QuestBoard board={board} stage={2} goal={null} keynote={null} onOpen={jest.fn()} onPropose={jest.fn()} />);
    expect(laneButton("เควสต์หลัก")).toHaveAccessibleName("เควสต์หลัก ผ่าน 2/7");
    expect(screen.getByText("ต้นไม้ขั้น 2 จาก 7")).toBeInTheDocument();
  });
});
