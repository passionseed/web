"use client";

import { Fragment, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import { figureBox, type Figure } from "@/lib/shift-island/live/figures";
import type { Rect } from "@/lib/shift-island/live/geometry";

import { FIGURES } from "../copy";
import styles from "../world.module.css";
import { figureLine, figureWords, turnOrder, type Today } from "./figureLine";

/** How long a line stays up: long enough to read twice, then the island is clear again. */
export const BUBBLE_MS = 5000;

const NO_BOXES: readonly (Rect | null)[] = [];
/** CSS px a bubble keeps from the edge of what is on screen. */
const EDGE = 8;
/** CSS px between the bubble's tail and the figure: over its head, or under its feet. */
const GAP = 2;

/** A sentence's phrases, split at its spaces, a number kept with the word after it ("5 คน"). */
export function phrases(sentence: string): string[] {
  const out: string[] = [];
  for (const word of sentence.split(" ")) {
    const last = out.length - 1;
    if (last >= 0 && /\d$/.test(out[last])) out[last] = `${out[last]} ${word}`;
    else out.push(word);
  }
  return out;
}

/** Who the figures are, without where they stand: a new cast resets the talk, a seat shifting an index does not. */
const castKey = (figures: readonly Figure[]) => figures.map((f) => `${f.kind}:${f.n}:${f.mine ? 1 : 0}`).join(",");

/** Client px edges. */
export interface Edges {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

const NO_PAD: Edges = { left: 0, top: 0, right: 0, bottom: 0 };

/**
 * An ancestor that clips the bubble (the world's scroller, the story's
 * frame). A scroller's scroll-padding keeps clear of what floats over it
 * (the HUD bars over the world), so the bubble keeps clear of that too.
 */
interface Clip {
  el: HTMLElement;
  pad: Edges;
  scrolls: boolean;
}

/** Every clipping ancestor, read once when the bubble opens. */
function clippers(node: HTMLElement): Clip[] {
  const out: Clip[] = [];
  for (let el = node.parentElement; el && el !== document.body; el = el.parentElement) {
    const style = getComputedStyle(el);
    const clips = (overflow: string) => overflow !== "" && overflow !== "visible";
    if (!clips(style.overflowX) && !clips(style.overflowY)) continue;
    const scrolls = /auto|scroll/.test(`${style.overflowX} ${style.overflowY}`);
    const px = (v: string) => parseFloat(v) || 0;
    const pad = scrolls
      ? { left: px(style.scrollPaddingLeft), top: px(style.scrollPaddingTop), right: px(style.scrollPaddingRight), bottom: px(style.scrollPaddingBottom) }
      : NO_PAD;
    out.push({ el, pad, scrolls });
  }
  return out;
}

/** What of the screen the bubble may use: the window, inside every clip and its padding. */
function visibleEdges(clips: readonly Clip[]): Edges {
  const edges = { left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight };
  for (const { el, pad } of clips) {
    const r = el.getBoundingClientRect();
    edges.left = Math.max(edges.left, r.left + pad.left);
    edges.top = Math.max(edges.top, r.top + pad.top);
    edges.right = Math.min(edges.right, r.right - pad.right);
    edges.bottom = Math.min(edges.bottom, r.bottom - pad.bottom);
  }
  return edges;
}

export interface BubbleFit {
  /** Under the figure's feet, its tail pointing up: there is no room over its head. */
  below: boolean;
  /** CSS px the text slides sideways to stay on screen; the tail stays on the figure. */
  shift: number;
}

/**
 * Where a bubble of `size` goes for a figure at `figure` (client px: its
 * middle, the top of its head, the bottom of its feet): over the head unless
 * that crosses the top of what is on screen and there is more room under the
 * feet, then slid sideways to keep EDGE from either side. Pure.
 */
export function fitBubble(figure: { x: number; top: number; bottom: number }, size: { w: number; h: number }, edges: Edges): BubbleFit {
  if (size.w <= 0 || size.h <= 0 || edges.right <= edges.left || edges.bottom <= edges.top) return { below: false, shift: 0 };
  const roomAbove = figure.top - GAP - size.h - (edges.top + EDGE);
  const roomBelow = edges.bottom - EDGE - (figure.bottom + GAP + size.h);
  const below = roomAbove < 0 && roomBelow > roomAbove;
  const left = figure.x - size.w / 2;
  let shift = 0;
  if (left < edges.left + EDGE) shift = edges.left + EDGE - left;
  else if (left + size.w > edges.right - EDGE) shift = edges.right - EDGE - (left + size.w);
  const most = Math.max(0, size.w / 2 - EDGE);
  return { below, shift: Math.round(Math.max(-most, Math.min(most, shift))) || 0 };
}

/** The scroll that brings `box` inside the scroller's padded area, the least way (as block: "nearest"). */
function nearest(box: Edges, area: Edges): { x: number; y: number } {
  const along = (start: number, end: number, from: number, to: number) =>
    end - start > to - from || start < from ? start - from : end > to ? end - to : 0;
  return { x: along(box.left, box.right, area.left, area.right), y: along(box.top, box.bottom, area.top, area.bottom) };
}

/** Who is talking: a figure's index, and how it was asked (a tap, or the keyboard's turn round the plaza). */
export interface Said {
  index: number;
  via: "tap" | "turn";
  /** A fresh key per line, so a second tap on the same figure restarts its bubble and its timer. */
  key: number;
}

export interface FigureTalk {
  said: Said | null;
  /** A tap on figure `index`, or null to close the bubble. */
  say: (index: number | null) => void;
  /** The next of today's visitors says their line (the people button); undefined when nobody is in the turn. */
  turn: (() => void) | undefined;
  /** What the live region reads: the line, after its place in the turn when the keyboard asked. */
  spoken: string;
}

/**
 * Which figure is talking. One bubble at a time; it closes after BUBBLE_MS,
 * on Escape, on a tap anywhere else, while `paused` (a sheet is open), and
 * whenever the figures change (someone arrived, the island redrew). With
 * `today`, today's visitors add the day's count to what they say.
 */
export function useFigureTalk(figures: readonly Figure[], paused: boolean, today?: Today | null): FigureTalk {
  const [said, setSaid] = useState<Said | null>(null);
  const next = useRef(0);
  const order = useMemo(() => turnOrder(figures), [figures]);

  // A new cast or a sheet over the island: nobody is talking any more (React's "adjust state on change").
  const cast = castKey(figures);
  const [seen, setSeen] = useState({ cast, paused });
  if (seen.cast !== cast || seen.paused !== paused) {
    setSeen({ cast, paused });
    if (said) setSaid(null);
  }

  useEffect(() => {
    if (!said) return;
    const timer = window.setTimeout(() => setSaid(null), BUBBLE_MS);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSaid(null);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("keydown", onKey);
    };
  }, [said]);

  const say = useCallback(
    (index: number | null) => {
      if (index == null || paused) setSaid(null);
      else setSaid({ index, via: "tap", key: ++next.current });
    },
    [paused],
  );

  const turn = useCallback(() => {
    if (order.length === 0) return;
    const key = ++next.current;
    // On from the one who spoke last on a turn; after a tap the turn starts again from the first.
    setSaid((current) => {
      const at = current?.via === "turn" ? order.indexOf(current.index) : -1;
      return { index: order[(at + 1) % order.length], via: "turn", key };
    });
  }, [order]);

  const figure = said ? figures[said.index] : undefined;
  let spoken = "";
  if (said && figure) {
    const line = figureLine(figure, today);
    spoken = said.via === "turn" ? `${FIGURES.nth(order.indexOf(said.index) + 1)}: ${line}` : line;
  }
  return { said: figure ? said : null, say, turn: order.length > 0 ? turn : undefined, spoken };
}

export interface FigureBubbleProps {
  figure: Figure;
  /** The native rect the bubble's box shows (the whole scene, or a story panel's crop): it is placed in percent of it. */
  view: Rect;
  /**
   * The engine's actor boxes now (figures.ts figureBox); absent for figures
   * drawn in place only. Null: the engine does not draw this figure's list
   * yet, so the bubble waits a frame.
   */
  read?: () => readonly (Rect | null)[] | null;
  /** Follow a walking figure frame by frame (off under reduced motion, where nobody walks). */
  follow: boolean;
  /** Scroll it on screen with the figure: a keyboard turn may land on someone out of view. */
  reveal?: boolean;
  /** The figure is no longer drawn: close the bubble. */
  onGone: () => void;
  /** The day's numbers: today's visitors say the count on a second line (figureLine.ts). */
  today?: Today | null;
}

/**
 * A figure's line in a small speech bubble over its head, cream on the dark
 * notch like the plaza's labels, with a stepped pixel tail. With no room over
 * the head (the top of a story panel, the top of the screen) it hangs under
 * the feet instead, its tail pointing up. It follows a walker (style writes
 * only on a frame where the figure moved, no React render per frame) and
 * slides sideways to stay on screen. Each sentence (the line, then the day's
 * count) starts a line of its own, and lines break only between phrases,
 * never inside a Thai word. Decoration only: the live region beside it says
 * the same words. While it is up, the viewer's คุณ tag steps out of sight
 * (PlazaLayer's `talking`), so the bubble never overlaps it.
 */
export function FigureBubble({ figure, view, read, follow, reveal = false, onGone, today }: FigureBubbleProps) {
  const element = useRef<HTMLSpanElement>(null);
  const text = useRef<HTMLSpanElement>(null);
  const gone = useRef(onGone);
  /** The bubble was scrolled into view once: a figure re-sent by a refresh does not scroll again. */
  const revealed = useRef(false);
  useEffect(() => {
    gone.current = onGone;
  });

  useLayoutEffect(() => {
    const node = element.current;
    const box = node?.parentElement;
    if (!node || !box) return;
    let raf = 0;
    let lastBoxes: readonly (Rect | null)[] | null = null;
    let last = "";
    const clips = clippers(node);
    // The line never changes while the bubble is up: its size is read once.
    const size = { w: text.current?.offsetWidth ?? 0, h: node.offsetHeight };
    // A walker is where the engine drew it; anyone else stands in their own box.
    const walks = read != null && figure.actor != null;

    /** Puts the bubble on its figure: reads first (the last frame's layout is still clean), then writes. */
    const place = (force = false): "placed" | "gone" | "wait" => {
      const boxes = walks && read ? read() : NO_BOXES;
      if (boxes == null) return "wait";
      // The engine hands back the same boxes until it paints again: nobody moved.
      if (!force && walks && boxes === lastBoxes) return "placed";
      lastBoxes = boxes;
      const at = figureBox(figure, boxes);
      if (!at) return "gone";
      const key = `${at.x}|${at.y}|${at.w}|${at.h}`;
      if (!force && key === last) return "placed";
      last = key;
      const r = box.getBoundingClientRect();
      const sx = r.width / view.w;
      const sy = r.height / view.h;
      const onScreen = { x: r.left + (at.x + at.w / 2 - view.x) * sx, top: r.top + (at.y - view.y) * sy, bottom: r.top + (at.y + at.h - view.y) * sy };
      const fit = r.width > 0 && r.height > 0 ? fitBubble(onScreen, size, visibleEdges(clips)) : { below: false, shift: 0 };
      const pct = (v: number) => Math.round(v * 10_000) / 10_000;
      node.style.left = `${pct(((at.x + at.w / 2 - view.x) / view.w) * 100)}%`;
      node.style.top = `${pct((((fit.below ? at.y + at.h : at.y) - view.y) / view.h) * 100)}%`;
      if (fit.below) node.dataset.below = "true";
      else delete node.dataset.below;
      node.dataset.placed = "true";
      if (text.current) text.current.style.transform = fit.shift ? `translateX(${fit.shift}px)` : "";
      if (reveal && !revealed.current) {
        revealed.current = true;
        const scroller = clips.find((clip) => clip.scrolls);
        if (scroller && r.width > 0) {
          // The figure and its bubble together, so the person who speaks is seen too.
          const top = fit.below ? onScreen.top : onScreen.top - GAP - size.h;
          const bottom = fit.below ? onScreen.bottom + GAP + size.h : onScreen.bottom;
          const half = Math.max(size.w, at.w * sx) / 2;
          const s = scroller.el.getBoundingClientRect();
          const area = { left: s.left + scroller.pad.left, top: s.top + scroller.pad.top, right: s.right - scroller.pad.right, bottom: s.bottom - scroller.pad.bottom };
          const by = nearest({ left: onScreen.x - half + fit.shift, right: onScreen.x + half + fit.shift, top, bottom }, area);
          if (by.x !== 0 || by.y !== 0) {
            scroller.el.scrollLeft += by.x;
            scroller.el.scrollTop += by.y;
            // Over the head or under the feet again, now that it is where it will be seen.
            return place(true);
          }
        }
      }
      return "placed";
    };

    const step = () => {
      const state = place();
      if (state === "gone") {
        gone.current();
        return;
      }
      // A walker is followed; a list the engine has not drawn yet is tried again next frame.
      if (state === "wait" || (follow && walks)) raf = requestAnimationFrame(step);
    };
    step();
    return () => cancelAnimationFrame(raf);
    // The view's four numbers, not the object: a caller may build it on every render.
  }, [figure, view.x, view.y, view.w, view.h, read, follow, reveal]);

  return (
    <span ref={element} className={styles.bubble} data-bubble={figure.kind} aria-hidden="true">
      <span ref={text} className={styles.bubbleText}>
        {figureWords(figure, today).map((sentence, s) => (
          <span key={s} className={styles.sentence}>
            {phrases(sentence).map((phrase, i) => (
              <Fragment key={i}>
                {i > 0 ? " " : null}
                <span className={styles.phrase}>{phrase}</span>
              </Fragment>
            ))}
          </span>
        ))}
      </span>
    </span>
  );
}
