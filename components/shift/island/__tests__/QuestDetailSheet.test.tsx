import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { toast } from "sonner";

import {
  loadOwnership,
  chooseSideQuest,
  resumeQuest,
  startMainQuest,
  submitMainQuest,
  submitProposedQuest,
  submitSideQuest,
} from "@/app/shift/island/actions";
import { pickGift } from "@/app/shift/island/tree-actions";
import { questGuide, type CanvasLinkState, type QuestCanvasContext } from "@/lib/shift-island/quest-canvas";
import { keynoteQuest, type BoardRef } from "@/lib/supabase/shift-quests/board";
import type { MyTree, QuestBoard, QuestSubmitResult } from "@/lib/supabase/shift-quests/types";

import { IDS, MAIN_SLUGS, MAIN_TITLES, makeBoard } from "../__fixtures__/board";
import { QuestCardComposer, useQuestCanvas } from "../canvas";
import { DETAIL, HELPERS, QUEST_FLAVOR } from "../copy";
import { clearAllDrafts } from "../drafts";
import { QuestDetailSheet } from "../QuestDetailSheet";

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
jest.mock("@/app/shift/island/actions", () => ({
  submitMainQuest: jest.fn(),
  submitSideQuest: jest.fn(),
  submitProposedQuest: jest.fn(),
  chooseSideQuest: jest.fn(),
  startMainQuest: jest.fn(),
  resumeQuest: jest.fn(),
  loadOwnership: jest.fn(() => Promise.resolve({ ok: true, data: null })),
}));

jest.mock("@/app/shift/island/tree-actions", () => ({ pickGift: jest.fn() }));

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

// The tree close-up canvas: what it was asked to draw (jsdom has no 2D canvas).
jest.mock("../tree/TreeCanvas", () => {
  const { createElement } = jest.requireActual<typeof import("react")>("react");
  return {
    TreeCanvas: ({ input, label }: { input: unknown; label?: string }) =>
      createElement("div", { "data-testid": "tree-canvas", "data-input": JSON.stringify(input), "aria-label": label }),
  };
});

// vaul needs layout APIs jsdom lacks; the sheet only has to show its content and its action bar when open.
jest.mock("../IslandSheet", () => {
  const { createElement } = jest.requireActual<typeof import("react")>("react");
  return {
    IslandSheet: ({
      open,
      title,
      description,
      footer,
      children,
    }: {
      open: boolean;
      title: string;
      description?: string;
      footer?: unknown;
      children: unknown;
    }) =>
      open
        ? createElement(
            "div",
            { role: "dialog", "aria-label": title },
            createElement("p", { "data-testid": "sheet-description" }, description),
            createElement("div", { "data-testid": "sheet-body" }, children as never),
            footer ? createElement("div", { "data-testid": "sheet-footer" }, footer as never) : null,
          )
        : null,
  };
});

/** What the stub composer hands up as sent (set per test). */
let mockSent: QuestSubmitResult;

// The canvas side is canvas-submit's: a hook whose answer each test picks, and a stub composer.
jest.mock("../canvas", () => {
  const { createElement } = jest.requireActual<typeof import("react")>("react");
  const { createPortal } = jest.requireActual<typeof import("react-dom")>("react-dom");
  return {
    useQuestCanvas: jest.fn(),
    CanvasLinkSheet: () => null,
    QuestCardComposer: jest.fn(
      ({
        target,
        step,
        onStep,
        footer,
        onSubmitted,
      }: {
        target: { title: string };
        step: string;
        onStep: (step: string) => void;
        footer: HTMLElement | null;
        onSubmitted: (result: QuestSubmitResult) => void;
      }) =>
        createElement(
          "div",
          { "data-testid": "composer", "data-step": step },
          createElement("p", null, `composer:${target.title}`),
          createElement("button", { type: "button", onClick: () => onStep("review") }, "composer-next"),
          createElement("button", { type: "button", onClick: () => onSubmitted(mockSent) }, "composer-sent"),
          footer ? createPortal(createElement("button", { type: "button" }, `composer-footer:${step}`), footer) : null,
        ),
    ),
  };
});

const ok = { ok: true as const, data: { instanceId: "i", revision: 1, created: true, gift: null, tree: null } };
const mocked = {
  submitMainQuest: submitMainQuest as jest.MockedFunction<typeof submitMainQuest>,
  submitSideQuest: submitSideQuest as jest.MockedFunction<typeof submitSideQuest>,
  submitProposedQuest: submitProposedQuest as jest.MockedFunction<typeof submitProposedQuest>,
  chooseSideQuest: chooseSideQuest as jest.MockedFunction<typeof chooseSideQuest>,
  startMainQuest: startMainQuest as jest.MockedFunction<typeof startMainQuest>,
  resumeQuest: resumeQuest as jest.MockedFunction<typeof resumeQuest>,
  useQuestCanvas: useQuestCanvas as jest.MockedFunction<typeof useQuestCanvas>,
  loadOwnership: loadOwnership as jest.MockedFunction<typeof loadOwnership>,
  QuestCardComposer: QuestCardComposer as unknown as jest.Mock,
  pickGift: pickGift as jest.MockedFunction<typeof pickGift>,
};

const UNLINKED: CanvasLinkState = { linked: false };
const LINKED: CanvasLinkState = { linked: true, linkedAt: "2026-11-11T08:00:00Z" };

const READY: Extract<QuestCanvasContext, { state: "ready" }> = {
  state: "ready",
  canvas: { title: "แอปจองห้องสมุด", boardTitle: "SHIFT ห้อง 2", lastEdited: 1_762_848_000_000 },
  context: [
    { kind: "problem", label: "ปัญหาตอนนี้", text: "ห้องสมุดเต็มตอนพักเที่ยง", version: 2, count: null, noteId: "note_P1" },
    { kind: "target", label: "คนที่เจอ", text: null, version: null, count: null, noteId: null },
    { kind: "interview", label: "สัมภาษณ์", text: null, version: null, count: 3, noteId: null },
  ],
  hints: [
    { id: "m1-who", hinted: true, detail: null },
    { id: "m1-talked", hinted: true, detail: "สัมภาษณ์ 3 ใบ" },
    { id: "m1-new", hinted: false, detail: null },
  ],
  notes: [],
};

const reload = jest.fn();
/** What the canvas hook answers for a quest that reads the canvas; null targets always get "no_zones". */
let canvasAnswer: { context: QuestCanvasContext | null; loading: boolean };

beforeEach(() => {
  clearAllDrafts();
  mockSent = ok.data;
  jest.mocked(toast.success).mockReset();
  jest.mocked(toast.error).mockReset();
  mocked.pickGift.mockReset();
  canvasAnswer = { context: { state: "unlinked" }, loading: false };
  mocked.useQuestCanvas.mockImplementation((target) =>
    target ? { ...canvasAnswer, reload } : { context: { state: "no_zones" }, loading: false, reload },
  );
  mocked.startMainQuest.mockResolvedValue({ ok: true, data: { instanceId: "i", version: 1, created: true } });
  mocked.resumeQuest.mockResolvedValue({ ok: true, data: { version: 2 } });
  mocked.submitMainQuest.mockResolvedValue(ok);
  mocked.submitSideQuest.mockResolvedValue(ok);
  mocked.submitProposedQuest.mockResolvedValue(ok);
  mocked.chooseSideQuest.mockResolvedValue({ ok: true, data: { instanceId: "i", version: 1, created: true } });
  mocked.loadOwnership.mockResolvedValue({ ok: true, data: null });
});

function open(
  target: BoardRef,
  link: CanvasLinkState = UNLINKED,
  {
    board = makeBoard(),
    ...extra
  }: {
    onTree?: () => void;
    board?: QuestBoard;
    team?: { ambition: string | null; planted: boolean } | null;
    onPlant?: () => void;
    onOpenQuest?: (ref: BoardRef) => void;
    next?: BoardRef | null;
    onIsland?: () => void;
  } = {},
) {
  const onClose = jest.fn();
  const onStuck = jest.fn();
  const onLinkCanvas = jest.fn();
  const utils = render(
    <QuestDetailSheet
      board={board}
      target={target}
      keynote={keynoteQuest(board)}
      canvasLink={link}
      onClose={onClose}
      onStuck={onStuck}
      onLinkCanvas={onLinkCanvas}
      {...extra}
    />,
  );
  return { onClose, onStuck, onLinkCanvas, board, ...utils };
}

/**
 * Open a quest and go to sending: ส่งเควสต์ in the bar on a started quest,
 * or on an untouched one (whose bar starts it) the quiet ทำเสร็จแล้ว? link.
 */
function openForm(target: BoardRef, link: CanvasLinkState = UNLINKED, extra: { onTree?: () => void } = {}) {
  const handlers = open(target, link, extra);
  const send = within(footer()).queryByRole("button", { name: "เขียนหรือแนบงาน" });
  fireEvent.click(send ?? within(body()).getByRole("button", { name: DETAIL.sendDone }));
  return handlers;
}

const body = () => screen.getByTestId("sheet-body");
const footer = () => screen.getByTestId("sheet-footer");

/** Write-first: the main action opens the written form; the quest card is the switch inside it. */
function openCard(target: BoardRef, link: CanvasLinkState = UNLINKED, extra: { onTree?: () => void } = {}) {
  const handles = openForm(target, link, extra);
  fireEvent.click(screen.getByRole("button", { name: "ใช้โน้ตจากแคนวาส" }));
  return handles;
}

const LINK_LABEL = "ลิงก์งาน (ขึ้นต้นด้วย https://)";

function fill({ proof, url, reflection }: { proof?: string; url?: string; reflection?: string }) {
  if (proof !== undefined) fireEvent.change(screen.getByLabelText("หลักฐาน"), { target: { value: proof } });
  if (url !== undefined) {
    // The link is a text button until it is wanted.
    const add = screen.queryByRole("button", { name: "เพิ่มลิงก์" });
    if (add) fireEvent.click(add);
    fireEvent.change(screen.getByLabelText(LINK_LABEL), { target: { value: url } });
  }
  // Required answers first (proof, then the reflection); the optional link comes after them.
  if (reflection !== undefined) fireEvent.change(screen.getAllByRole("textbox")[1] as HTMLElement, { target: { value: reflection } });
}

describe("QuestDetailSheet: the quest page", () => {
  it("shows a badge with the main quest's place among all of them, the title and one line of why", () => {
    open({ kind: "main", milestone: 1 });
    expect(screen.getByRole("dialog", { name: MAIN_TITLES[0] })).toBeInTheDocument();
    expect(within(body()).getByText("เควสต์หลัก 1/7")).toBeInTheDocument();
    expect(screen.getByTestId("sheet-description")).toHaveTextContent("เควสต์หลัก 1/7");
    expect(within(body()).getByText("จุดประสงค์ของขั้นที่ 1")).toBeInTheDocument();
    // Five dots say where the work stands, in place of the status chip.
    expect(within(body()).getByRole("list", { name: DETAIL.stepperLabel("เริ่ม") })).toBeInTheDocument();
    expect(within(body()).queryByText("ทำได้เลย")).toBeNull();
  });

  it("moves the dots with the work: ทำ in progress, พี่เลี้ยงดู once sent, all lit once passed", () => {
    open({ kind: "main", milestone: 2 });
    expect(within(body()).getByRole("list", { name: DETAIL.stepperLabel("ทำ") })).toBeInTheDocument();
    cleanup();
    open({ kind: "main", milestone: 5 });
    expect(within(body()).getByRole("list", { name: DETAIL.stepperLabel("พี่เลี้ยงดู") })).toBeInTheDocument();
  });

  it("keeps the status chip, no dots, on a quest that cannot be worked on now", () => {
    open({ kind: "side", templateId: IDS.sidePhone });
    expect(within(body()).queryByRole("list", { name: /สถานะเควสต์นี้/ })).toBeNull();
  });

  it("names side and proposed quests in the badge", () => {
    open({ kind: "side", templateId: IDS.sideVoices });
    expect(within(body()).getByText("เควสต์เสริม")).toBeInTheDocument();
  });

  it("names a quest the student proposed", () => {
    open({ kind: "proposed", instanceId: IDS.proposed });
    expect(within(body()).getByText("เควสต์ที่คุณเสนอ")).toBeInTheDocument();
    expect(within(body()).getByText("ให้เพื่อนหาร้านใกล้โรงเรียนได้")).toBeInTheDocument();
  });

  it("shows the quest's one lore line on main and side quests, never on a proposed one", () => {
    open({ kind: "main", milestone: 1 });
    expect(within(body()).getByText("ทุกต้นเริ่มจากคนหนึ่งคนที่เจอปัญหาจริง")).toBeInTheDocument();
    cleanup();
    open({ kind: "side", templateId: IDS.sideVoices });
    expect(within(body()).getByText("ห้าเสียงจริง ชัดกว่าการเดาคนเดียว")).toBeInTheDocument();
    cleanup();
    open({ kind: "proposed", instanceId: IDS.proposed });
    for (const line of Object.values(QUEST_FLAVOR)) expect(within(body()).queryByText(line)).toBeNull();
  });

  it("names the main quest's pitfall, its warning sign and how to avoid it", () => {
    open({ kind: "main", milestone: 3 });
    const box = within(body()).getByRole("heading", { name: "หลุมพราง" }).closest("section") as HTMLElement;
    expect(within(box).getByText("เยสแบบสุภาพ")).toBeInTheDocument();
    expect(within(box).getByText("สัญญาณเตือน")).toBeInTheDocument();
    expect(within(box).getByText("เลี่ยงยังไง")).toBeInTheDocument();
    cleanup();
    open({ kind: "main", milestone: 1 });
    const first = within(body()).getByRole("heading", { name: "หลุมพราง" }).closest("section") as HTMLElement;
    expect(within(first).getByText("เป้าหมายคือทุกคน")).toBeInTheDocument();
    expect(within(first).getByText("กลัวเจอคนจริง")).toBeInTheDocument();
  });

  it("has no หลุมพราง on side and proposed quests", () => {
    open({ kind: "side", templateId: IDS.sideVoices });
    expect(within(body()).queryByRole("heading", { name: "หลุมพราง" })).toBeNull();
    cleanup();
    open({ kind: "proposed", instanceId: IDS.proposed });
    expect(within(body()).queryByRole("heading", { name: "หลุมพราง" })).toBeNull();
  });

  it("offers the canvas as an optional reference when none is linked, and hands the quest up to open the picker", () => {
    const { onLinkCanvas } = open({ kind: "main", milestone: 1 });
    expect(mocked.useQuestCanvas).toHaveBeenLastCalledWith({ ref: { kind: "main", milestone: 1 }, slug: MAIN_SLUGS[0] }, UNLINKED);
    expect(within(body()).getByRole("heading", { name: "แคนวาสของทีม" })).toBeInTheDocument();
    expect(within(body()).getByText("ไม่บังคับ เชื่อมไว้แล้วโน้ตของทีมจะขึ้นตรงนี้ให้ดูประกอบ")).toBeInTheDocument();
    // The button is the one "เชื่อมแคนวาส" on the page.
    expect(within(body()).getAllByText("เชื่อมแคนวาส")).toHaveLength(1);
    fireEvent.click(within(body()).getByRole("button", { name: "เชื่อมแคนวาส" }));
    expect(onLinkCanvas).toHaveBeenCalledWith({ kind: "main", milestone: 1 });
  });

  it("shows a pixel skeleton while the notes load", () => {
    canvasAnswer = { context: null, loading: true };
    open({ kind: "main", milestone: 1 }, LINKED);
    expect(within(body()).getByRole("heading", { name: "สำหรับโปรเจกต์คุณ" })).toBeInTheDocument();
    expect(within(body()).getByRole("status")).toHaveTextContent("กำลังดึงโน้ตจากแคนวาส");
  });

  it("fills สำหรับโปรเจกต์คุณ from the student's own notes, with zone emoji from the whiteboard", () => {
    canvasAnswer = { context: READY, loading: false };
    const { onLinkCanvas } = open({ kind: "main", milestone: 1 }, LINKED);
    const box = within(body()).getByRole("heading", { name: "สำหรับโปรเจกต์คุณ" }).closest("section") as HTMLElement;
    const rows = within(box).getAllByRole("listitem");
    expect(rows).toHaveLength(3);
    expect(rows[0]).toHaveTextContent("🎯 ปัญหาตอนนี้: ห้องสมุดเต็มตอนพักเที่ยงv2");
    expect(rows[1]).toHaveTextContent("👥 คนที่เจอ: ยังไม่มีโน้ต");
    expect(rows[2]).toHaveTextContent("🎤 สัมภาษณ์3 ใบ");
    expect(within(box).getByText("จากแคนวาส แอปจองห้องสมุด")).toBeInTheDocument();
    fireEvent.click(within(box).getByRole("button", { name: "เปลี่ยน" }));
    expect(onLinkCanvas).toHaveBeenCalledWith({ kind: "main", milestone: 1 });
  });

  it("opens the canvas from the quest page, and each shown note on it", () => {
    canvasAnswer = { context: READY, loading: false };
    open({ kind: "main", milestone: 1 }, LINKED);
    const box = within(body()).getByRole("heading", { name: "สำหรับโปรเจกต์คุณ" }).closest("section") as HTMLElement;
    const openCanvas = within(body()).getByRole("link", { name: "เปิดแคนวาส" });
    expect(openCanvas).toHaveAttribute("href", "/shift/island/canvas");
    expect(openCanvas).toHaveAttribute("target", "_blank");
    // Only the row that shows a note's text links to it.
    const noteLinks = within(box).getAllByRole("link", { name: "ดูบนแคนวาส" });
    expect(noteLinks).toHaveLength(1);
    expect(noteLinks[0]).toHaveAttribute("href", "/shift/island/canvas?note=note_P1");
    expect(noteLinks[0]).toHaveTextContent("ดูบนแคนวาส");
    expect(noteLinks[0]).toHaveAccessibleDescription(/ห้องสมุดเต็มตอนพักเที่ยง/);
    expect(within(box).getAllByRole("listitem")[0]).toContainElement(noteLinks[0]);
  });

  it("links a note id that is not safe to the canvas only", () => {
    canvasAnswer = {
      context: { ...READY, context: [{ ...READY.context[0], noteId: "../../x?y=1" }] },
      loading: false,
    };
    open({ kind: "main", milestone: 1 }, LINKED);
    expect(within(body()).getByRole("link", { name: "ดูบนแคนวาส" })).toHaveAttribute("href", "/shift/island/canvas");
  });

  it("has no open-canvas row without a linked canvas", () => {
    canvasAnswer = { context: READY, loading: false };
    open({ kind: "main", milestone: 1 }, UNLINKED);
    expect(within(body()).queryByRole("link", { name: "เปิดแคนวาส" })).toBeNull();
  });

  it("opens the canvas on a quest without canvas zones too", () => {
    open({ kind: "side", templateId: IDS.sideFriend }, LINKED);
    expect(within(body()).queryByRole("heading", { name: "สำหรับโปรเจกต์คุณ" })).toBeNull();
    expect(within(body()).getByRole("link", { name: "เปิดแคนวาส" })).toHaveAttribute("href", "/shift/island/canvas");
  });

  it("opens the canvas while the notes still load", () => {
    canvasAnswer = { context: null, loading: true };
    open({ kind: "main", milestone: 1 }, LINKED);
    expect(within(body()).getByRole("link", { name: "เปิดแคนวาส" })).toBeInTheDocument();
  });

  it("offers to link a canvas on a quest without zones when none is linked", () => {
    const { onLinkCanvas } = open({ kind: "side", templateId: IDS.sideFriend });
    fireEvent.click(within(body()).getByRole("button", { name: "เชื่อมแคนวาส" }));
    expect(onLinkCanvas).toHaveBeenCalledWith({ kind: "side", templateId: IDS.sideFriend });
  });

  it("says when the student is not on the canvas team", () => {
    canvasAnswer = { context: { state: "not_yours" }, loading: false };
    open({ kind: "main", milestone: 1 }, LINKED);
    expect(within(body()).getByText("คุณยังไม่ได้อยู่ในทีมของแคนวาสนี้ ขอให้เจ้าของแคนวาสเพิ่มคุณในทีมก่อน")).toBeInTheDocument();
    expect(within(body()).queryByRole("button", { name: "เลือกใหม่" })).toBeNull();
  });

  it("offers to pick again when the linked canvas is gone", () => {
    canvasAnswer = { context: { state: "gone", candidates: [] }, loading: false };
    const { onLinkCanvas } = open({ kind: "main", milestone: 2 }, LINKED);
    expect(within(body()).getByText("หาแคนวาสที่เชื่อมไว้ไม่เจอ อาจถูกลบหรือย้ายไปแล้ว")).toBeInTheDocument();
    fireEvent.click(within(body()).getByRole("button", { name: "เลือกใหม่" }));
    expect(onLinkCanvas).toHaveBeenCalledWith({ kind: "main", milestone: 2 });
  });

  it("keeps the sheet working with one quiet line when the canvas fails", () => {
    canvasAnswer = { context: { state: "error" }, loading: false };
    open({ kind: "main", milestone: 1 }, LINKED);
    expect(within(body()).getByText("โหลดโน้ตจากแคนวาสไม่ได้ตอนนี้ ส่งแบบเขียนเองได้เลย")).toBeInTheDocument();
    expect(within(footer()).getByRole("button", { name: DETAIL.start })).toBeInTheDocument();
  });

  it("does not read the canvas for a quest without zones", () => {
    open({ kind: "side", templateId: IDS.sideFriend });
    expect(mocked.useQuestCanvas).toHaveBeenLastCalledWith(null, UNLINKED);
    expect(within(body()).queryByRole("heading", { name: "สำหรับโปรเจกต์คุณ" })).toBeNull();
    expect(within(body()).queryByRole("heading", { name: "เชื่อมแคนวาส" })).toBeNull();
  });

  it("ticks เสร็จเมื่อ from canvas hints only, and says a mentor still decides", () => {
    canvasAnswer = { context: READY, loading: false };
    open({ kind: "main", milestone: 1 }, LINKED);
    const guide = questGuide({ kind: "main", slug: MAIN_SLUGS[0] });
    const list = within(body()).getByRole("heading", { name: "เสร็จเมื่อ" }).closest("section") as HTMLElement;
    const items = within(list).getAllByRole("listitem");
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent(guide.checklist[0].label);
    expect(items[0]).toHaveAttribute("data-hinted", "true");
    // A written note needs no extra line: the lit check and the context row say it.
    expect(items[0].querySelector(".doneDetail")).toBeNull();
    expect(items[1]).toHaveTextContent("สัมภาษณ์ 3 ใบ");
    expect(items[1]).toHaveAttribute("data-hinted", "true");
    expect(items[2]).not.toHaveAttribute("data-hinted");
    expect(within(list).getByText("ติ๊กให้จากโน้ตในแคนวาส พี่เลี้ยงเป็นคนดูและตัดสิน")).toBeInTheDocument();
    // A hint never gates sending.
    expect(within(body()).getByRole("button", { name: DETAIL.sendDone })).toBeEnabled();
  });

  it("leaves every check unlit without a ready canvas", () => {
    open({ kind: "main", milestone: 1 });
    const list = within(body()).getByRole("heading", { name: "เสร็จเมื่อ" }).closest("section") as HTMLElement;
    for (const item of within(list).getAllByRole("listitem")) expect(item).not.toHaveAttribute("data-hinted");
  });

  it("falls back to the evidence criteria as the one unticked item for a quest with no guide", () => {
    open({ kind: "proposed", instanceId: IDS.proposed });
    const list = within(body()).getByRole("heading", { name: "เสร็จเมื่อ" }).closest("section") as HTMLElement;
    const items = within(list).getAllByRole("listitem");
    expect(items).toHaveLength(1);
    expect(items[0]).toHaveTextContent("มีแผนที่ที่เพื่อนสามคนใช้ได้");
    expect(items[0]).not.toHaveAttribute("data-hinted");
    expect(within(list).queryByText("ติ๊กให้จากโน้ตในแคนวาส พี่เลี้ยงเป็นคนดูและตัดสิน")).toBeNull();
  });

  it("puts how to do it open under the checklist, and folds only the details, the words and the lore", () => {
    open({ kind: "main", milestone: 1 });
    const guide = questGuide({ kind: "main", slug: MAIN_SLUGS[0] });
    const details = within(body()).getByText(DETAIL.helpers).closest("details") as HTMLElement;
    expect(details).not.toHaveAttribute("open");
    const done = within(body()).getByRole("heading", { name: "เสร็จเมื่อ" });
    // How to do it is open, never folded: work that passed, the pitfalls and the way around them, ตัวช่วย.
    const examples = within(body()).getByRole("heading", { name: "ตัวอย่างที่ผ่าน" }).closest("section") as HTMLElement;
    expect(examples.closest("details")).toBeNull();
    expect(within(examples).getByText(guide.examples[0])).toBeInTheDocument();
    const pitfalls = within(body()).getByRole("heading", { name: "หลุมพราง" }).closest("section") as HTMLElement;
    expect(pitfalls.closest("details")).toBeNull();
    expect(within(body()).getByText(HELPERS.safety).closest("details")).toBeNull();
    // Right under the checklist, before anything optional.
    expect(done.compareDocumentPosition(examples) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(pitfalls.compareDocumentPosition(details) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // The checklist stays out of the fold: it is the task.
    expect(done.closest("details")).toBeNull();
    expect(within(details).getByRole("heading", { name: /คำศัพท์/ })).toBeInTheDocument();
    expect(within(details).getByRole("heading", { name: "ส่งอะไร" })).toBeInTheDocument();
    expect(within(details).getByText("หลักฐานของขั้นที่ 1")).toBeInTheDocument();
    expect(within(details).getByRole("heading", { name: "คำถามหนึ่งข้อ" })).toBeInTheDocument();
    expect(within(details).getByText("คำถามของขั้นที่ 1")).toBeInTheDocument();
  });

  it("uses the board's examples for a side quest", () => {
    open({ kind: "side", templateId: IDS.sideVoices });
    const examples = within(body()).getByRole("heading", { name: "ตัวอย่างที่ผ่าน" }).closest("section") as HTMLElement;
    expect(within(examples).getByText("เช่น คุยกับเพื่อนต่างห้อง")).toBeInTheDocument();
  });
});

describe("QuestDetailSheet: pictures, the team's problem and ตัวช่วย", () => {
  it("gives every pitfall its own picture, with the sign and the way around as two different rows", () => {
    open({ kind: "main", milestone: 1 });
    const box = within(body()).getByRole("heading", { name: "หลุมพราง" }).closest("section") as HTMLElement;
    const cards = box.querySelectorAll("article");
    expect(cards).toHaveLength(2);
    cards.forEach((card) => {
      expect(card.querySelector("svg")).not.toBeNull();
      expect(card.querySelector('[data-tone="sign"]')).toHaveTextContent("สัญญาณเตือน");
      expect(card.querySelector('[data-tone="avoid"]')).toHaveTextContent("เลี่ยงยังไง");
    });
  });

  it("puts a picture beside every เสร็จเมื่อ item and names who checks in its own slot", () => {
    open({ kind: "main", milestone: 3 });
    const box = within(body()).getByRole("heading", { name: "เสร็จเมื่อ" }).closest("section") as HTMLElement;
    const items = within(box).getAllByRole("listitem");
    expect(items).toHaveLength(3);
    items.forEach((item) => expect(item.querySelectorAll("svg").length).toBeGreaterThan(0));
    expect(box.querySelector('[data-slot="who-checks"]')).toHaveTextContent("ใครตรวจพี่เลี้ยงตรวจ");
  });

  it("leads the first act with the problem the team planted, and not the later acts", () => {
    const team = { ambition: "แม่ค้าหน้าโรงเรียนขายไม่ทันตอนเที่ยง", planted: true };
    open({ kind: "main", milestone: 1 }, UNLINKED, { team });
    const box = within(body()).getByRole("heading", { name: "ปัญหาที่ทีมเลือก" }).closest("section") as HTMLElement;
    expect(within(box).getByText(team.ambition)).toBeInTheDocument();
    cleanup();
    open({ kind: "main", milestone: 4 }, UNLINKED, { team });
    expect(within(body()).queryByRole("heading", { name: "ปัญหาที่ทีมเลือก" })).toBeNull();
  });

  it("offers the team's tree when no problem is planted yet", () => {
    const onPlant = jest.fn();
    open({ kind: "main", milestone: 2 }, UNLINKED, { team: { ambition: null, planted: false }, onPlant });
    expect(within(body()).getByText("ทีมยังไม่ได้เลือกว่าอยากแก้ปัญหาอะไร ให้ใคร")).toBeInTheDocument();
    fireEvent.click(within(body()).getByRole("button", { name: "ไปเลือกที่ต้นไม้ของทีม" }));
    expect(onPlant).toHaveBeenCalledTimes(1);
  });

  it("lists the side quests off a main quest as ตัวช่วย and opens one in place", () => {
    const onOpenQuest = jest.fn();
    open({ kind: "main", milestone: 1 }, UNLINKED, { onOpenQuest });
    const box = within(body()).getByRole("heading", { name: "ตัวช่วย" }).closest("section") as HTMLElement;
    fireEvent.click(within(box).getByRole("button", { name: "ฟังเสียงจริงอีก 5 คน" }));
    expect(onOpenQuest).toHaveBeenCalledWith({ kind: "side", templateId: IDS.sideVoices });
    cleanup();
    open({ kind: "main", milestone: 2 }, UNLINKED, { onOpenQuest });
    const locked = within(body()).getByRole("button", { name: /ให้คนอื่นเปิดได้จากมือถือ/ });
    expect(locked).toHaveTextContent("ยังล็อกอยู่");
  });

  it("says to tell someone at home before meeting anyone, on the first act only", () => {
    const safety = "ก่อนไปเจอใคร บอกพ่อแม่หรือครูว่าจะไปคุยกับใคร และนัดในที่ที่มีคนอื่นอยู่ด้วย";
    open({ kind: "main", milestone: 2 });
    expect(within(body()).getByText(safety)).toBeInTheDocument();
    cleanup();
    open({ kind: "main", milestone: 5 });
    expect(within(body()).queryByText(safety)).toBeNull();
  });

  it("shows where the quest sits in the seven stages for a main quest", () => {
    open({ kind: "main", milestone: 5 });
    expect(within(body()).getByText("สร้างสิ่งที่สำคัญ")).toBeInTheDocument();
  });
});

describe("QuestDetailSheet: less repeated text", () => {
  it("shows a criteria-only quest's criteria once, in เสร็จเมื่อ, not again under the details", () => {
    open({ kind: "proposed", instanceId: IDS.proposed });
    expect(within(body()).getAllByText("มีแผนที่ที่เพื่อนสามคนใช้ได้")).toHaveLength(1);
    expect(within(body()).queryByRole("heading", { name: "ส่งอะไร" })).toBeNull();
  });

  it("never cuts a proposed quest's goal, the student's own words", () => {
    open({ kind: "proposed", instanceId: IDS.proposed });
    expect(within(body()).getByText("ให้เพื่อนหาร้านใกล้โรงเรียนได้")).toHaveAttribute("data-full", "true");
  });

  it("shows a long template purpose whole under the details", () => {
    const board = makeBoard();
    const long = "ก".repeat(130);
    board.main[0] = { ...board.main[0], purpose: long };
    render(
      <QuestDetailSheet
        board={board}
        target={{ kind: "main", milestone: 1 }}
        keynote={null}
        canvasLink={UNLINKED}
        onClose={jest.fn()}
        onStuck={jest.fn()}
        onLinkCanvas={jest.fn()}
      />,
    );
    const details = within(body()).getByText(DETAIL.helpers).closest("details") as HTMLElement;
    expect(within(details).getByRole("heading", { name: "ทำไมเควสต์นี้" })).toBeInTheDocument();
    expect(within(details).getByText(long)).toBeInTheDocument();
  });
});

describe("QuestDetailSheet: the ถือกุญแจเอง side quest and the ownership checklist", () => {
  const KEYS = "22222222-2222-4222-8222-000000000005";
  const keys: BoardRef = { kind: "side", templateId: KEYS };
  /** The fixture board with the ถือกุญแจเอง side quest on it, sent once already. */
  const withKeys = (): QuestBoard => {
    const board = makeBoard();
    const friend = board.side.find((s) => s.template_id === IDS.sideFriend)!;
    board.side = [
      ...board.side,
      {
        ...friend,
        template_id: KEYS,
        slug: "side-take-the-keys",
        title: "ถือกุญแจเอง",
        icon: "key",
        branch_of: 7,
        repeatable: false,
        sort_order: 220,
        mine: {
          instance_id: "33333333-3333-4333-8333-000000000005",
          state: "submitted",
          version: 3,
          updated_at: "2026-11-10T08:00:00Z",
          latest_submission: null,
          latest_review: null,
        },
      },
    ];
    return board;
  };

  const ROWS = [
    { item: "access" as const, state: "demonstrated" as const, mentorHeld: false },
    { item: "export" as const, state: "not_checked" as const, mentorHeld: false },
    { item: "team" as const, state: "not_applicable" as const, mentorHeld: false },
    { item: "costs" as const, state: "demonstrated" as const, mentorHeld: true },
    { item: "portability" as const, state: "needs_help" as const, mentorHeld: false },
  ];

  it("shows the checklist from Discord, read-only, and where to change it", async () => {
    mocked.loadOwnership.mockResolvedValue({ ok: true, data: ROWS });
    open(keys, UNLINKED, { board: withKeys() });
    const box = within(body()).getByRole("heading", { name: "สำหรับโปรเจกต์คุณ" }).closest("section") as HTMLElement;
    await waitFor(() => expect(within(box).getByText("เข้าถึงงานได้เอง:")).toBeInTheDocument());
    const rows = within(box).getAllByRole("listitem");
    expect(rows).toHaveLength(5);
    expect(rows[0]).toHaveTextContent("ทำได้แล้ว");
    expect(rows[3]).toHaveTextContent("บัญชีพี่เลี้ยง");
    expect(within(box).getByText("อัปเดตใน Discord: พิมพ์ /project ownership")).toBeInTheDocument();
    expect(mocked.useQuestCanvas).toHaveBeenLastCalledWith(null, UNLINKED);
    // Not every item is done: the first เสร็จเมื่อ item stays unlit.
    const list = within(body()).getByRole("heading", { name: "เสร็จเมื่อ" }).closest("section") as HTMLElement;
    expect(within(list).getAllByRole("listitem")[0]).not.toHaveAttribute("data-hinted");
    expect(within(list).getAllByRole("listitem")[0]).toHaveTextContent("/project ownership");
  });

  it("lights its first item once every check is done, still as a hint", async () => {
    mocked.loadOwnership.mockResolvedValue({
      ok: true,
      data: ROWS.map((row) => ({ ...row, state: "demonstrated" as const, mentorHeld: false })),
    });
    open(keys, UNLINKED, { board: withKeys() });
    const list = within(body()).getByRole("heading", { name: "เสร็จเมื่อ" }).closest("section") as HTMLElement;
    await waitFor(() => expect(within(list).getAllByRole("listitem")[0]).toHaveAttribute("data-hinted", "true"));
  });

  it("points to Discord when the checklist cannot load", async () => {
    mocked.loadOwnership.mockResolvedValue({ ok: false, code: "unknown", error: "x" });
    open(keys, UNLINKED, { board: withKeys() });
    await waitFor(() =>
      expect(within(body()).getByText("เช็กลิสต์อยู่ใน Discord: พิมพ์ /project ownership แล้วเช็กทีละข้อ")).toBeInTheDocument(),
    );
  });

  it("says the checklist goes with the work, and leaves room for it in the proof", async () => {
    mocked.loadOwnership.mockResolvedValue({ ok: true, data: ROWS });
    open(keys, UNLINKED, { board: withKeys() });
    await waitFor(() => expect(within(body()).getByText("เข้าถึงงานได้เอง:")).toBeInTheDocument());
    // With the work at a mentor, a new version is the quiet link in the page.
    fireEvent.click(within(body()).getByRole("button", { name: "ส่งฉบับใหม่" }));
    expect(screen.getByText("ตอนกดส่ง เช็กลิสต์ /project ownership จะแนบไปกับงานนี้ให้เอง")).toBeInTheDocument();
    const max = Number(screen.getByLabelText("หลักฐาน").getAttribute("maxLength"));
    expect(max).toBeLessThan(2000);
    expect(max).toBeGreaterThan(1500);
  });

  it("reads no checklist on any other quest, main quest 5 included", () => {
    open({ kind: "main", milestone: 1 });
    cleanup();
    open({ kind: "main", milestone: 5 });
    expect(mocked.loadOwnership).not.toHaveBeenCalled();
  });
});

describe("QuestDetailSheet: the action bar", () => {
  it("goes back to the island from a closed quest: never a dead end", () => {
    const board = makeBoard();
    board.proposed[0] = { ...board.proposed[0], state: "declined" };
    const onIsland = jest.fn();
    render(
      <QuestDetailSheet
        board={board}
        target={{ kind: "proposed", instanceId: IDS.proposed }}
        keynote={null}
        canvasLink={UNLINKED}
        onClose={jest.fn()}
        onStuck={jest.fn()}
        onLinkCanvas={jest.fn()}
        onIsland={onIsland}
      />,
    );
    const buttons = within(footer()).getAllByRole("button");
    expect(buttons.map((b) => b.textContent)).toEqual([DETAIL.home]);
    fireEvent.click(buttons[0]);
    expect(onIsland).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("button", { name: DETAIL.stuckLine })).toBeNull();
  });

  it("offers one button on a quest in progress, with help a quiet line under the checklist", () => {
    open({ kind: "main", milestone: 2 });
    const bar = footer();
    expect(within(bar).getAllByRole("button").map((b) => b.textContent)).toEqual(["เขียนหรือแนบงาน"]);
    const checklist = within(body()).getByRole("heading", { name: "เสร็จเมื่อ" }).closest("section") as HTMLElement;
    const stuck = within(body()).getByRole("button", { name: DETAIL.stuckLine });
    expect(checklist.compareDocumentPosition(stuck) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(within(body()).queryByLabelText("หลักฐาน")).toBeNull();
    // The day's intention is optional and folded inside the quest: the card's tap was the check-in.
    expect(within(body()).getByText(DETAIL.intention).closest("details")).not.toHaveAttribute("open");
  });

  it("makes starting the one button on an untouched quest, with sending done work one quiet link away", async () => {
    open({ kind: "main", milestone: 1 });
    const bar = footer();
    const start = within(bar).getByRole("button", { name: DETAIL.start });
    expect(start).toHaveClass("ei-button-dawn");
    expect(within(bar).getAllByRole("button")).toHaveLength(1);
    expect(within(body()).queryByRole("button", { name: DETAIL.start })).toBeNull();
    fireEvent.click(start);
    await waitFor(() => expect(mocked.startMainQuest).toHaveBeenCalledWith({ milestone: 1 }));
    // It stays on the quest: no toast to read, the page refreshes into the started quest.
    expect(toast.success).not.toHaveBeenCalled();
    fireEvent.click(within(body()).getByRole("button", { name: DETAIL.sendDone }));
    expect(screen.getByLabelText("หลักฐาน")).toBeInTheDocument();
  });

  it("opens the stuck sheet with the caller's own instance", () => {
    const { onStuck } = open({ kind: "main", milestone: 2 });
    fireEvent.click(within(body()).getByRole("button", { name: DETAIL.stuckLine }));
    expect(onStuck).toHaveBeenCalledWith({ instanceId: IDS.m2Instance, title: MAIN_TITLES[1] });
  });

  it("explains a locked quest with no form and no canvas, and goes to the quest that is open", () => {
    const onOpenQuest = jest.fn();
    open({ kind: "side", templateId: IDS.sidePhone }, UNLINKED, { next: { kind: "main", milestone: 2 }, onOpenQuest });
    expect(screen.getByText(`ปลดล็อกเมื่อผ่าน ${MAIN_TITLES[1]}`)).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.queryByRole("button", { name: /ส่ง/ })).toBeNull();
    expect(screen.queryByRole("button", { name: DETAIL.stuckLine })).toBeNull();
    expect(mocked.useQuestCanvas).toHaveBeenLastCalledWith(null, UNLINKED);
    fireEvent.click(within(footer()).getByRole("button", { name: DETAIL.toOpen }));
    expect(onOpenQuest).toHaveBeenCalledWith({ kind: "main", milestone: 2 });
  });

  it("shows who holds a teammate's quest, with help but nothing to send", () => {
    open({ kind: "main", milestone: 4 });
    expect(screen.getByText("มิ้นต์ ถืองานขั้นนี้อยู่ ช่วยกันในงานนั้นได้")).toBeInTheDocument();
    expect(within(footer()).getAllByRole("button").map((b) => b.textContent)).toEqual([DETAIL.home]);
    expect(within(body()).getByRole("button", { name: DETAIL.stuckLine })).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).toBeNull();
  });

  it("has nothing to send while an appeal is open: the bar says so", () => {
    open({ kind: "side", templateId: IDS.sideCut });
    expect(within(footer()).getByRole("status")).toHaveTextContent("งานนี้อยู่ระหว่างอุทธรณ์ รอทีมงานตัดสินก่อน");
    expect(within(footer()).queryByRole("button")).toBeNull();
    expect(screen.queryByRole("textbox")).toBeNull();
  });

  it("goes on to the next quest from a passed one, or back to the island when it is the same quest", () => {
    let board = makeBoard();
    board = { ...board, main: board.main.map((m) => (m.milestone === 3 ? { ...m, done: true, in_flight: null, mine: null } : m)) };
    const onOpenQuest = jest.fn();
    open({ kind: "main", milestone: 3 }, UNLINKED, { board, next: { kind: "main", milestone: 2 }, onOpenQuest });
    fireEvent.click(within(footer()).getByRole("button", { name: DETAIL.next }));
    expect(onOpenQuest).toHaveBeenCalledWith({ kind: "main", milestone: 2 });
    cleanup();
    open({ kind: "main", milestone: 3 }, UNLINKED, { board, next: { kind: "main", milestone: 3 }, onOpenQuest });
    expect(within(footer()).getByRole("button", { name: DETAIL.home })).toBeInTheDocument();
  });

  it("opens the written form first, with the quest card one tap away when the canvas is ready", () => {
    canvasAnswer = { context: READY, loading: false };
    openForm({ kind: "main", milestone: 1 }, LINKED);
    expect(screen.queryByTestId("composer")).toBeNull();
    expect(screen.getByLabelText("หลักฐาน")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "ใช้โน้ตจากแคนวาส" }));
    expect(screen.getByTestId("composer")).toHaveTextContent(`composer:${MAIN_TITLES[0]}`);
    expect(screen.getByTestId("composer")).toHaveAttribute("data-step", "pick");
    // The composer's button sits in the sheet's footer, in place of ส่งเควสต์ and ติด.
    expect(within(footer()).getAllByRole("button").map((b) => b.textContent)).toEqual(["composer-footer:pick"]);
    expect(screen.queryByLabelText("หลักฐาน")).toBeNull();
    const props = mocked.QuestCardComposer.mock.calls.at(-1)[0];
    expect(props.target).toEqual({
      ref: { kind: "main", milestone: 1 },
      slug: MAIN_SLUGS[0],
      title: MAIN_TITLES[0],
      reflectionPrompt: "คำถามของขั้นที่ 1",
      version: null,
      resubmit: false,
    });
    expect(props.context).toBe(READY);
    expect(props.onReload).toBe(reload);
    // What the mentor looks for, for step 1's compact reminder.
    expect(props.doneWhen).toEqual(questGuide({ kind: "main", slug: MAIN_SLUGS[0] }).checklist.map((item) => item.label));
  });

  it("goes back to the quest from step 1 with กลับ, top left, with the bar back", () => {
    canvasAnswer = { context: READY, loading: false };
    openCard({ kind: "main", milestone: 1 }, LINKED);
    const back = within(body()).getAllByRole("button")[0];
    expect(back).toHaveAccessibleName("กลับ");
    fireEvent.click(back);
    expect(screen.queryByTestId("composer")).toBeNull();
    expect(within(footer()).getByRole("button", { name: DETAIL.start })).toHaveFocus();
  });

  it("goes back from step 2 to step 1 with แก้โน้ต, in the same top left place", () => {
    canvasAnswer = { context: READY, loading: false };
    openCard({ kind: "main", milestone: 1 }, LINKED);
    fireEvent.click(screen.getByRole("button", { name: "composer-next" }));
    expect(screen.getByTestId("composer")).toHaveAttribute("data-step", "review");
    expect(within(footer()).getByRole("button", { name: "composer-footer:review" })).toBeInTheDocument();
    // Step 2 is about the card: no switch to the written form.
    expect(screen.queryByRole("button", { name: "เขียนเองแทน" })).toBeNull();
    const back = within(body()).getAllByRole("button")[0];
    expect(back).toHaveAccessibleName("แก้โน้ต");
    fireEvent.click(back);
    expect(screen.getByTestId("composer")).toHaveAttribute("data-step", "pick");
  });

  it("stays open on the sent screen when the composer has sent the card", () => {
    canvasAnswer = { context: READY, loading: false };
    const { onClose } = openCard({ kind: "main", milestone: 1 }, LINKED);
    fireEvent.click(screen.getByRole("button", { name: "composer-sent" }));
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.queryByTestId("composer")).toBeNull();
    expect(within(body()).getByRole("heading", { name: "ส่งถึงพี่เลี้ยงแล้ว" })).toHaveFocus();
    expect(within(body()).getByText("พี่เลี้ยงจะดูใน Discord แล้วแจ้งผลในกล่องข้อความของบอท")).toBeInTheDocument();
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("switches from the composer to writing it out with เขียนเองแทน, and back", () => {
    canvasAnswer = { context: READY, loading: false };
    openCard({ kind: "main", milestone: 1 }, LINKED);
    fireEvent.click(screen.getByRole("button", { name: "เขียนเองแทน" }));
    expect(screen.queryByTestId("composer")).toBeNull();
    expect(screen.getByLabelText("หลักฐาน")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "ใช้โน้ตจากแคนวาส" }));
    expect(screen.getByTestId("composer")).toBeInTheDocument();
  });

  it("opens the written form when the canvas is not ready", () => {
    openForm({ kind: "main", milestone: 1 });
    expect(screen.queryByTestId("composer")).toBeNull();
    expect(screen.getByLabelText("หลักฐาน")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "เขียนเองแทน" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "กลับ" }));
    expect(screen.queryByLabelText("หลักฐาน")).toBeNull();
    expect(within(footer()).getByRole("button", { name: DETAIL.start })).toBeInTheDocument();
  });

  it("never waits for the canvas: the written form opens at once while the notes still load", () => {
    canvasAnswer = { context: null, loading: true };
    openForm({ kind: "main", milestone: 1 }, LINKED);
    expect(screen.getByLabelText("หลักฐาน")).toBeInTheDocument();
    expect(screen.queryByTestId("composer")).toBeNull();
    // The card switch shows once the notes are ready, never before.
    expect(screen.queryByRole("button", { name: "ใช้โน้ตจากแคนวาส" })).toBeNull();
  });

  it("starts on the quest again when the sheet reopens", () => {
    const board = makeBoard();
    const props = { board, keynote: null, canvasLink: UNLINKED, onClose: jest.fn(), onStuck: jest.fn(), onLinkCanvas: jest.fn() };
    const { rerender } = render(<QuestDetailSheet {...props} target={{ kind: "main", milestone: 1 }} />);
    fireEvent.click(within(body()).getByRole("button", { name: DETAIL.sendDone }));
    expect(screen.getByLabelText("หลักฐาน")).toBeInTheDocument();
    rerender(<QuestDetailSheet {...props} target={null} />);
    rerender(<QuestDetailSheet {...props} target={{ kind: "main", milestone: 1 }} />);
    expect(screen.queryByLabelText("หลักฐาน")).toBeNull();
    expect(within(footer()).getByRole("button", { name: DETAIL.start })).toBeInTheDocument();
  });
});

describe("QuestDetailSheet: the sent screen", () => {
  const GIFT_ID = "7c1d2e3f-4a5b-4c6d-8e7f-000000000001";
  const DEFAULTS = ["shape:round", "leaf:forest", "bark:oak", "bloom:cream"];
  const TREE: MyTree = {
    seed: "oak",
    equipped: { shape: "shape:round", leaf: "leaf:forest", bark: "bark:oak", bloom: "bloom:cream" },
    owned: DEFAULTS,
    gifts: [{ id: GIFT_ID, options: ["leaf:mint", "leaf:gold", "leaf:dusk"] }],
    roots: { count: 2, recent: 1 },
    stage: 2,
  };
  const withGift: QuestSubmitResult = {
    instanceId: "i",
    revision: 1,
    created: true,
    gift: { id: GIFT_ID, options: ["leaf:mint", "leaf:gold", "leaf:dusk"] },
    tree: TREE,
  };
  const PICKED: MyTree = { ...TREE, owned: [...DEFAULTS, "leaf:gold"], gifts: [], equipped: { ...TREE.equipped, leaf: "leaf:gold" } };

  /** The written form, filled and sent from the sheet's bar. */
  async function sendWritten(extra: { onTree?: () => void } = {}) {
    const handlers = openForm({ kind: "main", milestone: 1 }, UNLINKED, extra);
    fill({ proof: "หลักฐาน", reflection: "คำตอบ" });
    fireEvent.click(within(footer()).getByRole("button", { name: "ส่งให้พี่เลี้ยงดู" }));
    await within(body()).findByRole("heading", { name: "ส่งถึงพี่เลี้ยงแล้ว" });
    return handlers;
  }

  it("after the written form, says where the result arrives, with กลับไปที่เกาะ closing the sheet", async () => {
    const { onClose } = await sendWritten();
    expect(mocked.submitMainQuest).toHaveBeenCalledTimes(1);
    expect(within(body()).getByText("พี่เลี้ยงจะดูใน Discord แล้วแจ้งผลในกล่องข้อความของบอท")).toBeInTheDocument();
    expect(within(body()).queryByRole("textbox")).toBeNull();
    // No tree below schema 13: no gift and no link to it.
    expect(screen.queryByRole("group", { name: /เลือกลุค/ })).toBeNull();
    expect(screen.queryByRole("button", { name: "ดูต้นไม้ของทีม" })).toBeNull();
    expect(within(footer()).getAllByRole("button").map((b) => b.textContent)).toEqual(["กลับไปที่เกาะ"]);
    fireEvent.click(within(footer()).getByRole("button", { name: "กลับไปที่เกาะ" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("offers the team's tree beside กลับไปที่เกาะ when the island has one", async () => {
    const onTree = jest.fn();
    await sendWritten({ onTree });
    fireEvent.click(within(footer()).getByRole("button", { name: "ดูต้นไม้ของทีม" }));
    expect(onTree).toHaveBeenCalledTimes(1);
  });

  it("keeps the sent screen when the page refreshes with the quest's new state", async () => {
    const { board, rerender, onClose, onStuck, onLinkCanvas } = await sendWritten();
    const next = { ...board, main: board.main.map((m) => (m.milestone === 1 ? { ...m, in_flight: { instance_id: "i", state: "submitted" as const, version: 1, mine: true, owner: null } } : m)) };
    rerender(
      <QuestDetailSheet
        board={next}
        target={{ kind: "main", milestone: 1 }}
        keynote={null}
        canvasLink={UNLINKED}
        onClose={onClose}
        onStuck={onStuck}
        onLinkCanvas={onLinkCanvas}
      />,
    );
    expect(within(body()).getByRole("heading", { name: "ส่งถึงพี่เลี้ยงแล้ว" })).toBeInTheDocument();
  });

  it("starts on the quest again when the sheet reopens after sending", async () => {
    const { board, rerender, onClose, onStuck, onLinkCanvas } = await sendWritten();
    const props = { board, keynote: null, canvasLink: UNLINKED, onClose, onStuck, onLinkCanvas };
    rerender(<QuestDetailSheet {...props} target={null} />);
    rerender(<QuestDetailSheet {...props} target={{ kind: "main", milestone: 1 }} />);
    expect(screen.queryByRole("heading", { name: "ส่งถึงพี่เลี้ยงแล้ว" })).toBeNull();
    expect(within(footer()).getByRole("button", { name: DETAIL.start })).toBeInTheDocument();
  });

  it("offers the gift, 1 of 3 as the team's tree wearing each, and puts the pick on the tree", async () => {
    mockSent = withGift;
    mocked.pickGift.mockResolvedValue({ ok: true, data: { tree: PICKED } });
    canvasAnswer = { context: READY, loading: false };
    openCard({ kind: "main", milestone: 1 }, LINKED, { onTree: jest.fn() });
    fireEvent.click(screen.getByRole("button", { name: "composer-sent" }));
    expect(within(body()).getByRole("heading", { name: "ส่งเควสต์นี้ครั้งแรกแล้ว ทีมได้ของขวัญหนึ่งชิ้น" })).toBeInTheDocument();
    const options = within(screen.getByRole("group", { name: "เลือกลุคให้ต้นไม้ของทีม 1 จาก 3 แบบ" })).getAllByRole("button");
    expect(options).toHaveLength(3);
    // While the gift waits, the bar only offers to keep it for later.
    expect(within(footer()).getAllByRole("button").map((b) => b.textContent)).toEqual(["เก็บไว้ก่อน"]);
    fireEvent.click(options[1]);
    await waitFor(() => expect(mocked.pickGift).toHaveBeenCalledWith(GIFT_ID, "leaf:gold"));
    // The picked look on the team's tree, and no tiles left to press.
    expect(await within(body()).findByText("ต้นไม้ของทีมได้ ทอง แล้ว")).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: /เลือกลุค/ })).toBeNull();
    const drawn = within(body()).getByTestId("tree-canvas");
    expect(JSON.parse(drawn.getAttribute("data-input") ?? "{}").style.leaf).toBe("leaf:gold");
    expect(within(footer()).getAllByRole("button").map((b) => b.textContent)).toEqual(["กลับไปที่เกาะ", "ดูต้นไม้ของทีม"]);
    // Said once, on the screen (no toast on top of it), and focus moves to the way back.
    expect(toast.success).not.toHaveBeenCalled();
    expect(within(footer()).getByRole("button", { name: "กลับไปที่เกาะ" })).toHaveFocus();
  });

  it("when a teammate picked the gift first: says so once, and the bar offers the way back, not keeping it", async () => {
    mockSent = withGift;
    mocked.pickGift.mockResolvedValue({ ok: false, code: "gift_gone", error: "ของขวัญชิ้นนี้ถูกเลือกไปแล้ว ดูลุคที่ทีมมีได้ในลุคของต้นไม้" });
    canvasAnswer = { context: READY, loading: false };
    const { onClose } = openCard({ kind: "main", milestone: 1 }, LINKED, { onTree: jest.fn() });
    fireEvent.click(screen.getByRole("button", { name: "composer-sent" }));
    fireEvent.click(within(screen.getByRole("group", { name: "เลือกลุคให้ต้นไม้ของทีม 1 จาก 3 แบบ" })).getAllByRole("button")[0]);
    expect(await within(body()).findByRole("status")).toHaveTextContent("ของขวัญชิ้นนี้ถูกเลือกไปแล้ว");
    expect(toast.error).not.toHaveBeenCalled();
    expect(within(footer()).getAllByRole("button").map((b) => b.textContent)).toEqual(["กลับไปที่เกาะ", "ดูต้นไม้ของทีม"]);
    expect(within(footer()).getByRole("button", { name: "กลับไปที่เกาะ" })).toHaveFocus();
    fireEvent.click(within(footer()).getByRole("button", { name: "กลับไปที่เกาะ" }));
    expect(toast.success).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("keeps the gift for later: the sheet closes and the gift waits in the close-up", () => {
    mockSent = withGift;
    canvasAnswer = { context: READY, loading: false };
    const { onClose } = openCard({ kind: "main", milestone: 1 }, LINKED);
    fireEvent.click(screen.getByRole("button", { name: "composer-sent" }));
    fireEvent.click(within(footer()).getByRole("button", { name: "เก็บไว้ก่อน" }));
    expect(mocked.pickGift).not.toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalledWith("เก็บไว้แล้ว เพื่อนในทีมคนไหนก็เปิดได้ทีหลัง");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("shows no gift it cannot draw (no tree came with it)", () => {
    mockSent = { ...withGift, tree: null };
    canvasAnswer = { context: READY, loading: false };
    openCard({ kind: "main", milestone: 1 }, LINKED);
    fireEvent.click(screen.getByRole("button", { name: "composer-sent" }));
    expect(screen.queryByRole("group", { name: /เลือกลุค/ })).toBeNull();
    expect(within(footer()).getByRole("button", { name: "กลับไปที่เกาะ" })).toBeInTheDocument();
  });
});

describe("QuestDetailSheet: the written form and quest states", () => {
  it("caps the written form like the database", () => {
    openForm({ kind: "main", milestone: 1 });
    expect(screen.getByLabelText("หลักฐาน")).toHaveAttribute("maxLength", "2000");
    // The link opens from its text button, focused, with the https rule in its label.
    expect(screen.queryByLabelText(LINK_LABEL)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "เพิ่มลิงก์" }));
    expect(screen.getByLabelText(LINK_LABEL)).toHaveAttribute("maxLength", "500");
    expect(screen.getByLabelText(LINK_LABEL)).toHaveFocus();
    expect(screen.getByLabelText("คำถามของขั้นที่ 1")).toHaveAttribute("maxLength", "2000");
    expect(screen.getByRole("button", { name: "ส่งให้พี่เลี้ยงดู" })).toBeInTheDocument();
  });

  it("reminds what the mentor looks for on top, with placeholders, and sends from the sheet's bar", () => {
    openForm({ kind: "main", milestone: 1 });
    const reminder = within(body()).getByRole("list", { name: "เสร็จเมื่อ" });
    expect(within(reminder).getAllByRole("listitem")).toHaveLength(3);
    expect(reminder.compareDocumentPosition(screen.getByLabelText("หลักฐาน")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByLabelText("หลักฐาน")).toHaveAttribute("placeholder", "วางลิงก์ หรือเล่าสั้นๆ ว่าทำอะไรไป แล้วเจออะไร");
    expect(screen.getByLabelText("คำถามของขั้นที่ 1")).toHaveAttribute("placeholder", "ตอบสั้นๆ ข้อเดียว เก็บไว้ใช้ในพอร์ตได้");
    const send = within(footer()).getByRole("button", { name: "ส่งให้พี่เลี้ยงดู" });
    expect(send).toHaveAttribute("type", "submit");
    expect(send).toHaveAttribute("form", (body().querySelector("form") as HTMLFormElement).id);
    expect(within(body()).queryByRole("button", { name: "ส่งให้พี่เลี้ยงดู" })).toBeNull();
  });

  it("shows criteria without a guide as the one reminder line", () => {
    openForm({ kind: "proposed", instanceId: IDS.proposed });
    const reminder = within(body()).getByRole("list", { name: "เสร็จเมื่อ" });
    expect(within(reminder).getAllByRole("listitem")).toHaveLength(1);
  });

  it("refuses text over the cap and empty answers without calling the server", async () => {
    openForm({ kind: "main", milestone: 1 });
    fill({ proof: "ก".repeat(2001), reflection: "" });
    fireEvent.click(screen.getByRole("button", { name: "ส่งให้พี่เลี้ยงดู" }));
    expect(await screen.findByText("ยาวเกิน 2000 ตัวอักษร")).toBeInTheDocument();
    expect(screen.getByText("ตอบคำถามหนึ่งข้อก่อนส่ง")).toBeInTheDocument();
    expect(mocked.submitMainQuest).not.toHaveBeenCalled();
  });

  it("shows a counter near the cap", () => {
    openForm({ kind: "main", milestone: 1 });
    fill({ proof: "ก".repeat(1700) });
    expect(screen.getByText("1700/2000")).toBeInTheDocument();
  });

  it("accepts only https links", async () => {
    openForm({ kind: "main", milestone: 1 });
    fill({ proof: "ทำแบบสอบถามแล้ว", url: "http://example.com/work", reflection: "เห็นว่าคนไม่อ่านคำอธิบาย" });
    fireEvent.click(screen.getByRole("button", { name: "ส่งให้พี่เลี้ยงดู" }));
    expect(await screen.findByText("ลิงก์ต้องขึ้นต้นด้วย https://")).toBeInTheDocument();
    expect(mocked.submitMainQuest).not.toHaveBeenCalled();
  });

  it("sends a main quest by milestone with ids and text only, never an actor", async () => {
    const { onClose } = openForm({ kind: "main", milestone: 1 });
    fill({ proof: "  ทำแบบสอบถามแล้ว  ", url: "https://example.com/work", reflection: "เห็นว่าคนไม่อ่านคำอธิบาย" });
    fireEvent.click(screen.getByRole("button", { name: "ส่งให้พี่เลี้ยงดู" }));
    await waitFor(() => expect(mocked.submitMainQuest).toHaveBeenCalledTimes(1));
    const input = mocked.submitMainQuest.mock.calls[0][0];
    expect(input).toEqual({
      milestone: 1,
      proof: "ทำแบบสอบถามแล้ว",
      reflection: "เห็นว่าคนไม่อ่านคำอธิบาย",
      artifactUrl: "https://example.com/work",
    });
    expect(JSON.stringify(input)).not.toMatch(/actor|discord|\d{17,20}/i);
    expect(await within(body()).findByRole("heading", { name: "ส่งถึงพี่เลี้ยงแล้ว" })).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("sends a side quest by template id and shows the mentor's feedback", async () => {
    open({ kind: "side", templateId: IDS.sideVoices });
    expect(screen.getByText("พี่เลี้ยงบอกว่า: ขอรูปหรือโน้ตเพิ่มอีกนิด")).toBeInTheDocument();
    // A mentor asked for more: the one button is a new version.
    fireEvent.click(within(footer()).getByRole("button", { name: "ส่งฉบับใหม่" }));
    fill({ proof: "คุยกับ ม.4 สามคน", reflection: "ประโยคที่ว่าไม่มีเวลา" });
    fireEvent.click(screen.getByRole("button", { name: "ส่งฉบับใหม่" }));
    await waitFor(() =>
      expect(mocked.submitSideQuest).toHaveBeenCalledWith({
        templateId: IDS.sideVoices,
        proof: "คุยกับ ม.4 สามคน",
        reflection: "ประโยคที่ว่าไม่มีเวลา",
        artifactUrl: null,
      }),
    );
    expect(mocked.submitMainQuest).not.toHaveBeenCalled();
  });

  it("sends a proposed quest by instance id and version", async () => {
    openForm({ kind: "proposed", instanceId: IDS.proposed });
    fill({ proof: "แผนที่ฉบับแรก", reflection: "เพื่อนใช้ได้จริงสองคน" });
    fireEvent.click(screen.getByRole("button", { name: "ส่งให้พี่เลี้ยงดู" }));
    await waitFor(() =>
      expect(mocked.submitProposedQuest).toHaveBeenCalledWith({
        instanceId: IDS.proposed,
        version: 5,
        proof: "แผนที่ฉบับแรก",
        reflection: "เพื่อนใช้ได้จริงสองคน",
        artifactUrl: null,
      }),
    );
  });

  it("shows the database's Thai error and keeps the sheet open", async () => {
    mocked.submitMainQuest.mockResolvedValueOnce({ ok: false, code: "milestone_open", error: "เพื่อนในทีมทำขั้นนี้อยู่" });
    const { onClose } = openForm({ kind: "main", milestone: 1 });
    fill({ proof: "หลักฐาน", reflection: "คำตอบ" });
    fireEvent.click(screen.getByRole("button", { name: "ส่งให้พี่เลี้ยงดู" }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("เพื่อนในทีมทำขั้นนี้อยู่"));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("lets a done main quest be sent again to keep learning", () => {
    open({ kind: "main", milestone: 3 });
    expect(screen.getByText("ผ่านแล้ว ส่งซ้ำเพื่อเรียนรู้ต่อได้")).toBeInTheDocument();
    // Moving on is the bar's one button; sending again is a quiet link in the page.
    expect(within(footer()).getAllByRole("button").map((b) => b.textContent)).toEqual([DETAIL.home]);
    fireEvent.click(within(body()).getByRole("button", { name: "เขียนหรือแนบงาน" }));
    expect(screen.getByRole("button", { name: "ส่งให้พี่เลี้ยงดู" })).toBeInTheDocument();
  });

  it("says a submitted quest is with a mentor, with a new version one quiet tap away", () => {
    open({ kind: "main", milestone: 5 });
    // The bar is words, not a button: the work is with a mentor.
    expect(within(footer()).getByRole("status")).toHaveTextContent(DETAIL.waiting);
    expect(within(footer()).queryByRole("button")).toBeNull();
    expect(screen.queryByRole("textbox")).toBeNull();
    const resend = within(body()).getByRole("button", { name: "ส่งฉบับใหม่" });
    expect(resend).not.toHaveClass("ei-button-dawn");
    fireEvent.click(resend);
    expect(screen.getByLabelText("หลักฐาน")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "ส่งฉบับใหม่" })).toHaveAttribute("type", "submit");
  });

  it("offers to resume a paused quest instead of a form that would fail", async () => {
    open({ kind: "main", milestone: 7 });
    expect(screen.getByText("เควสต์นี้พักไว้อยู่ ทำต่อเมื่อพร้อม")).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(within(footer()).queryByRole("button", { name: "เขียนหรือแนบงาน" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "ทำต่อเควสต์นี้" }));
    await waitFor(() => expect(mocked.resumeQuest).toHaveBeenCalledWith({ instanceId: IDS.m7Instance }));
  });

  it("can start an untouched main quest by milestone", async () => {
    open({ kind: "main", milestone: 1 });
    fireEvent.click(screen.getByRole("button", { name: "เริ่มเควสต์นี้" }));
    await waitFor(() => expect(mocked.startMainQuest).toHaveBeenCalledWith({ milestone: 1 }));
    expect(mocked.chooseSideQuest).not.toHaveBeenCalled();
  });

  it("can start an untouched side quest by template id", async () => {
    open({ kind: "side", templateId: IDS.sideFriend });
    fireEvent.click(screen.getByRole("button", { name: "เริ่มเควสต์นี้" }));
    await waitFor(() => expect(mocked.chooseSideQuest).toHaveBeenCalledWith({ templateId: IDS.sideFriend }));
  });

  it("keeps the unsent proof when the sheet closes by accident", () => {
    const board = makeBoard();
    const props = { board, keynote: null, canvasLink: UNLINKED, onClose: jest.fn(), onStuck: jest.fn(), onLinkCanvas: jest.fn() };
    const { rerender } = render(<QuestDetailSheet {...props} target={{ kind: "main", milestone: 1 }} />);
    fireEvent.click(within(body()).getByRole("button", { name: DETAIL.sendDone }));
    fill({ proof: "หลักฐานยาวๆ ที่พิมพ์ไว้" });
    rerender(<QuestDetailSheet {...props} target={null} />);
    rerender(<QuestDetailSheet {...props} target={{ kind: "main", milestone: 1 }} />);
    fireEvent.click(within(body()).getByRole("button", { name: DETAIL.sendDone }));
    expect(screen.getByLabelText("หลักฐาน")).toHaveValue("หลักฐานยาวๆ ที่พิมพ์ไว้");
  });

  it("renders nothing without a target", () => {
    const board = makeBoard();
    render(
      <QuestDetailSheet
        board={board}
        target={null}
        keynote={null}
        canvasLink={UNLINKED}
        onClose={jest.fn()}
        onStuck={jest.fn()}
        onLinkCanvas={jest.fn()}
      />,
    );
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

describe("QuestDetailSheet: a skill quest's picture, steps and English words", () => {
  /** The first side quest, renamed to แผนที่คนรอบปัญหา (side-stakeholder-map). */
  function stakeholderBoard(): QuestBoard {
    const board = makeBoard();
    board.side[0] = { ...board.side[0], slug: "side-stakeholder-map", title: "แผนที่คนรอบปัญหา", mine: null };
    return board;
  }
  const stakeholder: BoardRef = { kind: "side", templateId: IDS.sideVoices };

  it("draws the stakeholder map: four roles around the problem, the one to talk to first marked", () => {
    open(stakeholder, UNLINKED, { board: stakeholderBoard() });
    const map = within(body()).getByRole("list", { name: /ตัวอย่างแผนที่คนรอบปัญหา/ });
    const items = within(map).getAllByRole("listitem");
    expect(items).toHaveLength(5);
    for (const term of ["User", "Payer", "Decision maker", "Blocker"]) expect(within(map).getByText(term)).toBeInTheDocument();
    expect(within(map).getByText("ระบบสั่งข้าวล่วงหน้า")).toBeInTheDocument();
    const first = map.querySelectorAll('[data-first="true"]');
    expect(first).toHaveLength(1);
    expect(first[0]).toHaveTextContent("แม่ค้า");
    expect(first[0]).toHaveTextContent("คุยก่อน");
  });

  it("gives every step a number and a picture", () => {
    open(stakeholder, UNLINKED, { board: stakeholderBoard() });
    const box = within(body()).getByRole("heading", { name: "ทำยังไง" }).closest("section") as HTMLElement;
    const steps = within(box).getAllByRole("listitem");
    expect(steps).toHaveLength(4);
    steps.forEach((step, i) => {
      expect(step.querySelector("svg")).not.toBeNull();
      expect(step).toHaveTextContent(String(i + 1));
    });
  });

  it("keeps the English word, shows its Thai beside it, and opens the meaning on a tap", () => {
    open(stakeholder, UNLINKED, { board: stakeholderBoard() });
    const box = within(body()).getByRole("heading", { name: /คำศัพท์/ }).closest("section") as HTMLElement;
    const word = within(box).getByText("Stakeholder");
    expect(word).toHaveAttribute("lang", "en");
    const details = word.closest("details") as HTMLDetailsElement;
    expect(details).toHaveTextContent("ผู้มีส่วนได้ส่วนเสีย");
    expect(details.open).toBe(false);
    fireEvent.click(word.closest("summary") as HTMLElement);
    expect(details.open).toBe(true);
    expect(details).toHaveTextContent("ทุกคนที่ได้หรือเสียอะไรจากปัญหานี้");
  });

  it("warns about its own pitfalls", () => {
    open(stakeholder, UNLINKED, { board: stakeholderBoard() });
    const box = within(body()).getByRole("heading", { name: "หลุมพราง" }).closest("section") as HTMLElement;
    expect(box.querySelectorAll("article")).toHaveLength(2);
    expect(box).toHaveTextContent("มีแต่คนใช้");
  });

  it("shows a main quest's words but no map or steps, and nothing of the kind on a proposed quest", () => {
    open({ kind: "main", milestone: 4 });
    expect(within(body()).getByText("Prototype")).toBeInTheDocument();
    expect(within(body()).queryByRole("heading", { name: "ทำยังไง" })).toBeNull();
    expect(within(body()).queryByRole("list", { name: /ตัวอย่างแผนที่คนรอบปัญหา/ })).toBeNull();
    cleanup();
    open({ kind: "proposed", instanceId: IDS.proposed });
    expect(within(body()).queryByRole("heading", { name: /คำศัพท์/ })).toBeNull();
  });
});
