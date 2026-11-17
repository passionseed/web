import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { toast } from "sonner";

import { checkIn, reflect } from "@/app/shift/island/actions";
import { REFLECTION_MIN_CHARS, REFLECTIONS_PER_DAY } from "@/lib/shift-island/rounds-rules";
import type { IslandActionResult } from "@/lib/supabase/shift-quests/types";

import { IDS, makeBoard } from "../__fixtures__/board";
import { CheckInSheet } from "../CheckInSheet";
import { CHECK_IN, NEXT_STEP, REFLECT, TODAY } from "../copy";
import { NextStepCard } from "../NextStepCard";
import type { NextStep } from "../nextStep";
import { RootsLine } from "../RootsLine";
import { DAY_INTENTION_KEY } from "../useDayIntention";

jest.mock("@/app/shift/island/actions", () => ({ checkIn: jest.fn(), reflect: jest.fn() }));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() } }));
jest.mock("../IslandSheet", () => {
  const { createElement } = jest.requireActual<typeof import("react")>("react");
  return {
    IslandSheet: ({ open, title, description, children }: { open: boolean; title: string; description?: string; children: unknown }) =>
      open ? createElement("div", { role: "dialog", "aria-label": title, "aria-description": description }, children as never) : null,
  };
});

type CheckInResult = IslandActionResult<{ tapsToday: number }>;
const mockedCheckIn = checkIn as jest.MockedFunction<typeof checkIn>;
const mockedReflect = reflect as jest.MockedFunction<typeof reflect>;

const TITLE = "หาเรื่องที่อยากแก้";
const INTENTION = "ไปคุยกับแม่ค้าหน้าโรงเรียน";
const LINE = "คุยกับแม่ค้าหน้าโรงเรียนสิบนาที";
const MEMBER = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

const GO: NextStep = {
  kind: "go",
  ref: { kind: "main", milestone: 1 },
  kindOfQuest: "main",
  title: TITLE,
  milestone: 1,
  instanceId: IDS.m2Instance,
  feedback: null,
  waitingTitle: null,
  checksIn: true,
};
const START: NextStep = { ...GO, kind: "start", instanceId: null };

beforeEach(() => window.localStorage.clear());

describe("NextStepCard", () => {
  it("is one gold button: what to do next, and which quest it is", () => {
    const onTap = jest.fn();
    render(<NextStepCard board={makeBoard()} step={{ ...GO, checksIn: false }} onTap={onTap} />);
    const card = screen.getByRole("button", { name: /ทำต่อ: หาเรื่องที่อยากแก้/ });
    expect(card).toHaveClass("dawn-keynote");
    expect(card).toHaveTextContent(NEXT_STEP.main(1));
    expect(screen.queryByTestId("next-check-in")).toBeNull();
    fireEvent.click(card);
    expect(onTap).toHaveBeenCalledWith({ ...GO, checksIn: false });
  });

  it("carries a lamp dot and says so while the day's check-in is open", () => {
    render(<NextStepCard board={makeBoard()} step={GO} onTap={jest.fn()} />);
    expect(screen.getByTestId("next-check-in")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: new RegExp(NEXT_STEP.checkIn) })).toBeInTheDocument();
  });

  it("shows back today's intention once checked in", () => {
    render(<NextStepCard board={makeBoard()} step={{ ...GO, checksIn: false }} intended={INTENTION} onTap={jest.fn()} />);
    expect(screen.getByText(NEXT_STEP.intended(INTENTION))).toBeInTheDocument();
  });

  it("quotes the mentor on work they asked more about", () => {
    const step: NextStep = { ...GO, kind: "answer", feedback: "ขอรูปอีกนิด", checksIn: false };
    render(<NextStepCard board={makeBoard()} step={step} onTap={jest.fn()} />);
    expect(screen.getByRole("button", { name: /ตอบพี่เลี้ยง: หาเรื่องที่อยากแก้/ })).toHaveTextContent("พี่เลี้ยงบอกว่า: ขอรูปอีกนิด");
  });
});

/** A check-in whose answer the test decides, to look at the screen while it is in flight. */
function deferCheckIn() {
  let resolve!: (value: CheckInResult) => void;
  mockedCheckIn.mockImplementationOnce(() => new Promise<CheckInResult>((r) => (resolve = r)));
  return (value: CheckInResult) => act(async () => resolve(value));
}

function sheet(props: Partial<React.ComponentProps<typeof CheckInSheet>> = {}) {
  const handlers = { onClose: jest.fn(), onCheckedIn: jest.fn() };
  const view = render(<CheckInSheet step={GO} viewerKey={MEMBER} {...handlers} {...props} />);
  return { ...handlers, ...view };
}

describe("CheckInSheet", () => {
  it("comes before the work: asks what the student will do today, optional and private", () => {
    sheet();
    expect(screen.getByRole("dialog", { name: CHECK_IN.title })).toHaveAttribute("aria-description", `ทำต่อ: ${TITLE}`);
    expect(screen.getByLabelText(TODAY.ask)).toHaveAttribute("maxLength", "300");
    expect(screen.getByText(TODAY.askHint)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: TODAY.go })).toHaveClass("ei-button-dawn");
  });

  it("stays closed without a step", () => {
    sheet({ step: null });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("goes to the quest only once the database has the check-in", async () => {
    const answer = deferCheckIn();
    const { onCheckedIn } = sheet();
    fireEvent.click(screen.getByRole("button", { name: TODAY.go }));
    await waitFor(() => expect(mockedCheckIn).toHaveBeenCalledWith({ intention: null, instanceId: IDS.m2Instance }));
    expect(screen.getByRole("button", { name: TODAY.go })).toBeDisabled();
    expect(onCheckedIn).not.toHaveBeenCalled();
    await answer({ ok: true, data: { tapsToday: 1 } });
    expect(onCheckedIn).toHaveBeenCalledWith(GO);
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("keeps what the student means to do on this browser, for them only", async () => {
    mockedCheckIn.mockResolvedValueOnce({ ok: true, data: { tapsToday: 1 } });
    const { onCheckedIn } = sheet();
    fireEvent.change(screen.getByLabelText(TODAY.ask), { target: { value: `  ${INTENTION}  ` } });
    fireEvent.click(screen.getByRole("button", { name: TODAY.go }));
    await waitFor(() => expect(onCheckedIn).toHaveBeenCalled());
    expect(mockedCheckIn).toHaveBeenCalledWith({ intention: INTENTION, instanceId: IDS.m2Instance });
    expect(JSON.parse(window.localStorage.getItem(DAY_INTENTION_KEY) ?? "null")).toMatchObject({ text: INTENTION, who: MEMBER });
  });

  it("keeps nothing on the device without a viewer key", async () => {
    mockedCheckIn.mockResolvedValueOnce({ ok: true, data: { tapsToday: 1 } });
    const { onCheckedIn } = sheet({ viewerKey: null });
    fireEvent.change(screen.getByLabelText(TODAY.ask), { target: { value: INTENTION } });
    fireEvent.click(screen.getByRole("button", { name: TODAY.go }));
    await waitFor(() => expect(onCheckedIn).toHaveBeenCalled());
    expect(window.localStorage.getItem(DAY_INTENTION_KEY)).toBeNull();
  });

  it("checks in on a quest not started yet without filing under it", async () => {
    mockedCheckIn.mockResolvedValueOnce({ ok: true, data: { tapsToday: 1 } });
    const { onCheckedIn } = sheet({ step: START });
    fireEvent.click(screen.getByRole("button", { name: TODAY.go }));
    await waitFor(() => expect(onCheckedIn).toHaveBeenCalledWith(START));
    expect(mockedCheckIn).toHaveBeenCalledWith({ intention: null, instanceId: null });
  });

  it("keeps the writing and says why when the check-in fails", async () => {
    mockedCheckIn.mockResolvedValueOnce({ ok: false, code: "unavailable", error: "เกาะปิดปรับปรุงชั่วคราว" });
    const { onCheckedIn } = sheet();
    fireEvent.change(screen.getByLabelText(TODAY.ask), { target: { value: INTENTION } });
    fireEvent.click(screen.getByRole("button", { name: TODAY.go }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("เกาะปิดปรับปรุงชั่วคราว"));
    expect(onCheckedIn).not.toHaveBeenCalled();
    expect(screen.getByLabelText(TODAY.ask)).toHaveValue(INTENTION);
    expect(screen.getByRole("button", { name: TODAY.go })).toBeEnabled();
  });

  it("never counts anything: no streak, no day number", () => {
    sheet();
    expect(screen.getByRole("dialog").textContent ?? "").not.toMatch(/\d+ วัน/);
  });
});

describe("RootsLine", () => {
  it("asks how the work went, with its minimum and its cap", () => {
    render(<RootsLine instanceId={IDS.m2Instance} />);
    expect(screen.getByLabelText(TODAY.lineLabel)).toHaveAttribute("maxLength", "1000");
    expect(screen.getByText(TODAY.lineHint)).toHaveTextContent(String(REFLECTION_MIN_CHARS));
  });

  it("rejects a line too short to count, without saving", () => {
    render(<RootsLine instanceId={IDS.m2Instance} />);
    fireEvent.change(screen.getByLabelText(TODAY.lineLabel), { target: { value: "  สั้น  " } });
    fireEvent.click(screen.getByRole("button", { name: TODAY.lineSave }));
    expect(screen.getByText(TODAY.lineTooShort)).toBeInTheDocument();
    expect(mockedReflect).not.toHaveBeenCalled();
  });

  it("saves the line privately, filed under the student's quest", async () => {
    mockedReflect.mockResolvedValueOnce({ ok: true, data: null });
    render(<RootsLine instanceId={IDS.m2Instance} />);
    fireEvent.change(screen.getByLabelText(TODAY.lineLabel), { target: { value: `  ${LINE}  ` } });
    fireEvent.click(screen.getByRole("button", { name: TODAY.lineSave }));
    expect(await screen.findByText(TODAY.lineSaved)).toBeInTheDocument();
    expect(mockedReflect).toHaveBeenCalledWith({ learned: LINE, instanceId: IDS.m2Instance });
    expect(screen.getByText(REFLECT.private)).toHaveTextContent(String(REFLECTIONS_PER_DAY));
    fireEvent.click(screen.getByRole("button", { name: TODAY.lineAgain }));
    expect(screen.getByLabelText(TODAY.lineLabel)).toHaveValue("");
  });

  it("files nothing under a quest that is not started yet", async () => {
    mockedReflect.mockResolvedValueOnce({ ok: true, data: null });
    render(<RootsLine instanceId={null} />);
    fireEvent.change(screen.getByLabelText(TODAY.lineLabel), { target: { value: LINE } });
    fireEvent.click(screen.getByRole("button", { name: TODAY.lineSave }));
    await waitFor(() => expect(mockedReflect).toHaveBeenCalledWith({ learned: LINE, instanceId: null }));
  });

  it("keeps the writing on a server refusal", async () => {
    mockedReflect.mockResolvedValueOnce({ ok: false, code: "no_project", error: "สร้างโปรเจกต์ก่อน" });
    render(<RootsLine instanceId={IDS.m2Instance} />);
    fireEvent.change(screen.getByLabelText(TODAY.lineLabel), { target: { value: LINE } });
    fireEvent.click(screen.getByRole("button", { name: TODAY.lineSave }));
    expect(await screen.findByText("สร้างโปรเจกต์ก่อน")).toBeInTheDocument();
    expect(screen.getByLabelText(TODAY.lineLabel)).toHaveValue(LINE);
  });
});
