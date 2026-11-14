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
import type { MyTree, QuestSubmitResult } from "@/lib/supabase/shift-quests/types";

import { IDS, MAIN_SLUGS, MAIN_TITLES, makeBoard } from "../__fixtures__/board";
import { QuestCardComposer, useQuestCanvas } from "../canvas";
import { QUEST_FLAVOR } from "../copy";
import { clearAllDrafts } from "../drafts";
import { QuestDetailSheet } from "../QuestDetailSheet";

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
    { id: "m1-problem", hinted: true, detail: null },
    { id: "m1-target", hinted: false, detail: null },
    { id: "m1-talked", hinted: true, detail: "สัมภาษณ์ 3 ใบ" },
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

function open(target: BoardRef, link: CanvasLinkState = UNLINKED, extra: { onTree?: () => void } = {}) {
  const board = makeBoard();
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

/** Open a quest and press ส่งเควสต์ in the bar. */
function openForm(target: BoardRef, link: CanvasLinkState = UNLINKED, extra: { onTree?: () => void } = {}) {
  const handlers = open(target, link, extra);
  fireEvent.click(within(footer()).getByRole("button", { name: "ส่งเควสต์" }));
  return handlers;
}

const body = () => screen.getByTestId("sheet-body");
const footer = () => screen.getByTestId("sheet-footer");

function fill({ proof, url, reflection }: { proof?: string; url?: string; reflection?: string }) {
  if (proof !== undefined) fireEvent.change(screen.getByLabelText("หลักฐาน (ลิงก์หรือเล่าสั้นๆ)"), { target: { value: proof } });
  if (url !== undefined) fireEvent.change(screen.getByLabelText("ลิงก์งาน (ไม่บังคับ, ขึ้นต้นด้วย https://)"), { target: { value: url } });
  if (reflection !== undefined) fireEvent.change(screen.getAllByRole("textbox").at(-1) as HTMLElement, { target: { value: reflection } });
}

describe("QuestDetailSheet: the quest page", () => {
  it("shows a badge with the main quest's place among all of them, the title and one line of why", () => {
    open({ kind: "main", milestone: 1 });
    expect(screen.getByRole("dialog", { name: MAIN_TITLES[0] })).toBeInTheDocument();
    expect(within(body()).getByText("เควสต์หลัก 1/7")).toBeInTheDocument();
    expect(screen.getByTestId("sheet-description")).toHaveTextContent("เควสต์หลัก 1/7");
    expect(within(body()).getByText("จุดประสงค์ของขั้นที่ 1")).toBeInTheDocument();
    expect(within(body()).getByText("ทำได้เลย")).toBeInTheDocument();
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
    expect(within(body()).getByText("ทุกต้นเริ่มจากเรื่องที่มีคนเจอจริง")).toBeInTheDocument();
    cleanup();
    open({ kind: "side", templateId: IDS.sideVoices });
    expect(within(body()).getByText("ห้าเสียงจริง ชัดกว่าการเดาคนเดียว")).toBeInTheDocument();
    cleanup();
    open({ kind: "proposed", instanceId: IDS.proposed });
    for (const line of Object.values(QUEST_FLAVOR)) expect(within(body()).queryByText(line)).toBeNull();
  });

  it("asks to link a canvas when none is linked, and hands the quest up to open the picker", () => {
    const { onLinkCanvas } = open({ kind: "main", milestone: 1 });
    expect(mocked.useQuestCanvas).toHaveBeenLastCalledWith({ ref: { kind: "main", milestone: 1 }, slug: MAIN_SLUGS[0] }, UNLINKED);
    expect(within(body()).getByRole("heading", { name: "สำหรับโปรเจกต์คุณ" })).toBeInTheDocument();
    expect(within(body()).getByText("เลือกแคนวาสโปรเจกต์ของคุณบนไวท์บอร์ด แล้วเควสต์จะดึงโน้ตของคุณมาให้")).toBeInTheDocument();
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
    open({ kind: "main", milestone: 6 }, LINKED);
    expect(within(body()).queryByRole("heading", { name: "สำหรับโปรเจกต์คุณ" })).toBeNull();
    expect(within(body()).getByRole("link", { name: "เปิดแคนวาส" })).toHaveAttribute("href", "/shift/island/canvas");
  });

  it("opens the canvas while the notes still load", () => {
    canvasAnswer = { context: null, loading: true };
    open({ kind: "main", milestone: 1 }, LINKED);
    expect(within(body()).getByRole("link", { name: "เปิดแคนวาส" })).toBeInTheDocument();
  });

  it("offers to link a canvas on a quest without zones when none is linked", () => {
    const { onLinkCanvas } = open({ kind: "main", milestone: 6 });
    fireEvent.click(within(body()).getByRole("button", { name: "เชื่อมแคนวาส" }));
    expect(onLinkCanvas).toHaveBeenCalledWith({ kind: "main", milestone: 6 });
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
    expect(within(footer()).getByRole("button", { name: "ส่งเควสต์" })).toBeInTheDocument();
  });

  it("does not read the canvas for a quest without zones", () => {
    open({ kind: "main", milestone: 6 });
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
    expect(items[2]).toHaveTextContent("สัมภาษณ์ 3 ใบ");
    expect(items[1]).not.toHaveAttribute("data-hinted");
    expect(items[2]).toHaveAttribute("data-hinted", "true");
    expect(within(list).getByText("ติ๊กให้จากโน้ตในแคนวาส พี่เลี้ยงเป็นคนดูและตัดสิน")).toBeInTheDocument();
    // A hint never gates sending.
    expect(within(footer()).getByRole("button", { name: "ส่งเควสต์" })).toBeEnabled();
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

  it("keeps examples and the full details in collapsed rows", () => {
    open({ kind: "main", milestone: 1 });
    const guide = questGuide({ kind: "main", slug: MAIN_SLUGS[0] });
    const examples = within(body()).getByText("ตัวอย่างที่ผ่าน").closest("details") as HTMLElement;
    expect(examples).not.toHaveAttribute("open");
    expect(within(examples).getByText(guide.examples[0])).toBeInTheDocument();
    const details = within(body()).getByText("รายละเอียดทั้งหมด").closest("details") as HTMLElement;
    expect(details).not.toHaveAttribute("open");
    expect(within(details).getByRole("heading", { name: "ส่งอะไร" })).toBeInTheDocument();
    expect(within(details).getByText("หลักฐานของขั้นที่ 1")).toBeInTheDocument();
    expect(within(details).getByRole("heading", { name: "คำถามหนึ่งข้อ" })).toBeInTheDocument();
    expect(within(details).getByText("คำถามของขั้นที่ 1")).toBeInTheDocument();
  });

  it("uses the board's examples for a side quest", () => {
    open({ kind: "side", templateId: IDS.sideVoices });
    const examples = within(body()).getByText("ตัวอย่างที่ผ่าน").closest("details") as HTMLElement;
    expect(within(examples).getByText("เช่น คุยกับเพื่อนต่างห้อง")).toBeInTheDocument();
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
    const details = within(body()).getByText("รายละเอียดทั้งหมด").closest("details") as HTMLElement;
    expect(within(details).getByRole("heading", { name: "ทำไมเควสต์นี้" })).toBeInTheDocument();
    expect(within(details).getByText(long)).toBeInTheDocument();
  });
});

describe("QuestDetailSheet: quest 5 and the ownership checklist", () => {
  const ROWS = [
    { item: "access" as const, state: "demonstrated" as const, mentorHeld: false },
    { item: "export" as const, state: "not_checked" as const, mentorHeld: false },
    { item: "team" as const, state: "not_applicable" as const, mentorHeld: false },
    { item: "costs" as const, state: "demonstrated" as const, mentorHeld: true },
    { item: "portability" as const, state: "needs_help" as const, mentorHeld: false },
  ];

  it("shows the checklist from Discord, read-only, and where to change it", async () => {
    mocked.loadOwnership.mockResolvedValue({ ok: true, data: ROWS });
    open({ kind: "main", milestone: 5 });
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
    open({ kind: "main", milestone: 5 });
    const list = within(body()).getByRole("heading", { name: "เสร็จเมื่อ" }).closest("section") as HTMLElement;
    await waitFor(() => expect(within(list).getAllByRole("listitem")[0]).toHaveAttribute("data-hinted", "true"));
  });

  it("points to Discord when the checklist cannot load", async () => {
    mocked.loadOwnership.mockResolvedValue({ ok: false, code: "unknown", error: "x" });
    open({ kind: "main", milestone: 5 });
    await waitFor(() =>
      expect(within(body()).getByText("เช็กลิสต์อยู่ใน Discord: พิมพ์ /project ownership แล้วเช็กทีละข้อ")).toBeInTheDocument(),
    );
  });

  it("says the checklist goes with the work, and leaves room for it in the proof", async () => {
    mocked.loadOwnership.mockResolvedValue({ ok: true, data: ROWS });
    open({ kind: "main", milestone: 5 });
    await waitFor(() => expect(within(body()).getByText("เข้าถึงงานได้เอง:")).toBeInTheDocument());
    fireEvent.click(within(footer()).getByRole("button", { name: "ส่งฉบับใหม่" }));
    expect(screen.getByText("ตอนกดส่ง เช็กลิสต์ /project ownership จะแนบไปกับงานนี้ให้เอง")).toBeInTheDocument();
    const max = Number(screen.getByLabelText("หลักฐาน (ลิงก์หรือเล่าสั้นๆ)").getAttribute("maxLength"));
    expect(max).toBeLessThan(2000);
    expect(max).toBeGreaterThan(1500);
  });

  it("reads no checklist on any other quest", () => {
    open({ kind: "main", milestone: 1 });
    expect(mocked.loadOwnership).not.toHaveBeenCalled();
  });
});

describe("QuestDetailSheet: the action bar", () => {
  it("has no bar on a closed quest: nothing to send or be stuck on", () => {
    const board = makeBoard();
    board.proposed[0] = { ...board.proposed[0], state: "declined" };
    render(
      <QuestDetailSheet
        board={board}
        target={{ kind: "proposed", instanceId: IDS.proposed }}
        keynote={null}
        canvasLink={UNLINKED}
        onClose={jest.fn()}
        onStuck={jest.fn()}
        onLinkCanvas={jest.fn()}
      />,
    );
    expect(screen.queryByTestId("sheet-footer")).toBeNull();
  });

  it("offers ส่งเควสต์ and ติด on an open quest", () => {
    open({ kind: "main", milestone: 1 });
    const bar = footer();
    expect(within(bar).getByRole("button", { name: "ส่งเควสต์" })).toBeInTheDocument();
    expect(within(bar).getByRole("button", { name: "ติด" })).toBeInTheDocument();
    expect(within(body()).queryByRole("textbox")).toBeNull();
  });

  it("opens the stuck sheet with the caller's own instance", () => {
    const { onStuck } = open({ kind: "main", milestone: 2 });
    fireEvent.click(within(footer()).getByRole("button", { name: "ติด" }));
    expect(onStuck).toHaveBeenCalledWith({ instanceId: IDS.m2Instance, title: MAIN_TITLES[1] });
  });

  it("explains a locked quest with no form, no bar and no canvas", () => {
    open({ kind: "side", templateId: IDS.sidePhone });
    expect(screen.getByText(`ปลดล็อกเมื่อผ่าน ${MAIN_TITLES[1]}`)).toBeInTheDocument();
    expect(screen.queryByTestId("sheet-footer")).toBeNull();
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.queryByRole("button", { name: /ส่ง/ })).toBeNull();
    expect(screen.queryByRole("button", { name: "ติด" })).toBeNull();
    expect(mocked.useQuestCanvas).toHaveBeenLastCalledWith(null, UNLINKED);
  });

  it("shows who holds a teammate's quest, with ติด but nothing to send", () => {
    open({ kind: "main", milestone: 4 });
    expect(screen.getByText("มิ้นต์ ถืองานขั้นนี้อยู่ ช่วยกันในงานนั้นได้")).toBeInTheDocument();
    expect(within(footer()).queryByRole("button", { name: "ส่งเควสต์" })).toBeNull();
    expect(within(footer()).getByRole("button", { name: "ติด" })).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).toBeNull();
  });

  it("has nothing to send while an appeal is open", () => {
    open({ kind: "side", templateId: IDS.sideCut });
    expect(screen.getByText("งานนี้อยู่ระหว่างอุทธรณ์ รอทีมงานตัดสินก่อน")).toBeInTheDocument();
    expect(within(footer()).queryByRole("button", { name: /ส่ง/ })).toBeNull();
    expect(screen.queryByRole("textbox")).toBeNull();
  });

  it("opens the quest card composer when the canvas is ready, on step 1 with the sheet's own bar", () => {
    canvasAnswer = { context: READY, loading: false };
    openForm({ kind: "main", milestone: 1 }, LINKED);
    expect(screen.getByTestId("composer")).toHaveTextContent(`composer:${MAIN_TITLES[0]}`);
    expect(screen.getByTestId("composer")).toHaveAttribute("data-step", "pick");
    // The composer's button sits in the sheet's footer, in place of ส่งเควสต์ and ติด.
    expect(within(footer()).getAllByRole("button").map((b) => b.textContent)).toEqual(["composer-footer:pick"]);
    expect(screen.queryByLabelText("หลักฐาน (ลิงก์หรือเล่าสั้นๆ)")).toBeNull();
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
    openForm({ kind: "main", milestone: 1 }, LINKED);
    const back = within(body()).getAllByRole("button")[0];
    expect(back).toHaveAccessibleName("กลับ");
    fireEvent.click(back);
    expect(screen.queryByTestId("composer")).toBeNull();
    expect(within(footer()).getByRole("button", { name: "ส่งเควสต์" })).toHaveFocus();
  });

  it("goes back from step 2 to step 1 with แก้โน้ต, in the same top left place", () => {
    canvasAnswer = { context: READY, loading: false };
    openForm({ kind: "main", milestone: 1 }, LINKED);
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
    const { onClose } = openForm({ kind: "main", milestone: 1 }, LINKED);
    fireEvent.click(screen.getByRole("button", { name: "composer-sent" }));
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.queryByTestId("composer")).toBeNull();
    expect(within(body()).getByRole("heading", { name: "ส่งถึงพี่เลี้ยงแล้ว" })).toHaveFocus();
    expect(within(body()).getByText("พี่เลี้ยงจะดูใน Discord แล้วแจ้งผลในกล่องข้อความของบอท")).toBeInTheDocument();
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("switches from the composer to writing it out with เขียนเองแทน, and back", () => {
    canvasAnswer = { context: READY, loading: false };
    openForm({ kind: "main", milestone: 1 }, LINKED);
    fireEvent.click(screen.getByRole("button", { name: "เขียนเองแทน" }));
    expect(screen.queryByTestId("composer")).toBeNull();
    expect(screen.getByLabelText("หลักฐาน (ลิงก์หรือเล่าสั้นๆ)")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "ใช้โน้ตจากแคนวาส" }));
    expect(screen.getByTestId("composer")).toBeInTheDocument();
  });

  it("opens the written form when the canvas is not ready", () => {
    openForm({ kind: "main", milestone: 1 });
    expect(screen.queryByTestId("composer")).toBeNull();
    expect(screen.getByLabelText("หลักฐาน (ลิงก์หรือเล่าสั้นๆ)")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "เขียนเองแทน" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "กลับ" }));
    expect(screen.queryByLabelText("หลักฐาน (ลิงก์หรือเล่าสั้นๆ)")).toBeNull();
    expect(within(footer()).getByRole("button", { name: "ส่งเควสต์" })).toBeInTheDocument();
  });

  it("waits for the notes with a skeleton, keeping เขียนเองแทน one tap away", () => {
    canvasAnswer = { context: null, loading: true };
    openForm({ kind: "main", milestone: 1 }, LINKED);
    expect(within(body()).getByRole("status")).toHaveTextContent("กำลังดึงโน้ตจากแคนวาส");
    // The bar keeps its place, with nothing to press yet.
    expect(within(footer()).getByRole("button")).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "เขียนเองแทน" }));
    expect(screen.getByLabelText("หลักฐาน (ลิงก์หรือเล่าสั้นๆ)")).toBeInTheDocument();
  });

  it("starts on the quest again when the sheet reopens", () => {
    const board = makeBoard();
    const props = { board, keynote: null, canvasLink: UNLINKED, onClose: jest.fn(), onStuck: jest.fn(), onLinkCanvas: jest.fn() };
    const { rerender } = render(<QuestDetailSheet {...props} target={{ kind: "main", milestone: 1 }} />);
    fireEvent.click(within(footer()).getByRole("button", { name: "ส่งเควสต์" }));
    expect(screen.getByLabelText("หลักฐาน (ลิงก์หรือเล่าสั้นๆ)")).toBeInTheDocument();
    rerender(<QuestDetailSheet {...props} target={null} />);
    rerender(<QuestDetailSheet {...props} target={{ kind: "main", milestone: 1 }} />);
    expect(screen.queryByLabelText("หลักฐาน (ลิงก์หรือเล่าสั้นๆ)")).toBeNull();
    expect(within(footer()).getByRole("button", { name: "ส่งเควสต์" })).toBeInTheDocument();
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
    expect(within(footer()).getByRole("button", { name: "ส่งเควสต์" })).toBeInTheDocument();
  });

  it("offers the gift, 1 of 3 as the team's tree wearing each, and puts the pick on the tree", async () => {
    mockSent = withGift;
    mocked.pickGift.mockResolvedValue({ ok: true, data: { tree: PICKED } });
    canvasAnswer = { context: READY, loading: false };
    openForm({ kind: "main", milestone: 1 }, LINKED, { onTree: jest.fn() });
    fireEvent.click(screen.getByRole("button", { name: "composer-sent" }));
    expect(within(body()).getByRole("heading", { name: "ส่งเควสต์นี้ครั้งแรกแล้ว ทีมได้ของขวัญหนึ่งชิ้น" })).toBeInTheDocument();
    const options = within(screen.getByRole("group", { name: "เลือกลุคให้ต้นไม้ของทีม 1 จาก 3 แบบ ทุกคนเห็นบนเกาะ" })).getAllByRole("button");
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
  });

  it("keeps the gift for later: the sheet closes and the gift waits in the close-up", () => {
    mockSent = withGift;
    canvasAnswer = { context: READY, loading: false };
    const { onClose } = openForm({ kind: "main", milestone: 1 }, LINKED);
    fireEvent.click(screen.getByRole("button", { name: "composer-sent" }));
    fireEvent.click(within(footer()).getByRole("button", { name: "เก็บไว้ก่อน" }));
    expect(mocked.pickGift).not.toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalledWith("เก็บไว้แล้ว เพื่อนในทีมคนไหนก็เปิดได้ทีหลัง");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("shows no gift it cannot draw (no tree came with it)", () => {
    mockSent = { ...withGift, tree: null };
    canvasAnswer = { context: READY, loading: false };
    openForm({ kind: "main", milestone: 1 }, LINKED);
    fireEvent.click(screen.getByRole("button", { name: "composer-sent" }));
    expect(screen.queryByRole("group", { name: /เลือกลุค/ })).toBeNull();
    expect(within(footer()).getByRole("button", { name: "กลับไปที่เกาะ" })).toBeInTheDocument();
  });
});

describe("QuestDetailSheet: the written form and quest states", () => {
  it("caps the written form like the database", () => {
    openForm({ kind: "main", milestone: 1 });
    expect(screen.getByLabelText("หลักฐาน (ลิงก์หรือเล่าสั้นๆ)")).toHaveAttribute("maxLength", "2000");
    expect(screen.getByLabelText("ลิงก์งาน (ไม่บังคับ, ขึ้นต้นด้วย https://)")).toHaveAttribute("maxLength", "500");
    expect(screen.getByLabelText("คำถามของขั้นที่ 1")).toHaveAttribute("maxLength", "2000");
    expect(screen.getByRole("button", { name: "ส่งให้พี่เลี้ยงดู" })).toBeInTheDocument();
  });

  it("reminds what the mentor looks for on top, with placeholders, and sends from the sheet's bar", () => {
    openForm({ kind: "main", milestone: 1 });
    const reminder = within(body()).getByRole("list", { name: "เสร็จเมื่อ" });
    expect(within(reminder).getAllByRole("listitem")).toHaveLength(3);
    expect(reminder.compareDocumentPosition(screen.getByLabelText("หลักฐาน (ลิงก์หรือเล่าสั้นๆ)")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByLabelText("หลักฐาน (ลิงก์หรือเล่าสั้นๆ)")).toHaveAttribute("placeholder", "วางลิงก์ หรือเล่าสั้นๆ ว่าทำอะไรไป แล้วเจออะไร");
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
    fireEvent.click(within(footer()).getByRole("button", { name: "ส่งเควสต์" }));
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
    fireEvent.click(within(footer()).getByRole("button", { name: "ส่งเควสต์" }));
    expect(screen.getByRole("button", { name: "ส่งให้พี่เลี้ยงดู" })).toBeInTheDocument();
  });

  it("says a submitted quest is with a mentor, with a new version one quiet tap away", () => {
    open({ kind: "main", milestone: 5 });
    expect(screen.getByText("ส่งแล้ว รอพี่เลี้ยงดูอยู่ ถ้าแก้งานแล้วส่งฉบับใหม่ได้")).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).toBeNull();
    const resend = within(footer()).getByRole("button", { name: "ส่งฉบับใหม่" });
    expect(resend).not.toHaveClass("ei-button-dawn");
    fireEvent.click(resend);
    expect(screen.getByLabelText("หลักฐาน (ลิงก์หรือเล่าสั้นๆ)")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "ส่งฉบับใหม่" })).toHaveAttribute("type", "submit");
  });

  it("offers to resume a paused quest instead of a form that would fail", async () => {
    open({ kind: "main", milestone: 7 });
    expect(screen.getByText("เควสต์นี้พักไว้อยู่ ทำต่อเมื่อพร้อม")).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(within(footer()).queryByRole("button", { name: "ส่งเควสต์" })).toBeNull();
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
    fireEvent.click(within(footer()).getByRole("button", { name: "ส่งเควสต์" }));
    fill({ proof: "หลักฐานยาวๆ ที่พิมพ์ไว้" });
    rerender(<QuestDetailSheet {...props} target={null} />);
    rerender(<QuestDetailSheet {...props} target={{ kind: "main", milestone: 1 }} />);
    fireEvent.click(within(footer()).getByRole("button", { name: "ส่งเควสต์" }));
    expect(screen.getByLabelText("หลักฐาน (ลิงก์หรือเล่าสั้นๆ)")).toHaveValue("หลักฐานยาวๆ ที่พิมพ์ไว้");
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
