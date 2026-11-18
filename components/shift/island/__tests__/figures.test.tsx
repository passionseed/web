import { act, fireEvent, render, screen } from "@testing-library/react";

import { buildScene, type IslandPlot } from "@/bot/src/quests/island/scene";
import type { IslandCanvasProps } from "@/components/shift/island/live/IslandCanvas";
import type { Rect } from "@/lib/shift-island/live/geometry";
import type { NoticePin } from "@/lib/shift-island/notice";
import { plazaWorld, type PlazaInput, type PlazaSpotId } from "@/lib/shift-island/live/plaza";
import type { IslandPicture } from "@/lib/shift-island/picture";

import { FIGURES } from "../copy";
import { IslandViewport } from "../IslandViewport";
import { BUBBLE_MS } from "../live/FigureBubble";
import { figureLine, turnOrder } from "../live/figureLine";
import { PlazaLayer } from "../live/PlazaLayer";
import { plazaProps } from "../plazaProps";

/** The living island, mocked: it draws at once and reads its actors' boxes from mockLive.boxes. */
const mockLive: { boxes: (Rect | null)[] } = { boxes: [] };

jest.mock("../live/IslandLive", () => {
  const { useEffect } = jest.requireActual<typeof import("react")>("react");
  return {
    IslandLive: function MockIslandLive(props: IslandCanvasProps) {
      useEffect(() => {
        const holder = props.actorBoxes;
        if (holder) holder.current = () => mockLive.boxes;
        props.onReady?.();
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

  it("goes round the viewer first, then the team, everyone else and the trees' partners", () => {
    const order = turnOrder([
      { kind: "partner", n: 2 },
      { kind: "crowd", n: 1 },
      { kind: "me", n: 0 },
      { kind: "crowd", n: 0 },
      { kind: "team", n: 0 },
    ]);
    expect(order).toEqual([2, 4, 3, 1, 0]);
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
    const plotButton = screen.getByRole("button", { name: "แปลง #1" });
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
    const total = world.figures.length + 2;
    fireEvent.click(people);
    expect(bubble()).toHaveAttribute("data-bubble", "me");
    expect(spoken()).toBe(`${FIGURES.nth(1, total)}: ${FIGURES.me[0]}`);
    fireEvent.click(people);
    expect(bubble()).toHaveAttribute("data-bubble", "team");
    expect(spoken()).toBe(`${FIGURES.nth(2, total)}: ${FIGURES.team[0]}`);
    // A tap on someone in between, then the button again: the turn starts over from the first.
    tap(partner.x + 5, partner.y + 7);
    fireEvent.click(people);
    expect(bubble()).toHaveAttribute("data-bubble", "me");
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
