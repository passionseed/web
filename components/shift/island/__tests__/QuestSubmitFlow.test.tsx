/**
 * The whole quest card send, as a student goes through it: the quest sheet
 * with the real composer and the real sent screen (only the server actions,
 * the canvas read and the drawing are stand-ins).
 */
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";

import { submitQuestCard } from "@/app/shift/island/actions";
import { pickGift } from "@/app/shift/island/tree-actions";
import type { PickableNote, QuestCanvasContext } from "@/lib/shift-island/quest-canvas";
import type { MyTree, QuestSubmitResult } from "@/lib/supabase/shift-quests/types";

import { makeBoard } from "../__fixtures__/board";
import { useQuestCanvas } from "../canvas/useQuestCanvas";
import { clearAllDrafts } from "../drafts";
import { QuestDetailSheet } from "../QuestDetailSheet";

jest.mock("@/app/shift/island/evidence-actions", () => ({
  uploadEvidencePhoto: jest.fn(async () => ({ ok: true, data: { id: "p", count: 1 } })),
  removeEvidencePhoto: jest.fn(async () => ({ ok: true, data: null })),
  loadEvidencePhotos: jest.fn(async () => ({ ok: true, data: null })),
  setTeamProblem: jest.fn(async () => ({ ok: true, data: { ambition: "x" } })),
}));
jest.mock("@/app/shift/island/actions", () => ({
  submitQuestCard: jest.fn(),
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
jest.mock("../canvas/useQuestCanvas", () => ({ useQuestCanvas: jest.fn() }));
jest.mock("../tree/TreeCanvas", () => ({ TreeCanvas: () => null }));
jest.mock("../IslandSheet", () => {
  const { createElement } = jest.requireActual<typeof import("react")>("react");
  return {
    IslandSheet: ({ open, title, footer, children }: { open: boolean; title: string; footer?: unknown; children: unknown }) =>
      open
        ? createElement(
            "div",
            { role: "dialog", "aria-label": title },
            createElement("div", { "data-testid": "sheet-body" }, children as never),
            footer ? createElement("div", { "data-testid": "sheet-footer" }, footer as never) : null,
          )
        : null,
  };
});

const note = (id: string, kind: PickableNote["kind"], text: string): PickableNote => ({
  id,
  kind,
  text,
  day: null,
  zoneTitle: "",
  version: null,
  editedSinceVersion: false,
  history: [],
  byTeam: true,
  pii: false,
  hash: `a${id.length}`,
});

const READY: Extract<QuestCanvasContext, { state: "ready" }> = {
  state: "ready",
  canvas: { title: "โต๊ะว่างไหม", boardTitle: "ห้อง 5/1", lastEdited: 1 },
  context: [],
  hints: [],
  notes: [
    note("n1", "problem", "ห้องสมุดเต็มตอนพักเที่ยง"),
    note("n22", "target", "นักเรียน ม.5 ที่อ่านหนังสือสอบ"),
    note("n333", "interview", "คุยกับเพื่อน 3 คน"),
  ],
};

const GIFT_ID = "7c1d2e3f-4a5b-4c6d-8e7f-000000000001";
const TREE: MyTree = {
  seed: "maple",
  equipped: { shape: "shape:maple", leaf: "leaf:autumn", bark: "bark:birch", bloom: "bloom:lantern" },
  owned: ["shape:round", "leaf:forest", "bark:oak", "bloom:cream", "shape:maple", "leaf:autumn", "bark:birch", "bloom:lantern"],
  gifts: [{ id: GIFT_ID, options: ["bark:ash", "bark:ebony", "bark:cedar"] }],
  roots: { count: 4, recent: 1 },
  stage: 1,
};
const SENT: QuestSubmitResult = {
  instanceId: "i-main",
  revision: 1,
  created: true,
  gift: { id: GIFT_ID, options: ["bark:ash", "bark:ebony", "bark:cedar"] },
  tree: TREE,
};

const body = () => screen.getByTestId("sheet-body");
const bar = () => within(screen.getByTestId("sheet-footer")).getByRole("button");
const box = (text: string) => screen.getByRole("checkbox", { name: text });

beforeEach(() => {
  clearAllDrafts();
  jest.mocked(useQuestCanvas).mockImplementation((target) =>
    target ? { context: READY, loading: false, reload: jest.fn() } : { context: { state: "no_zones" }, loading: false, reload: jest.fn() },
  );
  jest.mocked(submitQuestCard).mockReset().mockResolvedValue({ ok: true, data: SENT });
  jest.mocked(pickGift).mockReset().mockResolvedValue({
    ok: true,
    data: { tree: { ...TREE, gifts: [], owned: [...TREE.owned, "bark:ebony"], equipped: { ...TREE.equipped, bark: "bark:ebony" } } },
  });
});

it("picks notes, checks the card, sends it once and ends on the gift for the team's tree", async () => {
  const board = makeBoard();
  const onClose = jest.fn();
  render(
    <QuestDetailSheet
      board={board}
      target={{ kind: "main", milestone: 1 }}
      keynote={null}
      canvasLink={{ linked: true, linkedAt: "2026-11-11T08:00:00Z" }}
      onClose={onClose}
      onStuck={jest.fn()}
      onLinkCanvas={jest.fn()}
      onTree={jest.fn()}
    />,
  );
  fireEvent.click(within(screen.getByTestId("sheet-footer")).getByRole("button", { name: "เขียนหรือแนบงาน" }));
  // Write-first: the written form opens; the quest card is one tap away with the canvas ready.
  fireEvent.click(screen.getByRole("button", { name: "ใช้โน้ตจากแคนวาส" }));

  // Step 1: the bar says why it waits, then how many are picked.
  expect(within(body()).getByRole("heading", { name: "เลือกหลักฐาน" })).toBeInTheDocument();
  expect(bar()).toHaveAccessibleName("เลือกโน้ตอย่างน้อย 1 ใบ");
  expect(bar()).toBeDisabled();
  fireEvent.click(screen.getByText("ห้องสมุดเต็มตอนพักเที่ยง"));
  fireEvent.click(screen.getByText("คุยกับเพื่อน 3 คน"));
  expect(bar()).toHaveAccessibleName("ต่อไป (เลือกแล้ว 2 ใบ)");

  // Step 2: the card as the mentor gets it; แก้โน้ต goes back with the ticks kept.
  fireEvent.click(bar());
  expect(within(body()).getByRole("heading", { name: "ตรวจแล้วส่ง" })).toBeInTheDocument();
  expect(within(screen.getByRole("region", { name: "หน้าตาที่พี่เลี้ยงจะเห็น" })).getAllByRole("listitem")).toHaveLength(2);
  expect(screen.getByLabelText("คำถามของขั้นที่ 1")).toBeInTheDocument();
  fireEvent.click(within(body()).getByRole("button", { name: "แก้โน้ต" }));
  expect(box("ห้องสมุดเต็มตอนพักเที่ยง")).toBeChecked();
  expect(box("คุยกับเพื่อน 3 คน")).toBeChecked();
  expect(box("นักเรียน ม.5 ที่อ่านหนังสือสอบ")).not.toBeChecked();
  fireEvent.click(bar());

  // Send: once, and the sheet stays open on the sent screen.
  expect(bar()).toHaveAccessibleName("ส่งให้พี่เลี้ยงดู");
  fireEvent.click(bar());
  expect(await within(body()).findByRole("heading", { name: "ส่งถึงพี่เลี้ยงแล้ว" })).toBeInTheDocument();
  expect(submitQuestCard).toHaveBeenCalledTimes(1);
  expect(jest.mocked(submitQuestCard).mock.calls[0][0].notes).toEqual([
    { id: "n1", hash: "a2" },
    { id: "n333", hash: "a4" },
  ]);
  expect(onClose).not.toHaveBeenCalled();

  // The gift: 1 of 3, picked onto the team's tree.
  const options = within(screen.getByRole("group", { name: "เลือกลุคให้ต้นไม้ของทีม 1 จาก 3 แบบ" })).getAllByRole("button");
  expect(options).toHaveLength(3);
  fireEvent.click(options[1]);
  await waitFor(() => expect(pickGift).toHaveBeenCalledWith(GIFT_ID, "bark:ebony"));
  expect(await within(body()).findByText(/ต้นไม้ของทีมได้ .+ แล้ว/)).toBeInTheDocument();
  fireEvent.click(within(screen.getByTestId("sheet-footer")).getByRole("button", { name: "กลับไปที่เกาะ" }));
  expect(onClose).toHaveBeenCalledTimes(1);
});
