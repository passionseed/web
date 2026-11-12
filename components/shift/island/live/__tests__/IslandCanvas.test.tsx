import { act, render } from "@testing-library/react";

import { buildScene, type IslandPlot } from "@/bot/src/quests/island/scene";

import { waterColor } from "@/lib/shift-island/live/lighting";

import IslandCanvas from "../IslandCanvas";

/** jsdom has no canvas: a context that records what it is asked to do. */
function fakeContext() {
  return {
    imageSmoothingEnabled: true,
    globalAlpha: 1,
    fillStyle: "#000",
    drawImage: jest.fn(),
    fillRect: jest.fn(),
    clearRect: jest.fn(),
    putImageData: jest.fn(),
    setTransform: jest.fn(),
    save: jest.fn(),
    restore: jest.fn(),
    beginPath: jest.fn(),
    rect: jest.fn(),
    clip: jest.fn(),
  };
}

const plot = (slot: number, stage: number, extra: Partial<IslandPlot> = {}): IslandPlot => ({
  slot,
  stage,
  visitor: false,
  key: false,
  helper: false,
  lantern: false,
  name: null,
  mine: false,
  ...extra,
});
const scene = buildScene([plot(1, 3, { lantern: true }), plot(2, 6, { mine: true })], { markMine: true, festival: true });

let contexts: ReturnType<typeof fakeContext>[];
let getContext: jest.SpyInstance;
let observers: { callback: IntersectionObserverCallback }[];
let reduced: boolean;
let motionListeners: (() => void)[];

/** Bangkok 20:00 on 11 Nov 2026: night. */
const NIGHT = Date.UTC(2026, 10, 11, 13, 0);

beforeEach(() => {
  // Install the clock at NIGHT: fake animation frames are timed from the install
  // time, so setting the time afterwards to a moment before the real one makes a
  // frame up to 31 ms away and two frames no longer fit in firstFrame().
  jest.useFakeTimers({ now: NIGHT });
  contexts = [];
  getContext = jest.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation((() => {
    const ctx = fakeContext();
    contexts.push(ctx);
    return ctx;
  }) as never);
  (globalThis as { ImageData?: unknown }).ImageData = class {
    constructor(
      readonly data: Uint8ClampedArray,
      readonly width: number,
      readonly height: number
    ) {}
  };
  observers = [];
  (globalThis as { IntersectionObserver?: unknown }).IntersectionObserver = class {
    constructor(readonly callback: IntersectionObserverCallback) {
      observers.push(this);
    }
    observe() {}
    disconnect() {}
  };
  reduced = false;
  motionListeners = [];
  window.matchMedia = ((query: string) => ({
    get matches() {
      return query.includes("reduced-motion") && reduced;
    },
    media: query,
    addEventListener: (_: string, fn: () => void) => motionListeners.push(fn),
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;
});

afterEach(() => {
  getContext.mockRestore();
  jest.useRealTimers();
  delete (globalThis as { IntersectionObserver?: unknown }).IntersectionObserver;
  Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
});

/** Two animation frames: the build, then the first frame. */
function firstFrame() {
  act(() => {
    jest.advanceTimersByTime(40);
  });
}

const visible = (on: boolean) =>
  act(() => {
    for (const o of observers) o.callback([{ isIntersecting: on } as IntersectionObserverEntry], o as unknown as IntersectionObserver);
  });

describe("IslandCanvas", () => {
  it("reports a failure and starts nothing when there is no 2D context", () => {
    getContext.mockImplementation((() => null) as never);
    const onFail = jest.fn();
    const onReady = jest.fn();
    render(<IslandCanvas scene={scene} onFail={onFail} onReady={onReady} />);
    expect(onFail).toHaveBeenCalledTimes(1);
    firstFrame();
    expect(onReady).not.toHaveBeenCalled();
    expect(jest.getTimerCount()).toBe(0);
  });

  it("reports a failure when drawing throws, and stops", () => {
    getContext.mockImplementation((() => {
      const ctx = fakeContext();
      ctx.drawImage.mockImplementation(() => {
        throw new Error("boom");
      });
      return ctx;
    }) as never);
    const onFail = jest.fn();
    render(<IslandCanvas scene={scene} onFail={onFail} />);
    firstFrame();
    expect(onFail).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBe(0);
  });

  it("draws its first frame in Bangkok's light, then ticks; is the scene's size, crisp and hidden from assistive tech", () => {
    const onReady = jest.fn();
    const onPhase = jest.fn();
    const { container } = render(<IslandCanvas scene={scene} onReady={onReady} onPhase={onPhase} />);
    const canvas = container.querySelector("canvas")!;
    expect([canvas.width, canvas.height]).toEqual([scene.width, scene.height]);
    expect(canvas).toHaveAttribute("aria-hidden", "true");
    expect(canvas.style.imageRendering).toBe("pixelated");
    expect(onReady).not.toHaveBeenCalled();
    firstFrame();
    expect(onReady).toHaveBeenCalledTimes(1);
    expect(onPhase).toHaveBeenCalledWith("night", waterColor("night"));
    const visibleCtx = contexts[0];
    expect(getContext.mock.calls[0][1]).toEqual({ alpha: false });
    expect(visibleCtx.imageSmoothingEnabled).toBe(false);
    const drawn = visibleCtx.drawImage.mock.calls.length;
    expect(drawn).toBeGreaterThan(0);
    // Every coordinate is a whole pixel.
    for (const call of visibleCtx.drawImage.mock.calls) for (const v of call.slice(1)) expect(Number.isInteger(v)).toBe(true);
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(visibleCtx.drawImage.mock.calls.length).toBeGreaterThan(drawn);
    expect(jest.getTimerCount()).toBeGreaterThan(0);
  });

  it("takes a fixed light when given one", () => {
    const onPhase = jest.fn();
    render(<IslandCanvas scene={scene} phase="dusk" onPhase={onPhase} />);
    firstFrame();
    expect(onPhase).toHaveBeenCalledWith("dusk", waterColor("dusk"));
  });

  it("keeps zero timers while paused, and carries on after", () => {
    const { rerender } = render(<IslandCanvas scene={scene} paused />);
    firstFrame();
    expect(jest.getTimerCount()).toBe(0);
    const ctx = contexts[0];
    const drawn = ctx.drawImage.mock.calls.length;
    act(() => {
      jest.advanceTimersByTime(5000);
    });
    expect(ctx.drawImage.mock.calls.length).toBe(drawn);
    rerender(<IslandCanvas scene={scene} paused={false} />);
    expect(jest.getTimerCount()).toBeGreaterThan(0);
    rerender(<IslandCanvas scene={scene} paused />);
    expect(jest.getTimerCount()).toBe(0);
  });

  it("keeps zero timers off-screen and in a hidden tab", () => {
    render(<IslandCanvas scene={scene} />);
    firstFrame();
    expect(jest.getTimerCount()).toBeGreaterThan(0);
    visible(false);
    expect(jest.getTimerCount()).toBe(0);
    visible(true);
    expect(jest.getTimerCount()).toBeGreaterThan(0);
    act(() => {
      Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(jest.getTimerCount()).toBe(0);
    act(() => {
      Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(jest.getTimerCount()).toBeGreaterThan(0);
  });

  it("draws one still frame and no loop under reduced motion, or when still", () => {
    reduced = true;
    const onReady = jest.fn();
    render(<IslandCanvas scene={scene} onReady={onReady} />);
    firstFrame();
    expect(onReady).toHaveBeenCalledTimes(1);
    // No loop: only the one slow check of Bangkok's light.
    expect(jest.getTimerCount()).toBe(1);
    const ctx = contexts[0];
    const drawn = ctx.drawImage.mock.calls.length;
    expect(drawn).toBeGreaterThan(0);
    act(() => {
      jest.advanceTimersByTime(5000);
    });
    expect(ctx.drawImage.mock.calls.length).toBe(drawn);
    // Motion allowed again: the island comes alive.
    act(() => {
      reduced = false;
      for (const fn of motionListeners) fn();
    });
    expect(jest.getTimerCount()).toBeGreaterThan(0);
  });

  it("turns a still island to the new light when the hour changes, and holds no timer while paused or hidden", () => {
    reduced = true;
    // Bangkok 05:29 the next morning (the clock only moves forward): one minute of night left.
    jest.setSystemTime(Date.UTC(2026, 10, 11, 22, 29));
    const onPhase = jest.fn();
    const { rerender } = render(<IslandCanvas scene={scene} onPhase={onPhase} />);
    firstFrame();
    expect(onPhase).toHaveBeenLastCalledWith("night", waterColor("night"));
    const ctx = contexts[0];
    const drawn = ctx.drawImage.mock.calls.length;
    act(() => {
      jest.advanceTimersByTime(61_000);
    });
    expect(onPhase).toHaveBeenLastCalledWith("dawn", waterColor("dawn"));
    expect(ctx.drawImage.mock.calls.length).toBeGreaterThan(drawn);
    expect(jest.getTimerCount()).toBe(1);

    rerender(<IslandCanvas scene={scene} onPhase={onPhase} paused />);
    expect(jest.getTimerCount()).toBe(0);
    rerender(<IslandCanvas scene={scene} onPhase={onPhase} />);
    expect(jest.getTimerCount()).toBe(1);
    act(() => {
      Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(jest.getTimerCount()).toBe(0);
  });

  it("keeps no light timer on a still island with a fixed light", () => {
    render(<IslandCanvas scene={scene} phase="dusk" still />);
    firstFrame();
    expect(jest.getTimerCount()).toBe(0);
  });

  it("shows only its crop, and keeps going when the scene changes", () => {
    const crop = { x: 100, y: 60, w: 160, h: 112 };
    const { container, rerender } = render(<IslandCanvas scene={scene} crop={crop} still />);
    const canvas = container.querySelector("canvas")!;
    expect([canvas.width, canvas.height]).toEqual([160, 112]);
    firstFrame();
    expect(contexts[0].setTransform).toHaveBeenCalledWith(1, 0, 0, 1, -100, -60);
    const next = buildScene([plot(1, 4, { lantern: true }), plot(2, 6, { mine: true })], { markMine: true, festival: true });
    const onFail = jest.fn();
    rerender(<IslandCanvas scene={next} crop={crop} still onFail={onFail} />);
    expect(onFail).not.toHaveBeenCalled();
  });

  it("names itself when given a label", () => {
    const { container } = render(<IslandCanvas scene={scene} label="เกาะ" still />);
    const canvas = container.querySelector("canvas")!;
    expect(canvas).toHaveAttribute("role", "img");
    expect(canvas).toHaveAttribute("aria-label", "เกาะ");
    expect(canvas).not.toHaveAttribute("aria-hidden");
  });

  it("cleans up every timer when unmounted", () => {
    const { unmount } = render(<IslandCanvas scene={scene} />);
    firstFrame();
    expect(jest.getTimerCount()).toBeGreaterThan(0);
    unmount();
    expect(jest.getTimerCount()).toBe(0);
  });
});
