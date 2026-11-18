"use client";

import { Fragment, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import { bubbleAnchor, figureBox, type Figure } from "@/lib/shift-island/live/figures";
import type { Rect } from "@/lib/shift-island/live/geometry";

import { FIGURES } from "../copy";
import styles from "../world.module.css";
import { figureLine, turnOrder } from "./figureLine";

/** How long a line stays up: long enough to read twice, then the island is clear again. */
export const BUBBLE_MS = 5000;

const NO_BOXES: readonly (Rect | null)[] = [];
/** CSS px a bubble keeps from the edge of what is on screen. */
const EDGE = 8;

/** Who the figures are, without where they stand: a new cast resets the talk, a seat shifting an index does not. */
const castKey = (figures: readonly Figure[]) => figures.map((f) => `${f.kind}:${f.n}:${f.mine ? 1 : 0}`).join(",");

/** Every ancestor that clips (the world's scroller, the story's frame): a bubble keeps inside all of them. */
function clippers(node: HTMLElement): HTMLElement[] {
  const out: HTMLElement[] = [];
  for (let el = node.parentElement; el && el !== document.body; el = el.parentElement) {
    if (getComputedStyle(el).overflowX !== "visible") out.push(el);
  }
  return out;
}

/** Slides the bubble's text sideways to keep it on screen; its tail stays over the head. */
function keepOnScreen(text: HTMLElement, clips: readonly HTMLElement[]): void {
  text.style.transform = "";
  const r = text.getBoundingClientRect();
  let left = 0;
  let right = window.innerWidth;
  for (const el of clips) {
    const c = el.getBoundingClientRect();
    left = Math.max(left, c.left);
    right = Math.min(right, c.right);
  }
  let shift = 0;
  if (r.left < left + EDGE) shift = left + EDGE - r.left;
  else if (r.right > right - EDGE) shift = right - EDGE - r.right;
  const most = Math.max(0, r.width / 2 - EDGE);
  shift = Math.round(Math.max(-most, Math.min(most, shift)));
  if (shift !== 0) text.style.transform = `translateX(${shift}px)`;
}

/** Who is talking: a figure's index, and how it was asked (a tap, or the keyboard's turn round the island). */
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
  /** The next figure in turn order says its line (the people button). */
  turn: () => void;
  /** What the live region reads: the line, after its place in the turn when the keyboard asked. */
  spoken: string;
}

/**
 * Which figure is talking. One bubble at a time; it closes after BUBBLE_MS,
 * on Escape, on a tap anywhere else, while `paused` (a sheet is open), and
 * whenever the figures change (someone arrived, the island redrew).
 */
export function useFigureTalk(figures: readonly Figure[], paused: boolean): FigureTalk {
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
    const line = figureLine(figure);
    spoken = said.via === "turn" ? `${FIGURES.nth(order.indexOf(said.index) + 1, order.length)}: ${line}` : line;
  }
  return { said: figure ? said : null, say, turn, spoken };
}

export interface FigureBubbleProps {
  figure: Figure;
  /** The native rect the bubble's box shows (the whole scene, or a story panel's crop): it is placed in percent of it. */
  view: Rect;
  /** The engine's actor boxes now (figures.ts figureBox); absent for figures drawn in place only. */
  read?: () => readonly (Rect | null)[];
  /** Follow a walking figure frame by frame (off under reduced motion, where nobody walks). */
  follow: boolean;
  /** Scroll it on screen: a keyboard turn may land on someone out of view. */
  reveal?: boolean;
  /** The figure is no longer drawn: close the bubble. */
  onGone: () => void;
}

/**
 * A figure's line in a small speech bubble over its head, cream on the dark
 * notch like the plaza's labels, with a stepped pixel tail. It follows a
 * walker (style writes only when the figure moved, no React render per
 * frame) and slides sideways to stay on screen. Lines break only between
 * their phrases, never inside a Thai word. Decoration only: the live region
 * beside it says the same words.
 */
export function FigureBubble({ figure, view, read, follow, reveal = false, onGone }: FigureBubbleProps) {
  const element = useRef<HTMLSpanElement>(null);
  const text = useRef<HTMLSpanElement>(null);
  const gone = useRef(onGone);
  useEffect(() => {
    gone.current = onGone;
  });

  useLayoutEffect(() => {
    let raf = 0;
    let last = "";
    const clips = element.current ? clippers(element.current) : [];
    const place = (): boolean => {
      const node = element.current;
      const box = figureBox(figure, read ? read() : NO_BOXES);
      if (!node || !box) return false;
      const at = bubbleAnchor(box, view);
      const key = `${at.x}|${at.y}`;
      if (key !== last) {
        last = key;
        node.style.left = `${at.x}%`;
        node.style.top = `${at.y}%`;
        if (text.current) keepOnScreen(text.current, clips);
      }
      return true;
    };
    if (!place()) {
      gone.current();
      return;
    }
    if (reveal) element.current?.scrollIntoView?.({ block: "nearest", inline: "nearest" });
    if (follow && figure.actor != null) {
      const loop = () => {
        if (!place()) {
          gone.current();
          return;
        }
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    }
    return () => cancelAnimationFrame(raf);
    // The view stands for its four numbers: a caller may build it on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [figure, view.x, view.y, view.w, view.h, read, follow, reveal]);

  return (
    <span ref={element} className={styles.bubble} data-bubble={figure.kind} aria-hidden="true">
      <span ref={text} className={styles.bubbleText}>
        {figureLine(figure)
          .split(" ")
          .map((phrase, i) => (
            <Fragment key={i}>
              {i > 0 ? " " : null}
              <span className={styles.phrase}>{phrase}</span>
            </Fragment>
          ))}
      </span>
    </span>
  );
}
