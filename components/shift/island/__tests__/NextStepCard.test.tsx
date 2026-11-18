import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { toast } from "sonner";

import { checkIn, keepIntention, reflect } from "@/app/shift/island/actions";
import { REFLECTION_MIN_CHARS, REFLECTIONS_PER_DAY } from "@/lib/shift-island/rounds-rules";

import { IDS, makeBoard } from "../__fixtures__/board";
import { DETAIL, NEXT_STEP, REFLECT, TODAY } from "../copy";
import { DayIntention } from "../DayIntention";
import { NextStepCard } from "../NextStepCard";
import type { NextStep } from "../nextStep";
import { RootsLine } from "../RootsLine";
import { DAY_INTENTION_KEY } from "../useDayIntention";

jest.mock("@/app/shift/island/actions", () => ({ checkIn: jest.fn(), keepIntention: jest.fn(), reflect: jest.fn() }));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() } }));
jest.mock("../IslandSheet", () => {
  const { createElement } = jest.requireActual<typeof import("react")>("react");
  return {
    IslandSheet: ({ open, title, description, children }: { open: boolean; title: string; description?: string; children: unknown }) =>
      open ? createElement("div", { role: "dialog", "aria-label": title, "aria-description": description }, children as never) : null,
  };
});

const mockedCheckIn = checkIn as jest.MockedFunction<typeof checkIn>;
const mockedKeep = keepIntention as jest.MockedFunction<typeof keepIntention>;
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
  action: "open",
  checksIn: true,
};
const START: NextStep = { ...GO, kind: "start", instanceId: null, action: "start" };

beforeEach(() => window.localStorage.clear());

describe("NextStepCard", () => {
  it("says what to do next and which quest it is, with one verb button", () => {
    const onTap = jest.fn();
    render(<NextStepCard board={makeBoard()} step={{ ...GO, checksIn: false }} onTap={onTap} />);
    const card = screen.getByRole("region", { name: `ทำต่อ: ${TITLE}` });
    expect(card).toHaveClass("dawn-keynote");
    expect(card).toHaveTextContent(NEXT_STEP.main(1));
    const buttons = within(card).getAllByRole("button");
    expect(buttons).toHaveLength(1);
    expect(buttons[0]).toHaveTextContent(NEXT_STEP.action.go);
    expect(buttons[0]).toHaveClass("ei-button-dawn");
    fireEvent.click(buttons[0]);
    expect(onTap).toHaveBeenCalledWith({ ...GO, checksIn: false });
  });

  it("says เริ่มเลย on a quest it starts", () => {
    render(<NextStepCard board={makeBoard()} step={START} onTap={jest.fn()} />);
    expect(screen.getByRole("button", { name: NEXT_STEP.action.start })).toBeInTheDocument();
  });

  it("is plain words with nothing to tap while the work waits on a mentor", () => {
    const step: NextStep = { ...GO, kind: "waiting", action: null, checksIn: false };
    render(<NextStepCard board={makeBoard()} step={step} onTap={jest.fn()} />);
    expect(screen.getByRole("region", { name: `รอพี่เลี้ยงดู: ${TITLE}` })).toHaveTextContent(NEXT_STEP.sentOnly);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("waits while the tap is on its way", () => {
    render(<NextStepCard board={makeBoard()} step={START} pending onTap={jest.fn()} />);
    expect(screen.getByRole("button", { name: NEXT_STEP.action.start })).toBeDisabled();
  });

  it("shows back today's intention once checked in", () => {
    render(<NextStepCard board={makeBoard()} step={{ ...GO, checksIn: false }} intended={INTENTION} onTap={jest.fn()} />);
    expect(screen.getByText(NEXT_STEP.intended(INTENTION))).toBeInTheDocument();
  });

  it("quotes the mentor on work they asked more about", () => {
    const step: NextStep = { ...GO, kind: "answer", feedback: "ขอรูปอีกนิด", checksIn: false };
    render(<NextStepCard board={makeBoard()} step={step} onTap={jest.fn()} />);
    expect(screen.getByRole("region", { name: `ตอบพี่เลี้ยง: ${TITLE}` })).toHaveTextContent("พี่เลี้ยงบอกว่า: ขอรูปอีกนิด");
    expect(screen.getByRole("button", { name: NEXT_STEP.action.answer })).toBeInTheDocument();
  });
});

/** The intention box inside the quest, opened. */
function intention(props: Partial<React.ComponentProps<typeof DayIntention>> = {}) {
  const view = render(<DayIntention instanceId={IDS.m2Instance} viewerKey={MEMBER} {...props} />);
  fireEvent.click(screen.getByText(DETAIL.intention));
  return view;
}

describe("DayIntention", () => {
  it("is optional and private, folded inside the quest", () => {
    intention();
    expect(screen.getByLabelText(TODAY.ask)).toHaveAttribute("maxLength", "300");
    expect(screen.getByText(TODAY.askHint)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: DETAIL.intentionSave })).toBeDisabled();
  });

  it("keeps what the student means to do on this browser, for them only, filed under their quest", async () => {
    mockedKeep.mockResolvedValueOnce({ ok: true, data: null });
    intention();
    fireEvent.change(screen.getByLabelText(TODAY.ask), { target: { value: `  ${INTENTION}  ` } });
    fireEvent.click(screen.getByRole("button", { name: DETAIL.intentionSave }));
    await waitFor(() => expect(screen.getByText(TODAY.intended(INTENTION))).toBeInTheDocument());
    expect(mockedKeep).toHaveBeenCalledWith({ intention: INTENTION, instanceId: IDS.m2Instance });
    expect(mockedCheckIn).not.toHaveBeenCalled();
    expect(JSON.parse(window.localStorage.getItem(DAY_INTENTION_KEY) ?? "null")).toMatchObject({ text: INTENTION, who: MEMBER });
  });

  it("keeps nothing on the device without a viewer key", async () => {
    mockedKeep.mockResolvedValueOnce({ ok: true, data: null });
    intention({ viewerKey: null });
    fireEvent.change(screen.getByLabelText(TODAY.ask), { target: { value: INTENTION } });
    fireEvent.click(screen.getByRole("button", { name: DETAIL.intentionSave }));
    await waitFor(() => expect(toast.success).toHaveBeenCalled());
    expect(window.localStorage.getItem(DAY_INTENTION_KEY)).toBeNull();
  });

  it("keeps the writing and says why when saving fails", async () => {
    mockedKeep.mockResolvedValueOnce({ ok: false, code: "unavailable", error: "เกาะปิดปรับปรุงชั่วคราว" });
    intention();
    fireEvent.change(screen.getByLabelText(TODAY.ask), { target: { value: INTENTION } });
    fireEvent.click(screen.getByRole("button", { name: DETAIL.intentionSave }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("เกาะปิดปรับปรุงชั่วคราว"));
    expect(screen.getByLabelText(TODAY.ask)).toHaveValue(INTENTION);
  });

  it("never counts anything: no streak, no day number", () => {
    const { container } = intention();
    expect(container.textContent ?? "").not.toMatch(/\d+ วัน/);
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
