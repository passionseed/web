import { act, fireEvent, render, screen } from "@testing-library/react";

import { buildScene, type IslandPlot } from "@/bot/src/quests/island/scene";
import type { IslandCanvasProps } from "@/components/shift/island/live/IslandCanvas";
import type { Rect } from "@/lib/shift-island/live/geometry";
import type { LiveActor } from "@/lib/shift-island/live/types";
import type { NoticePin } from "@/lib/shift-island/notice";
import { plazaWorld, type PlazaInput, type PlazaSpotId } from "@/lib/shift-island/live/plaza";
import type { IslandPicture } from "@/lib/shift-island/picture";

import { FIGURES } from "../copy";
import { IslandViewport } from "../IslandViewport";
import { BUBBLE_MS, fitBubble } from "../live/FigureBubble";
import { figureLine, turnOrder } from "../live/figureLine";
import { PlazaLayer } from "../live/PlazaLayer";
import { plazaProps } from "../plazaProps";

/**
 * The living island, mocked: it draws at once ("fail": it cannot draw at all)
 * and reads its actors' boxes from mockLive.boxes, or (null) where its actors
 * stand. Like the real engine it is handed new actors in a passive effect,
 * after every layout effect, and answers null for a list it does not draw yet.
 */
const mockLive: { boxes: (Rect | null)[] | null; drawn: readonly LiveActor[]; mode: "ready" | "fail" } = { boxes: [], drawn: [], mode: "ready" };

jest.mock("../live/IslandLive", () => {
  const { useEffect } = jest.requireActual<typeof import("react")>("react");
  return {
    IslandLive: function MockIslandLive(props: IslandCanvasProps) {
      useEffect(() => {
        mockLive.drawn = props.actors ?? [];
      }, [props.actors]);
      useEffect(() => {
        const holder = props.actorBoxes;
        if (holder) {
          holder.current = (actors) =>
            actors && actors !== mockLive.drawn ? null : (mockLive.boxes ?? mockLive.drawn.map((a) => ({ x: a.x, y: a.y, w: 10, h: 14 })));
        }
        if (mockLive.mode === "fail") props.onFail?.();
        else props.onReady?.();
        return () => {
          if (holder) holder.current = null;
        };
        // Once per mount, like the real canvas.
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);
      return <canvas data-testid="live-island" aria-hidden="true" />;
    },
  };
});

const plot = (slot: number, extra: Partial<IslandPlot> = {}): IslandPlot => ({
  slot,
  stage: 4,
  visitor: false,
  key: false,
  helper: false,
  lantern: false,
  name: null,
  mine: false,
  ...extra,
});

const scene = buildScene([plot(1, { visitor: true }), plot(2, { mine: true, visitor: true }), plot(3), plot(4)], { markMine: true, festival: true });
const picture: IslandPicture = {
  src: "/api/shift/island/map?v=abcdef123456",
  width: scene.width,
  height: scene.height,
  hotspots: scene.trees.map((t) => ({
    slot: t.slot,
    mine: t.mine === true,
    plain: false,
    stage: t.stage,
    name: null,
    x: (t.left / scene.width) * 100,
    y: (t.top / scene.height) * 100,
    w: (t.w / scene.width) * 100,
    h: (t.h / scene.height) * 100,
  })),
  mine: null,
  festival: true,
  scene,
};
/** One note on the notice board, so the plaza has its group of buttons. */
const PIN: NoticePin = { ref: { kind: "main", milestone: 1 }, kind: "main", title: "เจอคนจริงคนแรก" };
const partner = scene.trees.find((t) => t.slot === 1)!.visitor!;
const ownPartner = scene.trees.find((t) => t.slot === 2)!.visitor!;
/** CSS px per native px in these tests. */
const S = 2;

/** The picture's box over the canvas, measured as if it sat at the page's top-left at 2x. */
function overlay(): HTMLElement {
  const box = screen.getByRole("group", { name: "แปลงบนเกาะ" }).parentElement!;
  box.getBoundingClientRect = () =>
    ({ left: 0, top: 0, x: 0, y: 0, width: scene.width * S, height: scene.height * S, right: scene.width * S, bottom: scene.height * S }) as DOMRect;
  return box;
}

/** A pointer tap (detail 1) at native px, on `target` (the picture's box unless a button is under the finger). */
function tap(x: number, y: number, target: Element = overlay()) {
  overlay();
  fireEvent.click(target, { detail: 1, clientX: x * S, clientY: y * S });
}

const bubble = () => document.querySelector<HTMLElement>("[data-bubble]");
const spoken = () => document.querySelector('p[aria-live="polite"]')?.textContent ?? null;

beforeEach(() => {
  mockLive.boxes = [];
  mockLive.drawn = [];
  mockLive.mode = "ready";
});

describe("figure lines", () => {
  it("gives each figure one line, picked by its kind and number, so it always says the same", () => {
    expect(figureLine({ kind: "me", n: 0 })).toBe(FIGURES.me[0]);
    expect(figureLine({ kind: "team", n: 1 })).toBe(FIGURES.team[1]);
    expect(figureLine({ kind: "crowd", n: 7 })).toBe(FIGURES.crowd[7 % FIGURES.crowd.length]);
    expect(figureLine({ kind: "partner", n: 4 })).toBe(FIGURES.partner[0]);
    expect(figureLine({ kind: "partner", n: 5, mine: true })).toBe(FIGURES.partnerMine[1]);
    expect(figureLine({ kind: "builder", n: 0 })).toBe(FIGURES.builder[0]);
    expect(figureLine({ kind: "tester", n: 0 })).toBe(FIGURES.tester[0]);
    // The plaza's strollers each say something different.
    const strollers = Array.from({ length: 5 }, (_, n) => figureLine({ kind: "crowd", n }));
    expect(new Set(strollers).size).toBe(5);
  });

  it("speaks truthfully and kindly: the viewer is told it is them, a teammate that they checked in, nobody is named", () => {
    expect(FIGURES.me.every((line) => line.includes("คุณ"))).toBe(true);
    expect(FIGURES.team.every((line) => line.includes("ทีม"))).toBe(true);
    expect(FIGURES.partner.every((line) => line.includes("พันธมิตรคนแรก"))).toBe(true);
    const all = [...FIGURES.me, ...FIGURES.team, ...FIGURES.crowd, ...FIGURES.partner, ...FIGURES.partnerMine, ...FIGURES.builder, ...FIGURES.tester];
    for (const line of all) {
      expect(line).not.toMatch(/[—–]/);
      expect(line).not.toMatch(/น้อง|เด็ก/);
      expect(line.length).toBeLessThanOrEqual(60);
    }
  });

  it("goes round today's visitors only: the viewer first, then the team, then everyone else", () => {
    const order = turnOrder([
      { kind: "partner", n: 2 },
      { kind: "crowd", n: 1 },
      { kind: "me", n: 0 },
      { kind: "crowd", n: 0 },
      { kind: "team", n: 0 },
      { kind: "builder", n: 0 },
    ]);
    // The day's count names today's check-ins: a tree's partner and the story's people are not in its turn.
    expect(order).toEqual([2, 4, 3, 1]);
    expect(turnOrder([{ kind: "partner", n: 1 }])).toEqual([]);
  });
});

describe("tapping people on the island", () => {
  it("has a tree's partner say what it stands for, in a bubble over it and for screen readers; a tap elsewhere closes it", () => {
    render(<IslandViewport picture={picture} onPlot={jest.fn()} />);
    expect(spoken()).toBe("");
    tap(partner.x + 5, partner.y + 7);
    expect(bubble()).toHaveAttribute("data-bubble", "partner");
    expect(bubble()).toHaveTextContent(FIGURES.partner[1]);
    expect(bubble()).toHaveAttribute("aria-hidden", "true");
    expect(spoken()).toBe(FIGURES.partner[1]);
    // Over its head: the top middle of its box.
    expect(parseFloat(bubble()!.style.left)).toBeCloseTo(((partner.x + 5) / scene.width) * 100, 3);
    expect(parseFloat(bubble()!.style.top)).toBeCloseTo((partner.y / scene.height) * 100, 3);
    tap(2, 2);
    expect(bubble()).toBeNull();
    expect(spoken()).toBe("");
  });

  it("tells the viewer the partner by their own team's tree is their team's", () => {
    render(<IslandViewport picture={picture} onPlot={jest.fn()} />);
    tap(ownPartner.x + 5, ownPartner.y + 7);
    expect(bubble()).toHaveTextContent(FIGURES.partnerMine[0]);
  });

  it("is easy to hit: a fingertip round the figure counts, on open ground", () => {
    render(<IslandViewport picture={picture} onPlot={jest.fn()} />);
    tap(partner.x - 5, partner.y + 16);
    expect(bubble()).not.toBeNull();
  });

  it("leaves a key press on a plot to the plot, and over a plot's own button counts only the figure itself", () => {
    const onPlot = jest.fn();
    render(<IslandViewport picture={picture} onPlot={onPlot} />);
    const plotButton = screen.getByRole("button", { name: `แปลง #1, ${FIGURES.plotPartner}` });
    // Enter or Space on the button: a click with no pointer.
    fireEvent.click(plotButton, { detail: 0, clientX: (partner.x + 5) * S, clientY: (partner.y + 7) * S });
    expect(onPlot).toHaveBeenCalledTimes(1);
    expect(bubble()).toBeNull();
    // Near the figure but on the plot's button: the plot.
    tap(partner.x - 5, partner.y + 7, plotButton);
    expect(onPlot).toHaveBeenCalledTimes(2);
    expect(bubble()).toBeNull();
    // On the figure itself: the figure, and the plot never hears of it.
    tap(partner.x + 5, partner.y + 7, plotButton);
    expect(onPlot).toHaveBeenCalledTimes(2);
    expect(bubble()).not.toBeNull();
  });

  it("closes on Escape, after a while, and when a sheet covers the island", () => {
    jest.useFakeTimers();
    try {
      const { rerender } = render(<IslandViewport picture={picture} onPlot={jest.fn()} />);
      tap(partner.x + 5, partner.y + 7);
      fireEvent.keyDown(document, { key: "Escape" });
      expect(bubble()).toBeNull();
      tap(partner.x + 5, partner.y + 7);
      act(() => void jest.advanceTimersByTime(BUBBLE_MS - 10));
      expect(bubble()).not.toBeNull();
      act(() => void jest.advanceTimersByTime(20));
      expect(bubble()).toBeNull();
      tap(partner.x + 5, partner.y + 7);
      rerender(<IslandViewport picture={picture} onPlot={jest.fn()} paused />);
      expect(bubble()).toBeNull();
      // Nothing talks while a sheet is open.
      tap(partner.x + 5, partner.y + 7);
      expect(bubble()).toBeNull();
    } finally {
      jest.useRealTimers();
    }
  });

  it("names a tree's partner in its plot's name, the keyboard's way to it, and only where one stands", () => {
    render(<IslandViewport picture={picture} onPlot={jest.fn()} />);
    expect(screen.getByRole("button", { name: `แปลง #1, ${FIGURES.plotPartner}` })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: new RegExp(`^แปลงของคุณ #2, .*, ${FIGURES.plotPartner}$`) })).toHaveAttribute("data-slot", "2");
    expect(screen.getByRole("button", { name: "แปลง #3" })).toBeInTheDocument();
    // Nobody greets in turn here: the partners are not today's visitors, so there is no people button.
    expect(screen.queryByRole("button", { name: new RegExp(FIGURES.turn) })).toBeNull();
  });

  it("closes the bubble when it is tapped, instead of opening what it covers", () => {
    const onPlot = jest.fn();
    render(<IslandViewport picture={picture} onPlot={onPlot} />);
    tap(partner.x + 5, partner.y + 7);
    const words = bubble()!.firstElementChild as HTMLElement;
    // The bubble's box on screen, over the head; plot 1's button lies under it.
    const top = (partner.y - 14) * S;
    words.getBoundingClientRect = () => ({ left: (partner.x - 20) * S, right: (partner.x + 30) * S, top, bottom: top + 12 * S, width: 50 * S, height: 12 * S, x: 0, y: 0 }) as DOMRect;
    const plotButton = screen.getByRole("button", { name: `แปลง #1, ${FIGURES.plotPartner}` });
    tap(partner.x + 5, partner.y - 8, plotButton);
    expect(onPlot).not.toHaveBeenCalled();
    expect(bubble()).toBeNull();
    // With the bubble gone, the same tap reaches the plot.
    tap(partner.x + 5, partner.y - 8, plotButton);
    expect(onPlot).toHaveBeenCalledTimes(1);
  });

  it("maps a tap through the picture's box as measured on screen: scrolled away from the corner, at 3x", () => {
    render(<IslandViewport picture={picture} onPlot={jest.fn()} />);
    const box = screen.getByRole("group", { name: "แปลงบนเกาะ" }).parentElement!;
    // The world scrolled right and down: the picture starts above and left of the screen.
    const left = -300;
    const top = -120;
    const k = 3;
    box.getBoundingClientRect = () =>
      ({ left, top, x: left, y: top, width: scene.width * k, height: scene.height * k, right: left + scene.width * k, bottom: top + scene.height * k }) as DOMRect;
    const at = (x: number, y: number) => ({ detail: 1, clientX: left + x * k, clientY: top + y * k });
    // Where the partner would be with no scroll, or at 2x: open ground.
    fireEvent.click(box, { detail: 1, clientX: (partner.x + 5) * k, clientY: (partner.y + 7) * k });
    expect(bubble()).toBeNull();
    fireEvent.click(box, { detail: 1, clientX: left + (partner.x + 5) * S, clientY: top + (partner.y + 7) * S });
    expect(bubble()).toBeNull();
    fireEvent.click(box, at(partner.x + 5, partner.y + 7));
    expect(bubble()).toHaveAttribute("data-bubble", "partner");
    expect(spoken()).toBe(FIGURES.partner[1]);
  });

  it("counts only the figure itself on the whole island, as the plots drop their 48px floor there", () => {
    const { rerender } = render(<IslandViewport picture={picture} onPlot={jest.fn()} whole />);
    // 5 native px left of the figure, on open ground: too far on the whole island.
    tap(partner.x - 5, partner.y + 7);
    expect(bubble()).toBeNull();
    tap(partner.x + 1, partner.y + 7);
    expect(bubble()).not.toBeNull();
    // Close up, the fingertip's margin reaches it.
    rerender(<IslandViewport picture={picture} onPlot={jest.fn()} />);
    tap(2, 2);
    expect(bubble()).toBeNull();
    tap(partner.x - 5, partner.y + 7);
    expect(bubble()).not.toBeNull();
  });

  it("still hears taps after the picture failed and came back on retry", () => {
    mockLive.mode = "fail";
    render(<IslandViewport picture={picture} onPlot={jest.fn()} />);
    fireEvent.error(screen.getByRole("img", { name: /ภาพเกาะ/ }));
    expect(screen.queryByRole("group", { name: "แปลงบนเกาะ" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "ลองอีกครั้ง" }));
    // A new picture box: the partner still talks when tapped.
    tap(partner.x + 5, partner.y + 7);
    expect(bubble()).toHaveAttribute("data-bubble", "partner");
  });

  it("says nothing on an island that only shows the place", () => {
    render(<IslandViewport picture={picture} interactive={false} />);
    fireEvent.click(document.querySelector("[data-testid='live-island']")!.parentElement!.nextElementSibling!, {
      detail: 1,
      clientX: (partner.x + 5) * S,
      clientY: (partner.y + 7) * S,
    });
    expect(bubble()).toBeNull();
    expect(document.querySelector('p[aria-live="polite"]')).toBeNull();
  });
});

describe("the plaza's people", () => {
  const visitors = { count: 4, team: 1, me: true, shirt: "l" };
  const props = plazaProps(null, [PIN], null, jest.fn() as (id: PlazaSpotId) => void, visitors);
  const world = plazaWorld(scene, props.input);
  /** Where the engine says everyone stands now: 30 px right of where they started, as a walk would. */
  const walked = world.actors.map((a) => ({ x: a.x + 30, y: a.y, w: 10, h: 14 }));
  const me = world.figures.find((f) => f.kind === "me")!;

  it("finds a walker where the engine draws it now, not where it started", () => {
    mockLive.boxes = walked;
    render(<IslandViewport picture={picture} onPlot={jest.fn()} plaza={props} me={{ name: "Mint", avatarUrl: null }} />);
    const start = world.actors[me.actor!];
    tap(start.x + 30 + 5, start.y + 7);
    expect(bubble()).toHaveAttribute("data-bubble", "me");
    expect(bubble()).toHaveTextContent(FIGURES.me[0]);
    expect(spoken()).toBe(FIGURES.me[0]);
  });

  it("follows a walker frame by frame, and closes when it is no longer drawn", () => {
    jest.useFakeTimers();
    try {
      mockLive.boxes = walked;
      render(<IslandViewport picture={picture} onPlot={jest.fn()} plaza={props} />);
      const start = world.actors[me.actor!];
      tap(start.x + 30 + 5, start.y + 7);
      const left = parseFloat(bubble()!.style.left);
      mockLive.boxes = walked.map((r) => ({ ...r, x: r.x + 4 }));
      act(() => void jest.advanceTimersByTime(20));
      expect(parseFloat(bubble()!.style.left)).toBeCloseTo(left + (4 / scene.width) * 100, 3);
      mockLive.boxes = [];
      act(() => void jest.advanceTimersByTime(20));
      expect(bubble()).toBeNull();
    } finally {
      jest.useRealTimers();
    }
  });

  it("holds the bubble still under reduced motion, where nobody walks", () => {
    const matchMedia = window.matchMedia;
    window.matchMedia = ((query: string) => ({
      matches: query.includes("reduced-motion"),
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    })) as unknown as typeof window.matchMedia;
    jest.useFakeTimers();
    try {
      mockLive.boxes = walked;
      render(<IslandViewport picture={picture} onPlot={jest.fn()} plaza={props} />);
      const start = world.actors[me.actor!];
      tap(start.x + 30 + 5, start.y + 7);
      const left = bubble()!.style.left;
      mockLive.boxes = walked.map((r) => ({ ...r, x: r.x + 4 }));
      act(() => void jest.advanceTimersByTime(100));
      expect(bubble()!.style.left).toBe(left);
    } finally {
      jest.useRealTimers();
      window.matchMedia = matchMedia;
    }
  });

  it("makes the day's count the keyboard's way round: each press has the next person say their line", () => {
    mockLive.boxes = walked;
    render(<IslandViewport picture={picture} onPlot={jest.fn()} plaza={props} />);
    const people = screen.getByRole("button", { name: `${props.labels.visitors!.replace("\n", " ")}, ${FIGURES.turn}` });
    expect(screen.getByRole("group", { name: "ลานกลางเกาะ" })).toContainElement(people);
    fireEvent.click(people);
    expect(bubble()).toHaveAttribute("data-bubble", "me");
    expect(spoken()).toBe(`${FIGURES.nth(1)}: ${FIGURES.me[0]}`);
    fireEvent.click(people);
    expect(bubble()).toHaveAttribute("data-bubble", "team");
    expect(spoken()).toBe(`${FIGURES.nth(2)}: ${FIGURES.team[0]}`);
    // A tap on someone in between, then the button again: the turn starts over from the first.
    tap(partner.x + 5, partner.y + 7);
    fireEvent.click(people);
    expect(bubble()).toHaveAttribute("data-bubble", "me");
  });

  it("keeps the day's count to the people it counts: round today's visitors and back, never off to a tree, never a total", () => {
    mockLive.boxes = walked;
    render(<IslandViewport picture={picture} onPlot={jest.fn()} plaza={props} />);
    const people = screen.getByRole("button", { name: new RegExp(FIGURES.turn) });
    const today = world.figures.length;
    const kinds: string[] = [];
    for (let i = 0; i < today + 1; i++) {
      fireEvent.click(people);
      kinds.push(bubble()!.dataset.bubble!);
      expect(spoken()).not.toMatch(/จาก/);
    }
    expect(kinds.slice(0, today)).toEqual(["me", "team", ...Array(today - 2).fill("crowd")]);
    // Round again from the viewer, with no partner on the way.
    expect(kinds[today]).toBe("me");
    expect(spoken()).toBe(`${FIGURES.nth(1)}: ${FIGURES.me[0]}`);
  });

  it("keeps a walker's bubble on them while the plaza's actors shift under it (someone sat down by the fire)", () => {
    jest.useFakeTimers();
    try {
      // Boxes where the engine stands each actor of the list it was handed.
      mockLive.boxes = null;
      const base = { ...props.input, campfire: { count: 1 } };
      const busier = { ...props.input, campfire: { count: 2 } };
      const before = plazaWorld(scene, base);
      const after = plazaWorld(scene, busier);
      const meBefore = before.figures.find((f) => f.kind === "me")!;
      const meAfter = after.figures.find((f) => f.kind === "me")!;
      // The same people, each one actor further along: a seat was drawn before them.
      expect(after.figures.map((f) => [f.kind, f.n])).toEqual(before.figures.map((f) => [f.kind, f.n]));
      expect(meAfter.actor).toBe(meBefore.actor! + 1);
      const { rerender } = render(<IslandViewport picture={picture} onPlot={jest.fn()} plaza={{ ...props, input: base }} />);
      const start = before.actors[meBefore.actor!];
      tap(start.x + 5, start.y + 7);
      expect(bubble()).toHaveAttribute("data-bubble", "me");
      const left = bubble()!.style.left;
      rerender(<IslandViewport picture={picture} onPlot={jest.fn()} plaza={{ ...props, input: busier }} />);
      act(() => void jest.advanceTimersByTime(40));
      // Still open, still over the viewer (who did not move), not over whoever took their old index.
      expect(bubble()).toHaveAttribute("data-bubble", "me");
      expect(bubble()!.style.left).toBe(left);
      expect(spoken()).toBe(FIGURES.me[0]);
    } finally {
      jest.useRealTimers();
    }
  });

  it("brings a person reached by the keyboard into view with their bubble, above the next-step card", () => {
    mockLive.boxes = walked;
    const real = window.getComputedStyle;
    const offsetHeight = jest.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(40);
    const offsetWidth = jest.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(160);
    try {
      const { container } = render(<IslandViewport picture={picture} onPlot={jest.fn()} plaza={props} />);
      const world = container.querySelector<HTMLElement>("[data-live]")!;
      // The world scrolls under the HUD: its padding keeps clear of the chip above and the card below.
      jest.spyOn(window, "getComputedStyle").mockImplementation((el, pseudo) => {
        if (el !== world) return real(el, pseudo);
        return { overflowX: "auto", overflowY: "auto", scrollPaddingTop: "104px", scrollPaddingBottom: "180px", scrollPaddingLeft: "12px", scrollPaddingRight: "12px" } as CSSStyleDeclaration;
      });
      world.getBoundingClientRect = () => ({ left: 0, top: 0, right: 375, bottom: 812, width: 375, height: 812, x: 0, y: 0 }) as DOMRect;
      const box = overlay();
      // The viewer's figure stands low on the screen, behind the card (which starts 180px from the bottom).
      const mine = walked[me.actor!];
      const top = 760 - mine.y * S;
      box.getBoundingClientRect = () =>
        ({ left: 0, top, x: 0, y: top, width: scene.width * S, height: scene.height * S, right: scene.width * S, bottom: top + scene.height * S }) as DOMRect;
      fireEvent.click(screen.getByRole("button", { name: new RegExp(FIGURES.turn) }));
      expect(bubble()).toHaveAttribute("data-bubble", "me");
      // Scrolled the least way that shows the figure and its bubble above the card.
      const feet = 760 + 14 * S;
      expect(world.scrollTop).toBe(feet - (812 - 180));
    } finally {
      offsetHeight.mockRestore();
      offsetWidth.mockRestore();
      jest.restoreAllMocks();
    }
  });
});

describe("where a bubble goes", () => {
  const screenEdges = { left: 0, top: 0, right: 375, bottom: 812 };
  const size = { w: 200, h: 58 };

  it("sits over the head when there is room, centred on the figure", () => {
    expect(fitBubble({ x: 180, top: 300, bottom: 328 }, size, screenEdges)).toEqual({ below: false, shift: 0 });
  });

  it("hangs under the feet when the top of what is on screen would cut it (the top of a story panel)", () => {
    // A story frame 46px above the partner's head: a two-line bubble needs 58px.
    const frame = { left: 16, top: 120, right: 359, bottom: 361 };
    expect(fitBubble({ x: 60, top: 166, bottom: 194 }, size, frame).below).toBe(true);
    // With the room it needs, it stays over the head.
    expect(fitBubble({ x: 60, top: 120 + 8 + 58 + 2, bottom: 216 }, size, frame).below).toBe(false);
    // No room under the feet either: whichever side has more.
    expect(fitBubble({ x: 60, top: 150, bottom: 340 }, size, frame).below).toBe(false);
  });

  it("slides sideways to stay on screen, but never so far its tail leaves the text", () => {
    expect(fitBubble({ x: 40, top: 300, bottom: 328 }, size, screenEdges).shift).toBe(68);
    expect(fitBubble({ x: 340, top: 300, bottom: 328 }, size, screenEdges).shift).toBe(-73);
    expect(fitBubble({ x: -500, top: 300, bottom: 328 }, size, screenEdges).shift).toBe(92);
  });

  it("leaves a bubble it cannot measure where it is", () => {
    expect(fitBubble({ x: 0, top: 0, bottom: 0 }, { w: 0, h: 0 }, screenEdges)).toEqual({ below: false, shift: 0 });
    expect(fitBubble({ x: 0, top: 0, bottom: 0 }, size, { left: 0, top: 0, right: 0, bottom: 0 })).toEqual({ below: false, shift: 0 });
  });
});

describe("PlazaLayer's people button", () => {
  const visitors = { count: 3, team: 0, me: false };
  const props = plazaProps(null, [PIN], null, jest.fn() as (id: PlazaSpotId) => void, visitors);
  const world = plazaWorld(scene, props.input as PlazaInput);

  it("is the day's count where people can talk, said once as its name", () => {
    const onPeople = jest.fn();
    const { container } = render(
      <PlazaLayer world={world} labels={props.labels} names={props.names} onSpot={jest.fn()} interactive showLabels whole={false} onPeople={onPeople} />,
    );
    const button = screen.getByRole("button", { name: `วันนี้มีคนเช็กอินบนเกาะแล้ว 3 คน, ${FIGURES.turn}` });
    expect(button).toHaveAttribute("data-label", "visitors");
    expect(button).toHaveTextContent("วันนี้มีคนเช็กอินบนเกาะแล้ว 3 คน");
    // No second copy for screen readers: the button's name carries the line.
    expect(container.querySelectorAll(".sr-only")).toHaveLength(0);
    fireEvent.click(button);
    expect(onPeople).toHaveBeenCalledTimes(1);
  });

  it("waits out of sight for a keyboard when no count is on screen, and is not there on an island that only shows the place", () => {
    const { rerender } = render(
      <PlazaLayer world={world} labels={props.labels} names={props.names} onSpot={jest.fn()} interactive showLabels={false} whole onPeople={jest.fn()} />,
    );
    expect(screen.getByRole("button", { name: `${FIGURES.people}, ${FIGURES.turn}` })).not.toHaveAttribute("data-label");
    rerender(<PlazaLayer world={world} labels={props.labels} names={props.names} interactive={false} showLabels whole={false} onPeople={jest.fn()} />);
    expect(screen.queryByRole("button", { name: new RegExp(FIGURES.turn) })).toBeNull();
  });
});
