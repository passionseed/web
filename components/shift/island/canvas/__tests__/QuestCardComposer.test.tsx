import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { toast } from "sonner";

import { submitQuestCard } from "@/app/shift/island/actions";
import type { PickableNote, QuestCanvasContext, QuestCardTarget } from "@/lib/shift-island/quest-canvas";
import { buildSnapshot } from "@/lib/supabase/shift-quests/canvas-snapshot";
import { questErrorText } from "@/lib/supabase/shift-quests/errors";

import { clearAllDrafts } from "../../drafts";
import { QuestCardComposer } from "../QuestCardComposer";

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

function setup(over: Partial<Parameters<typeof QuestCardComposer>[0]> = {}) {
  const props = {
    target,
    context: context(),
    onReload: jest.fn(),
    onSubmitted: jest.fn(),
    onCancel: jest.fn(),
    ...over,
  };
  const utils = render(<QuestCardComposer {...props} />);
  return { ...utils, props };
}

const box = (text: string) => screen.getByRole("checkbox", { name: text });
const sendButton = () => screen.getByRole("button", { name: "ส่งให้พี่เลี้ยงดู" });

beforeEach(() => {
  clearAllDrafts();
  mockedSubmit.mockReset().mockResolvedValue({ ok: true, data: { instanceId: "i", revision: 1, created: true } });
});

describe("QuestCardComposer", () => {
  it("lists the notes as stickies grouped by zone, with versions, reasons, team and privacy lines", () => {
    setup();
    expect(screen.getByRole("heading", { name: "การ์ดเควสต์" })).toBeInTheDocument();
    expect(screen.getByText("เลือกโน้ตที่จะส่ง (สูงสุด 8 ใบ)")).toBeInTheDocument();
    expect(screen.getByText("อย่าใส่ชื่อจริง เบอร์โทร หรือช่องทางติดต่อของคนที่ลองงานคุณ")).toBeInTheDocument();
    const tests = screen.getByRole("group", { name: "🧪 ทดสอบ" });
    expect(within(tests).getAllByRole("checkbox")).toHaveLength(2);
    const pivots = screen.getByRole("group", { name: "🔀 เปลี่ยนแผน" });
    expect(within(pivots).getByText("v2")).toBeInTheDocument();
    expect(within(pivots).getByText("แก้หลัง v2")).toBeInTheDocument();
    expect(within(pivots).getByText("เปลี่ยนเพราะ เพื่อนไม่อยากลงแอป")).toBeInTheDocument();
    expect(within(tests).getByText("โน้ตจากคนนอกทีม ส่งเป็นของคุณไม่ได้")).toBeInTheDocument();
    // Someone else's note is shown but cannot become the student's evidence.
    expect(box("โทรถามเขาที่ 081-234-5678")).toBeDisabled();
    expect(screen.getAllByText("โน้ตนี้อาจมีเบอร์โทร อีเมล หรือไอดีของใครบางคน แก้ในแคนวาสก่อนส่งดีกว่า")).toHaveLength(1);
    expect(screen.getByLabelText("อะไรทำให้คุณเปลี่ยนความคิด")).toHaveAttribute("placeholder", "ตอบสั้นๆ หนึ่งบรรทัด (ไม่บังคับ)");
    expect(screen.getByLabelText("ลิงก์งาน (ไม่บังคับ ขึ้นต้นด้วย https://)")).toBeInTheDocument();
    expect(screen.getByText("ส่งแล้วการ์ดนี้จะไม่เปลี่ยน ถึงจะแก้โน้ตในแคนวาสทีหลัง")).toBeInTheDocument();
  });

  it("disables send until a note is ticked, then previews the exact card with its meter", () => {
    setup();
    expect(sendButton()).toBeDisabled();
    expect(screen.queryByText(/\/2000$/)).toBeNull();
    expect(screen.getByText("ติ๊กโน้ตอย่างน้อย 1 ใบ แล้วการ์ดจะขึ้นตรงนี้")).toBeInTheDocument();
    fireEvent.click(box("เปลี่ยนจากแอปเป็นเว็บ"));
    fireEvent.click(box("ให้เพื่อน 3 คนลองแอป"));
    expect(sendButton()).toBeEnabled();
    const expected = buildSnapshot("Lamp project", [NOTES[0], NOTES[2]]);
    expect(screen.getByTestId("quest-card-text").textContent).toBe(expected.text);
    // The exact text is folded away; the student sees the notes as stickies, versions and reasons included.
    expect(screen.getByTestId("quest-card-text").closest("details")).not.toHaveAttribute("open");
    expect(screen.getByText("ดูข้อความที่พี่เลี้ยงจะได้")).toBeInTheDocument();
    const preview = screen.getByRole("heading", { name: "หน้าตาที่พี่เลี้ยงจะเห็น" }).closest("section") as HTMLElement;
    const tiles = within(preview).getAllByRole("listitem");
    expect(tiles.map((tile) => tile.querySelector("p")?.textContent)).toEqual(expected.blocks.map((b) => b.header));
    expect(within(preview).getByText("v1 → v2 เปลี่ยนเพราะ: เพื่อนไม่อยากลงแอป")).toBeInTheDocument();
    expect(screen.getByText(`${expected.length}/2000`)).toBeInTheDocument();
    expect(screen.getByText("เลือกแล้ว 2/8")).toBeInTheDocument();
  });

  it("warns, without changing anything, when the student's own line holds a contact", () => {
    setup();
    const line = screen.getByLabelText("อะไรทำให้คุณเปลี่ยนความคิด");
    expect(screen.queryByText("ข้อความนี้อาจมีเบอร์โทร อีเมล หรือไอดีของใครบางคน ลบออกก่อนส่งดีกว่า")).toBeNull();
    fireEvent.change(line, { target: { value: "น้องมิ้นท์ ไอจี mint.k ช่วยลอง" } });
    expect(screen.getByText("ข้อความนี้อาจมีเบอร์โทร อีเมล หรือไอดีของใครบางคน ลบออกก่อนส่งดีกว่า")).toBeInTheDocument();
    expect(line).toHaveValue("น้องมิ้นท์ ไอจี mint.k ช่วยลอง");
  });

  it("does not send while the canvas is being read again", () => {
    setup({ loading: true });
    fireEvent.click(box("ให้เพื่อน 3 คนลองแอป"));
    expect(sendButton()).toBeDisabled();
    expect(screen.getByText("กำลังอ่านแคนวาสใหม่ รอสักครู่แล้วค่อยส่ง")).toBeInTheDocument();
  });

  it("caps the card at 8 notes", () => {
    const many = Array.from({ length: 10 }, (_, i) => note({ id: `n${i}`, kind: "test", text: `โน้ตที่ ${i}`, hash: `b${i}` }));
    setup({ context: context(many) });
    for (let i = 0; i < 8; i++) fireEvent.click(box(`โน้ตที่ ${i}`));
    expect(box("โน้ตที่ 8")).toBeDisabled();
    expect(box("โน้ตที่ 0")).toBeEnabled();
    expect(screen.getByText(/ครบ 8 ใบแล้ว/)).toBeInTheDocument();
    fireEvent.click(box("โน้ตที่ 8"));
    expect(screen.getByText("เลือกแล้ว 8/8")).toBeInTheDocument();
    fireEvent.click(box("โน้ตที่ 0"));
    expect(box("โน้ตที่ 8")).toBeEnabled();
  });

  it("says when the card will be cut", () => {
    const long = [note({ id: "l", kind: "test", text: "ย".repeat(900), hash: "c" })];
    setup({ context: context(long) });
    fireEvent.click(box("ย".repeat(900)));
    expect(screen.getByText("บางโน้ตยาวเกิน จะถูกตัดท้าย")).toBeInTheDocument();
  });

  it("sends ids and hashes, the line and the link, then clears the draft", async () => {
    const { props } = setup();
    fireEvent.click(box("ให้เพื่อน 3 คนลองแอป"));
    fireEvent.change(screen.getByLabelText("อะไรทำให้คุณเปลี่ยนความคิด"), { target: { value: " เพื่อนไม่ใช้ปุ่มที่คิดไว้ " } });
    fireEvent.change(screen.getByLabelText("ลิงก์งาน (ไม่บังคับ ขึ้นต้นด้วย https://)"), { target: { value: "https://lamp.example.com" } });
    fireEvent.click(sendButton());
    await waitFor(() =>
      expect(mockedSubmit).toHaveBeenCalledWith({
        ref: target.ref,
        slug: target.slug,
        version: null,
        notes: [{ id: "t1", hash: "a1" }],
        line: "เพื่อนไม่ใช้ปุ่มที่คิดไว้",
        link: "https://lamp.example.com",
      })
    );
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("ส่งแล้ว พี่เลี้ยงจะดูใน Discord แล้วแจ้งผลในกล่องข้อความของบอท"));
    expect(props.onSubmitted).toHaveBeenCalled();
  });

  it("sends an empty line and link as null", async () => {
    setup();
    fireEvent.click(box("ให้เพื่อน 3 คนลองแอป"));
    fireEvent.click(sendButton());
    await waitFor(() => expect(mockedSubmit).toHaveBeenCalledWith(expect.objectContaining({ line: null, link: null })));
  });

  it("refuses a link that is not https before sending", () => {
    setup();
    fireEvent.click(box("ให้เพื่อน 3 คนลองแอป"));
    fireEvent.change(screen.getByLabelText("ลิงก์งาน (ไม่บังคับ ขึ้นต้นด้วย https://)"), { target: { value: "http://x.com" } });
    fireEvent.click(sendButton());
    expect(screen.getByRole("alert")).toHaveTextContent("ลิงก์ต้องขึ้นต้นด้วย https://");
    expect(mockedSubmit).not.toHaveBeenCalled();
  });

  it("on notes_changed says so and reloads the canvas, keeping the draft", async () => {
    mockedSubmit.mockResolvedValue({ ok: false, code: "notes_changed", error: questErrorText("notes_changed") });
    const { props } = setup();
    fireEvent.click(box("ให้เพื่อน 3 คนลองแอป"));
    fireEvent.click(sendButton());
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("โน้ตในแคนวาสเพิ่งเปลี่ยน ดูการ์ดอีกครั้งแล้วค่อยส่ง"));
    expect(props.onReload).toHaveBeenCalledTimes(1);
    expect(props.onSubmitted).not.toHaveBeenCalled();
    expect(box("ให้เพื่อน 3 คนลองแอป")).toBeChecked();
  });

  it("does not reload for a refusal unrelated to the canvas", async () => {
    mockedSubmit.mockResolvedValue({ ok: false, code: "milestone_open", error: "x" });
    const { props } = setup();
    fireEvent.click(box("ให้เพื่อน 3 คนลองแอป"));
    fireEvent.click(sendButton());
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("x"));
    expect(props.onReload).not.toHaveBeenCalled();
  });

  it("keeps ticks, line and link when the sheet closes, and drops ticks for notes that are gone", () => {
    const { unmount } = setup();
    fireEvent.click(box("ให้เพื่อน 3 คนลองแอป"));
    fireEvent.click(box("เปลี่ยนจากแอปเป็นเว็บ"));
    fireEvent.change(screen.getByLabelText("อะไรทำให้คุณเปลี่ยนความคิด"), { target: { value: "ร่าง" } });
    unmount();
    setup({ context: context([NOTES[0], NOTES[1]]) });
    expect(box("ให้เพื่อน 3 คนลองแอป")).toBeChecked();
    expect(screen.getByText("เลือกแล้ว 1/8")).toBeInTheDocument();
    expect(screen.getByLabelText("อะไรทำให้คุณเปลี่ยนความคิด")).toHaveValue("ร่าง");
  });

  it("offers ส่งฉบับใหม่ on a resubmit, กลับ, and เขียนเองแทน when given", () => {
    const onWriteInstead = jest.fn();
    const { props } = setup({ target: { ...target, resubmit: true }, onWriteInstead });
    expect(screen.getByRole("button", { name: "ส่งฉบับใหม่" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "กลับ" }));
    expect(props.onCancel).toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "เขียนเองแทน" }));
    expect(onWriteInstead).toHaveBeenCalled();
  });

  it("explains an empty canvas zone", () => {
    setup({ context: context([]) });
    expect(screen.getByText(/ยังไม่มีโน้ต/)).toBeInTheDocument();
    expect(sendButton()).toBeDisabled();
  });
});
