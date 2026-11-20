import { act, fireEvent, render, screen, within } from "@testing-library/react";

import { buildScene } from "@/bot/src/quests/island/scene";
import type { IslandCanvasProps } from "@/components/shift/island/live/IslandCanvas";
import { gradedWater } from "@/lib/shift-island/live/grade";
import { plazaWorld, type PlazaInput, type PlazaSpotId } from "@/lib/shift-island/live/plaza";
import { BOARD, boardInk, signpostFor } from "@/lib/shift-island/live/signposts";
import type { IslandPicture } from "@/lib/shift-island/picture";

import { ISLAND, PRE_STAGE, stageName } from "../copy";
import { IslandViewport, hotspotLabel } from "../IslandViewport";

/**
 * The living island, mocked: jsdom has no canvas. "idle" never draws, "ready" draws at night, "fail" has no 2D context.
 * `steer` records how the viewport steers the interact outline.
 */
const mockLive: {
  mode: "idle" | "ready" | "fail";
  props: IslandCanvasProps[];
  steer: { aim: jest.Mock; focus: jest.Mock };
} = { mode: "idle", props: [], steer: { aim: jest.fn(), focus: jest.fn() } };

jest.mock("../live/IslandLive", () => {
  const { useEffect } = jest.requireActual<typeof import("react")>("react");
  return {
    IslandLive: function MockIslandLive(props: IslandCanvasProps) {
      mockLive.props.push(props);
      useEffect(() => {
        const holder = props.interact;
        if (holder) holder.current = mockLive.steer;
        return () => {
          if (holder) holder.current = null;
        };
        // Once per mount, like the real canvas.
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);
      useEffect(() => {
        if (mockLive.mode === "ready") {
          props.onPhase?.("night", gradedWater("night"));
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
  mockLive.steer = { aim: jest.fn(), focus: jest.fn() };
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
    expect(screen.getByRole("button", { name: "แปลง #4, สวนผักดาดฟ้า" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "แปลง #9" })).toBeInTheDocument();
  });

  it("puts a sign with the project name under each named plot, and none on the rest", () => {
    render(<IslandViewport picture={picture} onPlot={jest.fn()} />);
    const signs = screen.getByTestId("plot-signs");
    expect(signs).toHaveAttribute("aria-hidden", "true");
    expect(signs.children).toHaveLength(1);
    const sign = within(signs).getByText("สวนผักดาดฟ้า");
    expect(sign).toHaveAttribute("data-slot", "4");
    // Centred under the plot's box: x + w / 2, y + h.
    expect(sign).toHaveStyle({ left: "23%", top: "40%" });
  });

  it("never signs a plain plot or a blank name, whatever the database sent", () => {
    const odd: IslandPicture = {
      ...picture,
      hotspots: [
        { ...picture.hotspots[1], slot: 5, name: "   " },
        { ...picture.hotspots[2], name: "ไม่ควรขึ้น" },
      ],
      mine: null,
    };
    render(<IslandViewport picture={odd} onPlot={jest.fn()} />);
    expect(screen.queryByTestId("plot-signs")).toBeNull();
    expect(screen.getByRole("button", { name: "แปลง #5" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "แปลง #9" })).toBeInTheDocument();
  });

  it("drops the signs on the whole island, where plots sit too close", () => {
    render(<IslandViewport picture={picture} onPlot={jest.fn()} whole />);
    expect(screen.queryByTestId("plot-signs")).toBeNull();
  });

  it("hangs each name from its plot's signpost once the living island draws, in the post's own wood", () => {
    mockLive.mode = "ready";
    render(<IslandViewport picture={live} onPlot={jest.fn()} />);
    // The canvas stands the posts and the ropes: only the named plot's carries a board.
    expect(mockLive.props.at(-1)?.signs).toEqual([4]);
    const signs = screen.getByTestId("plot-signs");
    expect(signs).toHaveAttribute("aria-hidden", "true");
    expect(signs).toHaveAttribute("data-hung", "true");
    const board = within(signs).getByText("สวนผักดาดฟ้า");
    expect(board).toHaveAttribute("data-slot", "4");
    // Under the ropes of plot 4's post, centred on it, in a strip as wide as the widest board.
    const scene = live.scene!;
    const post = signpostFor(scene.trees.find((t) => t.slot === 4)!, 1, true);
    const pct = (v: number, of: number) => `${(v / of) * 100}%`;
    expect(board.parentElement).toHaveStyle({
      left: pct(post.hang!.cx - BOARD.maxW / 2, scene.width),
      top: pct(post.hang!.y, scene.height),
      width: pct(BOARD.maxW, scene.width),
    });
    // Wood and paint of the hour (the mock draws at night), measured in the island's own pixels.
    const ink = boardInk("night");
    expect(signs.style.getPropertyValue("--sign-face")).toBe(ink.face);
    expect(signs.style.getPropertyValue("--sign-ink")).toBe(ink.ink);
    expect(signs.style.getPropertyValue("--sign-px")).toBe("2px");
    // The plot's name for screen readers is unchanged.
    expect(screen.getByRole("button", { name: "แปลง #4, สวนผักดาดฟ้า" })).toBeInTheDocument();
  });

  it("hangs no boards on the whole island, where the names do not show", () => {
    mockLive.mode = "ready";
    render(<IslandViewport picture={live} onPlot={jest.fn()} whole />);
    expect(mockLive.props.at(-1)?.signs).toEqual([]);
    expect(screen.queryByTestId("plot-signs")).toBeNull();
  });

  it("keeps the signs on the no-project island, which takes no taps", () => {
    render(<IslandViewport picture={picture} interactive={false} />);
    expect(within(screen.getByTestId("plot-signs")).getByText("สวนผักดาดฟ้า")).toBeInTheDocument();
  });

  it("hands the tapped plot up", () => {
    const onPlot = jest.fn();
    render(<IslandViewport picture={picture} onPlot={onPlot} />);
    fireEvent.click(screen.getByRole("button", { name: "แปลง #4, สวนผักดาดฟ้า" }));
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
    const plot = screen.getByRole("button", { name: "แปลง #4, สวนผักดาดฟ้า" });
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
    // The canvas fades in, and the PNG under it hides once that fade is over (world.module.css).
    expect(container.querySelector("img")).toHaveAttribute("data-hidden", "true");
    expect(container.querySelector("[data-ready]")).toHaveAttribute("data-ready", "true");
    // Plots still answer taps above the canvas.
    expect(screen.getByRole("button", { name: "แปลง #4, สวนผักดาดฟ้า" })).toBeInTheDocument();
    // The sea around the picture takes the light of the hour.
    const viewport = container.firstElementChild as HTMLElement;
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(gradedWater("night").slice(i, i + 2), 16));
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
      // 960 px of island plus a 12 px strip of sea each side; 576 px of island plus the HUD's
      // reserves (104 px for the chip and the coin pill, 96 px for the bottom bar), past the screen's 740.
      expect(sizer.style.width).toBe("984px");
      expect(sizer.style.height).toBe("776px");
      expect(screen.getByRole("img")).toHaveAttribute("width", "960");
      // The canvas draws past the picture: open sea on every side, in whole native pixels.
      const crop = mockLive.props.at(-1)?.crop;
      expect(crop).toBeDefined();
      expect(crop!.x).toBeLessThan(0);
      expect(crop!.y).toBeLessThan(0);
      expect(crop!.w).toBeGreaterThan(live.width);
      expect(crop!.h).toBeGreaterThan(live.height);
      // Plots stay on the picture's own box.
      const plot = screen.getByRole("button", { name: "แปลง #4, สวนผักดาดฟ้า" });
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
      fireEvent.click(screen.getByRole("button", { name: "แปลง #4, สวนผักดาดฟ้า" }));
      expect(screen.queryByText("เลือกต้นไม้เพื่อดูแปลง")).toBeNull();
    } finally {
      jest.useRealTimers();
    }
  });

  it("gives the plots one tab stop, on the student's own plot, and moves with the arrow keys", () => {
    render(<IslandViewport picture={picture} onPlot={jest.fn()} />);
    const group = screen.getByRole("group", { name: "แปลงบนเกาะ" });
    const mine = screen.getByRole("button", { name: "แปลงของคุณ #3, ต้นกล้า" });
    const four = screen.getByRole("button", { name: "แปลง #4, สวนผักดาดฟ้า" });
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
    const [r, g, b] = gradedWater("night").match(/[0-9a-f]{2}/gi)!.map((h) => parseInt(h, 16));
    expect(world.style.background).toBe(`rgb(${r}, ${g}, ${b})`);
    expect(container.querySelector("[data-phase]")).toHaveAttribute("data-phase", "night");
    // The daytime PNG takes the night's multiply until the canvas has drawn.
    expect(container.querySelector(".tint")).not.toBeNull();
  });

  it("puts no tint over the PNG by day", () => {
    const { container } = render(<IslandViewport picture={live} onPlot={jest.fn()} initialPhase="day" />);
    expect(container.querySelector(".tint")).toBeNull();
  });

  describe("the viewer's own marker", () => {
    const me = { name: "พลอย", avatarUrl: "https://cdn.discordapp.com/avatars/123456789012345678/0123456789abcdef0123456789abcdef.png?size=64" };

    it("puts the viewer's picture over their own pin, hidden from assistive tech and never a tap target", () => {
      render(<IslandViewport picture={live} onPlot={jest.fn()} me={me} />);
      const marker = screen.getByTestId("plot-marker");
      expect(marker).toHaveAttribute("aria-hidden", "true");
      expect(marker).toHaveAttribute("data-anchor", "pin");
      const pin = live.scene?.marker;
      expect(pin).toBeTruthy();
      expect(parseFloat(marker.style.left)).toBeCloseTo((pin!.x / live.width) * 100, 3);
      expect(parseFloat(marker.style.top)).toBeCloseTo((pin!.y / live.height) * 100, 3);
      // The pin sprite is 9 native pixels wide, at the scene's glyph scale.
      expect(parseFloat(marker.style.width)).toBeCloseTo(((9 * pin!.scale) / live.width) * 100, 3);
      expect(screen.getByRole("group", { name: "แปลงบนเกาะ" })).not.toContainElement(marker);
      expect(within(marker).queryByRole("img")).toBeNull();
      // Still exactly one button per plot.
      expect(screen.getAllByRole("button", { name: /^แปลง/ })).toHaveLength(picture.hotspots.length);
    });

    it("sits above the top centre of the viewer's plot when there is no scene", () => {
      render(<IslandViewport picture={picture} onPlot={jest.fn()} me={me} />);
      const marker = screen.getByTestId("plot-marker");
      const mine = picture.mine!;
      expect(marker).toHaveAttribute("data-anchor", "top");
      expect(parseFloat(marker.style.left)).toBeCloseTo(mine.x + mine.w / 2, 3);
      expect(parseFloat(marker.style.top)).toBeCloseTo(mine.y, 3);
    });

    it("draws no marker without a plot of one's own, or when the island is not the viewer's", () => {
      const { rerender } = render(<IslandViewport picture={{ ...picture, mine: null }} onPlot={jest.fn()} me={me} />);
      expect(screen.queryByTestId("plot-marker")).toBeNull();
      // Only IslandHome passes `me`: no picture of anyone on any plot otherwise.
      rerender(<IslandViewport picture={live} onPlot={jest.fn()} />);
      expect(screen.queryByTestId("plot-marker")).toBeNull();
    });
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
      prizes: true,
      deepfire: { lit: true },
    };
    // The only word the plaza prints; it shows only over the viewer's own figure (visiting below).
    const labels = { me: "คุณ" };
    const names: Record<PlazaSpotId, string> = {
      notice: "กระดานเควสต์: ตั้งชื่อปัญหา",
      stage: "Demo Day 28 พ.ย. อีก 17 วัน",
      campfire: "ห้อง coworking, 11 คน",
      prizes: "ป้ายรางวัล Demo Day",
      ship: "เรือสินค้า เปิดร้านค้า",
      deepfire: "กองไฟโฟกัส: ห้องเงียบของคุณคนเดียว",
    };
    const plaza = (onSpot?: (id: PlazaSpotId) => void) => ({ input, labels, names, onSpot });
    /** The same plaza with the viewer checked in today: their figure, and their คุณ tag over it. */
    const visiting = () => ({ ...plaza(jest.fn()), input: { ...input, visitors: { count: 3, team: 0, me: true } } });

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
      expect(screen.getByRole("button", { name: "แปลง #4, สวนผักดาดฟ้า" })).toBeInTheDocument();
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
      fireEvent.click(screen.getByRole("button", { name: names.deepfire }));
      expect(onSpot.mock.calls).toEqual([["notice"], ["campfire"], ["deepfire"]]);
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
      const { container } = render(<IslandViewport picture={live} onPlot={jest.fn()} plaza={visiting()} />);
      expect(container.querySelector("[data-label]")).toBeNull();
    });

    it("prints no words over the places, only the viewer's คุณ tag over their own figure, hidden from assistive tech", () => {
      mockLive.mode = "ready";
      const { container, rerender } = render(<IslandViewport picture={live} onPlot={jest.fn()} plaza={visiting()} />);
      const shown = [...container.querySelectorAll<HTMLElement>("[data-label]")];
      expect(shown.map((el) => [el.dataset.label, el.dataset.anchor, el.textContent])).toEqual([["me", "bottom", "คุณ"]]);
      // No words over the notice board, the stage (its countdown board draws the days), the prize board, the
      // campfire (11 people, more than its seats) or the deep fire: a tap opens each.
      for (const id of ["notice", "stage", "prizes", "campfire", "deepfire"]) {
        expect(container.querySelector(`[data-spot="${id}"]`)).toBeEmptyDOMElement();
      }
      const points = plazaWorld(live.scene!, visiting().input).labels;
      shown.forEach((el, i) => {
        expect(el.style.left).toBe(`${points[i].x}%`);
        expect(el.style.top).toBe(`${points[i].y}%`);
        expect(el.closest("[aria-hidden='true']")).not.toBeNull();
      });
      rerender(<IslandViewport picture={live} onPlot={jest.fn()} plaza={visiting()} whole />);
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
        // The top bar is the chip with the coin pill under it.
        expect(o?.options?.rootMargin).toBe("-104px 0px -96px 0px");
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

describe("IslandViewport interact outline", () => {
  /** Native px to CSS px in these tests: no screen is measured in jsdom, so the island is at its 2x. */
  const S = 2;
  const box = (el: Element, r: { left: number; top: number; width: number; height: number }) => {
    el.getBoundingClientRect = () => ({ ...r, x: r.left, y: r.top, right: r.left + r.width, bottom: r.top + r.height, toJSON: () => r }) as DOMRect;
  };
  /** The picture's box over the canvas, at the page's top-left at 2x. */
  function overlay(): HTMLElement {
    const el = screen.getByRole("group", { name: "แปลงบนเกาะ" }).parentElement!;
    box(el, { left: 0, top: 0, width: live.width * S, height: live.height * S });
    return el;
  }
  const world = (container: HTMLElement) => container.querySelector<HTMLElement>('[data-live="true"]')!;
  function pointer(target: Element, type: string, pointerType: string, x = 0, y = 0) {
    const event = new MouseEvent(type, { bubbles: true, clientX: x, clientY: y });
    Object.defineProperty(event, "pointerType", { value: pointerType });
    act(() => {
      target.dispatchEvent(event);
    });
  }
  /** Lets the aim's animation frame run. */
  const frame = () => act(() => new Promise((done) => setTimeout(done, 40)));

  it("hands the living island every plot as a target once it draws, and none before", () => {
    const { unmount } = render(<IslandViewport picture={live} onPlot={jest.fn()} />);
    expect(mockLive.props.at(-1)?.targets).toEqual([]);
    unmount();
    mockLive.mode = "ready";
    render(<IslandViewport picture={live} onPlot={jest.fn()} />);
    expect(mockLive.props.at(-1)?.targets?.map((t) => t.key)).toEqual(["plot:3", "plot:4", "plot:9"]);
    const scene = live.scene!;
    expect(mockLive.props.at(-1)?.targets?.[1].shape).toEqual({ kind: "tree", tree: scene.trees.findIndex((t) => t.slot === 4) });
  });

  it("draws no outline on the island that takes no taps", () => {
    mockLive.mode = "ready";
    render(<IslandViewport picture={live} interactive={false} />);
    expect(mockLive.props.at(-1)?.targets).toEqual([]);
  });

  it("aims at the middle of the room between the HUD bars on a touch screen, and follows a scroll", async () => {
    mockLive.mode = "ready";
    const { container } = render(<IslandViewport picture={live} onPlot={jest.fn()} />);
    overlay();
    const el = world(container);
    box(el, { left: 0, top: 0, width: 375, height: 812 });
    Object.defineProperty(el, "clientWidth", { configurable: true, value: 375 });
    Object.defineProperty(el, "clientHeight", { configurable: true, value: 812 });
    act(() => {
      el.dispatchEvent(new Event("scroll"));
    });
    await frame();
    const mid = (104 + 812 - 96) / 2;
    expect(mockLive.steer.aim).toHaveBeenLastCalledWith({ x: 187.5 / S, y: mid / S, reach: 28 / S });
    // Scrolled: the picture moved under the middle.
    box(overlay(), { left: -100, top: -60, width: live.width * S, height: live.height * S });
    act(() => {
      el.dispatchEvent(new Event("scroll"));
    });
    await frame();
    expect(mockLive.steer.aim).toHaveBeenLastCalledWith({ x: 287.5 / S, y: (mid + 60) / S, reach: 28 / S });
  });

  it("follows a mouse pointer on a desktop, closer in, and aims nowhere once it leaves", async () => {
    mockLive.mode = "ready";
    const { container } = render(<IslandViewport picture={live} onPlot={jest.fn()} />);
    overlay();
    const el = world(container);
    pointer(el, "pointermove", "mouse", 120, 80);
    await frame();
    expect(mockLive.steer.aim).toHaveBeenLastCalledWith({ x: 60, y: 40, reach: 14 / S });
    pointer(el, "pointerleave", "mouse");
    await frame();
    expect(mockLive.steer.aim).toHaveBeenLastCalledWith(null);
  });

  it("aims only with a mouse on the whole island, which never scrolls", async () => {
    mockLive.mode = "ready";
    const { container } = render(<IslandViewport picture={live} onPlot={jest.fn()} whole />);
    overlay();
    const el = world(container);
    act(() => {
      el.dispatchEvent(new Event("scroll"));
    });
    await frame();
    expect(mockLive.steer.aim).toHaveBeenLastCalledWith(null);
    pointer(el, "pointermove", "mouse", 120, 80);
    await frame();
    expect(mockLive.steer.aim).toHaveBeenLastCalledWith({ x: 60, y: 40, reach: 14 / S });
  });

  it("shows the outline round the plot a keyboard focuses, and not for a tap's focus", () => {
    mockLive.mode = "ready";
    render(<IslandViewport picture={live} onPlot={jest.fn()} />);
    const four = screen.getByRole("button", { name: "แปลง #4, สวนผักดาดฟ้า" });
    const real = Element.prototype.matches;
    const matches = jest.spyOn(Element.prototype, "matches");
    let keyboard = true;
    matches.mockImplementation(function (this: Element, selector: string) {
      return selector === ":focus-visible" ? keyboard : real.call(this, selector);
    });
    try {
      act(() => four.focus());
      expect(mockLive.steer.focus).toHaveBeenLastCalledWith("plot:4");
      act(() => four.blur());
      expect(mockLive.steer.focus).toHaveBeenLastCalledWith(null);
      keyboard = false;
      act(() => four.focus());
      expect(mockLive.steer.focus).toHaveBeenLastCalledWith(null);
    } finally {
      matches.mockRestore();
    }
  });

  it("keeps every tap where it went: a plot opens its own sheet whatever the outline shows", async () => {
    mockLive.mode = "ready";
    const onPlot = jest.fn();
    const { container } = render(<IslandViewport picture={live} onPlot={onPlot} />);
    overlay();
    // The outline shows round plot 3 (the mouse is over it); the tap lands on plot 4's button.
    const three = live.hotspots[0];
    pointer(world(container), "pointermove", "mouse", ((three.x + three.w / 2) / 100) * live.width * S, ((three.y + three.h / 2) / 100) * live.height * S);
    await frame();
    expect(mockLive.steer.aim).toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "แปลง #4, สวนผักดาดฟ้า" }));
    expect(onPlot).toHaveBeenCalledTimes(1);
    expect(onPlot).toHaveBeenCalledWith(live.hotspots[1]);
  });
});

describe("hotspotLabel", () => {
  it("names the own plot's planted seed at stage 0 as the seed, never an empty plot", () => {
    const spot = { slot: 3, mine: true, plain: false, stage: 0, name: "แอป", x: 0, y: 0, w: 1, h: 1 };
    expect(hotspotLabel({ ...spot, seeded: true })).toBe(ISLAND.signed(ISLAND.myPlot(3, PRE_STAGE), "แอป"));
    expect(hotspotLabel(spot)).toBe(ISLAND.signed(ISLAND.myPlot(3, stageName(0)), "แอป"));
  });

  it("adds the sign's name after the plot, and only a sign's name", () => {
    const spot = { slot: 4, mine: false, plain: false, stage: 2, name: " สวนผักดาดฟ้า ", x: 0, y: 0, w: 1, h: 1 };
    expect(hotspotLabel(spot)).toBe("แปลง #4, สวนผักดาดฟ้า");
    expect(hotspotLabel({ ...spot, name: null })).toBe("แปลง #4");
    expect(hotspotLabel({ ...spot, plain: true })).toBe("แปลง #4");
  });
});
