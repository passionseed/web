import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ComponentProps } from "react";

import { checkIn, loadCampfire } from "@/app/shift/island/actions";

import type { PlazaSpotId } from "@/lib/shift-island/live/plaza";
import { noticePins } from "@/lib/shift-island/notice";
import type { BoardRef } from "@/lib/supabase/shift-quests/board";
import type { IslandPageData } from "@/lib/supabase/shift-quests/types";

import { makeBoard } from "../__fixtures__/board";
import { IslandApp } from "../IslandApp";
import type { IslandViewport } from "../IslandViewport";

type ViewportProps = ComponentProps<typeof IslandViewport>;

jest.mock("@/app/shift/island/actions", () => ({
  checkIn: jest.fn(),
  setResting: jest.fn(),
  setShowName: jest.fn(),
  askForHelp: jest.fn(),
  proposeQuest: jest.fn(),
  createProject: jest.fn(),
  respondInvite: jest.fn(),
  loadCampfire: jest.fn(),
}));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
// The client's Bangkok date: null keeps the page's own days_to_demo, a day number overrides it.
const mockToday: { day: number | null } = { day: null };
jest.mock("../useBangkokDay", () => ({ useBangkokDay: () => mockToday.day }));
jest.mock("../IslandDiscordButton", () => ({ IslandDiscordButton: () => null }));

// vaul needs layout APIs jsdom lacks; the sheets only have to show their content when open,
// and run their open auto-focus like Radix does.
jest.mock("../IslandSheet", () => {
  const { createElement, useEffect } = jest.requireActual<typeof import("react")>("react");
  function MockSheet({
    open,
    title,
    onOpenAutoFocus,
    children,
  }: {
    open: boolean;
    title: string;
    onOpenAutoFocus?: (event: Event) => void;
    children: unknown;
  }) {
    useEffect(() => {
      if (open) onOpenAutoFocus?.(new Event("focus"));
      // Once per opening.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);
    return open ? createElement("div", { role: "dialog", "aria-label": title }, children as never) : null;
  }
  return { IslandSheet: MockSheet };
});

/** The props the island picture got last (the plaza, the live switch). */
const mockViewport: { props: ViewportProps | null } = { props: null };

// The island picture: whether it is paused or whole, one plot to tap, the plaza's tap targets
// under their accessible names, and a switch standing in for the living island showing.
jest.mock("../IslandViewport", () => {
  const { createElement } = jest.requireActual<typeof import("react")>("react");
  return {
    IslandViewport: (props: ViewportProps) => {
      mockViewport.props = props;
      const { paused, whole, puffKey, onPlot, plaza, onNoticeVisible } = props;
      const onSpot = plaza?.onSpot;
      return createElement(
        "div",
        { "data-testid": "viewport", "data-paused": String(!!paused), "data-whole": String(!!whole), "data-puff": String(puffKey ?? 0) },
        onPlot
          ? createElement(
              "button",
              {
                type: "button",
                onClick: () => onPlot({ slot: 4, mine: false, plain: false, stage: 5, name: null, x: 20, y: 30, w: 6, h: 10 }),
              },
              "plot-4",
            )
          : null,
        onSpot
          ? Object.entries(plaza.names).map(([id, name]) =>
              createElement("button", { key: id, type: "button", "aria-label": name, onClick: () => onSpot(id as PlazaSpotId) }, id),
            )
          : null,
        onNoticeVisible
          ? [
              createElement("button", { key: "seen", type: "button", onClick: () => onNoticeVisible(true) }, "notice-seen"),
              createElement("button", { key: "gone", type: "button", onClick: () => onNoticeVisible(false) }, "notice-gone"),
            ]
          : null,
      );
    },
  };
});

// The quest sheet: which quest is open, and its "เชื่อมแคนวาส".
jest.mock("../QuestDetailSheet", () => {
  const { createElement } = jest.requireActual<typeof import("react")>("react");
  return {
    QuestDetailSheet: ({
      target,
      canvasLink,
      onClose,
      onLinkCanvas,
    }: {
      target: BoardRef | null;
      canvasLink: unknown;
      onClose: () => void;
      onLinkCanvas: (ref: BoardRef) => void;
    }) =>
      target
        ? createElement(
            "div",
            { "data-testid": "detail", "data-link": JSON.stringify(canvasLink) },
            createElement("p", null, `detail:${JSON.stringify(target)}`),
            createElement("button", { type: "button", onClick: () => onLinkCanvas(target) }, "link-canvas"),
            createElement("button", { type: "button", onClick: onClose }, "close-detail"),
          )
        : null,
  };
});

jest.mock("../canvas", () => {
  const { createElement } = jest.requireActual<typeof import("react")>("react");
  return {
    CanvasLinkSheet: ({ open, link, onClose, onLinked }: { open: boolean; link: unknown; onClose: () => void; onLinked: () => void }) =>
      open
        ? createElement(
            "div",
            { "data-testid": "picker", "data-link": JSON.stringify(link) },
            createElement("button", { type: "button", onClick: onLinked }, "picker-linked"),
            createElement("button", { type: "button", onClick: onClose }, "picker-close"),
          )
        : null,
  };
});

jest.mock("../story/StoryLauncher", () => {
  const { createElement } = jest.requireActual<typeof import("react")>("react");
  return {
    StoryLauncher: ({
      demoDay,
      cta,
      onCta,
      onOpenChange,
    }: {
      demoDay: string | null;
      cta: string;
      onCta?: () => void;
      onOpenChange?: (open: boolean) => void;
    }) =>
      createElement(
        "div",
        null,
        createElement(
          "button",
          { type: "button", "data-testid": "story", "data-cta": cta, "data-demo": demoDay ?? "", onClick: () => onCta?.() },
          "story",
        ),
        createElement("button", { type: "button", onClick: () => onOpenChange?.(true) }, "story-open"),
        createElement("button", { type: "button", onClick: () => onOpenChange?.(false) }, "story-close"),
      ),
  };
});

const LINK = { linked: true as const, linkedAt: "2026-11-11T08:00:00Z" };
const KEYNOTE = "ทำต่อ: ฟังเสียงจริงอีก 5 คน";

function page(overrides: Partial<IslandPageData> = {}): IslandPageData {
  return {
    me: { name: "พลอย", avatarUrl: null, staff: false },
    unread: 0,
    island: {
      project: {
        id: "55555555-5555-4555-8555-000000000001",
        name: "แอปจองห้องสมุด",
        route: "software",
        slot: 3,
        stage: 1,
        milestones_done: [3],
        next_milestone: 1,
        show_name: false,
        name_visible: false,
      },
      milestones: [],
      taps_today: 0,
      resting: false,
      season: null,
    },
    map: { plots: [], goal: null, season: null },
    board: makeBoard(),
    invites: [],
    canvasLink: LINK,
    ...overrides,
  };
}

const viewport = () => screen.getByTestId("viewport");

describe("IslandApp", () => {
  it("animates the island only while no sheet covers it", () => {
    render(<IslandApp page={page()} picture={null} />);
    expect(viewport()).toHaveAttribute("data-paused", "false");
    fireEvent.click(screen.getByRole("button", { name: new RegExp(KEYNOTE) }));
    expect(screen.getByTestId("detail")).toBeInTheDocument();
    expect(viewport()).toHaveAttribute("data-paused", "true");
    fireEvent.click(screen.getByRole("button", { name: "close-detail" }));
    expect(viewport()).toHaveAttribute("data-paused", "false");
    fireEvent.click(screen.getByRole("button", { name: "plot-4" }));
    expect(viewport()).toHaveAttribute("data-paused", "true");
  });

  it("pauses the island while the story plays over it", () => {
    render(<IslandApp page={page()} picture={null} />);
    fireEvent.click(screen.getByRole("button", { name: "story-open" }));
    expect(viewport()).toHaveAttribute("data-paused", "true");
    fireEvent.click(screen.getByRole("button", { name: "story-close" }));
    expect(viewport()).toHaveAttribute("data-paused", "false");
  });

  it("pauses the unclaimed island while the story plays over it", () => {
    render(<IslandApp page={unclaimed()} picture={null} />);
    expect(viewport()).toHaveAttribute("data-paused", "false");
    fireEvent.click(screen.getByRole("button", { name: "story-open" }));
    expect(viewport()).toHaveAttribute("data-paused", "true");
  });

  it("hands the page's canvas link to the quest sheet", () => {
    render(<IslandApp page={page()} picture={null} />);
    fireEvent.click(screen.getByRole("button", { name: new RegExp(KEYNOTE) }));
    expect(screen.getByTestId("detail")).toHaveAttribute("data-link", JSON.stringify(LINK));
  });

  it("swaps the quest for the canvas picker, then reopens the same quest once linked", () => {
    render(<IslandApp page={page({ canvasLink: { linked: false } })} picture={null} />);
    fireEvent.click(screen.getByRole("button", { name: new RegExp(KEYNOTE) }));
    const shown = screen.getByTestId("detail").textContent;
    fireEvent.click(screen.getByRole("button", { name: "link-canvas" }));
    expect(screen.queryByTestId("detail")).toBeNull();
    expect(screen.getByTestId("picker")).toHaveAttribute("data-link", JSON.stringify({ linked: false }));
    expect(viewport()).toHaveAttribute("data-paused", "true");
    fireEvent.click(screen.getByRole("button", { name: "picker-linked" }));
    expect(screen.queryByTestId("picker")).toBeNull();
    expect(screen.getByTestId("detail").textContent).toBe(shown);
  });

  it("returns to the quest when the picker is dismissed", () => {
    render(<IslandApp page={page()} picture={null} />);
    fireEvent.click(screen.getByRole("button", { name: new RegExp(KEYNOTE) }));
    fireEvent.click(screen.getByRole("button", { name: "link-canvas" }));
    fireEvent.click(screen.getByRole("button", { name: "picker-close" }));
    expect(screen.queryByTestId("picker")).toBeNull();
    expect(screen.getByTestId("detail")).toBeInTheDocument();
  });

  it("puts the story book in the top bar, pointing back to the island", () => {
    const season = makeSeason();
    render(<IslandApp page={page({ island: { ...page().island, season } })} picture={null} />);
    const story = screen.getByTestId("story");
    expect(story).toHaveAttribute("data-cta", "island");
    expect(story).toHaveAttribute("data-demo", season.demo_day);
    expect(story.closest("header")).not.toBeNull();
  });

  it("sends a student without a plot from the story to the claim sheet, ready to type", () => {
    render(<IslandApp page={unclaimed()} picture={null} />);
    expect(document.getElementById("island-claim")).toBeNull();
    const story = screen.getByTestId("story");
    expect(story).toHaveAttribute("data-cta", "claim");
    fireEvent.click(story);
    const sheet = screen.getByRole("dialog", { name: "จับจองที่ดินบนเกาะ" });
    expect(within(sheet).getByRole("region", { name: "จับจองที่ดินบนเกาะ" })).toHaveAttribute("id", "island-claim");
    expect(screen.getByLabelText("ชื่อโปรเจกต์")).toHaveFocus();
    expect(viewport()).toHaveAttribute("data-paused", "true");
  });

  it("gives a student without a plot one bottom action: claim, or answer the invites", () => {
    const { unmount } = render(<IslandApp page={unclaimed()} picture={null} />);
    fireEvent.click(screen.getByRole("button", { name: "จับจองที่ดิน" }));
    expect(screen.getByRole("dialog", { name: "จับจองที่ดินบนเกาะ" })).toBeInTheDocument();
    unmount();
    const invite = { projectId: "77777777-7777-4777-8777-000000000001", name: "สวนผักดาดฟ้า", route: "service" as const, inviter: "Ploy" };
    render(<IslandApp page={unclaimed({ invites: [invite] })} picture={null} />);
    fireEvent.click(screen.getByRole("button", { name: "คำชวนเข้าทีม 1" }));
    expect(screen.getByText("สวนผักดาดฟ้า ชวนคุณเข้าทีม")).toBeInTheDocument();
    // The student came to answer an invite: focus lands on the invites, no keyboard over them.
    expect(screen.getByLabelText("ชื่อโปรเจกต์")).not.toHaveFocus();
    expect(document.getElementById("island-invites-heading")).toHaveFocus();
  });
});

describe("IslandApp HUD", () => {
  it("keeps the island's every screen behind HUD buttons, with nothing but the island and the HUD in view", () => {
    render(<IslandApp page={page()} picture={null} />);
    expect(screen.queryByRole("region", { name: "เควสต์หลัก" })).toBeNull();
    expect(screen.queryByText("เช็กอินวันนี้")).toBeNull();
    expect(screen.getByRole("button", { name: /แอปจองห้องสมุด/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "กระดานเควสต์" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "เมนู" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "เกาะ SHIFT" })).toBeInTheDocument();
  });

  it("opens the quest board over the island, and a quest from it returns to the board", () => {
    render(<IslandApp page={page()} picture={null} />);
    fireEvent.click(screen.getByRole("button", { name: "กระดานเควสต์" }));
    const boardSheet = screen.getByRole("dialog", { name: "กระดานเควสต์" });
    expect(viewport()).toHaveAttribute("data-paused", "true");
    fireEvent.click(within(boardSheet).getAllByRole("button", { name: /ฟังเสียงจริงอีก 5 คน/ })[0]);
    expect(screen.queryByRole("dialog", { name: "กระดานเควสต์" })).toBeNull();
    expect(screen.getByTestId("detail")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "close-detail" }));
    expect(screen.getByRole("dialog", { name: "กระดานเควสต์" })).toBeInTheDocument();
  });

  it("goes back to the world when a quest opened from the bottom bar closes", () => {
    render(<IslandApp page={page()} picture={null} />);
    fireEvent.click(screen.getByRole("button", { name: new RegExp(KEYNOTE) }));
    fireEvent.click(screen.getByRole("button", { name: "close-detail" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(viewport()).toHaveAttribute("data-paused", "false");
  });

  it("puts the HUD before the island in reading and tab order", () => {
    render(<IslandApp page={page()} picture={null} />);
    const heading = screen.getByRole("heading", { level: 1, name: "เกาะ SHIFT" });
    expect(heading.compareDocumentPosition(viewport()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByRole("button", { name: "กระดานเควสต์" }).compareDocumentPosition(viewport()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("marks the chip while today's check-in is still open", () => {
    const { unmount } = render(<IslandApp page={page()} picture={null} />);
    expect(screen.getByRole("button", { name: /วันนี้ยังไม่ได้เช็กอิน/ })).toBeInTheDocument();
    expect(screen.getByTestId("chip-today-open")).toBeInTheDocument();
    unmount();
    render(<IslandApp page={page({ island: { ...page().island, taps_today: 1 } })} picture={null} />);
    expect(screen.queryByRole("button", { name: /วันนี้ยังไม่ได้เช็กอิน/ })).toBeNull();
    expect(screen.queryByTestId("chip-today-open")).toBeNull();
  });

  it("closes the project sheet once the check-in is saved, then plays the dust puff where it can be seen", async () => {
    (checkIn as jest.Mock).mockResolvedValue({ ok: true, data: { kind: "tap", tapsToday: 1 } });
    render(<IslandApp page={page()} picture={null} />);
    fireEvent.click(screen.getByRole("button", { name: /แอปจองห้องสมุด/ }));
    fireEvent.click(within(screen.getByRole("dialog", { name: "แอปจองห้องสมุด" })).getByRole("button", { name: "เช็กอินวันนี้" }));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "แอปจองห้องสมุด" })).toBeNull());
    expect(viewport()).toHaveAttribute("data-puff", "0");
    await waitFor(() => expect(viewport()).toHaveAttribute("data-puff", "1"), { timeout: 2000 });
  });

  it("opens the project sheet from the chip, with today's check-in in it", () => {
    render(<IslandApp page={page()} picture={null} />);
    fireEvent.click(screen.getByRole("button", { name: /แอปจองห้องสมุด/ }));
    const sheet = screen.getByRole("dialog", { name: "แอปจองห้องสมุด" });
    expect(within(sheet).getByRole("button", { name: "เช็กอินวันนี้" })).toBeInTheDocument();
    fireEvent.click(within(sheet).getByRole("button", { name: "ติด" }));
    expect(screen.queryByRole("dialog", { name: "แอปจองห้องสมุด" })).toBeNull();
    expect(screen.getByRole("dialog", { name: "ติดตรงไหน" })).toBeInTheDocument();
  });

  it("switches between the close view and the whole island from the menu", () => {
    render(<IslandApp page={page()} picture={null} />);
    fireEvent.click(screen.getByRole("button", { name: "เมนู" }));
    fireEvent.click(screen.getByRole("button", { name: "ดูทั้งเกาะ" }));
    expect(screen.queryByRole("dialog", { name: "เมนู" })).toBeNull();
    expect(viewport()).toHaveAttribute("data-whole", "true");
    fireEvent.click(screen.getByRole("button", { name: "เมนู" }));
    expect(screen.getByRole("button", { name: "ขยายดูใกล้ๆ" })).toBeInTheDocument();
    expect(screen.getByText("โชว์ชื่อโปรเจกต์บนเกาะ")).toBeInTheDocument();
  });

  it("shows the envelope only when the bot has new messages", () => {
    const { unmount } = render(<IslandApp page={page()} picture={null} />);
    expect(screen.queryByRole("button", { name: /ข้อความใหม่/ })).toBeNull();
    unmount();
    render(<IslandApp page={page({ unread: 2 })} picture={null} />);
    fireEvent.click(screen.getByRole("button", { name: "ข้อความใหม่ 2 ข้อความ" }));
    expect(screen.getByRole("dialog", { name: "ข้อความใหม่" })).toHaveTextContent("บอทส่งข้อความใหม่ถึงคุณ 2 ข้อความ");
  });

  it("opens a plot over the island", () => {
    render(<IslandApp page={page()} picture={null} />);
    fireEvent.click(screen.getByRole("button", { name: "plot-4" }));
    expect(screen.getByRole("dialog", { name: "แปลง #4" })).toBeInTheDocument();
  });
});

describe("IslandApp: the canvas button", () => {
  it("opens the linked canvas on the whiteboard from the top bar, without the board's id", () => {
    render(<IslandApp page={page()} picture={null} />);
    const link = screen.getByRole("link", { name: "เปิดแคนวาส" });
    expect(link).toHaveAttribute("href", "/shift/island/canvas");
    expect(link.closest("header")).not.toBeNull();
    expect(screen.queryByRole("button", { name: "เชื่อมแคนวาส" })).toBeNull();
  });

  it("opens the canvas picker when none is linked, and goes back to the world after", () => {
    render(<IslandApp page={page({ canvasLink: { linked: false } })} picture={null} />);
    expect(screen.queryByRole("link", { name: "เปิดแคนวาส" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "เชื่อมแคนวาส" }));
    expect(screen.getByTestId("picker")).toHaveAttribute("data-link", JSON.stringify({ linked: false }));
    expect(viewport()).toHaveAttribute("data-paused", "true");
    fireEvent.click(screen.getByRole("button", { name: "picker-linked" }));
    expect(screen.queryByTestId("picker")).toBeNull();
    // Not opened from a quest: no quest comes back.
    expect(screen.queryByTestId("detail")).toBeNull();
    expect(viewport()).toHaveAttribute("data-paused", "false");
  });
});

describe("IslandApp: the plaza", () => {
  const JOIN = "https://discord.com/channels/111111111111111111/222222222222222222";
  const mockedLoadCampfire = loadCampfire as jest.MockedFunction<typeof loadCampfire>;
  const festive = (overrides: Partial<IslandPageData> = {}) =>
    page({ island: { ...page().island, season: makeSeason() }, campfire: { count: 3, joinUrl: JOIN }, ...overrides });
  const plaza = () => {
    const props = mockViewport.props?.plaza;
    if (!props) throw new Error("no plaza");
    return props;
  };

  beforeEach(() => {
    mockViewport.props = null;
    mockedLoadCampfire.mockReset().mockResolvedValue({ ok: true, data: { count: 2, names: ["Ploy", "มิ้นต์"], joinUrl: JOIN } });
  });

  it("hands the world the festival, the notice board's pins and the campfire's count", () => {
    render(<IslandApp page={festive()} picture={null} />);
    const pins = noticePins(makeBoard());
    expect(pins.length).toBeGreaterThan(0);
    const { input, labels, names } = plaza();
    expect(input.festival).toMatchObject({ demoDay: "2026-11-28", daysToDemo: 17, tableBar: 3, stageBar: 5 });
    expect(input.pins).toEqual(pins.map((pin) => pin.kind));
    expect(input.campfire).toEqual({ count: 3 });
    expect(labels).toEqual({ sign: "Demo Day 28 พ.ย.\nอีก 17 วัน", campfireCount: "3 คนกำลังทำงานอยู่" });
    expect(names).toEqual({
      notice: `กระดานเควสต์: ${pins.map((pin) => pin.title).join(" · ")}`,
      stage: "เวที Demo Day: 28 พ.ย. · อีก 17 วัน",
      campfire: "กองไฟ: ห้อง coworking มี 3 คน",
    });
  });

  it("counts down from the client's Bangkok date once it has one (a page left open past midnight)", () => {
    mockToday.day = Math.round(Date.UTC(2026, 10, 28) / 86_400_000);
    try {
      render(<IslandApp page={festive()} picture={null} />);
      expect(plaza().labels.sign).toBe("Demo Day 28 พ.ย.\nวันนี้");
      expect(plaza().names.stage).toBe("เวที Demo Day: 28 พ.ย. · วันนี้");
    } finally {
      mockToday.day = null;
    }
  });

  it("draws eight at the fire and says how many more", () => {
    render(<IslandApp page={festive({ campfire: { count: 11, joinUrl: JOIN } })} picture={null} />);
    expect(plaza().labels).toMatchObject({ campfireCount: "11 คนกำลังทำงานอยู่", campfireMore: "+3" });
  });

  it("draws no campfire and no stage when there is no coworking room and no season", () => {
    render(<IslandApp page={page()} picture={null} />);
    const { input, labels, names } = plaza();
    expect(input.festival).toBeNull();
    expect(input.campfire).toBeNull();
    expect(labels).toEqual({});
    expect(Object.keys(names)).toEqual(["notice"]);
  });

  it("opens the quest board from the notice board", () => {
    render(<IslandApp page={festive()} picture={null} />);
    fireEvent.click(screen.getByRole("button", { name: /^กระดานเควสต์:/ }));
    expect(screen.getByRole("dialog", { name: "กระดานเควสต์" })).toBeInTheDocument();
    expect(viewport()).toHaveAttribute("data-paused", "true");
  });

  it("opens Demo Day from the stage", () => {
    render(<IslandApp page={festive()} picture={null} />);
    fireEvent.click(screen.getByRole("button", { name: /^เวที Demo Day/ }));
    const sheet = screen.getByRole("dialog", { name: "เวที Demo Day" });
    expect(within(sheet).getByText("โต๊ะโชว์งาน: นับได้ 3 ขั้น และผ่านเควสต์ 2 เห็นเฉพาะทีมที่โชว์ชื่อบนเกาะ")).toBeInTheDocument();
    expect(viewport()).toHaveAttribute("data-paused", "true");
  });

  it("opens the campfire and reads the names only then", async () => {
    render(<IslandApp page={festive()} picture={null} />);
    expect(mockedLoadCampfire).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /^กองไฟ/ }));
    const sheet = screen.getByRole("dialog", { name: "กองไฟ" });
    expect(mockedLoadCampfire).toHaveBeenCalledWith({ names: true });
    expect(viewport()).toHaveAttribute("data-paused", "true");
    expect(await within(sheet).findByText("มิ้นต์")).toBeInTheDocument();
    expect(within(sheet).getByRole("link", { name: "เข้าห้อง" })).toHaveAttribute("href", JOIN);
  });

  it("hides the board button only while the notice board is on screen, keeping it for keyboards", () => {
    render(<IslandApp page={festive()} picture={null} />);
    const button = screen.getByRole("button", { name: "กระดานเควสต์" });
    expect(button).not.toHaveAttribute("data-concealed");
    fireEvent.click(screen.getByRole("button", { name: "notice-seen" }));
    const concealed = screen.getByRole("button", { name: "กระดานเควสต์" });
    expect(concealed).toHaveAttribute("data-concealed", "true");
    expect(concealed).not.toHaveAttribute("aria-hidden");
    expect(concealed).not.toHaveAttribute("tabindex", "-1");
    // Panned away from the plaza (the plot centred far from it): the button is back.
    fireEvent.click(screen.getByRole("button", { name: "notice-gone" }));
    expect(screen.getByRole("button", { name: "กระดานเควสต์" })).not.toHaveAttribute("data-concealed");
    fireEvent.click(screen.getByRole("button", { name: "notice-seen" }));
    fireEvent.click(screen.getByRole("button", { name: "กระดานเควสต์" }));
    expect(screen.getByRole("dialog", { name: "กระดานเควสต์" })).toBeInTheDocument();
  });

  it("shows a student without a plot the festival and the campfire, with nothing to tap", () => {
    render(<IslandApp page={unclaimed({ island: { ...page().island, project: null, season: makeSeason() }, campfire: { count: 3, joinUrl: JOIN } })} picture={null} />);
    const props = plaza();
    expect(props.onSpot).toBeUndefined();
    expect(props.input.pins).toBeNull();
    expect(props.input.festival).not.toBeNull();
    expect(props.input.campfire).toEqual({ count: 3 });
    expect(props.names).toEqual({});
    expect(mockViewport.props?.onNoticeVisible).toBeUndefined();
    expect(screen.queryByRole("button", { name: /^กองไฟ/ })).toBeNull();
  });
});

function unclaimed(overrides: Partial<IslandPageData> = {}): IslandPageData {
  return page({ island: { ...page().island, project: null }, board: null, ...overrides });
}

function makeSeason(): NonNullable<IslandPageData["island"]["season"]> {
  return {
    name: "Season 1",
    demo_day: "2026-11-28",
    days_to_demo: 17,
    table_bar: 3,
    stage_bar: 5,
    stage_at_cutoff: 1,
    qualifies: null,
    goal: null,
    unlocks: [],
  };
}
