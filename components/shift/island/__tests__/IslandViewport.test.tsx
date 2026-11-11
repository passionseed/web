import { fireEvent, render, screen } from "@testing-library/react";

import { buildScene } from "@/bot/src/quests/island/scene";
import type { IslandCanvasProps } from "@/components/shift/island/live/IslandCanvas";
import { waterColor } from "@/lib/shift-island/live/lighting";
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

  it("hints that the trees can be tapped, only when they can", () => {
    const { rerender } = render(<IslandViewport picture={picture} onPlot={jest.fn()} />);
    expect(screen.getByText("แตะต้นไม้เพื่อดูแปลง")).toBeInTheDocument();
    rerender(<IslandViewport picture={picture} interactive={false} />);
    expect(screen.queryByText("แตะต้นไม้เพื่อดูแปลง")).toBeNull();
  });
});
