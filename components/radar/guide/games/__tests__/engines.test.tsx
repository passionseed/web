import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { useReducer, type ComponentType } from "react";
import { demoTargetSelector } from "@/lib/radar-guide/demo";
import type { DemoStep, EngineId, EngineProps, GameTrack, GuideState } from "@/lib/radar-guide/guide-types";
import { emptyProgress, reduceProgress } from "@/lib/radar-guide/story";
import type { GuideTracker } from "@/lib/radar-guide/types";
import * as fx from "@/lib/radar-guide/games/__fixtures__/engines";
import BinaryChoice from "../BinaryChoice";
import DateToggle from "../DateToggle";
import EvidenceMaker from "../EvidenceMaker";
import FakeTerminal from "../FakeTerminal";
import FindLine from "../FindLine";
import FlipCards from "../FlipCards";
import GuessReveal from "../GuessReveal";
import LadderRebuild from "../LadderRebuild";
import ProgrammeFilter from "../ProgrammeFilter";
import RecapCard from "../RecapCard";
import SortGame from "../SortGame";
import { EngineStoreProvider, type EngineStore } from "../engine-context";
import { ENGINE_IDS, ENGINE_LOADERS } from "../index";
import { GuideShellContext, type GuideShellValue } from "../../shell/shell-context";

// ---------------------------------------------------------------- harness

function makeTracker() {
  return { visitId: null, track: jest.fn(), submitCareerRequest: jest.fn() } satisfies GuideTracker;
}

/** Holds real progress (reduceProgress) and exposes the latest state to the test. */
function TestStore({
  initial,
  probe,
  children,
}: {
  initial: GuideState;
  probe: { state: GuideState };
  children: React.ReactNode;
}) {
  const [state, dispatch] = useReducer(reduceProgress, initial);
  probe.state = state;
  const value: EngineStore = {
    state,
    dispatch,
    pages: [
      { key: "mythos", order: 1, navLabelTh: "บั๊กแก่", titleTh: "" },
      { key: "triage", order: 3, navLabelTh: "จับผิด AI", titleTh: "" },
      { key: "terminal", order: 9, navLabelTh: "แล็บ", titleTh: "" },
    ],
  };
  return <EngineStoreProvider value={value}>{children}</EngineStoreProvider>;
}

interface Options {
  skipped?: boolean;
  reducedMotion?: boolean;
  track?: Partial<GameTrack>;
  state?: GuideState;
}

function renderEngine<E extends EngineId>(
  Engine: ComponentType<EngineProps<E>>,
  data: EngineProps<E>["data"],
  opts: Options = {}
) {
  const tracker = makeTracker();
  const onResult = jest.fn();
  const probe = { state: opts.state ?? emptyProgress() };
  const track: GameTrack = { done: "p:done", value: "score", ...opts.track };
  const props = (skipped: boolean): EngineProps<E> => ({
    slug: "cybersecurity",
    pageKey: "p",
    blockId: "b",
    data,
    track,
    tracker,
    demo: false,
    reducedMotion: opts.reducedMotion ?? false,
    skipped,
    onResult,
  });
  const ui = (skipped: boolean) => (
    <TestStore initial={probe.state} probe={probe}>
      <Engine {...props(skipped)} />
    </TestStore>
  );
  const utils = render(ui(opts.skipped ?? false));
  return { ...utils, tracker, onResult, probe, skip: () => utils.rerender(ui(true)) };
}

const demo = (part: string) => document.querySelector(demoTargetSelector(`b.${part}`)) as HTMLElement | null;
const tap = (part: string) => {
  const el = demo(part);
  if (!el) throw new Error(`missing data-demo b.${part}`);
  fireEvent.click(el);
};

/** Plays a demoScript: every target must exist when its step runs. */
function playDemo(steps: readonly DemoStep[]) {
  for (const step of steps) {
    if (step.action === "wait") continue;
    const el = document.querySelector(demoTargetSelector(step.target)) as HTMLElement | null;
    expect({ target: step.target, found: Boolean(el) }).toEqual({ target: step.target, found: true });
    if (step.action === "tap") fireEvent.click(el!);
    if (step.action === "type") fireEvent.change(el!, { target: { value: step.text } });
  }
}

const doneEvents = (tracker: ReturnType<typeof makeTracker>, target = "p:done") =>
  tracker.track.mock.calls.filter(([e]) => e.target === target);

// ---------------------------------------------------------------- registry

test("ENGINE_LOADERS covers every engine with a default export", async () => {
  expect(ENGINE_IDS.sort()).toEqual(
    [
      "BinaryChoice",
      "DateToggle",
      "EvidenceMaker",
      "FakeTerminal",
      "FindLine",
      "FlipCards",
      "GuessReveal",
      "LadderRebuild",
      "ProgrammeFilter",
      "RecapCard",
      "SortGame",
    ].sort()
  );
  for (const id of ENGINE_IDS) {
    const mod = await ENGINE_LOADERS[id]();
    expect(typeof mod.default).toBe("function");
  }
});

test("without a provider, engines save progress through the guide shell's context", () => {
  const dispatch = jest.fn(() => ({ state: emptyProgress(), earned: [], xpGained: 0 }));
  const shell = {
    progress: emptyProgress(),
    dispatch,
    index: { pages: [] },
  } as unknown as GuideShellValue;
  render(
    <GuideShellContext.Provider value={shell}>
      <BinaryChoice
        slug="cybersecurity"
        pageKey="p"
        blockId="b"
        data={fx.fit}
        track={{ done: "p:done", value: "bitmask" }}
        tracker={makeTracker()}
        demo={false}
        reducedMotion
        skipped={false}
        onResult={jest.fn()}
      />
    </GuideShellContext.Provider>
  );
  tap("q-q1-left");
  tap("q-q2-left");
  tap("q-q3-right");
  expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: "fit" }));
});

// ---------------------------------------------------------------- FindLine

describe("FindLine", () => {
  test("tap wrong lines for hints, then the answer; result and event fire once", () => {
    const { onResult, tracker } = renderEngine(FindLine, fx.findLine, { track: { value: "attempts" } });
    tap("line-1");
    expect(screen.getByText(fx.findLine.hintsTh[0])).toBeInTheDocument();
    tap("line-2");
    expect(screen.getByText(fx.findLine.hintsTh[1])).toBeInTheDocument();
    expect(demo("line-5")).toHaveAttribute("data-state", "outlined");
    tap("line-7");
    tap("line-7");
    expect(onResult).toHaveBeenCalledTimes(1);
    expect(onResult.mock.calls[0][0]).toMatchObject({ done: true, attempts: 3 });
    expect(doneEvents(tracker)).toHaveLength(1);
    expect(doneEvents(tracker)[0][0]).toMatchObject({ type: "interactive_tap", pageKey: "p", valueInt: 3 });
    expect(screen.getByText("CLEAR!")).toBeInTheDocument();
  });

  test("reduced motion shows the final counter value", () => {
    renderEngine(FindLine, fx.findLine, { reducedMotion: true });
    tap("line-7");
    expect(screen.getByText("5,000,000")).toBeInTheDocument();
  });

  test("skip shows the solution and reports a skipped result without events", () => {
    const { onResult, tracker, skip } = renderEngine(FindLine, fx.findLine, { reducedMotion: true });
    skip();
    expect(demo("line-7")).toHaveAttribute("data-state", "found");
    expect(screen.getByText(fx.findLine.onFound.explanationTh)).toBeInTheDocument();
    expect(onResult).toHaveBeenCalledWith({ done: true, skipped: true });
    expect(tracker.track).not.toHaveBeenCalled();
  });

  test("demo script targets exist", () => {
    renderEngine(FindLine, fx.findLine);
    playDemo([
      { at: 0, action: "tap", target: "b.line-8" },
      { at: 800, action: "tap", target: "b.line-7" },
    ]);
  });
});

// ---------------------------------------------------------------- GuessReveal

describe("GuessReveal", () => {
  test("step the guess, lock it, reveal the answer with the gap and bucket", () => {
    const { onResult, tracker, probe } = renderEngine(GuessReveal, fx.firefox, { reducedMotion: true, track: { value: "bucket" } });
    tap("plus");
    tap("plus");
    expect(screen.getByText("270")).toBeInTheDocument();
    tap("lock");
    expect(screen.getAllByText("423").length).toBeGreaterThan(0);
    expect(screen.getByText("เธอเดาต่ำไป 153")).toBeInTheDocument();
    expect(screen.getByText("เธอเดา 270 ของจริง 423")).toBeInTheDocument();
    expect(onResult.mock.calls[0][0]).toMatchObject({ done: true, score: 0, total: 1 });
    expect(doneEvents(tracker)[0][0].valueInt).toBe(2);
    expect(probe.state.choices["p:b"]).toBe("270");
  });

  test("axis chart: เกือบเป๊ะ within the tolerance", () => {
    renderEngine(GuessReveal, fx.money, { reducedMotion: true });
    fireEvent.change(demo("slider")!, { target: { value: "35000" } });
    tap("lock");
    expect(screen.getByText("เกือบเป๊ะ")).toBeInTheDocument();
    expect(screen.getByText("ค่ากลาง")).toBeInTheDocument();
  });

  test("skip reveals the answer and hides the guess line", () => {
    const { skip, onResult } = renderEngine(GuessReveal, fx.firefox, { reducedMotion: true });
    skip();
    expect(screen.getAllByText("423").length).toBeGreaterThan(0);
    expect(screen.queryByText(/เธอเดา/)).not.toBeInTheDocument();
    expect(demo("lock")).toBeNull();
    expect(onResult).toHaveBeenCalledWith({ done: true, skipped: true });
  });
});

// ---------------------------------------------------------------- SortGame

describe("SortGame", () => {
  test("cards: tap a card, then tap a door", () => {
    const { onResult, tracker, probe } = renderEngine(SortGame, fx.doors, {
      track: { milestones: { "item:grid": "p:grid" } },
    });
    tap("bin-defense");
    expect(screen.getByText("แตะการ์ดก่อน แล้วค่อยแตะประตู")).toBeInTheDocument();
    tap("item-hunter");
    expect(demo("item-hunter")).toHaveAttribute("data-selected");
    tap("bin-redteam");
    expect(screen.getByText("ใกล้แล้ว Red Team รับเฉพาะองค์กร")).toBeInTheDocument();
    for (const [item, bin] of [
      ["hospital", "defense"],
      ["pentest", "redteam"],
      ["grid", "defense"],
      ["anon", "no"],
      ["student", "defense"],
    ]) {
      tap(`item-${item}`);
      tap(`bin-${bin}`);
    }
    expect(onResult).toHaveBeenCalledTimes(1);
    expect(onResult.mock.calls[0][0]).toMatchObject({ done: true, score: 4, total: 5 });
    expect(screen.getByText("ให้กุญแจถูก 4/5")).toBeInTheDocument();
    expect(tracker.track.mock.calls.some(([e]) => e.target === "p:grid")).toBe(true);
    expect(probe.state.choices["p:hunter"]).toBe("redteam");
    expect(probe.state.choices["p:missed"]).toBe("hunter");
  });

  test("queue: expand a row, then judge it; value is x*10+y", () => {
    const { tracker, probe } = renderEngine(SortGame, fx.triage, {
      track: { milestones: { "item:a2": "p:caught-takeover" } },
    });
    expect(demo("item-a1-bin-agree")).toBeNull();
    tap("item-a1");
    expect(screen.getByText("หลักฐาน a1")).toBeInTheDocument();
    tap("item-a1-bin-agree");
    for (const item of fx.triage.items.slice(1)) {
      tap(`item-${item.id}`);
      tap(`item-${item.id}-bin-${item.id === "a2" || item.id === "a5" ? "miss" : "agree"}`);
    }
    expect(doneEvents(tracker)[0][0].valueInt).toBe(28);
    expect(tracker.track.mock.calls.some(([e]) => e.target === "p:caught-takeover")).toBe(true);
    expect(screen.getByText("จับข้อที่ AI พลาดได้ 2/2 · เห็นด้วยถูก 8/8")).toBeInTheDocument();
    expect(probe.state.choices["p:x"]).toBe("2");
  });

  test("the soft timer can be turned off and never fails the game", () => {
    jest.useFakeTimers();
    try {
      renderEngine(SortGame, fx.triage);
      expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "90");
      act(() => {
        jest.advanceTimersByTime(3000);
      });
      expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "87");
      tap("timer");
      expect(screen.queryByRole("progressbar")).toBeNull();
      act(() => {
        jest.advanceTimersByTime(200_000);
      });
      expect(demo("item-a1")).not.toBeDisabled();
    } finally {
      jest.useRealTimers();
    }
  });

  test("chat: messages arrive one at a time; reduced motion shows them all", () => {
    const first = renderEngine(SortGame, fx.scam);
    expect(demo("item-m2")).toBeNull();
    tap("item-m1-bin-safe");
    expect(screen.getByText("เรื่องจริงเบื้องหลัง: วางสายแล้วโทรกลับ")).toBeInTheDocument();
    expect(screen.getByText("เร่ง")).toBeInTheDocument();
    tap("next");
    expect(demo("item-m2")).not.toBeNull();
    first.unmount();
    renderEngine(SortGame, fx.scam, { reducedMotion: true });
    expect(demo("item-m2")).not.toBeNull();
    expect(demo("next")).toBeNull();
  });

  test("skip shows every answer", () => {
    const { skip, onResult } = renderEngine(SortGame, fx.triage);
    skip();
    expect(screen.getAllByText("เฉลย a2").length).toBe(1);
    expect(screen.getByText("เฉลย")).toBeInTheDocument();
    expect(onResult).toHaveBeenCalledWith({ done: true, skipped: true });
    expect(screen.queryByText(/จับข้อที่ AI พลาดได้/)).toBeNull();
  });

  test("demo script targets exist", () => {
    renderEngine(SortGame, fx.triage);
    playDemo([
      { at: 0, action: "tap", target: "b.item-a2" },
      { at: 600, action: "tap", target: "b.item-a2-bin-miss" },
      { at: 1200, action: "tap", target: "b.timer" },
    ]);
  });
});

// ---------------------------------------------------------------- FlipCards and DateToggle

describe("FlipCards", () => {
  test("flip each card; the same sentence is highlighted on every back", () => {
    const { onResult, tracker } = renderEngine(FlipCards, fx.flip, { track: { value: "count", milestones: { flip: "p:flip" } } });
    tap("card-c1");
    expect(onResult).not.toHaveBeenCalled();
    tap("card-c2");
    expect(onResult.mock.calls[0][0]).toMatchObject({ done: true, score: 2, total: 2 });
    expect(document.querySelectorAll("mark")).toHaveLength(3);
    expect(doneEvents(tracker)[0][0].valueInt).toBe(2);
  });

  test("skip opens every card", () => {
    const { skip } = renderEngine(FlipCards, fx.flip);
    skip();
    expect(demo("card-c1")).toHaveAttribute("data-open");
    expect(demo("card-c2")).toHaveAttribute("data-open");
  });
});

describe("DateToggle", () => {
  test("tap a chip to light the doors; done once every chip was seen", () => {
    const { onResult, tracker } = renderEngine(DateToggle, fx.passport, { track: { value: "index", milestones: { chip: "p:passport" } } });
    tap("chip-d1");
    expect(screen.getByText("เฉพาะองค์กรพันธมิตร")).toBeInTheDocument();
    tap("chip-d2");
    tap("chip-d1");
    expect(onResult).toHaveBeenCalledTimes(1);
    expect(tracker.track.mock.calls.filter(([e]) => e.target === "p:passport").map(([e]) => e.valueInt)).toEqual([0, 1, 0]);
  });

  test("skip shows every day", () => {
    const { skip } = renderEngine(DateToggle, fx.passport);
    skip();
    expect(screen.getByText("11 มิ.ย.")).toBeInTheDocument();
    expect(screen.getByText("13 มิ.ย.")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------- LadderRebuild

describe("LadderRebuild", () => {
  test("AI fades the bottom rungs, new rungs snap in, then pick exactly three", () => {
    const { onResult, tracker, probe } = renderEngine(LadderRebuild, fx.ladder, {
      track: { value: "bitmask", milestones: { ladder: "p:ladder" } },
    });
    tap("ai");
    expect(screen.getByText("นั่งเฝ้าจอ")).toHaveAttribute("data-fade");
    tap("replace");
    expect(screen.getByText("ตรวจงาน AI")).toHaveAttribute("data-fresh");
    expect(tracker.track.mock.calls.some(([e]) => e.target === "p:ladder")).toBe(true);
    tap("chip-writeup");
    tap("chip-homelab");
    expect(demo("confirm")).toBeDisabled();
    tap("chip-oss");
    expect(demo("chip-ctf")).toBeDisabled();
    tap("confirm");
    expect(onResult).toHaveBeenCalledTimes(1);
    expect(doneEvents(tracker)[0][0].valueInt).toBe(0b1101);
    expect(probe.state.proof).toEqual(["writeup", "homelab", "oss"]);
    expect(probe.state.local?.proofLabels).toEqual({ writeup: "เขียน write-up", homelab: "ทำแล็บที่บ้าน", oss: "ช่วยโอเพนซอร์ส" });
  });

  test("skip shows the rebuilt ladder", () => {
    const { skip } = renderEngine(LadderRebuild, fx.ladder);
    skip();
    expect(screen.getByText("ตรวจงาน AI")).toBeInTheDocument();
    expect(demo("ai")).toBeNull();
  });
});

// ---------------------------------------------------------------- BinaryChoice

describe("BinaryChoice", () => {
  test("one pair at a time; the result saves fit and its title", () => {
    const { onResult, tracker, probe } = renderEngine(BinaryChoice, fx.fit, { track: { value: "index" } });
    tap("q-q1-left");
    expect(demo("q-q1-left")).toBeNull();
    tap("q-q2-left");
    tap("q-q3-right");
    expect(screen.getByText("ไซเบอร์ตรง")).toBeInTheDocument();
    expect(screen.getByText(fx.fit.disclaimerTh)).toBeInTheDocument();
    expect(onResult).toHaveBeenCalledTimes(1);
    expect(doneEvents(tracker)[0][0].valueInt).toBe(1);
    expect(probe.state.fit).toBe("A");
    expect(probe.state.choices["p:title"]).toBe("ไซเบอร์ตรง");
  });

  test("a tie shows both readouts", () => {
    const { probe } = renderEngine(BinaryChoice, {
      ...fx.fit,
      questions: [{ id: "t", leftTh: "ซ้าย", rightTh: "ขวา", left: { A: 1, B: 1 }, right: { C: 1 } }],
    });
    tap("q-t-left");
    expect(screen.getByText("ไซเบอร์ตรง")).toBeInTheDocument();
    expect(screen.getByText("คอมกว้างก่อน")).toBeInTheDocument();
    expect(probe.state.fit).toBe("AB");
  });
});

// ---------------------------------------------------------------- ProgrammeFilter

describe("ProgrammeFilter", () => {
  const at = (iso: string) => jest.spyOn(Date, "now").mockReturnValue(new Date(iso).getTime());
  afterEach(() => jest.restoreAllMocks());

  test("countdowns for ม.6 only, ปิดแล้ว after the deadline", () => {
    at("2026-11-17T09:00:00+07:00");
    const first = renderEngine(ProgrammeFilter, fx.tcas, { track: { value: "index", milestones: { grade: "p:grade" } } });
    expect(screen.queryByText(/มข\./)).toBeNull();
    tap("grade-m5");
    expect(screen.getByText("ปีหน้าเธอคือ TCAS71")).toBeInTheDocument();
    expect(screen.queryByText(/อีก \d+ วัน/)).toBeNull();
    expect(screen.getByText(/ปิด 28 ม\.ค\. 2570/)).toBeInTheDocument();
    tap("grade-m6");
    expect(screen.getByText(/อีก 72 วัน/)).toBeInTheDocument();
    expect(first.tracker.track.mock.calls.filter(([e]) => e.target === "p:grade").map(([e]) => e.valueInt)).toEqual([5, 6]);
    expect(first.onResult).toHaveBeenCalledTimes(1);
    first.unmount();

    at("2027-01-29T09:00:00+07:00");
    renderEngine(ProgrammeFilter, fx.tcas, { state: { ...emptyProgress(), grade: "m6" } });
    expect(screen.getByText(/ปิดแล้ว/)).toBeInTheDocument();
    expect(screen.queryByText(/-\d/)).toBeNull();
  });

  test("GPAX greys cards out and never hides them; saved locally only", () => {
    const { probe, tracker } = renderEngine(ProgrammeFilter, fx.tcas, { state: { ...emptyProgress(), grade: "m5" } });
    fireEvent.change(demo("gpax")!, { target: { value: "2.5" } });
    expect(probe.state.local?.gpax).toBe(2.5);
    const kmitl = screen.getByText("สจล.").closest("li")!;
    expect(kmitl).toHaveAttribute("data-greyed");
    expect(screen.getByText("มข.").closest("li")).not.toHaveAttribute("data-greyed");
    expect(JSON.stringify(tracker.track.mock.calls)).not.toContain("2.5");
  });

  test("the fit result sets the order; star saves to the shortlist; links fire cta_click", () => {
    const { probe, tracker } = renderEngine(ProgrammeFilter, fx.tcas, {
      state: { ...emptyProgress(), grade: "m6", fit: "A" },
      track: { milestones: { save: "p:save" } },
    });
    const unis = within(document.querySelector(".rg-prog__list") as HTMLElement)
      .getAllByText(/^(มข\.|สจล\.|มช\.)$/)
      .map((el) => el.textContent);
    expect(unis).toEqual(["มข.", "สจล.", "มช."]);
    tap("save-10160101300504A");
    expect(probe.state.shortlist).toEqual(["10160101300504A"]);
    tap("open-10030138220204A");
    expect(tracker.track).toHaveBeenCalledWith({ type: "cta_click", pageKey: "p", target: "program" });
    tap("track-intl");
    expect(screen.queryByText("มข.")).toBeNull();
    expect(screen.getByText("มช.")).toBeInTheDocument();
  });

  test("snapshot programmes sit behind ดูอีก N หลักสูตร", () => {
    renderEngine(ProgrammeFilter, { ...fx.tcas, snapshotProgrammes: [{ ...fx.tcas.programmes[0], id: "x1", uniTh: "สวนดุสิต" }] } as typeof fx.tcas, {
      state: { ...emptyProgress(), grade: "m4" },
    });
    expect(screen.getByText("พื้นฐานเครือข่าย")).toBeInTheDocument();
    expect(screen.queryByText("สวนดุสิต")).toBeNull();
    tap("more");
    expect(screen.getByText("สวนดุสิต")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------- FakeTerminal

describe("FakeTerminal", () => {
  test("chips play every mission; typed text is never tracked or stored", () => {
    const { onResult, tracker, probe } = renderEngine(FakeTerminal, fx.terminal, {
      track: { value: "count", milestones: { mission: "p:mission", flag: "p:flag", scopeTry: "p:scope-try", poll: "p:poll" } },
    });
    expect(demo("cmd-scan_school-web")).toBeNull();
    fireEvent.change(demo("input")!, { target: { value: "   cat    secretdiary.txt " } });
    tap("send");
    expect(screen.getByText("ไม่มีคำสั่งนี้ในแล็บ ลอง help")).toBeInTheDocument();
    fireEvent.change(demo("input")!, { target: { value: "  cat   scope.txt " } });
    fireEvent.submit(demo("input")!.closest("form")!);
    tap("cmd-scan_school-web");
    expect(screen.getByRole("alert")).toHaveTextContent("หยุด: นอกขอบเขต");
    tap("cmd-grep_-c_Failed_auth.log");
    expect(screen.getByText("41", { selector: ".rg-term__line" })).toBeInTheDocument();
    tap("answer-41");
    tap("cmd-grep_Accepted_auth.log");
    tap("hit-1");
    tap("cmd-ls_-a");
    tap("cmd-cat_.flag");
    expect(screen.getByText("FLAG ✓")).toBeInTheDocument();
    tap("decision-block");
    expect(onResult).not.toHaveBeenCalled();
    tap("decision-lock");
    expect(onResult).toHaveBeenCalledTimes(1);
    expect(onResult.mock.calls[0][0]).toMatchObject({ done: true, score: 5, total: 5 });
    tap("poll-depends");
    expect(screen.getByText(fx.terminal.poll.reveal.th)).toBeInTheDocument();

    const targets = tracker.track.mock.calls.map(([e]) => [e.target, e.valueInt]);
    expect(targets).toEqual(
      expect.arrayContaining([
        ["p:mission", 1],
        ["p:scope-try", 1],
        ["p:flag", undefined],
        ["p:done", 5],
        ["p:poll", 3],
      ])
    );
    const everything = JSON.stringify([tracker.track.mock.calls, probe.state]);
    expect(everything).not.toContain("secretdiary");
    expect(everything).not.toContain("cat");
    expect(probe.state.local?.terminal).toEqual({ missions: [1, 2, 3, 4, 5], flag: true, scopeTries: 1 });
    expect(probe.state.choices["p:poll"]).toBe("depends");
  });

  test("skip ticks every mission and hides the input", () => {
    const { skip, onResult } = renderEngine(FakeTerminal, fx.terminal);
    skip();
    expect(document.querySelectorAll(".rg-term__missions li[data-done]")).toHaveLength(5);
    expect(demo("input")).toBeNull();
    expect(onResult).toHaveBeenCalledWith({ done: true, skipped: true });
    expect(demo("poll-ok")).not.toBeNull();
  });

  test("demo script targets exist", () => {
    renderEngine(FakeTerminal, fx.terminal);
    playDemo([
      { at: 0, action: "tap", target: "b.cmd-cat_scope.txt" },
      { at: 900, action: "tap", target: "b.cmd-scan_school-web" },
      { at: 1800, action: "tap", target: "b.cmd-grep_-c_Failed_auth.log" },
      { at: 2600, action: "tap", target: "b.answer-41" },
      { at: 3400, action: "type", target: "b.input", text: "whoami" },
    ]);
  });
});

// ---------------------------------------------------------------- EvidenceMaker

describe("EvidenceMaker", () => {
  test("drafts stay in local; copy falls back to a selected textarea", async () => {
    const { probe, tracker, onResult } = renderEngine(EvidenceMaker, fx.evidence, {
      state: { ...emptyProgress(), proof: ["ctf"], local: { proofLabels: { ctf: "แข่ง CTF" } } },
      track: { value: "count", milestones: { checklist: "p:checklist", copied: "p:writeup-copied" } },
    });
    tap("room");
    expect(tracker.track).toHaveBeenCalledWith({ type: "cta_click", pageKey: "p", target: "first-step" });
    fireEvent.click(demo("check-0")!);
    expect(probe.state.checklist?.["p:b"]).toEqual([true, false, false, false]);
    fireEvent.change(demo("field-tried")!, { target: { value: "ลองหาหน้าแอดมิน" } });
    expect((probe.state.local?.drafts as Record<string, Record<string, string>>).b.tried).toBe("ลองหาหน้าแอดมิน");
    expect(screen.getByText("แข่ง CTF")).toBeInTheDocument();
    await act(async () => {
      tap("copy");
    });
    const out = screen.getByLabelText("write-up สำหรับคัดลอก") as HTMLTextAreaElement;
    expect(out.value).toContain("ลองหาหน้าแอดมิน");
    expect(out.value).toContain("- แข่ง CTF");
    expect(out.value).toContain("> ทำในแล็บฝึกที่ได้รับอนุญาตเท่านั้น");
    expect(document.activeElement).toBe(out);
    expect(onResult).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(tracker.track.mock.calls)).not.toContain("แอดมิน");
  });

  test("copies with the clipboard when it works", async () => {
    const writeText = jest.fn(() => Promise.resolve());
    Object.assign(navigator, { clipboard: { writeText } });
    try {
      renderEngine(EvidenceMaker, fx.evidence);
      await act(async () => {
        tap("copy");
      });
      expect(writeText).toHaveBeenCalled();
      expect(screen.getByText(/คัดลอกแล้ว/)).toBeInTheDocument();
    } finally {
      Object.assign(navigator, { clipboard: undefined });
    }
  });
});

// ---------------------------------------------------------------- RecapCard

describe("RecapCard", () => {
  const state: GuideState = {
    ...emptyProgress(),
    games: {
      "mythos:find": { done: true, attempts: 2, score: 0, total: 1 },
      "triage:queue": { done: true, score: 10, total: 10 },
    },
    choices: { "triage:x": "2" },
  };

  test("only played levels appear; the pick sets the line and the order value", () => {
    const { onResult, tracker, probe } = renderEngine(RecapCard, fx.recap, { state, track: { value: "index" } });
    expect(screen.getByText("หาบรรทัดอันตรายเจอใน 2 ครั้ง")).toBeInTheDocument();
    expect(screen.getByText("จับข้อที่ AI พลาดได้ 2/2")).toBeInTheDocument();
    expect(demo("fav-terminal")).toBeNull();
    tap("fav-mythos");
    expect(screen.getByText("สายที่เธอเลือกเอง: นักล่าช่องโหว่")).toBeInTheDocument();
    expect(probe.state.favourite).toBe("mythos");
    expect(onResult).toHaveBeenCalledTimes(1);
    expect(doneEvents(tracker)[0][0].valueInt).toBe(1);
  });

  test("an empty run says so", () => {
    renderEngine(RecapCard, fx.recap);
    expect(screen.getByText(/ยังไม่มีด่านที่เล่นจบ/)).toBeInTheDocument();
  });
});
