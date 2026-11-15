import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { useState } from "react";
import { toast } from "sonner";

import { submitQuestCard } from "@/app/shift/island/actions";
import type { PickableNote, QuestCanvasContext, QuestCardTarget } from "@/lib/shift-island/quest-canvas";
import { buildSnapshot } from "@/lib/supabase/shift-quests/canvas-snapshot";
import { questErrorText } from "@/lib/supabase/shift-quests/errors";

import { clearAllDrafts } from "../../drafts";
import { QuestCardComposer, type CardStep, type QuestCardComposerProps } from "../QuestCardComposer";

jest.mock("@/app/shift/island/actions", () => ({ submitQuestCard: jest.fn() }));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

const mockedSubmit = submitQuestCard as jest.MockedFunction<typeof submitQuestCard>;

const note = (over: Partial<PickableNote> & Pick<PickableNote, "id" | "kind" | "text">): PickableNote => ({
  day: null,
  zoneTitle: "",
  version: null,
  editedSinceVersion: false,
  history: [],
  byTeam: true,
  pii: false,
  hash: `h${over.id.length}`,
  ...over,
});

const NOTES: PickableNote[] = [
  note({ id: "t1", kind: "test", text: "ให้เพื่อน 3 คนลองแอป", hash: "a1" }),
  note({ id: "t2", kind: "test", text: "โทรถามเขาที่ 081-234-5678", pii: true, hash: "a2", byTeam: false }),
  note({
    id: "p1",
    kind: "pivot",
    text: "เปลี่ยนจากแอปเป็นเว็บ",
    version: 2,
    editedSinceVersion: true,
    history: [{ v: 2, why: "เพื่อนไม่อยากลงแอป" }, { v: 1, why: null }],
    hash: "a3",
  }),
  note({ id: "t3", kind: "test", text: "ไลน์ของพี่คือ mint.k", pii: true, hash: "a4" }),
];

const context = (notes = NOTES): Extract<QuestCanvasContext, { state: "ready" }> => ({
  state: "ready",
  canvas: { title: "Lamp project", boardTitle: "ห้อง 5/1", lastEdited: 1 },
  context: [],
  hints: [],
  notes,
});

const target: QuestCardTarget = {
  ref: { kind: "main", milestone: 3 },
  slug: "let-reality-surprise-you",
  title: "ให้ความจริงทำให้คุณแปลกใจ",
  reflectionPrompt: "อะไรทำให้คุณเปลี่ยนความคิด",
  version: null,
  resubmit: false,
};

type Over = Partial<Omit<QuestCardComposerProps, "step" | "onStep" | "footer">> & { step?: CardStep };

/** The composer with its step held like QuestCompose holds it, and the sheet's footer slot under it. */
function Harness({ step: first = "pick", ...props }: Omit<QuestCardComposerProps, "step" | "onStep" | "footer"> & { step?: CardStep }) {
  const [step, setStep] = useState<CardStep>(first);
  const [slot, setSlot] = useState<HTMLDivElement | null>(null);
  return (
    <>
      <div data-testid="body">
        <QuestCardComposer {...props} step={step} onStep={setStep} footer={slot} />
      </div>
      <div data-testid="footer" ref={setSlot} />
    </>
  );
}

function setup(over: Over = {}) {
  const props = {
    target,
    context: context(),
    doneWhen: ["มีคนจริงลองงานของคุณ", "จดสิ่งที่ไม่ตรงกับที่คิด"],
    onReload: jest.fn(),
    onSubmitted: jest.fn(),
    ...over,
  };
  const utils = render(<Harness {...props} />);
  return { ...utils, props };
}

const box = (text: string) => screen.getByRole("checkbox", { name: text });
const footer = () => screen.getByTestId("footer");
const footerButton = () => within(footer()).getByRole("button");
const next = () => within(footer()).getByRole("button", { name: /^ต่อไป/ });
const sendButton = (name = "ส่งให้พี่เลี้ยงดู") => within(footer()).getByRole("button", { name });

/** Tick these notes, then ต่อไป. */
function toReview(...texts: string[]) {
  for (const text of texts) fireEvent.click(box(text));
  fireEvent.click(next());
}

beforeEach(() => {
  clearAllDrafts();
  jest.mocked(toast.success).mockReset();
  jest.mocked(toast.error).mockReset();
  mockedSubmit.mockReset().mockResolvedValue({ ok: true, data: { instanceId: "i", revision: 1, created: true, gift: null, tree: null } });
});

describe("QuestCardComposer: step 1, เลือกหลักฐาน", () => {
  it("shows the notes as stickies by zone, under the step's heading, with no fields, preview or privacy box yet", () => {
    setup();
    expect(screen.getByRole("heading", { name: "เลือกหลักฐาน" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "การ์ดเควสต์" })).toBeNull();
    expect(screen.getByText("ติ๊กโน้ตบนแคนวาสที่เป็นหลักฐานของเควสต์นี้")).toBeInTheDocument();
    // What the mentor looks for, compact, before the notes.
    const reminder = screen.getByRole("list", { name: "เสร็จเมื่อ" });
    expect(within(reminder).getAllByRole("listitem").map((li) => li.textContent)).toEqual(["มีคนจริงลองงานของคุณ", "จดสิ่งที่ไม่ตรงกับที่คิด"]);
    const tests = screen.getByRole("group", { name: "🧪 ทดสอบ" });
    expect(within(tests).getAllByRole("checkbox")).toHaveLength(3);
    const pivots = screen.getByRole("group", { name: "🔀 เปลี่ยนแผน" });
    expect(within(pivots).getByText("v2")).toBeInTheDocument();
    expect(within(pivots).getByText("แก้หลัง v2")).toBeInTheDocument();
    expect(within(pivots).getByText("เปลี่ยนเพราะ เพื่อนไม่อยากลงแอป")).toBeInTheDocument();
    expect(screen.queryByText("อย่าใส่ชื่อจริง เบอร์โทร หรือช่องทางติดต่อของคนที่ลองงานคุณ")).toBeNull();
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.queryByText("หน้าตาที่พี่เลี้ยงจะเห็น")).toBeNull();
    expect(screen.queryByText(/^เลือกแล้ว \d\/8$/)).toBeNull();
  });

  it("has one เปิดแคนวาส link under the list, and no ดูบนแคนวาส on each note", () => {
    setup();
    expect(screen.queryByRole("link", { name: "ดูบนแคนวาส" })).toBeNull();
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAccessibleName("เปิดแคนวาส");
    expect(links[0]).toHaveAttribute("href", "/shift/island/canvas");
    expect(links[0]).toHaveAttribute("target", "_blank");
    // After the notes, not between them.
    const lists = screen.getAllByRole("group");
    expect(lists.at(-1)!.compareDocumentPosition(links[0]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("ticks a note by tapping anywhere on its sticky, and unticks it the same way", () => {
    setup();
    fireEvent.click(screen.getByText("ให้เพื่อน 3 คนลองแอป"));
    expect(box("ให้เพื่อน 3 คนลองแอป")).toBeChecked();
    expect(box("ให้เพื่อน 3 คนลองแอป").closest("li")).toHaveAttribute("data-checked", "true");
    fireEvent.click(screen.getByText("เปลี่ยนเพราะ เพื่อนไม่อยากลงแอป"));
    expect(box("เปลี่ยนจากแอปเป็นเว็บ")).toBeChecked();
    fireEvent.click(screen.getByText("ให้เพื่อน 3 คนลองแอป"));
    expect(box("ให้เพื่อน 3 คนลองแอป")).not.toBeChecked();
  });

  it("dims someone else's note with one short tag, and never lets it be picked", () => {
    setup();
    const outsider = box("โทรถามเขาที่ 081-234-5678");
    expect(outsider).toBeDisabled();
    expect(outsider).toHaveAccessibleDescription("โน้ตจากคนนอกทีม");
    expect(outsider.closest("li")).toHaveAttribute("data-disabled", "true");
    // It cannot be sent, so it carries no privacy warning of its own.
    expect(screen.getAllByText("โน้ตนี้อาจมีเบอร์โทร อีเมล หรือไอดีของใครบางคน แก้ในแคนวาสก่อนส่งดีกว่า")).toHaveLength(1);
    expect(box("ไลน์ของพี่คือ mint.k")).toHaveAccessibleDescription(
      "โน้ตนี้อาจมีเบอร์โทร อีเมล หรือไอดีของใครบางคน แก้ในแคนวาสก่อนส่งดีกว่า",
    );
  });

  it("says in the footer why it cannot go on yet, then how many notes are picked", () => {
    setup();
    const form = screen.getByTestId("body").querySelector("form") as HTMLFormElement;
    expect(footerButton()).toHaveAccessibleName("เลือกโน้ตอย่างน้อย 1 ใบ");
    expect(footerButton()).toBeDisabled();
    expect(footerButton()).toHaveAttribute("type", "submit");
    expect(footerButton()).toHaveAttribute("form", form.id);
    fireEvent.click(box("ให้เพื่อน 3 คนลองแอป"));
    fireEvent.click(box("เปลี่ยนจากแอปเป็นเว็บ"));
    expect(footerButton()).toHaveAccessibleName("ต่อไป (เลือกแล้ว 2 ใบ)");
    expect(footerButton()).toBeEnabled();
  });

  it("caps the card at 8 notes", () => {
    const many = Array.from({ length: 10 }, (_, i) => note({ id: `n${i}`, kind: "test", text: `โน้ตที่ ${i}`, hash: `b${i}` }));
    setup({ context: context(many) });
    for (let i = 0; i < 8; i++) fireEvent.click(box(`โน้ตที่ ${i}`));
    expect(box("โน้ตที่ 8")).toBeDisabled();
    expect(box("โน้ตที่ 0")).toBeEnabled();
    expect(screen.getByText(/ครบ 8 ใบแล้ว/)).toBeInTheDocument();
    fireEvent.click(box("โน้ตที่ 8"));
    expect(footerButton()).toHaveAccessibleName("ต่อไป (เลือกแล้ว 8 ใบ)");
    fireEvent.click(box("โน้ตที่ 0"));
    expect(box("โน้ตที่ 8")).toBeEnabled();
  });

  it("explains an empty canvas zone, with nothing to go on with", () => {
    setup({ context: context([]) });
    expect(screen.getByText(/ยังไม่มีโน้ต/)).toBeInTheDocument();
    expect(footerButton()).toBeDisabled();
  });

  it("keeps ticks, line and link when the sheet closes, and drops ticks for notes that are gone", () => {
    const { unmount } = setup();
    toReview("ให้เพื่อน 3 คนลองแอป", "เปลี่ยนจากแอปเป็นเว็บ");
    fireEvent.change(screen.getByLabelText("อะไรทำให้คุณเปลี่ยนความคิด"), { target: { value: "ร่าง" } });
    unmount();
    setup({ context: context([NOTES[0], NOTES[1]]) });
    expect(box("ให้เพื่อน 3 คนลองแอป")).toBeChecked();
    expect(footerButton()).toHaveAccessibleName("ต่อไป (เลือกแล้ว 1 ใบ)");
    fireEvent.click(next());
    expect(screen.getByLabelText("อะไรทำให้คุณเปลี่ยนความคิด")).toHaveValue("ร่าง");
  });
});

describe("QuestCardComposer: step 2, ตรวจแล้วส่ง", () => {
  it("shows the card as the mentor gets it, the line with the privacy reminder as its hint, and the link", () => {
    setup();
    toReview("เปลี่ยนจากแอปเป็นเว็บ", "ให้เพื่อน 3 คนลองแอป");
    expect(screen.getByRole("heading", { name: "ตรวจแล้วส่ง" })).toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).toBeNull();
    expect(screen.queryByRole("list", { name: "เสร็จเมื่อ" })).toBeNull();
    expect(screen.getByText("นี่คือการ์ดที่พี่เลี้ยงจะได้รับ จะเพิ่มข้อความสั้นๆ หรือลิงก์ก็ได้")).toBeInTheDocument();
    const expected = buildSnapshot("Lamp project", [NOTES[0], NOTES[2]]);
    const preview = screen.getByRole("region", { name: "หน้าตาที่พี่เลี้ยงจะเห็น" });
    const tiles = within(preview).getAllByRole("listitem");
    expect(tiles.map((tile) => tile.querySelector("p")?.textContent)).toEqual(expected.blocks.map((b) => b.header));
    expect(within(preview).getByText("v1 → v2 เปลี่ยนเพราะ: เพื่อนไม่อยากลงแอป")).toBeInTheDocument();
    expect(within(preview).getByText(`${expected.length}/2000`)).toBeInTheDocument();
    // The exact text, one tap away.
    expect(screen.getByTestId("quest-card-text").textContent).toBe(expected.text);
    expect(screen.getByTestId("quest-card-text").closest("details")).not.toHaveAttribute("open");
    const line = screen.getByLabelText("อะไรทำให้คุณเปลี่ยนความคิด");
    expect(line).toHaveAttribute("placeholder", "ตอบสั้นๆ หนึ่งบรรทัด (ไม่บังคับ)");
    expect(line).toHaveAccessibleDescription("อย่าใส่ชื่อจริง เบอร์โทร หรือช่องทางติดต่อของคนที่ลองงานคุณ");
    expect(screen.getByLabelText("ลิงก์งาน (ไม่บังคับ ขึ้นต้นด้วย https://)")).toBeInTheDocument();
    // The card will not change: said next to the button.
    expect(within(footer()).getByText("ส่งแล้วการ์ดนี้จะไม่เปลี่ยน ถึงจะแก้โน้ตในแคนวาสทีหลัง")).toBeInTheDocument();
    expect(sendButton()).toBeEnabled();
  });

  it("warns, without changing anything, when the student's own line holds a contact", () => {
    setup();
    toReview("ให้เพื่อน 3 คนลองแอป");
    const line = screen.getByLabelText("อะไรทำให้คุณเปลี่ยนความคิด");
    expect(screen.queryByText("ข้อความนี้อาจมีเบอร์โทร อีเมล หรือไอดีของใครบางคน ลบออกก่อนส่งดีกว่า")).toBeNull();
    fireEvent.change(line, { target: { value: "น้องมิ้นท์ ไอจี mint.k ช่วยลอง" } });
    expect(screen.getByText("ข้อความนี้อาจมีเบอร์โทร อีเมล หรือไอดีของใครบางคน ลบออกก่อนส่งดีกว่า")).toBeInTheDocument();
    expect(line).toHaveValue("น้องมิ้นท์ ไอจี mint.k ช่วยลอง");
  });

  it("says when the card will be cut", () => {
    const long = [note({ id: "l", kind: "test", text: "ย".repeat(900), hash: "c" })];
    setup({ context: context(long) });
    toReview("ย".repeat(900));
    expect(screen.getByText("บางโน้ตยาวเกิน จะถูกตัดท้าย")).toBeInTheDocument();
  });

  it("does not send while the canvas is being read again", () => {
    setup({ loading: true });
    toReview("ให้เพื่อน 3 คนลองแอป");
    expect(sendButton()).toBeDisabled();
    expect(screen.getByText("กำลังอ่านแคนวาสใหม่ รอสักครู่แล้วค่อยส่ง")).toBeInTheDocument();
  });

  it("sends ids and hashes, the line and the link once, clears the draft and hands the result up, with no toast", async () => {
    const result = { instanceId: "i", revision: 1, created: true, gift: null, tree: null };
    const { props } = setup();
    toReview("ให้เพื่อน 3 คนลองแอป");
    fireEvent.change(screen.getByLabelText("อะไรทำให้คุณเปลี่ยนความคิด"), { target: { value: " เพื่อนไม่ใช้ปุ่มที่คิดไว้ " } });
    fireEvent.change(screen.getByLabelText("ลิงก์งาน (ไม่บังคับ ขึ้นต้นด้วย https://)"), { target: { value: "https://lamp.example.com" } });
    fireEvent.click(sendButton());
    fireEvent.click(sendButton("กำลังส่ง"));
    await waitFor(() => expect(props.onSubmitted).toHaveBeenCalledWith(result));
    expect(mockedSubmit).toHaveBeenCalledTimes(1);
    expect(mockedSubmit).toHaveBeenCalledWith({
      ref: target.ref,
      slug: target.slug,
      version: null,
      notes: [{ id: "t1", hash: "a1" }],
      line: "เพื่อนไม่ใช้ปุ่มที่คิดไว้",
      link: "https://lamp.example.com",
    });
    // The sent screen says it; a toast would say it twice.
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("sends an empty line and link as null", async () => {
    setup();
    toReview("ให้เพื่อน 3 คนลองแอป");
    fireEvent.click(sendButton());
    await waitFor(() => expect(mockedSubmit).toHaveBeenCalledWith(expect.objectContaining({ line: null, link: null })));
  });

  it("refuses a link that is not https before sending", () => {
    setup();
    toReview("ให้เพื่อน 3 คนลองแอป");
    fireEvent.change(screen.getByLabelText("ลิงก์งาน (ไม่บังคับ ขึ้นต้นด้วย https://)"), { target: { value: "http://x.com" } });
    fireEvent.click(sendButton());
    expect(screen.getByRole("alert")).toHaveTextContent("ลิงก์ต้องขึ้นต้นด้วย https://");
    expect(mockedSubmit).not.toHaveBeenCalled();
  });

  it("on notes_changed says so and reloads the canvas, keeping the draft", async () => {
    mockedSubmit.mockResolvedValue({ ok: false, code: "notes_changed", error: questErrorText("notes_changed") });
    const { props } = setup();
    toReview("ให้เพื่อน 3 คนลองแอป");
    fireEvent.click(sendButton());
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("โน้ตในแคนวาสเพิ่งเปลี่ยน ดูการ์ดอีกครั้งแล้วค่อยส่ง"));
    expect(props.onReload).toHaveBeenCalledTimes(1);
    expect(props.onSubmitted).not.toHaveBeenCalled();
    expect(sendButton()).toBeEnabled();
  });

  it("does not reload for a refusal unrelated to the canvas", async () => {
    mockedSubmit.mockResolvedValue({ ok: false, code: "milestone_open", error: "x" });
    const { props } = setup();
    toReview("ให้เพื่อน 3 คนลองแอป");
    fireEvent.click(sendButton());
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("x"));
    expect(props.onReload).not.toHaveBeenCalled();
  });

  it("goes back to step 1 by itself when the picked notes are gone after a reload", () => {
    const { rerender, props } = setup();
    toReview("ให้เพื่อน 3 คนลองแอป");
    rerender(<Harness {...props} context={context([NOTES[2]])} />);
    expect(screen.getByRole("heading", { name: "เลือกหลักฐาน" })).toBeInTheDocument();
    expect(footerButton()).toHaveAccessibleName("เลือกโน้ตอย่างน้อย 1 ใบ");
  });

  it("offers ส่งฉบับใหม่ on a resubmit", () => {
    setup({ target: { ...target, resubmit: true } });
    toReview("ให้เพื่อน 3 คนลองแอป");
    expect(sendButton("ส่งฉบับใหม่")).toHaveAttribute("type", "submit");
  });
});
