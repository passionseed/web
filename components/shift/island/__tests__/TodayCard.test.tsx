import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { toast } from "sonner";

import { checkIn, reflect, setResting } from "@/app/shift/island/actions";
import { REFLECTION_MIN_CHARS, REFLECTIONS_PER_DAY } from "@/lib/shift-island/rounds-rules";
import type { IslandActionResult } from "@/lib/supabase/shift-quests/types";

import { KEYNOTE, REFLECT, TODAY } from "../copy";
import type { TodayQuest } from "../model";
import { TodayCard } from "../TodayCard";

jest.mock("@/app/shift/island/actions", () => ({ checkIn: jest.fn(), reflect: jest.fn(), setResting: jest.fn() }));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() } }));

type CheckInResult = IslandActionResult<{ tapsToday: number }>;
const mockedCheckIn = checkIn as jest.MockedFunction<typeof checkIn>;
const mockedReflect = reflect as jest.MockedFunction<typeof reflect>;
const mockedSetResting = setResting as jest.MockedFunction<typeof setResting>;

const INSTANCE = "11111111-1111-4111-8111-111111111111";
const ACTIVE: TodayQuest = { ref: { kind: "main", milestone: 1 }, title: "เจอคนจริงคนแรก", mode: "next", instanceId: INSTANCE };
const STARTER: TodayQuest = { ref: { kind: "main", milestone: 1 }, title: "เจอคนจริงคนแรก", mode: "start", instanceId: null };
const LINE = "คุยกับแม่ค้าหน้าโรงเรียนสิบนาที";
const INTENTION = "ไปคุยกับแม่ค้าหน้าโรงเรียน";

beforeEach(() => window.localStorage.clear());

function card(props: Partial<React.ComponentProps<typeof TodayCard>> = {}) {
  const handlers = { onSaved: jest.fn(), onStuck: jest.fn(), onOpenQuest: jest.fn() };
  render(<TodayCard tapsToday={0} resting={false} quest={ACTIVE} {...handlers} {...props} />);
  return handlers;
}

/** A check-in whose answer the test decides, to look at the screen while it is in flight. */
function deferCheckIn() {
  let resolve!: (value: CheckInResult) => void;
  mockedCheckIn.mockImplementationOnce(() => new Promise<CheckInResult>((r) => (resolve = r)));
  return (value: CheckInResult) => act(async () => resolve(value));
}

describe("TodayCard", () => {
  it("comes before the work: asks what the student will do on their quest", () => {
    card();
    expect(screen.getByText("เควสต์ที่ทำอยู่: เจอคนจริงคนแรก")).toBeInTheDocument();
    expect(screen.getByLabelText(TODAY.ask)).toHaveAttribute("maxLength", "300");
    expect(screen.getByText(TODAY.askHint)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: TODAY.go })).toHaveClass("ei-button-dawn");
  });

  it("names a quest with a mentor as waiting, and none before anything is started", () => {
    const { unmount } = render(
      <TodayCard tapsToday={0} resting={false} quest={{ ...ACTIVE, mode: "waiting" }} onStuck={jest.fn()} onOpenQuest={jest.fn()} />,
    );
    expect(screen.getByText("รอพี่เลี้ยงดู: เจอคนจริงคนแรก")).toBeInTheDocument();
    unmount();
    card({ quest: STARTER });
    expect(screen.queryByText(/เควสต์ที่ทำอยู่/)).toBeNull();
    expect(screen.getByLabelText(TODAY.ask)).toBeInTheDocument();
  });

  it("is a plain เช็กอิน when there is no quest to open", () => {
    card({ quest: null });
    expect(screen.getByRole("button", { name: TODAY.tap })).toBeInTheDocument();
  });

  it("flips at once, then opens the quest once the database agrees", async () => {
    const answer = deferCheckIn();
    const { onSaved, onOpenQuest } = card();
    fireEvent.click(screen.getByRole("button", { name: TODAY.go }));

    expect(await screen.findByText(TODAY.tapped)).toBeInTheDocument();
    // Nothing celebrates or moves on before the database has the check-in.
    expect(onSaved).not.toHaveBeenCalled();
    expect(onOpenQuest).not.toHaveBeenCalled();
    expect(mockedCheckIn).toHaveBeenCalledWith({ intention: null, instanceId: INSTANCE });

    await answer({ ok: true, data: { tapsToday: 1 } });
    expect(onSaved).toHaveBeenCalledTimes(1);
    expect(onOpenQuest).toHaveBeenCalledWith(ACTIVE);
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("saves what the student means to do, and shows it back later that day", async () => {
    mockedCheckIn.mockResolvedValueOnce({ ok: true, data: { tapsToday: 1 } });
    card();
    fireEvent.change(screen.getByLabelText(TODAY.ask), { target: { value: `  ${INTENTION}  ` } });
    fireEvent.click(screen.getByRole("button", { name: TODAY.go }));
    expect(await screen.findByText(TODAY.intended(INTENTION))).toBeInTheDocument();
    expect(mockedCheckIn).toHaveBeenCalledWith({ intention: INTENTION, instanceId: INSTANCE });
  });

  it("checks in on a quest not started yet without filing under it", async () => {
    mockedCheckIn.mockResolvedValueOnce({ ok: true, data: { tapsToday: 1 } });
    const { onOpenQuest } = card({ quest: STARTER });
    fireEvent.click(screen.getByRole("button", { name: TODAY.go }));
    await waitFor(() => expect(onOpenQuest).toHaveBeenCalledWith(STARTER));
    expect(mockedCheckIn).toHaveBeenCalledWith({ intention: null, instanceId: null });
  });

  it("reverts, keeps the writing and says why when the check-in fails", async () => {
    const answer = deferCheckIn();
    const { onSaved, onOpenQuest } = card();
    fireEvent.change(screen.getByLabelText(TODAY.ask), { target: { value: INTENTION } });
    fireEvent.click(screen.getByRole("button", { name: TODAY.go }));
    expect(await screen.findByText(TODAY.tapped)).toBeInTheDocument();

    await answer({ ok: false, code: "unavailable", error: "เกาะปิดปรับปรุงชั่วคราว" });
    expect(onSaved).not.toHaveBeenCalled();
    expect(onOpenQuest).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByRole("button", { name: TODAY.go })).toBeInTheDocument());
    expect(screen.getByLabelText(TODAY.ask)).toHaveValue(INTENTION);
    expect(toast.error).toHaveBeenCalledWith("เกาะปิดปรับปรุงชั่วคราว");
  });

  it("back later the same day, leads to the quest, then asks how it went", () => {
    const { onOpenQuest } = card({ tapsToday: 1 });
    const back = screen.getByRole("button", { name: KEYNOTE.next("เจอคนจริงคนแรก") });
    expect(back.compareDocumentPosition(screen.getByLabelText(TODAY.lineLabel)) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    fireEvent.click(back);
    expect(onOpenQuest).toHaveBeenCalledWith(ACTIVE);
  });

  it("with nothing started, leads to the first quest to start", () => {
    const { onOpenQuest } = card({ tapsToday: 1, quest: STARTER });
    fireEvent.click(screen.getByRole("button", { name: KEYNOTE.start("เจอคนจริงคนแรก") }));
    expect(onOpenQuest).toHaveBeenCalledWith(STARTER);
  });

  it("shows the done state without any count after a check-in earlier today", () => {
    card({ tapsToday: 3, quest: null });
    const section = screen.getByRole("region", { name: TODAY.heading });
    expect(screen.getByText(TODAY.tapped)).toBeInTheDocument();
    // The line's hint names its minimum length; nothing counts check-ins.
    expect(section.textContent ?? "").not.toContain("3");
  });

  it("opens the stuck sheet on the student's own quest", () => {
    const { onStuck } = card();
    fireEvent.click(screen.getByRole("button", { name: TODAY.stuck }));
    expect(onStuck).toHaveBeenCalledWith({ instanceId: INSTANCE, title: "เจอคนจริงคนแรก" });
  });

  it("asks for general help when no quest is started yet", () => {
    const { onStuck } = card({ quest: STARTER });
    fireEvent.click(screen.getByRole("button", { name: TODAY.stuck }));
    expect(onStuck).toHaveBeenCalledWith({ instanceId: null, title: null });
  });

  it("asks to rest", async () => {
    mockedSetResting.mockResolvedValueOnce({ ok: true, data: { paused: 2, resumed: 0 } });
    card();
    fireEvent.click(screen.getByRole("button", { name: TODAY.rest }));
    await waitFor(() => expect(mockedSetResting).toHaveBeenCalledWith({ on: true }));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("พักแล้ว เควสต์ที่ทำอยู่ 2 อย่างพักไว้ให้ก่อน"));
  });

  it("keeps the card as it is when there was nothing in progress to pause", async () => {
    mockedSetResting.mockResolvedValueOnce({ ok: true, data: { paused: 0, resumed: 0 } });
    card();
    fireEvent.click(screen.getByRole("button", { name: TODAY.rest }));
    await waitFor(() => expect(toast.info).toHaveBeenCalledWith("ตอนนี้ยังไม่มีเควสต์ที่กำลังทำ เลยไม่มีอะไรต้องพัก"));
    expect(screen.queryByText("กำลังพัก ต้นไม้ไม่เหี่ยว ไม่มีอะไรหาย")).toBeNull();
    expect(screen.getByRole("button", { name: TODAY.go })).toBeInTheDocument();
  });

  it("while resting, says nothing is lost and offers กลับมาแล้ว", async () => {
    mockedSetResting.mockResolvedValueOnce({ ok: true, data: { paused: 0, resumed: 2 } });
    card({ resting: true });
    expect(screen.getByText("กำลังพัก ต้นไม้ไม่เหี่ยว ไม่มีอะไรหาย")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: TODAY.go })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "กลับมาแล้ว" }));
    await waitFor(() => expect(mockedSetResting).toHaveBeenCalledWith({ on: false }));
  });
});

describe("TodayCard line", () => {
  it.each([false, true])("is there after the check-in and while resting (resting=%s)", (resting) => {
    card({ tapsToday: 1, resting });
    expect(screen.getByLabelText(TODAY.lineLabel)).toHaveAttribute("maxLength", "1000");
    expect(screen.getByText(TODAY.lineHint)).toHaveTextContent(String(REFLECTION_MIN_CHARS));
  });

  it("is not asked for before the check-in", () => {
    card();
    expect(screen.queryByLabelText(TODAY.lineLabel)).toBeNull();
  });

  it("rejects a line too short to count, without saving", () => {
    card({ tapsToday: 1 });
    fireEvent.change(screen.getByLabelText(TODAY.lineLabel), { target: { value: "  สั้น  " } });
    fireEvent.click(screen.getByRole("button", { name: TODAY.lineSave }));
    expect(screen.getByText(TODAY.lineTooShort)).toBeInTheDocument();
    expect(mockedReflect).not.toHaveBeenCalled();
  });

  it("saves the line privately, filed under the student's quest", async () => {
    mockedReflect.mockResolvedValueOnce({ ok: true, data: null });
    card({ tapsToday: 1 });
    fireEvent.change(screen.getByLabelText(TODAY.lineLabel), { target: { value: `  ${LINE}  ` } });
    fireEvent.click(screen.getByRole("button", { name: TODAY.lineSave }));
    expect(await screen.findByText(TODAY.lineSaved)).toBeInTheDocument();
    expect(mockedReflect).toHaveBeenCalledWith({ learned: LINE, instanceId: INSTANCE });
    expect(screen.getByText(REFLECT.private)).toHaveTextContent(String(REFLECTIONS_PER_DAY));
    expect(screen.queryByLabelText(TODAY.lineLabel)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: TODAY.lineAgain }));
    expect(screen.getByLabelText(TODAY.lineLabel)).toHaveValue("");
  });

  it("files nothing under a quest that is not started yet", async () => {
    mockedReflect.mockResolvedValueOnce({ ok: true, data: null });
    card({ tapsToday: 1, quest: STARTER });
    fireEvent.change(screen.getByLabelText(TODAY.lineLabel), { target: { value: LINE } });
    fireEvent.click(screen.getByRole("button", { name: TODAY.lineSave }));
    await waitFor(() => expect(mockedReflect).toHaveBeenCalledWith({ learned: LINE, instanceId: null }));
  });

  it("keeps the writing on a server refusal", async () => {
    mockedReflect.mockResolvedValueOnce({ ok: false, code: "no_project", error: "สร้างโปรเจกต์ก่อน" });
    card({ tapsToday: 1 });
    fireEvent.change(screen.getByLabelText(TODAY.lineLabel), { target: { value: LINE } });
    fireEvent.click(screen.getByRole("button", { name: TODAY.lineSave }));
    expect(await screen.findByText("สร้างโปรเจกต์ก่อน")).toBeInTheDocument();
    expect(screen.getByLabelText(TODAY.lineLabel)).toHaveValue(LINE);
    expect(screen.queryByText(TODAY.lineSaved)).toBeNull();
  });

  it("disables saving while pending and sends once", async () => {
    let answer!: (value: IslandActionResult) => void;
    mockedReflect.mockImplementationOnce(() => new Promise((resolve) => { answer = resolve; }));
    card({ tapsToday: 1 });
    fireEvent.change(screen.getByLabelText(TODAY.lineLabel), { target: { value: LINE } });
    fireEvent.click(screen.getByRole("button", { name: TODAY.lineSave }));
    expect(await screen.findByRole("button", { name: "กำลังบันทึก" })).toBeDisabled();
    expect(mockedReflect).toHaveBeenCalledTimes(1);
    await act(async () => answer({ ok: true, data: null }));
  });
});
