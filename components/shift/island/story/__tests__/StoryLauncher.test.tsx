import { act, fireEvent, render, screen } from "@testing-library/react";

import type { IslandCanvasProps } from "@/components/shift/island/live/IslandCanvas";

import { StoryLauncher, type StoryLauncherProps } from "../StoryLauncher";
import { PANEL_MS } from "../StoryOverlay";
import { STORY_SEEN_KEY } from "../useStorySeen";

/** What the mocked canvas was last given, per panel phase, and whether it should fail. */
const mockCanvas: { props: IslandCanvasProps[]; fail: boolean; throws: boolean } = { props: [], fail: false, throws: false };

jest.mock("@/components/shift/island/live/IslandCanvas", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require("react");
  return {
    __esModule: true,
    default: function MockIslandCanvas(props: IslandCanvasProps) {
      // A chunk that failed to load throws while rendering.
      if (mockCanvas.throws) throw new Error("ChunkLoadError");
      mockCanvas.props.push(props);
      React.useEffect(() => {
        if (mockCanvas.fail) props.onFail?.();
        else props.onReady?.();
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);
      return React.createElement("canvas", {
        "data-testid": "island-canvas",
        "data-phase": props.phase,
        "data-still": String(Boolean(props.still)),
        "data-paused": String(Boolean(props.paused)),
      });
    },
  };
});

// next/dynamic resolves on a later tick; hand back the (mocked) canvas at once so timings stay exact.
jest.mock("next/dynamic", () => ({
  __esModule: true,
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  default: () => require("@/components/shift/island/live/IslandCanvas").default,
}));

function renderLauncher(props: Partial<StoryLauncherProps> = {}) {
  return render(<StoryLauncher demoDay={null} cta="island" {...props} />);
}

const panel = (n: number) => screen.getByRole("group", { name: `ภาพ ${n} จาก 4` });
const book = () => screen.getByRole("button", { name: "ดูเรื่องเล่าของเกาะอีกครั้ง" });
const tick = (ms: number) => act(() => void jest.advanceTimersByTime(ms));
/** Auto-advance to the last panel, one hold at a time (each panel sets its own timer after it renders). */
const toLast = () => [1, 2, 3].forEach(() => tick(PANEL_MS));
/** Radix hands focus back on the next tick after the dialog unmounts. */
const settle = () => act(() => void jest.runOnlyPendingTimers());

function mockReducedMotion(reduce: boolean) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: jest.fn((query: string) => ({
      matches: reduce && query.includes("prefers-reduced-motion"),
      media: query,
      onchange: null,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      addListener: jest.fn(),
      removeListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
}

beforeEach(() => {
  jest.useFakeTimers();
  window.localStorage.clear();
  mockCanvas.props = [];
  mockCanvas.fail = false;
  mockCanvas.throws = false;
});

afterEach(() => {
  jest.useRealTimers();
  // jsdom has no matchMedia of its own: put it back to missing.
  delete (window as { matchMedia?: unknown }).matchMedia;
});

describe("StoryLauncher", () => {
  it("renders the 44px pixel book button", () => {
    window.localStorage.setItem(STORY_SEEN_KEY, "seen");
    renderLauncher();
    expect(book()).toHaveAttribute("type", "button");
    expect(book().querySelector("svg")).not.toBeNull();
  });

  it("opens by itself on the first visit, and not again after skip", () => {
    const { unmount } = renderLauncher();
    expect(screen.getByRole("dialog", { name: "เรื่องเล่าของเกาะ" })).toBeInTheDocument();
    // Focus lands on the dialog itself, so a story that opened by itself shows no ring on "ข้าม".
    expect(screen.getByRole("dialog")).toHaveFocus();
    expect(panel(1)).toBeInTheDocument();
    expect(screen.getByText("เจอกันบนเกาะแล้ว ที่ดินยังว่าง รอโปรเจกต์ที่คุณถือมา")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "ข้าม" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(window.localStorage.getItem(STORY_SEEN_KEY)).toBe("seen");
    settle();
    expect(book()).toHaveFocus();

    unmount();
    renderLauncher();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("stays closed once seen; the book re-opens it from panel 1", () => {
    window.localStorage.setItem(STORY_SEEN_KEY, "seen");
    renderLauncher();
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(book());
    expect(screen.getByRole("dialog", { name: "เรื่องเล่าของเกาะ" })).toBeInTheDocument();
    fireEvent.click(panel(1));
    expect(panel(2)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "ข้าม" }));
    settle();
    fireEvent.click(book());
    expect(panel(1)).toBeInTheDocument();
  });

  it("tells the page when the story opens and closes", () => {
    window.localStorage.setItem(STORY_SEEN_KEY, "seen");
    const onOpenChange = jest.fn();
    renderLauncher({ onOpenChange });
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
    fireEvent.click(book());
    expect(onOpenChange).toHaveBeenLastCalledWith(true);
    fireEvent.click(screen.getByRole("button", { name: "ข้าม" }));
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });

  it("reports the story that opens by itself on a first visit", () => {
    const onOpenChange = jest.fn();
    renderLauncher({ onOpenChange });
    expect(onOpenChange).toHaveBeenLastCalledWith(true);
  });

  it("does not reopen at once when storage throws (private mode)", () => {
    const getItem = jest.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("denied");
    });
    const setItem = jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("denied");
    });
    try {
      renderLauncher();
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "ข้าม" }));
      expect(screen.queryByRole("dialog")).toBeNull();
    } finally {
      getItem.mockRestore();
      setItem.mockRestore();
    }
  });

  it("holds each panel 3.6 s, cuts to the next and waits on the last one", () => {
    renderLauncher({ demoDay: "2026-11-28" });
    tick(PANEL_MS - 1);
    expect(panel(1)).toBeInTheDocument();
    tick(1);
    expect(panel(2)).toBeInTheDocument();
    expect(screen.getByText("ลงแปลงแล้ว โปรเจกต์ได้โตต่อ หลังวันที่ 7 ของ SHIFT")).toBeInTheDocument();
    tick(PANEL_MS);
    expect(screen.getByText("ต้นไม้โตทีละขั้น เมื่อพี่เลี้ยงเห็นงานที่ทำจริง")).toBeInTheDocument();
    tick(PANEL_MS);
    expect(panel(4)).toBeInTheDocument();
    expect(screen.getByText(/^28 พ\.ย\. เทศกาล Demo Day ทั้งเกาะโชว์งาน และต้นไม้ทุกต้นยังอยู่ต่อ$/)).toBeInTheDocument();

    tick(60_000);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(panel(4)).toBeInTheDocument();
  });

  it("goes to the next panel on a tap and restarts its time", () => {
    renderLauncher();
    tick(3000);
    fireEvent.click(panel(1));
    expect(panel(2)).toBeInTheDocument();
    tick(3000);
    expect(panel(2)).toBeInTheDocument();
    tick(PANEL_MS - 3000);
    expect(panel(3)).toBeInTheDocument();
    fireEvent.click(panel(3));
    fireEvent.click(panel(4));
    expect(panel(4)).toBeInTheDocument();
  });

  it("goes to the next panel with the right arrow key from where focus starts, and back with the left", () => {
    renderLauncher();
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveFocus();
    fireEvent.keyDown(dialog, { key: "ArrowRight" });
    expect(panel(2)).toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole("button", { name: "ข้าม" }), { key: "ArrowRight" });
    expect(panel(3)).toBeInTheDocument();
    fireEvent.keyDown(dialog, { key: "ArrowLeft" });
    expect(panel(2)).toBeInTheDocument();
  });

  it("closes on Escape and remembers it", () => {
    renderLauncher();
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(window.localStorage.getItem(STORY_SEEN_KEY)).toBe("seen");
  });

  it("under reduced motion: still frames, no auto-advance, and a next button", () => {
    mockReducedMotion(true);
    renderLauncher();
    tick(60_000);
    expect(panel(1)).toBeInTheDocument();
    const current = screen.getAllByTestId("island-canvas").find((c) => c.dataset.paused === "false");
    expect(current?.dataset.still).toBe("true");

    fireEvent.click(screen.getByRole("button", { name: "ต่อไป" }));
    expect(panel(2)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "ต่อไป" }));
    fireEvent.click(screen.getByRole("button", { name: "ต่อไป" }));
    expect(panel(4)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "ต่อไป" })).toBeNull();
    expect(screen.getByRole("button", { name: "ไปที่เกาะ" })).toBeInTheDocument();
  });

  it("shows no next button when motion is allowed", () => {
    mockReducedMotion(false);
    renderLauncher();
    expect(screen.queryByRole("button", { name: "ต่อไป" })).toBeNull();
    const current = screen.getAllByTestId("island-canvas").find((c) => c.dataset.paused === "false");
    expect(current?.dataset.still).toBe("false");
  });

  it("shows the undated festival line without a Demo Day", () => {
    renderLauncher({ demoDay: null });
    toLast();
    expect(screen.getByText("คืนเทศกาล Demo Day ทั้งเกาะโชว์งาน และต้นไม้ทุกต้นยังอยู่ต่อ")).toBeInTheDocument();
  });

  it("draws the panel on screen and the next one ahead, paused, with each panel's phase", () => {
    renderLauncher();
    const canvases = screen.getAllByTestId("island-canvas");
    expect(canvases.map((c) => [c.dataset.phase, c.dataset.paused])).toEqual([
      ["dawn", "false"],
      ["day", "true"],
    ]);
    toLast();
    expect(screen.getAllByTestId("island-canvas").map((c) => [c.dataset.phase, c.dataset.paused])).toEqual([["night", "false"]]);

    const night = mockCanvas.props.filter((p) => p.phase === "night").at(-1)!;
    expect(night.scene.banner).not.toBeNull();
    expect(night.scene.trees).toHaveLength(8);
    expect(night.crop).toBeDefined();
    const day = mockCanvas.props.find((p) => p.phase === "day")!;
    expect(day.actors?.length).toBeGreaterThan(0);
  });

  it("shows the matching tree on the sky when the canvas cannot draw", () => {
    mockCanvas.fail = true;
    renderLauncher();
    expect(screen.queryAllByTestId("island-canvas")).toHaveLength(0);
    expect(panel(1).querySelector('[data-phase="dawn"] svg')).not.toBeNull();
    fireEvent.click(panel(1));
    expect(panel(2).querySelector('[data-phase="day"] svg')).not.toBeNull();
  });

  it("shows the tree, not a crashed page, when the canvas code fails to load", () => {
    mockCanvas.throws = true;
    const error = jest.spyOn(console, "error").mockImplementation(() => {});
    renderLauncher();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(panel(1).querySelector('[data-phase="dawn"] svg')).not.toBeNull();
    error.mockRestore();
  });

  it.each([
    ["start", "ไปที่เกาะ"],
    ["claim", "จับจองที่ดิน"],
    ["island", "ไปที่เกาะ"],
  ] as const)("cta %s: the last panel's button says %s, closes and then calls onCta", (cta, label) => {
    const onCta = jest.fn();
    renderLauncher({ cta, onCta });
    expect(screen.queryByRole("button", { name: label })).toBeNull();
    toLast();
    fireEvent.click(screen.getByRole("button", { name: label }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(window.localStorage.getItem(STORY_SEEN_KEY)).toBe("seen");
    settle();
    expect(onCta).toHaveBeenCalledTimes(1);
  });

  it("returns focus to the book after the CTA when there is no onCta", () => {
    renderLauncher({ cta: "island" });
    toLast();
    fireEvent.click(screen.getByRole("button", { name: "ไปที่เกาะ" }));
    settle();
    expect(book()).toHaveFocus();
  });
});
