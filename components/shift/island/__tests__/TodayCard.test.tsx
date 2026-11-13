import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { toast } from "sonner";

import { checkIn, reflect, setResting } from "@/app/shift/island/actions";
import type { IslandActionResult } from "@/lib/supabase/shift-quests/types";

import { REFLECT } from "../copy";
import { REFLECTION_MIN_CHARS, REFLECTIONS_PER_DAY } from "@/lib/shift-island/rounds-rules";

import { TodayCard } from "../TodayCard";

jest.mock("@/app/shift/island/actions", () => ({ checkIn: jest.fn(), reflect: jest.fn(), setResting: jest.fn() }));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() } }));

type CheckInResult = IslandActionResult<{ kind: "tap" | "note"; tapsToday: number }>;
const mockedCheckIn = checkIn as jest.MockedFunction<typeof checkIn>;
const mockedSetResting = setResting as jest.MockedFunction<typeof setResting>;

/** A check-in whose answer the test decides, to look at the screen while it is in flight. */
function deferCheckIn() {
  let resolve!: (value: CheckInResult) => void;
  mockedCheckIn.mockImplementationOnce(() => new Promise<CheckInResult>((r) => (resolve = r)));
  return (value: CheckInResult) => act(async () => resolve(value));
}

describe("TodayCard", () => {
  it("flips to วันนี้คุณลงมือแล้ว at once and keeps it when the database agrees", async () => {
    const answer = deferCheckIn();
    const onSaved = jest.fn();
    render(<TodayCard tapsToday={0} resting={false} onSaved={onSaved} onStuck={jest.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "เช็กอินวันนี้" }));

    expect(await screen.findByText("วันนี้คุณลงมือแล้ว")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "เช็กอินวันนี้" })).toBeNull();
    // The puff waits for the database: nothing celebrates a check-in that may still fail.
    expect(onSaved).not.toHaveBeenCalled();
    expect(mockedCheckIn).toHaveBeenCalledWith();

    await answer({ ok: true, data: { kind: "tap", tapsToday: 1 } });
    expect(screen.getByText("วันนี้คุณลงมือแล้ว")).toBeInTheDocument();
    expect(onSaved).toHaveBeenCalledTimes(1);
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("reverts and says why when the check-in fails", async () => {
    const answer = deferCheckIn();
    const onSaved = jest.fn();
    render(<TodayCard tapsToday={0} resting={false} onSaved={onSaved} onStuck={jest.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "เช็กอินวันนี้" }));
    expect(await screen.findByText("วันนี้คุณลงมือแล้ว")).toBeInTheDocument();

    await answer({ ok: false, code: "unavailable", error: "เกาะปิดปรับปรุงชั่วคราว" });
    expect(onSaved).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByRole("button", { name: "เช็กอินวันนี้" })).toBeInTheDocument());
    expect(screen.queryByText("วันนี้คุณลงมือแล้ว")).toBeNull();
    expect(toast.error).toHaveBeenCalledWith("เกาะปิดปรับปรุงชั่วคราว");
  });

  it("shows the done state without any count after a tap earlier today", () => {
    const { container } = render(<TodayCard tapsToday={3} resting={false} onStuck={jest.fn()} />);
    expect(screen.getByText("วันนี้คุณลงมือแล้ว")).toBeInTheDocument();
    expect(container.textContent ?? "").not.toMatch(/\d/);
  });

  it("saves a short private note on today's check-in", async () => {
    mockedCheckIn.mockResolvedValueOnce({ ok: true, data: { kind: "note", tapsToday: 1 } });
    render(<TodayCard tapsToday={1} resting={false} onStuck={jest.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /เพิ่มโน้ตสั้นๆ/ }));
    const note = screen.getByLabelText("โน้ตของวันนี้ (เห็นแค่คุณ)");
    expect(note).toHaveAttribute("maxLength", "300");
    fireEvent.change(note, { target: { value: "ลองทำหน้าแรกใหม่" } });
    fireEvent.click(screen.getByRole("button", { name: "บันทึกโน้ต" }));
    await waitFor(() => expect(mockedCheckIn).toHaveBeenCalledWith({ note: "ลองทำหน้าแรกใหม่" }));
  });

  it("opens the stuck sheet and asks to rest", async () => {
    mockedSetResting.mockResolvedValueOnce({ ok: true, data: { paused: 2, resumed: 0 } });
    const onStuck = jest.fn();
    render(<TodayCard tapsToday={0} resting={false} onStuck={onStuck} />);
    fireEvent.click(screen.getByRole("button", { name: "ติด" }));
    expect(onStuck).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "ขอพัก" }));
    await waitFor(() => expect(mockedSetResting).toHaveBeenCalledWith({ on: true }));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("พักแล้ว เควสต์ที่ทำอยู่ 2 อย่างพักไว้ให้ก่อน"));
  });

  it("keeps the card as it is when there was nothing in progress to pause", async () => {
    mockedSetResting.mockResolvedValueOnce({ ok: true, data: { paused: 0, resumed: 0 } });
    render(<TodayCard tapsToday={0} resting={false} onStuck={jest.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "ขอพัก" }));
    await waitFor(() => expect(toast.info).toHaveBeenCalledWith("ตอนนี้ยังไม่มีเควสต์ที่กำลังทำ เลยไม่มีอะไรต้องพัก"));
    expect(screen.queryByText("กำลังพัก ต้นไม้ไม่เหี่ยว ไม่มีอะไรหาย")).toBeNull();
    expect(screen.getByRole("button", { name: "เช็กอินวันนี้" })).toBeInTheDocument();
  });

  it("is never the page's primary button (the keynote card is)", () => {
    render(<TodayCard tapsToday={0} resting={false} onStuck={jest.fn()} />);
    expect(screen.getByRole("button", { name: "เช็กอินวันนี้" })).not.toHaveClass("ei-button-dawn");
  });

  it("while resting, says nothing is lost and offers กลับมาแล้ว", async () => {
    mockedSetResting.mockResolvedValueOnce({ ok: true, data: { paused: 0, resumed: 2 } });
    render(<TodayCard tapsToday={0} resting onStuck={jest.fn()} />);
    expect(screen.getByText("กำลังพัก ต้นไม้ไม่เหี่ยว ไม่มีอะไรหาย")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "เช็กอินวันนี้" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "กลับมาแล้ว" }));
    await waitFor(() => expect(mockedSetResting).toHaveBeenCalledWith({ on: false }));
  });
});


describe("TodayCard reflection", () => {
  function open(resting = false) {
    render(<TodayCard tapsToday={0} resting={resting} onStuck={jest.fn()} />);
    fireEvent.click(screen.getByText(REFLECT.entry));
  }

  it.each([false, true])("is available before check-in, resting=%s", (resting) => {
    open(resting);
    expect(screen.getByLabelText(REFLECT.learned)).toHaveAttribute("maxLength", "1000");
    expect(screen.getByLabelText(REFLECT.stuck)).toHaveAttribute("maxLength", "1000");
    expect(screen.getByText(REFLECT.learnedHint)).toHaveTextContent(String(REFLECTION_MIN_CHARS));
  });

  it("rejects short reflections without saving", () => {
    open();
    fireEvent.change(screen.getByLabelText(REFLECT.learned), { target: { value: "  สั้น  " } });
    fireEvent.click(screen.getByRole("button", { name: REFLECT.save }));
    expect(screen.getByRole("alert")).toHaveTextContent(REFLECT.tooShort);
    expect(reflect).not.toHaveBeenCalled();
  });

  it.each(["", "  ติดเรื่องลิงก์  "])("saves private reflection with blocker %s", async (stuck) => {
    jest.mocked(reflect).mockResolvedValueOnce({ ok: true, data: null });
    open();
    fireEvent.change(screen.getByLabelText(REFLECT.learned), { target: { value: "  เรียนรู้จากการลองกับเพื่อน  " } });
    fireEvent.change(screen.getByLabelText(REFLECT.stuck), { target: { value: stuck } });
    fireEvent.click(screen.getByRole("button", { name: REFLECT.save }));
    expect(await screen.findByText(REFLECT.saved)).toBeInTheDocument();
    expect(reflect).toHaveBeenCalledWith({ learned: "เรียนรู้จากการลองกับเพื่อน", stuck: stuck.trim() || null });
    expect(screen.getByText(REFLECT.private)).toHaveTextContent(String(REFLECTIONS_PER_DAY));
    expect(!!screen.queryByText(REFLECT.discordHelp)).toBe(!!stuck.trim());
    expect(screen.queryByLabelText(REFLECT.learned)).toBeNull();
  });

  it("retains writing on a server refusal", async () => {
    jest.mocked(reflect).mockResolvedValueOnce({ ok: false, code: "no_project", error: "สร้างโปรเจกต์ก่อน" });
    open();
    fireEvent.change(screen.getByLabelText(REFLECT.learned), { target: { value: "เรียนรู้จากการลองกับเพื่อน" } });
    fireEvent.click(screen.getByRole("button", { name: REFLECT.save }));
    expect(await screen.findByRole("alert")).toHaveTextContent("สร้างโปรเจกต์ก่อน");
    expect(screen.getByLabelText(REFLECT.learned)).toHaveValue("เรียนรู้จากการลองกับเพื่อน");
    expect(screen.queryByText(REFLECT.saved)).toBeNull();
  });

  it("disables save while pending and prevents duplicate requests", async () => {
    let answer!: (value: IslandActionResult) => void;
    jest.mocked(reflect).mockImplementationOnce(() => new Promise((resolve) => { answer = resolve; }));
    open();
    fireEvent.change(screen.getByLabelText(REFLECT.learned), { target: { value: "เรียนรู้จากการลองกับเพื่อน" } });
    fireEvent.click(screen.getByRole("button", { name: REFLECT.save }));
    expect(await screen.findByRole("button", { name: "กำลังบันทึก" })).toBeDisabled();
    expect(reflect).toHaveBeenCalledTimes(1);
    await act(async () => answer({ ok: true, data: null }));
  });
});
