import { act, fireEvent, render, screen } from "@testing-library/react";

import { buildScene } from "@/bot/src/quests/island/scene";
import type { IslandCanvasProps } from "@/components/shift/island/live/IslandCanvas";
import { waterColor } from "@/lib/shift-island/live/lighting";
import { plazaWorld, type PlazaInput, type PlazaSpotId } from "@/lib/shift-island/live/plaza";
import type { IslandPicture } from "@/lib/shift-island/picture";

import { IslandViewport } from "../IslandViewport";

/** The living island, mocked: jsdom has no canvas. "idle" never draws, "ready" draws at night, "fail" has no 2D context. */
const mockLive: { mode: "idle" | "ready" | "fail"; props: IslandCanvasProps[] } = { mode: "idle", props: [] };

jest.mock("../live/IslandLive", () => {
  const { useEffect } = jest.requireActual<typeof import("react")>("react");
  return {
    IslandLive: function MockIslandLive(props: IslandCanvasProps) {
      mockLive.props.push(props);
      useEffect(() => {
        if (mockLive.mode === "ready") {
          props.onPhase?.("night", waterColor("night"));
          props.onReady?.();
        }
        if (mockLive.mode === "fail") props.onFail?.();
        // Once per mount, like the real canvas.
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);
      return <canvas data-testid="live-island" aria-hidden="true" />;
    },
  };
});

beforeEach(() => {
  mockLive.mode = "idle";
  mockLive.props = [];
});

const picture: IslandPicture = {
  src: "/api/shift/island/map?v=abcdef123456",
  width: 480,
  height: 288,
  hotspots: [
    { slot: 3, mine: true, plain: false, stage: 2, name: null, x: 50, y: 40, w: 6, h: 10 },
    { slot: 4, mine: false, plain: false, stage: 5, name: "สวนผักดาดฟ้า", x: 20, y: 30, w: 6, h: 10 },
    { slot: 9, mine: false, plain: true, stage: 0, name: null, x: 70, y: 60, w: 6, h: 10 },
  ],
  mine: null,
  festival: false,
  scene: null,
};
picture.mine = picture.hotspots[0];

const plot = (slot: number, stage: number) => ({ slot, stage, visitor: false, key: false, helper: false, lantern: false, name: null, mine: slot === 3 });
const live: IslandPicture = { ...picture, scene: buildScene([plot(3, 2), plot(4, 5), plot(9, 0)], { markMine: true }) };

describe("IslandViewport", () => {
  it("shows the PNG at an integer 2x with one button per plot", () => {
    render(<IslandViewport picture={picture} onPlot={jest.fn()} />);
    const image = screen.getByRole("img");
    expect(image).toHaveAttribute("width", "960");
    expect(image).toHaveAttribute("height", "576");
    expect(screen.getByRole("button", { name: "แปลงของคุณ #3, ต้นกล้า" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "แปลง #4" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "แปลง #9" })).toBeInTheDocument();
  });

  it("names only the slot on other plots, whatever the database sent", () => {
    render(<IslandViewport picture={picture} onPlot={jest.fn()} />);
    expect(screen.queryByRole("button", { name: /สวนผักดาดฟ้า/ })).toBeNull();
  });

  it("hands the tapped plot up", () => {
    const onPlot = jest.fn();
    render(<IslandViewport picture={picture} onPlot={onPlot} />);
    fireEvent.click(screen.getByRole("button", { name: "แปลง #4" }));
    expect(onPlot).toHaveBeenCalledWith(picture.hotspots[1]);
  });

  it("shows the whole island on request and goes back to the close view", () => {
    const { container, rerender } = render(<IslandViewport picture={live} onPlot={jest.fn()} />);
    const world = container.firstElementChild as HTMLElement;
    expect(world).not.toHaveAttribute("data-whole");
    rerender(<IslandViewport picture={live} onPlot={jest.fn()} whole />);
    expect(world).toHaveAttribute("data-whole", "true");
    expect(mockLive.props.at(-1)?.fit).toBe(true);
    rerender(<IslandViewport picture={live} onPlot={jest.fn()} />);
    expect(mockLive.props.at(-1)?.fit).toBe(false);
  });

  it("says the work is safe when there is no picture", () => {
    render(<IslandViewport picture={null} />);
    expect(screen.getByRole("status")).toHaveTextContent("ตอนนี้วาดภาพเกาะไม่ได้ งานของคุณยังอยู่ครบ");
    expect(screen.queryByRole("img")).toBeNull();
  });

  it("falls back to the same line when the image fails to load", () => {
    render(<IslandViewport picture={picture} />);
    fireEvent.error(screen.getByRole("img"));
    expect(screen.getByRole("status")).toHaveTextContent("ตอนนี้วาดภาพเกาะไม่ได้");
  });

  it("shows the island again with the next picture after a failed load", () => {
    const { rerender } = render(<IslandViewport picture={picture} />);
    fireEvent.error(screen.getByRole("img"));
    expect(screen.queryByRole("img")).toBeNull();
    rerender(<IslandViewport picture={{ ...picture, src: "/api/shift/island/map?v=fedcba654321" }} />);
    expect(screen.getByRole("img")).toHaveAttribute("src", "/api/shift/island/map?v=fedcba654321");
  });

  it("retries a failed load with a fresh URL", () => {
    render(<IslandViewport picture={picture} />);
    fireEvent.error(screen.getByRole("img"));
    fireEvent.click(screen.getByRole("button", { name: "ลองอีกครั้ง" }));
    expect(screen.getByRole("img")).toHaveAttribute("src", `${picture.src}&r=1`);
  });

  it("drops the 48px tap floor when the whole island is shown, so plots do not overlap", () => {
    const { rerender } = render(<IslandViewport picture={picture} onPlot={jest.fn()} />);
    const plot = screen.getByRole("button", { name: "แปลง #4" });
    expect(plot.style.width).toBe("max(48px, 6%)");
    rerender(<IslandViewport picture={picture} onPlot={jest.fn()} whole />);
    expect(plot.style.width).toBe("6%");
  });

  it("keeps the PNG as the first paint while the living island loads", () => {
    render(<IslandViewport picture={live} onPlot={jest.fn()} />);
    const image = screen.getByRole("img");
    expect(image.tagName).toBe("IMG");
    expect(image).toHaveAttribute("width", "960");
    expect(image).toBeVisible();
    expect(mockLive.props.at(-1)).toMatchObject({ scene: live.scene, paused: false, fit: false });
  });

  it("swaps the PNG for the living island once its first frame is drawn, keeping the picture's name", () => {
    mockLive.mode = "ready";
    const { container } = render(<IslandViewport picture={live} onPlot={jest.fn()} />);
    const named = screen.getByRole("img", { name: "ภาพเกาะ SHIFT ที่มีต้นไม้ของแต่ละโปรเจกต์" });
    expect(named.tagName).toBe("SPAN");
    expect(container.querySelector("img")).toHaveStyle({ visibility: "hidden" });
    // Plots still answer taps above the canvas.
    expect(screen.getByRole("button", { name: "แปลง #4" })).toBeInTheDocument();
    // The sea around the picture takes the light of the hour.
    const viewport = container.firstElementChild as HTMLElement;
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(waterColor("night").slice(i, i + 2), 16));
    expect(viewport.style.background).toBe(`rgb(${r}, ${g}, ${b})`);
    expect(viewport).toHaveAttribute("data-live", "true");
  });

  it("keeps the PNG when the canvas has no 2D context", () => {
    mockLive.mode = "fail";
    render(<IslandViewport picture={live} onPlot={jest.fn()} />);
    const image = screen.getByRole("img");
    expect(image.tagName).toBe("IMG");
    expect(image).toBeVisible();
    expect(screen.queryByTestId("live-island")).toBeNull();
  });

  it("does not draw a living island without a scene", () => {
    mockLive.mode = "ready";
    render(<IslandViewport picture={picture} onPlot={jest.fn()} />);
    expect(screen.queryByTestId("live-island")).toBeNull();
    expect(screen.getByRole("img").tagName).toBe("IMG");
  });

  it("pauses the living island while a sheet is open", () => {
    const { rerender } = render(<IslandViewport picture={live} paused onPlot={jest.fn()} />);
    expect(mockLive.props.at(-1)?.paused).toBe(true);
    rerender(<IslandViewport picture={live} paused={false} onPlot={jest.fn()} />);
    expect(mockLive.props.at(-1)?.paused).toBe(false);
  });

  it("lights the whole screen with the hour once the living island draws", () => {
    mockLive.mode = "ready";
    const { container } = render(<IslandViewport picture={live} onPlot={jest.fn()} />);
    expect(container.querySelector("[data-phase]")).toHaveAttribute("data-phase", "night");
  });

  describe("on a measured screen", () => {
    const sizes = { clientWidth: 360, clientHeight: 740 };
    const saved: Partial<Record<keyof typeof sizes, PropertyDescriptor | undefined>> = {};
    beforeAll(() => {
      for (const [key, value] of Object.entries(sizes) as [keyof typeof sizes, number][]) {
        saved[key] = Object.getOwnPropertyDescriptor(HTMLElement.prototype, key);
        Object.defineProperty(HTMLElement.prototype, key, { configurable: true, get: () => value });
      }
    });
    afterAll(() => {
      for (const key of Object.keys(sizes) as (keyof typeof sizes)[]) {
        const descriptor = saved[key];
        if (descriptor) Object.defineProperty(HTMLElement.prototype, key, descriptor);
        else delete (HTMLElement.prototype as unknown as Record<string, unknown>)[key];
      }
    });

    it("fills the screen: a world at least as big as it, the island at 2x with sea around", () => {
      const { container } = render(<IslandViewport picture={live} onPlot={jest.fn()} />);
      const sizer = container.querySelector("[data-measured]") as HTMLElement;
      expect(sizer).toHaveAttribute("data-measured", "true");
      // 960 px of island plus a 12 px strip of sea each side; the screen's full height.
      expect(sizer.style.width).toBe("984px");
      expect(sizer.style.height).toBe("740px");
      expect(screen.getByRole("img")).toHaveAttribute("width", "960");
      // The canvas draws past the picture: open sea on every side, in whole native pixels.
      const crop = mockLive.props.at(-1)?.crop;
      expect(crop).toBeDefined();
      expect(crop!.x).toBeLessThan(0);
      expect(crop!.y).toBeLessThan(0);
      expect(crop!.w).toBeGreaterThan(live.width);
      expect(crop!.h).toBeGreaterThan(live.height);
      // Plots stay on the picture's own box.
      const plot = screen.getByRole("button", { name: "แปลง #4" });
      expect((plot.parentElement!.parentElement as HTMLElement).style.width).toBe("960px");
    });

    it("hands the living island the world that scrolls it", () => {
      const { container } = render(<IslandViewport picture={live} onPlot={jest.fn()} />);
      expect(mockLive.props.at(-1)?.scroller?.current).toBe(container.firstElementChild);
    });
  });

  it("ignores a failed PNG while the living island draws the picture", () => {
    mockLive.mode = "ready";
    render(<IslandViewport picture={live} onPlot={jest.fn()} />);
    fireEvent.error(document.querySelector("img")!);
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.getByTestId("live-island")).toBeInTheDocument();
  });

  it("sizes the picture so each native pixel covers whole device pixels", () => {
    const dpr = window.devicePixelRatio;
    try {
      Object.defineProperty(window, "devicePixelRatio", { configurable: true, value: 1.25 });
      render(<IslandViewport picture={picture} onPlot={jest.fn()} />);
      // 2.4 CSS px (3 device px) per native pixel.
      expect(screen.getByRole("img")).toHaveAttribute("width", "1152");
    } finally {
      Object.defineProperty(window, "devicePixelRatio", { configurable: true, value: dpr });
    }
  });

  it("hints that the trees can be chosen, only when they can", () => {
    const { rerender } = render(<IslandViewport picture={picture} onPlot={jest.fn()} />);
    expect(screen.getByText("เลือกต้นไม้เพื่อดูแปลง")).toBeInTheDocument();
    rerender(<IslandViewport picture={picture} interactive={false} />);
    expect(screen.queryByText("เลือกต้นไม้เพื่อดูแปลง")).toBeNull();
  });

  it("takes the hint away after a while, with or without motion, and after the first plot", () => {
    jest.useFakeTimers();
    try {
      const first = render(<IslandViewport picture={picture} onPlot={jest.fn()} />);
      expect(screen.getByText("เลือกต้นไม้เพื่อดูแปลง")).toBeInTheDocument();
      act(() => void jest.advanceTimersByTime(7000));
      expect(screen.queryByText("เลือกต้นไม้เพื่อดูแปลง")).toBeNull();
      first.unmount();

      render(<IslandViewport picture={picture} onPlot={jest.fn()} />);
      fireEvent.click(screen.getByRole("button", { name: "แปลง #4" }));
      expect(screen.queryByText("เลือกต้นไม้เพื่อดูแปลง")).toBeNull();
    } finally {
      jest.useRealTimers();
    }
  });

  it("gives the plots one tab stop, on the student's own plot, and moves with the arrow keys", () => {
    render(<IslandViewport picture={picture} onPlot={jest.fn()} />);
    const group = screen.getByRole("group", { name: "แปลงบนเกาะ" });
    const mine = screen.getByRole("button", { name: "แปลงของคุณ #3, ต้นกล้า" });
    const four = screen.getByRole("button", { name: "แปลง #4" });
    const nine = screen.getByRole("button", { name: "แปลง #9" });
    expect(group).toContainElement(mine);
    expect([mine, four, nine].map((b) => b.tabIndex)).toEqual([0, -1, -1]);
    mine.focus();
    fireEvent.keyDown(mine, { key: "ArrowRight" });
    expect(four).toHaveFocus();
    expect([mine, four, nine].map((b) => b.tabIndex)).toEqual([-1, 0, -1]);
    fireEvent.keyDown(four, { key: "End" });
    expect(nine).toHaveFocus();
    fireEvent.keyDown(nine, { key: "ArrowRight" });
    expect(nine).toHaveFocus();
    fireEvent.keyDown(nine, { key: "Home" });
    expect(mine).toHaveFocus();
  });

  it("is in the server's light from the first paint, before the living island draws", () => {
    const { container } = render(<IslandViewport picture={live} onPlot={jest.fn()} initialPhase="night" />);
    const world = container.firstElementChild as HTMLElement;
    const [r, g, b] = waterColor("night").match(/[0-9a-f]{2}/gi)!.map((h) => parseInt(h, 16));
    expect(world.style.background).toBe(`rgb(${r}, ${g}, ${b})`);
    expect(container.querySelector("[data-phase]")).toHaveAttribute("data-phase", "night");
    // The daytime PNG takes the night's multiply until the canvas has drawn.
    expect(container.querySelector(".tint")).not.toBeNull();
  });

  it("puts no tint over the PNG by day", () => {
    const { container } = render(<IslandViewport picture={live} onPlot={jest.fn()} initialPhase="day" />);
    expect(container.querySelector(".tint")).toBeNull();
  });

  describe("plaza", () => {
    const input: PlazaInput = {
      festival: {
        demoDay: "2026-11-28",
        daysToDemo: 17,
        stageStep: 1,
        tableBar: 2,
        stageBar: 3,
        lanterns: { total: 8, lit: 3, reached: false, count: 4, target: 12 },
        booths: [{ slot: 4, kind: "table" }],
      },
      pins: ["active", "main"],
      campfire: { count: 11 },
    };
    const labels = { sign: "Demo Day 28 พ.ย.\nอีก 17 วัน", campfireCount: "11 คนกำลังทำงานอยู่", campfireMore: "+3" };
    const names = { notice: "กระดานเควสต์: ตั้งชื่อปัญหา", stage: "Demo Day 28 พ.ย. อีก 17 วัน", campfire: "ห้อง coworking, 11 คน" };
    const plaza = (onSpot?: (id: PlazaSpotId) => void) => ({ input, labels, names, onSpot });

    it("hands the living island the plaza's sprites, and the same empty list without a plaza", () => {
      const { rerender } = render(<IslandViewport picture={live} onPlot={jest.fn()} />);
      const empty = mockLive.props.at(-1)?.actors;
      expect(empty).toEqual([]);
      rerender(<IslandViewport picture={live} onPlot={jest.fn()} paused />);
      // The same array, so the engine never sees a change.
      expect(mockLive.props.at(-1)?.actors).toBe(empty);
      rerender(<IslandViewport picture={live} onPlot={jest.fn()} plaza={plaza(jest.fn())} />);
      expect(mockLive.props.at(-1)?.actors).toEqual(plazaWorld(live.scene!, input).actors);
    });

    it("keeps the sprites while the input stays the same, even as a new object", () => {
      const { rerender } = render(<IslandViewport picture={live} onPlot={jest.fn()} plaza={plaza(jest.fn())} />);
      const first = mockLive.props.at(-1)?.actors;
      rerender(<IslandViewport picture={live} onPlot={jest.fn()} plaza={{ ...plaza(jest.fn()), input: JSON.parse(JSON.stringify(input)) }} />);
      expect(mockLive.props.at(-1)?.actors).toBe(first);
      rerender(<IslandViewport picture={live} onPlot={jest.fn()} plaza={{ ...plaza(jest.fn()), input: { ...input, campfire: { count: 2 } } }} />);
      expect(mockLive.props.at(-1)?.actors).not.toBe(first);
    });

    it("draws nothing for the plaza without a scene, or when the canvas cannot draw", () => {
      const { unmount } = render(<IslandViewport picture={picture} onPlot={jest.fn()} plaza={plaza(jest.fn())} />);
      expect(screen.queryByRole("group", { name: "ลานกลางเกาะ" })).toBeNull();
      unmount();
      // The PNG has no notice board or campfire: no tap targets over it.
      mockLive.mode = "fail";
      render(<IslandViewport picture={live} onPlot={jest.fn()} plaza={plaza(jest.fn())} />);
      expect(screen.queryByRole("group", { name: "ลานกลางเกาะ" })).toBeNull();
      expect(screen.getByRole("button", { name: "แปลง #4" })).toBeInTheDocument();
    });

    it("puts a named button on each plaza spot, at its place on the picture, apart from the plots", () => {
      const onSpot = jest.fn();
      render(<IslandViewport picture={live} onPlot={jest.fn()} plaza={plaza(onSpot)} />);
      const group = screen.getByRole("group", { name: "ลานกลางเกาะ" });
      const spots = plazaWorld(live.scene!, input).spots;
      for (const spot of spots) {
        const button = screen.getByRole("button", { name: names[spot.id] });
        expect(group).toContainElement(button);
        expect(screen.getByRole("group", { name: "แปลงบนเกาะ" })).not.toContainElement(button);
        expect(button.style.left).toMatch(/^\d+(\.\d+)?%$/);
        expect(parseFloat(button.style.left)).toBeCloseTo(spot.x + spot.w / 2, 3);
        expect(parseFloat(button.style.top)).toBeCloseTo(spot.y + spot.h / 2, 3);
        expect(button.style.width).toBe(`max(48px, ${spot.w}%)`);
        // A plain tab stop: outside the plots' arrow keys.
        expect(button.tabIndex).toBe(0);
      }
      fireEvent.click(screen.getByRole("button", { name: names.notice }));
      fireEvent.click(screen.getByRole("button", { name: names.campfire }));
      expect(onSpot.mock.calls).toEqual([["notice"], ["campfire"]]);
    });

    it("uses the exact boxes on the whole island, and skips spots without a name", () => {
      render(<IslandViewport picture={live} onPlot={jest.fn()} whole plaza={{ ...plaza(jest.fn()), names: { stage: names.stage } }} />);
      const stage = screen.getByRole("button", { name: names.stage });
      const spot = plazaWorld(live.scene!, input).spots.find((s) => s.id === "stage")!;
      expect(stage.style.width).toBe(`${spot.w}%`);
      expect(screen.queryByRole("button", { name: names.notice })).toBeNull();
      expect(screen.queryByRole("button", { name: names.campfire })).toBeNull();
    });

    it("has no plaza buttons when the island only shows the place, or nobody listens", () => {
      const { rerender } = render(<IslandViewport picture={live} interactive={false} plaza={plaza(jest.fn())} />);
      expect(screen.queryByRole("group", { name: "ลานกลางเกาะ" })).toBeNull();
      expect(screen.queryByRole("button", { name: names.notice })).toBeNull();
      rerender(<IslandViewport picture={live} onPlot={jest.fn()} plaza={plaza()} />);
      expect(screen.queryByRole("group", { name: "ลานกลางเกาะ" })).toBeNull();
    });

    it("shows no labels before the living island draws (the PNG has no plaza)", () => {
      const { container } = render(<IslandViewport picture={live} onPlot={jest.fn()} plaza={plaza(jest.fn())} />);
      expect(container.querySelector("[data-label]")).toBeNull();
      expect(screen.queryByText("+3")).toBeNull();
    });

    it("labels the sign and the campfire over the living island, hidden from assistive tech", () => {
      mockLive.mode = "ready";
      const { container, rerender } = render(<IslandViewport picture={live} onPlot={jest.fn()} plaza={plaza(jest.fn())} />);
      const shown = [...container.querySelectorAll<HTMLElement>("[data-label]")];
      expect(shown.map((el) => [el.dataset.label, el.dataset.anchor, el.textContent])).toEqual([
        ["sign", "bottom", labels.sign],
        ["campfireCount", "bottom", labels.campfireCount],
        ["campfireMore", "left", labels.campfireMore],
      ]);
      const points = plazaWorld(live.scene!, input).labels;
      shown.forEach((el, i) => {
        expect(el.style.left).toBe(`${points[i].x}%`);
        expect(el.style.top).toBe(`${points[i].y}%`);
        expect(el.closest("[aria-hidden='true']")).not.toBeNull();
      });
      rerender(<IslandViewport picture={live} onPlot={jest.fn()} plaza={plaza(jest.fn())} whole />);
      expect(container.querySelector("[data-label]")).toBeNull();
    });

    describe("the notice board on screen", () => {
      let observers: { callback: IntersectionObserverCallback; options?: IntersectionObserverInit; targets: Element[]; live: boolean }[];
      beforeEach(() => {
        observers = [];
        (globalThis as { IntersectionObserver?: unknown }).IntersectionObserver = class {
          targets: Element[] = [];
          live = true;
          constructor(
            readonly callback: IntersectionObserverCallback,
            readonly options?: IntersectionObserverInit
          ) {
            observers.push(this);
          }
          observe(target: Element) {
            this.targets.push(target);
          }
          disconnect() {
            this.live = false;
          }
          unobserve() {}
          takeRecords() {
            return [];
          }
        };
      });
      afterEach(() => {
        delete (globalThis as { IntersectionObserver?: unknown }).IntersectionObserver;
      });
      const noticeObserver = () => observers.find((o) => o.live && o.targets.some((t) => t.getAttribute("data-spot") === "notice"));
      const see = (ratio: number) =>
        act(() => {
          const o = noticeObserver()!;
          o.callback([{ isIntersecting: ratio > 0, intersectionRatio: ratio } as IntersectionObserverEntry], o as unknown as IntersectionObserver);
        });

      it("reports the notice board only while enough of it is between the HUD bars", () => {
        mockLive.mode = "ready";
        const onNoticeVisible = jest.fn();
        const { container } = render(<IslandViewport picture={live} onPlot={jest.fn()} plaza={plaza(jest.fn())} onNoticeVisible={onNoticeVisible} />);
        const o = noticeObserver();
        expect(o).toBeDefined();
        expect(o?.options?.root).toBe(container.querySelector("[data-live='true']"));
        expect(o?.options?.rootMargin).toBe("-64px 0px -96px 0px");
        see(1);
        expect(onNoticeVisible).toHaveBeenLastCalledWith(true);
        // The plot centred far from the plaza: the board is off screen, or only a sliver shows.
        see(0);
        expect(onNoticeVisible).toHaveBeenLastCalledWith(false);
        see(0.2);
        expect(onNoticeVisible).toHaveBeenLastCalledWith(false);
      });

      it("never reports it on the whole island, before the canvas draws, or without a notice board", () => {
        const onNoticeVisible = jest.fn();
        const idle = render(<IslandViewport picture={live} onPlot={jest.fn()} plaza={plaza(jest.fn())} onNoticeVisible={onNoticeVisible} />);
        expect(noticeObserver()).toBeUndefined();
        expect(onNoticeVisible).not.toHaveBeenCalledWith(true);
        idle.unmount();

        mockLive.mode = "ready";
        const { rerender } = render(<IslandViewport picture={live} onPlot={jest.fn()} plaza={plaza(jest.fn())} onNoticeVisible={onNoticeVisible} />);
        see(1);
        expect(onNoticeVisible).toHaveBeenLastCalledWith(true);
        rerender(<IslandViewport picture={live} onPlot={jest.fn()} plaza={plaza(jest.fn())} onNoticeVisible={onNoticeVisible} whole />);
        expect(onNoticeVisible).toHaveBeenLastCalledWith(false);
        expect(noticeObserver()).toBeUndefined();
        rerender(
          <IslandViewport
            picture={live}
            onPlot={jest.fn()}
            plaza={{ ...plaza(jest.fn()), names: { stage: names.stage } }}
            onNoticeVisible={onNoticeVisible}
          />
        );
        expect(noticeObserver()).toBeUndefined();
      });
    });

    it("tells the app when the living island becomes the picture, and when it stops", () => {
      const onLiveChange = jest.fn();
      const idle = render(<IslandViewport picture={live} onPlot={jest.fn()} onLiveChange={onLiveChange} />);
      expect(onLiveChange.mock.calls).toEqual([[false]]);
      idle.unmount();

      onLiveChange.mockClear();
      mockLive.mode = "ready";
      const { rerender, unmount } = render(<IslandViewport picture={live} onPlot={jest.fn()} onLiveChange={onLiveChange} />);
      expect(onLiveChange).toHaveBeenLastCalledWith(true);
      // The scene goes away: the PNG is the picture again.
      rerender(<IslandViewport picture={picture} onPlot={jest.fn()} onLiveChange={onLiveChange} />);
      expect(onLiveChange).toHaveBeenLastCalledWith(false);
      onLiveChange.mockClear();
      rerender(<IslandViewport picture={live} onPlot={jest.fn()} onLiveChange={onLiveChange} />);
      expect(onLiveChange).toHaveBeenLastCalledWith(true);
      unmount();
      expect(onLiveChange).toHaveBeenLastCalledWith(false);
    });
  });
});
