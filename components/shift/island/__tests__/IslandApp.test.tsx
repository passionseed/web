import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ComponentProps } from "react";

import { checkIn, loadCampfire, setResting, startMainQuest } from "@/app/shift/island/actions";
import { loadWallet } from "@/app/shift/island/wallet-actions";

import type { PlazaSpotId } from "@/lib/shift-island/live/plaza";
import type { CharacterStats, IslandConsent, IslandNews, WalletDetail } from "@/lib/supabase/shift-quests/playerTypes";
import { noticePins } from "@/lib/shift-island/notice";
import type { BoardRef } from "@/lib/supabase/shift-quests/board";
import type { IslandPageData, MyTree } from "@/lib/supabase/shift-quests/types";

import { IDS, MAIN_TITLES, makeBoard } from "../__fixtures__/board";
import { HUD, MENU, NEXT_STEP, PLOT, RESULTS, TODAY, TREE } from "../copy";
import { IslandApp } from "../IslandApp";
import type { IslandViewport } from "../IslandViewport";
import { CHARACTER as CHARACTER_COPY, PLAYER, PLAYER_MENU, WALLET } from "../player/copy";
import { PRIZES_UI } from "../prizes/copy";
import { STORY_SEEN_KEY } from "../story/useStorySeen";
import { VOYAGE_SEEN_KEY } from "../voyage/useVoyage";

jest.mock("@/app/shift/island/peer-actions", () => ({
  loadPeerQueue: jest.fn(async () => ({ ok: true, data: [] })),
  loadPeerCheck: jest.fn(),
  sendPeerCheck: jest.fn(),
  loadPeerChecks: jest.fn(async () => ({ ok: true, data: null })),
  setPeerOpen: jest.fn(async () => ({ ok: true, data: { open: true } })),
  hidePeerCheck: jest.fn(),
}));
jest.mock("@/app/shift/island/evidence-actions", () => ({
  uploadEvidencePhoto: jest.fn(async () => ({ ok: true, data: { id: "p", count: 1 } })),
  removeEvidencePhoto: jest.fn(async () => ({ ok: true, data: null })),
  loadEvidencePhotos: jest.fn(async () => ({ ok: true, data: null })),
  setTeamProblem: jest.fn(async () => ({ ok: true, data: { ambition: "x" } })),
}));
jest.mock("next/navigation", () => ({ useRouter: () => ({ refresh: jest.fn() }) }));

type ViewportProps = ComponentProps<typeof IslandViewport>;

jest.mock("@/app/shift/island/actions", () => ({
  checkIn: jest.fn(async () => ({ ok: true, data: { tapsToday: 1 } })),
  startMainQuest: jest.fn(),
  chooseSideQuest: jest.fn(),
  setResting: jest.fn(),
  setShowName: jest.fn(),
  askForHelp: jest.fn(),
  proposeQuest: jest.fn(),
  createProject: jest.fn(),
  respondInvite: jest.fn(),
  loadCampfire: jest.fn(),
}));
jest.mock("@/app/shift/island/wallet-actions", () => ({
  loadWallet: jest.fn(),
  redeemItem: jest.fn(),
  cancelRedemption: jest.fn(),
}));
jest.mock("@/app/shift/island/consent-actions", () => ({
  loadConsent: jest.fn(),
  confirmAdult: jest.fn(),
  requestParentLink: jest.fn(),
}));
jest.mock("@/app/shift/island/news-actions", () => ({ hideTeamNews: jest.fn() }));
jest.mock("@/app/shift/island/admin-actions", () => ({ resetMyIsland: jest.fn() }));
jest.mock("@/app/shift/island/tree-actions", () => ({ plantSeed: jest.fn(), pickGift: jest.fn(), equipItem: jest.fn() }));
// The close-up canvas (jsdom has no 2D canvas): only that it is there.
jest.mock("../tree/TreeCanvas", () => {
  const { createElement } = jest.requireActual<typeof import("react")>("react");
  return { TreeCanvas: () => createElement("div", { "data-testid": "tree-canvas" }) };
});
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() } }));
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
    onOpenChange,
    children,
  }: {
    open: boolean;
    title: string;
    onOpenAutoFocus?: (event: Event) => void;
    onOpenChange?: (open: boolean) => void;
    children: unknown;
  }) {
    useEffect(() => {
      if (open) onOpenAutoFocus?.(new Event("focus"));
      // Once per opening.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);
    // Escape stands in for the sheet's own ways to close (its button, a swipe, the backdrop).
    const onKeyDown = (event: { key: string }) => {
      if (event.key === "Escape") onOpenChange?.(false);
    };
    return open ? createElement("div", { role: "dialog", "aria-label": title, onKeyDown }, children as never) : null;
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
        onPlot
          ? createElement(
              "button",
              {
                type: "button",
                onClick: () => onPlot({ slot: 3, mine: true, plain: false, stage: 1, name: null, x: 40, y: 30, w: 6, h: 10 }),
              },
              "plot-mine",
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
      autoOpen = true,
    }: {
      demoDay: string | null;
      cta: string;
      onCta?: () => void;
      onOpenChange?: (open: boolean) => void;
      autoOpen?: boolean;
    }) =>
      createElement(
        "div",
        null,
        createElement(
          "button",
          {
            type: "button",
            "data-testid": "story",
            "data-cta": cta,
            "data-demo": demoDay ?? "",
            "data-auto": String(autoOpen),
            onClick: () => onCta?.(),
          },
          "story",
        ),
        createElement("button", { type: "button", onClick: () => onOpenChange?.(true) }, "story-open"),
        createElement("button", { type: "button", onClick: () => onOpenChange?.(false) }, "story-close"),
      ),
  };
});

// The crossing (a canvas cutscene in a Radix dialog): open or not, and its two ways out.
jest.mock("../voyage/IslandVoyage", () => {
  const { createElement } = jest.requireActual<typeof import("react")>("react");
  const actual = jest.requireActual<typeof import("../voyage/IslandVoyage")>("../voyage/IslandVoyage");
  return {
    VoyageCover: actual.VoyageCover,
    IslandVoyage: ({ open, name, onReveal, onDone }: { open: boolean; name: string; onReveal?: () => void; onDone: () => void }) =>
      open
        ? createElement(
            "div",
            { "data-testid": "voyage", "data-name": name },
            createElement("button", { type: "button", onClick: () => onReveal?.() }, "voyage-reveal"),
            createElement("button", { type: "button", onClick: () => onDone() }, "voyage-done"),
          )
        : null,
  };
});

// Every test but the crossing's own starts on a browser that has crossed already.
beforeEach(() => window.localStorage.setItem(VOYAGE_SEEN_KEY, "seen"));
afterEach(() => window.localStorage.clear());

const LINK = { linked: true as const, linkedAt: "2026-11-11T08:00:00Z" };
const SUGGEST_URL = "https://discord.com/channels/444444444444444444/555555555555555555";
// The fixture's next step: a mentor asked for more on a side quest.
const KEYNOTE = "ตอบพี่เลี้ยง: ฟังเสียงจริงอีก 5 คน";
/** The link that used to sit under the next-step card (founder decision 2026-11-18: off home). */
const OLD_BOARD_LINK = "ดูเควสต์ทั้งหมด";

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
      // Checked in today already: a tap on the card goes straight to the quest (the check-in has its own tests).
      taps_today: 1,
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
/** The next-step card's one button. */
const cardButton = (headline: string = KEYNOTE) => within(screen.getByRole("region", { name: headline })).getByRole("button");
/** The island's one door: the team chip with a plot, the picture chip before one. */
const door = () => screen.getByRole("button", { name: /ดูตัวละคร|, เมนู/ });
/** Opens the chip's sheet (with a plot) or the menu (before one), and returns it. */
function openMenu() {
  fireEvent.click(door());
  return screen.getByRole("dialog");
}

/** The whole quest board, from the first line of the chip's sheet. */
function openBoard() {
  fireEvent.click(within(openMenu()).getByRole("button", { name: MENU.board }));
  return screen.getByRole("dialog", { name: "กระดานเควสต์" });
}

describe("IslandApp", () => {
  it("animates the island only while no sheet covers it", () => {
    render(<IslandApp page={page()} picture={null} />);
    expect(viewport()).toHaveAttribute("data-paused", "false");
    fireEvent.click(cardButton());
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
    fireEvent.click(cardButton());
    expect(screen.getByTestId("detail")).toHaveAttribute("data-link", JSON.stringify(LINK));
  });

  it("swaps the quest for the canvas picker, then reopens the same quest once linked", () => {
    render(<IslandApp page={page({ canvasLink: { linked: false } })} picture={null} />);
    fireEvent.click(cardButton());
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
    fireEvent.click(cardButton());
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
    expect(screen.queryByLabelText(TODAY.ask)).toBeNull();
    expect(screen.getByRole("button", { name: /แอปจองห้องสมุด/ })).toBeInTheDocument();
    expect(cardButton()).toBeInTheDocument();
    // The whole board is not on home: it stands in the plaza and heads the chip's sheet.
    expect(screen.queryByRole("button", { name: OLD_BOARD_LINK })).toBeNull();
    expect(screen.queryByRole("button", { name: "กระดานเควสต์" })).toBeNull();
    // No envelope and no menu button: results and the menu's lines live in the chip's sheet.
    expect(screen.queryByRole("button", { name: /ผลตรวจจากพี่เลี้ยง/ })).toBeNull();
    expect(screen.queryByRole("button", { name: HUD.menu })).toBeNull();
    expect(screen.getByRole("heading", { level: 1, name: "เกาะ SHIFT" })).toBeInTheDocument();
  });

  it("keeps the top bar to the chip alone: everything else lives on the island or in the chip's sheet", () => {
    render(<IslandApp page={page({ tree: null })} picture={null} />);
    const header = screen.getByRole("heading", { level: 1, name: "เกาะ SHIFT" }).closest("header")!;
    const controls = within(header)
      .queryAllByRole("button")
      .concat(within(header).queryAllByRole("link"))
      // The story mock draws its own buttons; the real launcher has none on the island.
      .filter((el) => !/^story/.test(el.textContent ?? ""));
    expect(controls).toHaveLength(1);
    expect(controls[0]).toBe(door());
    expect(within(header).queryByRole("link", { name: "เปิดแคนวาส" })).toBeNull();
    expect(within(header).queryByRole("button", { name: /รีเฟรช/ })).toBeNull();
    expect(within(header).queryByRole("button", { name: /เสียงกองไฟ/ })).toBeNull();
  });

  it("shows two things to tap over the island: the chip and the card's one button", () => {
    render(<IslandApp page={page({ tree: null })} picture={null} />);
    const hud = screen.getByRole("heading", { level: 1, name: "เกาะ SHIFT" }).closest("header")!.parentElement!;
    const controls = within(hud)
      .queryAllByRole("button")
      .concat(within(hud).queryAllByRole("link"))
      .filter((el) => !/^story/.test(el.textContent ?? ""));
    expect(controls).toEqual([door(), cardButton()]);
  });

  it("opens the quest board over the island, and a quest from it returns to the board", () => {
    render(<IslandApp page={page()} picture={null} />);
    const boardSheet = openBoard();
    expect(viewport()).toHaveAttribute("data-paused", "true");
    fireEvent.click(within(boardSheet).getAllByRole("button", { name: /ฟังเสียงจริงอีก 5 คน/ })[0]);
    expect(screen.queryByRole("dialog", { name: "กระดานเควสต์" })).toBeNull();
    expect(screen.getByTestId("detail")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "close-detail" }));
    expect(screen.getByRole("dialog", { name: "กระดานเควสต์" })).toBeInTheDocument();
  });

  it("goes back to the world when a quest opened from the bottom bar closes", () => {
    render(<IslandApp page={page()} picture={null} />);
    fireEvent.click(cardButton());
    fireEvent.click(screen.getByRole("button", { name: "close-detail" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(viewport()).toHaveAttribute("data-paused", "false");
  });

  it("puts the HUD before the island in reading and tab order", () => {
    render(<IslandApp page={page()} picture={null} />);
    const heading = screen.getByRole("heading", { level: 1, name: "เกาะ SHIFT" });
    expect(heading.compareDocumentPosition(viewport()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(cardButton().compareDocumentPosition(viewport()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("counts the day's first tap as the check-in: no screen between the student and the work", async () => {
    (checkIn as jest.Mock).mockClear();
    render(<IslandApp page={page({ island: { ...page().island, taps_today: 0 } })} picture={null} />);
    // No lamp dot and no check-in sheet: the tap goes straight to the quest.
    expect(screen.queryByTestId("next-check-in")).toBeNull();
    expect(screen.queryByTestId("chip-dot")).toBeNull();
    fireEvent.click(cardButton());
    expect(screen.getByTestId("detail")).toBeInTheDocument();
    expect(screen.queryByLabelText(TODAY.ask)).toBeNull();
    await waitFor(() => expect(checkIn).toHaveBeenCalledWith({ instanceId: IDS.sideVoicesInstance }));
    // Checked in: the dust puff plays once the island is back in view, and the next tap checks in no more.
    expect(viewport()).toHaveAttribute("data-puff", "0");
    fireEvent.click(screen.getByRole("button", { name: "close-detail" }));
    await waitFor(() => expect(viewport()).toHaveAttribute("data-puff", "1"), { timeout: 2000 });
    fireEvent.click(cardButton());
    expect(checkIn).toHaveBeenCalledTimes(1);
  });

  it("never checks in again once today's check-in is in", () => {
    (checkIn as jest.Mock).mockClear();
    render(<IslandApp page={page()} picture={null} />);
    fireEvent.click(cardButton());
    expect(screen.getByTestId("detail")).toBeInTheDocument();
    expect(checkIn).not.toHaveBeenCalled();
  });

  it("starts an untouched quest from the card's เริ่มเลย, then opens it", async () => {
    (startMainQuest as jest.Mock).mockResolvedValue({ ok: true, data: { instanceId: IDS.m2Instance, version: 1 } });
    const board = makeBoard();
    board.main = board.main.map((m) => ({ ...m, in_flight: null, mine: null }));
    board.side = board.side.map((side) => ({ ...side, mine: null }));
    board.proposed = [];
    render(<IslandApp page={page({ board })} picture={null} />);
    fireEvent.click(cardButton(`เริ่มที่: ${MAIN_TITLES[0]}`));
    await waitFor(() => expect(startMainQuest).toHaveBeenCalledWith({ milestone: 1 }));
    await waitFor(() => expect(screen.getByTestId("detail")).toHaveTextContent(JSON.stringify({ kind: "main", milestone: 1 })));
  });

  it("stays on the island when starting fails", async () => {
    (startMainQuest as jest.Mock).mockResolvedValue({ ok: false, code: "unavailable", error: "ไม่ได้" });
    const board = makeBoard();
    board.main = board.main.map((m) => ({ ...m, in_flight: null, mine: null }));
    board.side = board.side.map((side) => ({ ...side, mine: null }));
    board.proposed = [];
    render(<IslandApp page={page({ board })} picture={null} />);
    fireEvent.click(cardButton(`เริ่มที่: ${MAIN_TITLES[0]}`));
    await waitFor(() => expect(startMainQuest).toHaveBeenCalled());
    expect(screen.queryByTestId("detail")).toBeNull();
  });

  it("opens the project sheet from the chip, with no check-in in it (that is the card's now)", () => {
    render(<IslandApp page={page({ island: { ...page().island, taps_today: 0 } })} picture={null} />);
    fireEvent.click(screen.getByRole("button", { name: /แอปจองห้องสมุด/ }));
    const sheet = screen.getByRole("dialog", { name: "แอปจองห้องสมุด" });
    expect(within(sheet).queryByRole("button", { name: /เช็กอิน/ })).toBeNull();
    expect(within(sheet).queryByLabelText(TODAY.ask)).toBeNull();
  });

  it("wakes a resting student from the card", async () => {
    (setResting as jest.Mock).mockResolvedValue({ ok: true, data: { paused: 0, resumed: 1 } });
    render(<IslandApp page={page({ island: { ...page().island, taps_today: 0, resting: true } })} picture={null} />);
    fireEvent.click(cardButton("กำลังพัก"));
    await waitFor(() => expect(setResting).toHaveBeenCalledWith({ on: false }));
    expect(cardButton("กำลังพัก")).toHaveTextContent(NEXT_STEP.action.wake);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("asks to rest from the chip's sheet", async () => {
    (setResting as jest.Mock).mockResolvedValue({ ok: true, data: { paused: 1, resumed: 0 } });
    render(<IslandApp page={page()} picture={null} />);
    openMenu();
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: MENU.rest }));
    await waitFor(() => expect(setResting).toHaveBeenCalledWith({ on: true }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("switches between the close view and the whole island from the menu", () => {
    render(<IslandApp page={page()} picture={null} />);
    openMenu();
    fireEvent.click(screen.getByRole("button", { name: "ดูทั้งเกาะ" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(viewport()).toHaveAttribute("data-whole", "true");
    openMenu();
    expect(screen.getByRole("button", { name: "ขยายดูใกล้ๆ" })).toBeInTheDocument();
  });

  it("keeps the menu a short list: what stands on the island is not in it, the sound is folded under ตั้งค่า, ขอพัก is up top", () => {
    render(<IslandApp page={page({ me: { ...page().me, admin: false } })} picture={null} />);
    openMenu();
    const sheet = screen.getByRole("dialog");
    const list = within(sheet).getByRole("list", { name: "เมนู" });
    expect(within(list).getAllByRole("listitem").map((line) => line.textContent)).toEqual([MENU.board, MENU.guide, MENU.story]);
    const fold = within(sheet).getByText(MENU.settings).closest("details") as HTMLElement;
    expect(fold).not.toHaveAttribute("open");
    expect(within(fold).getByRole("button", { name: MENU.sound })).toHaveAttribute("aria-pressed", "false");
    expect(within(fold).getByRole("button", { name: "ดูทั้งเกาะ" })).toBeInTheDocument();
    const rest = within(sheet).getByRole("button", { name: MENU.rest });
    expect(rest.compareDocumentPosition(list) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(within(sheet).queryByRole("button", { name: MENU.admin })).toBeNull();
  });

  it("keeps the show-name switch in the team sheet", () => {
    render(<IslandApp page={page()} picture={null} />);
    fireEvent.click(screen.getByRole("button", { name: /ดูตัวละคร/ }));
    expect(screen.getByRole("switch", { name: "โชว์ชื่อโปรเจกต์บนเกาะ" })).toBeInTheDocument();
  });

  it.each([
    ["with a project", () => page({ suggestUrl: SUGGEST_URL })],
    ["before a plot is claimed", () => unclaimed({ suggestUrl: SUGGEST_URL })],
  ])("links the suggestions channel from the menu %s", (_label, data) => {
    render(<IslandApp page={data()} picture={null} />);
    openMenu();
    const sheet = screen.getByRole("dialog");
    expect(within(sheet).getByRole("link", { name: "เสนอไอเดีย / แจ้งบั๊ก" })).toHaveAttribute("href", SUGGEST_URL);
  });

  it.each([
    ["with a project", () => page()],
    ["before a plot is claimed", () => unclaimed({ suggestUrl: null })],
  ])("leaves the suggestions link out of the menu %s when no channel is set", (_label, data) => {
    render(<IslandApp page={data()} picture={null} />);
    openMenu();
    const sheet = screen.getByRole("dialog");
    expect(within(sheet).queryByRole("link", { name: /เสนอไอเดีย/ })).toBeNull();
  });

  it("brings mentors' results to the chip's sheet, marks the new ones, and opens each quest", () => {
    // A day after the newest review, with no mark on this browser yet: both count as new.
    const now = jest.spyOn(Date, "now").mockReturnValue(Date.parse("2026-11-11T00:00:00Z"));
    try {
      render(<IslandApp page={page({ memberId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", unread: 3 })} picture={null} />);
      // New results put the lamp dot on the chip, and say so.
      expect(door()).toHaveAccessibleName(expect.stringContaining(RESULTS.hud(2)));
      expect(within(door()).getByTestId("chip-dot")).toBeInTheDocument();
      fireEvent.click(door());
      const list = screen.getByRole("region", { name: RESULTS.title });
      const rows = within(list).getAllByRole("button", { name: /ฟังเสียงจริงอีก 5 คน|เดินทางต่อ/ });
      expect(rows[0]).toHaveTextContent("ฟังเสียงจริงอีก 5 คน");
      expect(rows[0]).toHaveTextContent(RESULTS.clarification);
      expect(rows[0]).toHaveTextContent("ขอรูปหรือโน้ตเพิ่มอีกนิด");
      expect(rows[1]).toHaveTextContent(MAIN_TITLES[5]);
      expect(rows[1]).toHaveTextContent(RESULTS.declined);
      expect(within(list).getAllByText(RESULTS.fresh)).toHaveLength(2);
      // The bot's other notices still live in Discord.
      expect(list).toHaveTextContent(RESULTS.discord(3));
      // Opened: the chip has nothing new any more.
      expect(door()).not.toHaveAccessibleName(expect.stringContaining(RESULTS.hud(2)));
      fireEvent.click(rows[1]);
      expect(screen.queryByRole("region", { name: RESULTS.title })).toBeNull();
      expect(screen.getByTestId("detail")).toHaveTextContent(JSON.stringify({ kind: "main", milestone: 6 }));
    } finally {
      now.mockRestore();
    }
  });

  it("puts the lamp dot on the chip for the bot's notices that wait in Discord", () => {
    render(<IslandApp page={page({ unread: 2 })} picture={null} />);
    expect(door()).toHaveAccessibleName(expect.stringContaining(RESULTS.discord(2)));
    expect(within(door()).getByTestId("chip-dot")).toBeInTheDocument();
  });

  it("shows no results at all before there are any", () => {
    const board = makeBoard();
    board.side = board.side.map((side) => ({ ...side, mine: null }));
    board.main = board.main.map((m) => (m.milestone === 6 ? { ...m, mine: null } : m));
    render(<IslandApp page={page({ board })} picture={null} />);
    fireEvent.click(door());
    expect(screen.queryByRole("region", { name: RESULTS.title })).toBeNull();
  });

  it("puts a fresh approval on the card with ดูผล, then moves on once it is seen", () => {
    const now = jest.spyOn(Date, "now").mockReturnValue(Date.parse("2026-11-11T00:00:00Z"));
    try {
      const board = makeBoard();
      board.main = board.main.map((m) =>
        m.milestone === 1
          ? {
              ...m,
              done: true,
              mine: {
                instance_id: IDS.m6Instance,
                state: "approved",
                version: 1,
                updated_at: "2026-11-10T08:30:00Z",
                latest_submission: null,
                latest_review: { outcome: "approved", feedback: null, created_at: "2026-11-10T08:30:00Z" },
              },
            }
          : m,
      );
      // Its own viewer: the seen mark is per viewer, and another test's mark stays in memory.
      render(<IslandApp page={page({ board, memberId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb" })} picture={null} />);
      const headline = NEXT_STEP.reviewed(MAIN_TITLES[0]);
      expect(screen.getByRole("region", { name: headline })).toHaveTextContent(NEXT_STEP.grew);
      fireEvent.click(cardButton(headline));
      expect(screen.getByTestId("detail")).toHaveTextContent(JSON.stringify({ kind: "main", milestone: 1 }));
      // Seen: the card goes back to the student's next step.
      expect(screen.queryByRole("region", { name: headline })).toBeNull();
      expect(screen.getByRole("region", { name: KEYNOTE })).toBeInTheDocument();
      // Seen up to the approval only: the newer mentor reply still lights the chip.
      expect(door()).toHaveAccessibleName(expect.stringContaining(RESULTS.hud(1)));
    } finally {
      now.mockRestore();
    }
  });

  it("opens a plot over the island", () => {
    render(<IslandApp page={page()} picture={null} />);
    fireEvent.click(screen.getByRole("button", { name: "plot-4" }));
    expect(screen.getByRole("dialog", { name: "แปลง #4" })).toBeInTheDocument();
  });
});

describe("IslandApp: the team's tree", () => {
  const TREE_DATA: MyTree = {
    seed: "oak",
    equipped: { shape: "shape:round", leaf: "leaf:forest", bark: "bark:oak", bloom: "bloom:cream" },
    owned: ["shape:round", "leaf:forest", "bark:oak", "bloom:cream"],
    gifts: [],
    roots: { count: 2, recent: 0 },
    stage: 1,
  };
  const treeButton = () => screen.queryByRole("button", { name: new RegExp(`^${TREE.closeup.open}`) });
  /** The team chip in the top bar: its sheet holds the tree line. */
  const chip = () => screen.getByRole("button", { name: /ดูตัวละคร/ });

  it("has no tree button, no close-up and no seed card below schema 13", () => {
    render(<IslandApp page={page({ tree: null })} picture={null} />);
    expect(treeButton()).toBeNull();
    expect(openBoard()).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: new RegExp(TREE.seed.title) })).toBeNull();
    expect(screen.queryByTestId("tree-canvas")).toBeNull();
  });

  it("keeps the own plot leading to the plot sheet and the board below schema 13", () => {
    render(<IslandApp page={page()} picture={null} />);
    fireEvent.click(screen.getByRole("button", { name: "plot-mine" }));
    expect(screen.getByRole("dialog", { name: PLOT.mine(3) })).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: TREE.closeup.title })).toBeNull();
  });

  it("opens the close-up from the team sheet's tree line, with no pill in the top bar", () => {
    render(<IslandApp page={page({ tree: TREE_DATA })} picture={null} />);
    expect(treeButton()).toBeNull();
    fireEvent.click(chip());
    fireEvent.click(screen.getByRole("button", { name: /^ต้นไม้ของคุณ/ }));
    expect(screen.getByRole("dialog", { name: TREE.closeup.title })).toBeInTheDocument();
    expect(viewport()).toHaveAttribute("data-paused", "true");
  });

  it("opens the close-up from the own plot, and other plots as before", () => {
    render(<IslandApp page={page({ tree: TREE_DATA })} picture={null} />);
    fireEvent.click(screen.getByRole("button", { name: "plot-mine" }));
    expect(screen.getByRole("dialog", { name: TREE.closeup.title })).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: PLOT.mine(3) })).toBeNull();
  });

  it("asks on the tree how the work went (the roots), and never for the check-in", () => {
    render(<IslandApp page={page({ tree: TREE_DATA, island: { ...page().island, taps_today: 0 } })} picture={null} />);
    fireEvent.click(screen.getByRole("button", { name: "plot-mine" }));
    const sheet = screen.getByRole("dialog", { name: TREE.closeup.title });
    expect(within(sheet).getByLabelText(TODAY.lineLabel)).toBeInTheDocument();
    expect(within(sheet).queryByRole("button", { name: /เช็กอิน/ })).toBeNull();
  });

  it("says on the chip and the team sheet's tree line that a gift or the seed waits, never on the menu", () => {
    const chipDot = () => within(chip()).queryByTestId("chip-dot");
    const endsWith = (words: string) => (name: string) => name.endsWith(`, ${words}`);
    const { unmount } = render(
      <IslandApp page={page({ tree: { ...TREE_DATA, gifts: [{ id: "g1", options: ["leaf:mint"] }] } })} picture={null} />,
    );
    expect(chipDot()).toBeInTheDocument();
    expect(chip()).toHaveAccessibleName(expect.stringContaining(TREE.gift.waiting(1)));
    expect(screen.queryByRole("button", { name: HUD.menu })).toBeNull();
    fireEvent.click(chip());
    expect(screen.getByRole("button", { name: (name) => name.startsWith("ต้นไม้ของคุณ") && endsWith(TREE.gift.waiting(1))(name) })).toBeInTheDocument();
    unmount();
    // A gift that offers only a look the team owns by now waits for nothing: no dot.
    const stale = render(
      <IslandApp
        page={page({ tree: { ...TREE_DATA, owned: [...TREE_DATA.owned, "leaf:mint"], gifts: [{ id: "g1", options: ["leaf:mint"] }] } })}
        picture={null}
      />,
    );
    expect(chipDot()).toBeNull();
    stale.unmount();
    render(<IslandApp page={page({ tree: { ...TREE_DATA, seed: null } })} picture={null} />);
    expect(chip()).toHaveAccessibleName(expect.stringContaining(TREE.seed.title));
  });

  it("opens the seed choice from the board's seed card", () => {
    render(<IslandApp page={page({ tree: { ...TREE_DATA, seed: null, stage: 0 } })} picture={null} />);
    const board = openBoard();
    fireEvent.click(within(board).getByRole("button", { name: new RegExp(TREE.seed.title) }));
    const sheet = screen.getByRole("dialog", { name: TREE.closeup.title });
    expect(within(sheet).getByRole("region", { name: TREE.seed.title })).toBeInTheDocument();
  });
});

describe("IslandApp: the canvas", () => {
  it("opens the reconnect picker on arrival from a stale canvas link", () => {
    render(<IslandApp page={page({ canvasLink: { linked: false } })} picture={null} initialPanel="canvas" />);
    expect(screen.getByTestId("picker")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "picker-linked" }));
    expect(screen.queryByTestId("picker")).toBeNull();
    expect(screen.queryByTestId("detail")).toBeNull();
  });
  it("keeps the canvas out of the top bar and the menu: it opens from a quest", () => {
    render(<IslandApp page={page()} picture={null} />);
    openMenu();
    const menu = screen.getByRole("dialog");
    expect(within(menu).queryByRole("link", { name: /แคนวาส/ })).toBeNull();
    expect(within(menu).queryByRole("button", { name: /แคนวาส/ })).toBeNull();
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
    expect(input.prizes).toBe(true);
    expect(labels).toEqual({ notice: "กระดานเควสต์", sign: "Demo Day 28 พ.ย.\nอีก 17 วัน", campfireCount: "3 คนกำลังทำงานอยู่" });
    expect(names).toEqual({
      notice: `กระดานเควสต์: ${pins.map((pin) => pin.title).join(" · ")}`,
      stage: "เวที Demo Day: 28 พ.ย. · อีก 17 วัน",
      campfire: "กองไฟ: ห้อง coworking มี 3 คน",
      prizes: PRIZES_UI.spot,
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

  it("hands the world today's visitors: the viewer already checked in, teammates in the team's colour", () => {
    const tree = { seed: null, equipped: { shape: "shape:round", leaf: "leaf:dusk", bark: "bark:oak", bloom: "bloom:cream" }, owned: [], gifts: [], roots: { count: 0, recent: 0 }, stage: 1 };
    render(<IslandApp page={festive({ visitors: { count: 5, team: 2 }, tree })} picture={null} />);
    expect(plaza().input.visitors).toEqual({ count: 5, team: 2, me: true, arriving: false, shirt: "w" });
    expect(plaza().labels).toMatchObject({ visitors: "วันนี้มีคนเช็กอินบนเกาะแล้ว 5 คน\nวันนี้เพื่อนร่วมทีมเช็กอินแล้ว 2 คน", me: "คุณ" });
    expect(plaza().labels.visitorsMore).toBeUndefined();
  });

  it("draws nobody before the migration (no count), not even the viewer", () => {
    render(<IslandApp page={festive()} picture={null} />);
    expect(plaza().input.visitors).toBeNull();
    expect(plaza().labels).not.toHaveProperty("visitors");
    expect(plaza().labels).not.toHaveProperty("me");
  });

  it("walks the viewer in when today's check-in lands, adding them to the count once", async () => {
    (checkIn as jest.Mock).mockClear();
    render(<IslandApp page={festive({ island: { ...page().island, taps_today: 0 }, visitors: { count: 2, team: 0 } })} picture={null} />);
    expect(plaza().input.visitors).toMatchObject({ count: 2, me: false, arriving: false });
    fireEvent.click(cardButton());
    await waitFor(() => expect(checkIn).toHaveBeenCalled());
    // Under the quest sheet nothing moves yet: the figure waits for the island to be in view again.
    expect(plaza().input.visitors).toMatchObject({ count: 2, me: false });
    fireEvent.click(screen.getByRole("button", { name: "close-detail" }));
    await waitFor(() => expect(plaza().input.visitors).toMatchObject({ count: 3, me: true, arriving: true }), { timeout: 2000 });
    expect(viewport()).toHaveAttribute("data-puff", "1");
    expect(plaza().labels.me).toBe("คุณ");
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
    // Only the notice board's name: it is the way to the whole quest board.
    expect(labels).toEqual({ notice: "กระดานเควสต์" });
    // The Demo Day prize board always stands in the plaza.
    expect(Object.keys(names)).toEqual(["notice", "prizes"]);
    expect(input.prizes).toBe(true);
  });

  it("opens the prizes from the prize board", () => {
    render(<IslandApp page={festive()} picture={null} />);
    fireEvent.click(screen.getByRole("button", { name: PRIZES_UI.spot }));
    expect(screen.getByRole("dialog", { name: PRIZES_UI.title })).toBeInTheDocument();
    expect(viewport()).toHaveAttribute("data-paused", "true");
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

  it("keeps the whole board off home: the plaza's named notice board opens it, and the chip sheet's first line", () => {
    render(<IslandApp page={festive()} picture={null} />);
    expect(screen.queryByRole("button", { name: OLD_BOARD_LINK })).toBeNull();
    // The notice board stands in the plaza with its name over it, so it reads as a place to tap.
    expect(plaza().labels.notice).toBe("กระดานเควสต์");
    fireEvent.click(screen.getByRole("button", { name: /^กระดานเควสต์/ }));
    expect(screen.getByRole("dialog", { name: "กระดานเควสต์" })).toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole("dialog", { name: "กระดานเควสต์" }), { key: "Escape" });
    // The chip's sheet: เควสต์ทั้งหมด heads its short list.
    const sheet = openMenu();
    const list = within(sheet).getByRole("list", { name: "เมนู" });
    expect(within(list).getAllByRole("listitem")[0]).toHaveTextContent(MENU.board);
    fireEvent.click(within(list).getByRole("button", { name: MENU.board }));
    expect(screen.getByRole("dialog", { name: "กระดานเควสต์" })).toBeInTheDocument();
  });

  it("keeps the wide board button only once nothing is next, so home always has one action", () => {
    const board = makeBoard();
    board.main = board.main.map((m) => ({ ...m, done: true, in_flight: null, mine: null }));
    board.side = board.side.map((side) => ({ ...side, mine: null }));
    board.proposed = [];
    render(<IslandApp page={page({ board })} picture={null} />);
    expect(screen.queryByRole("region", { name: /./ })).toBeNull();
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
    expect(props.input.prizes).toBe(true);
    expect(props.names).toEqual({});
    expect(mockViewport.props?.onNoticeVisible).toBeUndefined();
    expect(screen.queryByRole("button", { name: /^กองไฟ/ })).toBeNull();
  });
});

describe("IslandApp: the player", () => {
  const AVATAR = "https://cdn.discordapp.com/avatars/123456789012345678/0123456789abcdef0123456789abcdef.png?size=64";
  const ME = { name: "พลอย", avatarUrl: AVATAR, staff: false };
  const stats = (coins: Partial<CharacterStats["coins"]> = {}): CharacterStats => ({
    stage: 1,
    main: { team: 1, mine: 1 },
    side: { team: 2, mine: 1 },
    community: { milestones: 0, mine: 0, thanks: 1 },
    checkins: { daysActive: 6, thisWeek: 2, run: 3 },
    coins: { live: true, shopLive: true, balance: 2300, reserved: 0, ...coins },
  });
  const waiting: IslandConsent = {
    required: true,
    state: "waiting",
    basis: null,
    ok: false,
    ai: false,
    linkExpiresAt: "2026-11-25T08:00:00Z",
    adultAge: 20,
    parentSaidNo: false,
  };
  const granted: IslandConsent = { ...waiting, state: "granted", basis: "parent", ok: true, ai: true, linkExpiresAt: null };
  const SUMMARY = "ทีมคุยกับผู้ใช้จริง 3 คนแล้ว";
  const news: IslandNews = {
    enabled: true,
    day: "2026-11-11",
    weekOf: null,
    teams: [{ slot: 4, name: "สวนผักดาดฟ้า", day: { summary: SUMMARY, noUpdate: false, at: "2026-11-11T13:00:00Z", day: null }, week: null }],
  };
  const wallet: WalletDetail = {
    live: true,
    shopLive: true,
    balance: 2300,
    reserved: 0,
    terms: null,
    earn: { main: { amount: 300, cap: 5 }, side: null, community: null, taught: null, helped: null },
    entries: [],
    stage: 1,
    communityDone: false,
    consentOk: true,
    shop: { live: true, terms: null, items: [], mine: [] },
  };
  const mockedLoadWallet = loadWallet as jest.MockedFunction<typeof loadWallet>;
  const pillName = (balance: number) => PLAYER.coinPill(balance.toLocaleString("th-TH"));

  beforeEach(() => {
    mockedLoadWallet.mockReset().mockResolvedValue({ ok: true, data: wallet });
  });

  it("names the chip after the student, the project and its tree as the level, and opens the character sheet", () => {
    render(<IslandApp page={page({ me: ME, character: stats() })} picture={null} />);
    const label = PLAYER.chip("พลอย", "แอปจองห้องสมุด", 1);
    const chip = screen.getByRole("button", { name: (name) => name.startsWith(label) });
    expect(chip.closest("header")).not.toBeNull();
    fireEvent.click(chip);
    const sheet = screen.getByRole("dialog", { name: "แอปจองห้องสมุด" });
    expect(within(sheet).getByText("พลอย")).toBeInTheDocument();
    expect(within(sheet).getByText(CHARACTER_COPY.level(1))).toBeInTheDocument();
    expect(viewport()).toHaveAttribute("data-paused", "true");
  });

  it("keeps the project sheet as it was when the stats cannot be read", () => {
    render(<IslandApp page={page({ character: null })} picture={null} />);
    fireEvent.click(screen.getByRole("button", { name: /ดูตัวละคร/ }));
    expect(screen.getByRole("dialog", { name: "แอปจองห้องสมุด" })).toBeInTheDocument();
  });

  it.each([
    ["no stats", null],
    ["coins off and an empty wallet", stats({ live: false, balance: 0 })],
  ])("shows no coins in the top bar or the menu with %s", (_label, character) => {
    render(<IslandApp page={page({ character })} picture={null} />);
    expect(screen.queryByRole("button", { name: /Passioncoin/ })).toBeNull();
    expect(within(openMenu()).queryByRole("button", { name: MENU.coins })).toBeNull();
  });

  it("keeps coins off the menu with a plot: they live in the team sheet", () => {
    render(<IslandApp page={page({ character: stats({ live: false, balance: 400 }) })} picture={null} />);
    expect(within(openMenu()).queryByRole("button", { name: MENU.coins })).toBeNull();
  });

  it("opens the wallet from the team sheet, read only then, and keeps no pill in the top bar", async () => {
    render(<IslandApp page={page({ character: stats() })} picture={null} />);
    expect(screen.queryByRole("button", { name: pillName(2300) })).toBeNull();
    expect(mockedLoadWallet).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /ดูตัวละคร/ }));
    fireEvent.click(within(screen.getByRole("dialog", { name: "แอปจองห้องสมุด" })).getByRole("button", { name: /ดูกระเป๋า/ }));
    const sheet = screen.getByRole("dialog", { name: WALLET.title });
    expect(mockedLoadWallet).toHaveBeenCalledTimes(1);
    expect(await within(sheet).findByText(WALLET.notHours)).toBeInTheDocument();
    expect(viewport()).toHaveAttribute("data-paused", "true");
  });

  it("opens the wallet from the character sheet's coin row", () => {
    render(<IslandApp page={page({ character: stats() })} picture={null} />);
    fireEvent.click(screen.getByRole("button", { name: /ดูตัวละคร/ }));
    const sheet = screen.getByRole("dialog", { name: "แอปจองห้องสมุด" });
    fireEvent.click(within(sheet).getByRole("button", { name: /ดูกระเป๋า/ }));
    expect(screen.queryByRole("dialog", { name: "แอปจองห้องสมุด" })).toBeNull();
    expect(screen.getByRole("dialog", { name: WALLET.title })).toBeInTheDocument();
  });

  it("shows the consent step in the character sheet and opens the consent sheet from it", () => {
    render(<IslandApp page={page({ character: stats(), consent: waiting })} picture={null} />);
    fireEvent.click(screen.getByRole("button", { name: /ดูตัวละคร/ }));
    const sheet = screen.getByRole("dialog", { name: "แอปจองห้องสมุด" });
    fireEvent.click(within(sheet).getByRole("button", { name: "ดูขั้นตอน" }));
    expect(screen.getByRole("dialog", { name: "ก่อนทีมขึ้นบนเกาะ" })).toBeInTheDocument();
  });

  it("lists the island news in the chip's sheet, puts the consent step at its top, and opens the prizes from the plaza", () => {
    render(<IslandApp page={page({ news, consent: waiting })} picture={null} />);
    fireEvent.click(within(openMenu()).getByRole("button", { name: "ข่าวเกาะ" }));
    expect(screen.queryByRole("dialog", { name: "แอปจองห้องสมุด" })).toBeNull();
    expect(screen.getByRole("dialog", { name: "ข่าวเกาะ" })).toHaveTextContent(SUMMARY);

    expect(within(openMenu()).queryByRole("button", { name: PRIZES_UI.menu })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: PRIZES_UI.spot }));
    expect(screen.getByRole("dialog", { name: PRIZES_UI.title })).toBeInTheDocument();

    const sheet = openMenu();
    expect(within(sheet).queryByRole("button", { name: PLAYER_MENU.consent })).toBeNull();
    fireEvent.click(within(sheet).getByRole("button", { name: "ดูขั้นตอน" }));
    expect(screen.getByRole("dialog", { name: "ก่อนทีมขึ้นบนเกาะ" })).toBeInTheDocument();
  });

  it("puts a lamp dot on the chip while consent waits, and none once it is on file", () => {
    const { unmount } = render(<IslandApp page={page({ consent: waiting })} picture={null} />);
    expect(door()).toHaveAccessibleName(expect.stringContaining(HUD.menuConsent));
    expect(within(door()).getByTestId("chip-dot")).toBeInTheDocument();
    unmount();
    render(<IslandApp page={page({ consent: granted })} picture={null} />);
    expect(within(door()).queryByTestId("chip-dot")).toBeNull();
  });

  it("puts the lamp dot on the picture chip before a plot while consent waits", () => {
    render(<IslandApp page={unclaimed({ consent: waiting })} picture={null} />);
    expect(door()).toHaveAccessibleName(expect.stringContaining(HUD.menuConsent));
    expect(within(door()).getByTestId("chip-dot")).toBeInTheDocument();
  });

  it("keeps a menu row for the AI news line while consent is on file without it", () => {
    render(<IslandApp page={page({ consent: { ...granted, basis: "shift_parent", ai: false } })} picture={null} />);
    const row = within(openMenu()).getByRole("button", { name: PLAYER_MENU.aiNews });
    fireEvent.click(row);
    expect(screen.getByRole("dialog", { name: "ก่อนทีมขึ้นบนเกาะ" })).toHaveTextContent("ข่าวเกาะใช้ AI สรุปงานของทีม");
  });

  it.each([
    ["the digest off and consent on file", { news: null, consent: granted }],
    ["neither known (before the migration)", { news: null, consent: null }],
    ["the news switched off", { news: { ...news, enabled: false }, consent: granted }],
  ])("leaves the news and the consent step out of the menu with %s", (_label, data) => {
    render(<IslandApp page={page(data)} picture={null} />);
    const menu = openMenu();
    expect(within(menu).getByRole("link", { name: MENU.guide })).toBeInTheDocument();
    expect(within(menu).queryByRole("button", { name: "ข่าวเกาะ" })).toBeNull();
    expect(within(menu).queryByRole("button", { name: PLAYER_MENU.consent })).toBeNull();
  });

  it("gives a student without a plot their coins and the prizes in the menu: nothing on that island is tapped yet", () => {
    render(<IslandApp page={unclaimed({ me: ME, news, consent: waiting, character: stats() })} picture={null} />);
    const menu = openMenu();
    expect(within(menu).getByRole("button", { name: "ข่าวเกาะ" })).toBeInTheDocument();
    expect(within(menu).getByRole("button", { name: PLAYER_MENU.consent })).toBeInTheDocument();
    fireEvent.click(within(menu).getByRole("button", { name: PRIZES_UI.menu }));
    expect(screen.getByRole("dialog", { name: PRIZES_UI.title })).toBeInTheDocument();
    fireEvent.click(within(openMenu()).getByRole("button", { name: MENU.coins }));
    expect(screen.getByRole("dialog", { name: WALLET.title })).toBeInTheDocument();
  });

  it("puts an opted-in team's AI news on its plot, and nothing on a plot without news", () => {
    const { unmount } = render(<IslandApp page={page({ news })} picture={null} />);
    fireEvent.click(screen.getByRole("button", { name: "plot-4" }));
    expect(within(screen.getByRole("dialog", { name: "แปลง #4" })).getByText(SUMMARY)).toBeInTheDocument();
    unmount();
    render(<IslandApp page={page({ news: { ...news, teams: [{ ...news.teams[0], slot: 9 }] } })} picture={null} />);
    fireEvent.click(screen.getByRole("button", { name: "plot-4" }));
    expect(within(screen.getByRole("dialog", { name: "แปลง #4" })).queryByText(SUMMARY)).toBeNull();
  });

  it("hands the island the viewer's own picture only on their own island", () => {
    const { unmount } = render(<IslandApp page={page({ me: ME })} picture={null} />);
    expect(mockViewport.props?.me).toMatchObject({ name: "พลอย", avatarUrl: AVATAR });
    unmount();
    render(<IslandApp page={unclaimed({ me: ME })} picture={null} />);
    expect(mockViewport.props?.me).toBeUndefined();
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

describe("IslandApp voyage", () => {
  const voyage = () => screen.queryByTestId("voyage");
  const cover = () => document.querySelector("[data-voyage-cover]");

  beforeEach(() => window.localStorage.clear());

  it("sails a first arrival across before the story, the island held still under the night", () => {
    render(<IslandApp page={page()} picture={null} />);
    expect(voyage()).toHaveAttribute("data-name", page().me.name);
    expect(screen.getByTestId("story")).toHaveAttribute("data-auto", "false");
    expect(viewport()).toHaveAttribute("data-paused", "true");
    expect(cover()).not.toBeNull();

    // The circle opens on the island: it comes alive, and the night lifts.
    fireEvent.click(screen.getByRole("button", { name: "voyage-reveal" }));
    expect(viewport()).toHaveAttribute("data-paused", "false");
    expect(cover()).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "voyage-done" }));
    expect(voyage()).toBeNull();
    expect(screen.getByTestId("story")).toHaveAttribute("data-auto", "true");
    expect(window.localStorage.getItem(VOYAGE_SEEN_KEY)).toBe("seen");
  });

  it("sails a first arrival without a plot across too", () => {
    render(<IslandApp page={unclaimed()} picture={null} />);
    expect(voyage()).not.toBeNull();
    expect(screen.getByTestId("story")).toHaveAttribute("data-auto", "false");
    fireEvent.click(screen.getByRole("button", { name: "voyage-done" }));
    expect(voyage()).toBeNull();
    expect(screen.getByTestId("story")).toHaveAttribute("data-auto", "true");
  });

  it("leaves a student who was on the island before the crossing existed on the island", () => {
    window.localStorage.setItem(STORY_SEEN_KEY, "seen");
    render(<IslandApp page={page()} picture={null} />);
    expect(voyage()).toBeNull();
    expect(cover()).toBeNull();
    expect(viewport()).toHaveAttribute("data-paused", "false");
  });

  it("sails across again when the ticket sent the student here, then drops ?at=voyage", () => {
    window.localStorage.setItem(STORY_SEEN_KEY, "seen");
    window.localStorage.setItem(VOYAGE_SEEN_KEY, "seen");
    window.history.replaceState(null, "", "/shift/island?at=voyage");
    render(<IslandApp page={page()} picture={null} voyage />);
    expect(voyage()).not.toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "voyage-done" }));
    expect(voyage()).toBeNull();
    expect(window.location.search).toBe("");
    window.history.replaceState(null, "", "/");
  });
});

describe("admin Island overview", () => {
  const adminOverview = { projects: [{ slot: 4, name: "Admin-visible team", route: "service", ambition: null, milestones: [1], members: ["Mint"], waitingReview: 2, openHelp: 1, checkinsWeek: 3, lastActivity: "2026-11-15T12:00:00Z" }] };
  it.each([true, false])("opens admin oversight with a project: %s", (withProject) => {
    const data = page({ me: { name: "Admin", avatarUrl: null, staff: true, admin: true }, adminOverview });
    if (!withProject) { data.island = { ...data.island, project: null }; data.board = null; }
    render(<IslandApp page={data} picture={null} />);
    openMenu();
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: MENU.admin }));
    expect(screen.getByRole("heading", { name: "แปลง 4 · Admin-visible team" })).toBeInTheDocument();
    expect(screen.getByText(/Mint/)).toBeInTheDocument();
  });
  it("does not expose the admin control or data to a reviewer", () => {
    render(<IslandApp page={page({ me: { name: "Reviewer", avatarUrl: null, staff: true }, adminOverview })} picture={null} />);
    openMenu();
    expect(screen.queryByRole("button", { name: MENU.admin })).not.toBeInTheDocument();
    expect(screen.queryByText(/Admin-visible team/)).not.toBeInTheDocument();
  });
});
