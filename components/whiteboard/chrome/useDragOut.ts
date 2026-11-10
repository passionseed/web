"use client";

import { viewportCoordsToSceneCoords } from "@excalidraw/excalidraw";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { type PointerEvent as ReactPointerEvent, useCallback, useEffect, useRef } from "react";

import { nextFrame } from "../useViewportTick";
import { dropSize, type ShapeType, tint } from "./toolOptions";

export type DragSpec = {
  kind: "sticky" | ShapeType;
  /** Sticky colour, or the shape's stroke colour. */
  color: string;
  /** Shapes: tinted fill. */
  fill?: boolean;
  /** A press that never left its spot (under 6px), or the keyboard. */
  onClick: () => void;
  /** Released over the canvas: scene coordinates under the pointer. */
  onDrop: (at: { x: number; y: number }) => void;
};

const SLOP = 6;

/** The preview that follows the pointer: the sticky or the shape outline at its size on screen. */
function ghostMarkup({ kind, color, fill }: DragSpec, w: number, h: number): string {
  if (kind === "sticky") return "";
  const paint = `fill="${fill && kind !== "line" && kind !== "arrow" ? tint(color) : "none"}" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"`;
  const r = Math.min(w, h) * 0.12;
  const body =
    kind === "rectangle"
      ? `<rect x="1" y="1" width="${w - 2}" height="${h - 2}" rx="${r}" ${paint}/>`
      : kind === "ellipse"
        ? `<ellipse cx="${w / 2}" cy="${h / 2}" rx="${w / 2 - 1}" ry="${h / 2 - 1}" ${paint}/>`
        : kind === "diamond"
          ? `<polygon points="${w / 2},1 ${w - 1},${h / 2} ${w / 2},${h - 1} 1,${h / 2}" ${paint}/>`
          : `<line x1="2" y1="${h - 2}" x2="${w - 2}" y2="2" ${paint}/>` +
            (kind === "arrow" ? `<polyline points="${w - 2 - r},${2 + r * 0.1} ${w - 2},2 ${w - 2 - r * 0.45},${2 + r * 0.9}" ${paint} fill="none"/>` : "");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`;
}

const LAND_MS = 100;
const RETURN_MS = 140;
const still = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

type Drag = {
  id: number;
  x: number;
  y: number;
  w: number;
  h: number;
  /** The button the drag began on. */
  source: HTMLElement;
  ghost: HTMLElement | null;
  /** Stickies: the ghost is the pad's top sheet, peeled off. */
  peel: boolean;
  offKey: () => void;
};

const padSheet = (source: HTMLElement) => source.querySelector(".wb-pad__top")?.getBoundingClientRect() ?? source.getBoundingClientRect();

function makeGhost(spec: DragSpec, d: Drag): HTMLElement {
  const ghost = document.createElement("div");
  ghost.className = `wb-ghost wb-ghost--${d.peel ? "sticky" : "shape"}`;
  ghost.style.width = `${d.w}px`;
  ghost.style.height = `${d.h}px`;
  if (d.peel) {
    // The sheet starts at the size it has on the pad and grows to its size on the canvas.
    const sheet = document.createElement("div");
    sheet.className = "wb-ghost__sheet";
    sheet.style.background = spec.color;
    sheet.style.setProperty("--peel-from", String(padSheet(d.source).width / d.w));
    ghost.appendChild(sheet);
    d.source.dataset.peeled = "1";
  } else {
    ghost.innerHTML = ghostMarkup(spec, d.w, d.h);
  }
  (d.source.closest(".whiteboard-room") ?? document.body).appendChild(ghost);
  return ghost;
}

/**
 * Takes the ghost away. A peeled sticky straightens before it lands ("land") or goes back to the
 * pad ("return"); shapes, and everything under prefers-reduced-motion, just go. `then` runs once
 * the ghost is where it ends (a landing places the real sticky there).
 */
function dismiss(d: Drag, how: "land" | "return" | "now", then?: () => void) {
  const { ghost, source } = d;
  const clear = () => {
    ghost?.remove();
    delete source.dataset.peeled;
  };
  if (!ghost || !d.peel || how === "now" || still()) {
    clear();
    then?.();
    return;
  }
  if (how === "land") {
    ghost.classList.add("wb-ghost--landing");
    setTimeout(() => {
      then?.();
      // The real sticky is painted a frame or two later: the ghost holds its place until then
      // (or for a moment, where frames are not running).
      const late = setTimeout(clear, 150);
      nextFrame(() =>
        nextFrame(() => {
          clearTimeout(late);
          clear();
        }),
      );
    }, LAND_MS);
    return;
  }
  const home = padSheet(source);
  ghost.classList.add("wb-ghost--return");
  ghost.style.transform = `translate(${Math.round(home.left + home.width / 2 - d.w / 2)}px, ${Math.round(home.top + home.height / 2 - d.h / 2)}px)`;
  setTimeout(clear, RETURN_MS);
}

/**
 * Dragging a sticky or a shape out of the bar onto the canvas. `bind(spec)` gives the pointer
 * handlers for one button. The button keeps the pointer (setPointerCapture) for the whole
 * gesture, so the canvas never sees it: no panning, no stray tool. A release back over the bar,
 * or Escape, cancels. A sticky peels off its pad: the top sheet leaves the bar, tilts and grows
 * to its size on the canvas, and straightens where it is dropped. Mouse, pen and touch.
 */
export function useDragOut(api: ExcalidrawImperativeAPI | null) {
  const drag = useRef<Drag | null>(null);
  // The click that follows a drag's pointerup is not a click.
  const skipClick = useRef(false);

  const end = useCallback((how: "land" | "return" | "now" = "now", then?: () => void) => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    d.offKey();
    dismiss(d, how, then);
  }, []);
  useEffect(() => () => end(), [end]);

  return useCallback(
    (spec: DragSpec) => {
      const overBar = (x: number, y: number) => !!document.elementFromPoint(x, y)?.closest(".wb-bar-wrap");
      const place = (e: ReactPointerEvent) => {
        const d = drag.current;
        if (!d?.ghost) return;
        d.ghost.style.transform = `translate(${Math.round(e.clientX - d.w / 2)}px, ${Math.round(e.clientY - d.h / 2)}px)`;
        d.ghost.classList.toggle("wb-ghost--cancel", overBar(e.clientX, e.clientY));
      };
      return {
        onPointerDown(e: ReactPointerEvent<HTMLElement>) {
          if (!api || !e.isPrimary || e.button !== 0) return;
          end();
          skipClick.current = false;
          const onKey = (k: KeyboardEvent) => {
            if (k.key !== "Escape" || !drag.current?.ghost) return;
            k.stopPropagation();
            skipClick.current = true;
            end("return");
          };
          window.addEventListener("keydown", onKey, true);
          drag.current = {
            id: e.pointerId,
            x: e.clientX,
            y: e.clientY,
            w: 0,
            h: 0,
            source: e.currentTarget,
            ghost: null,
            peel: spec.kind === "sticky",
            offKey: () => window.removeEventListener("keydown", onKey, true),
          };
          e.currentTarget.setPointerCapture(e.pointerId);
        },
        onPointerMove(e: ReactPointerEvent<HTMLElement>) {
          const d = drag.current;
          if (!api || !d || d.id !== e.pointerId) return;
          if (!d.ghost) {
            if (Math.hypot(e.clientX - d.x, e.clientY - d.y) < SLOP) return;
            const zoom = api.getAppState().zoom.value;
            const size = dropSize(spec.kind);
            d.w = Math.max(12, Math.round(size.width * zoom));
            d.h = Math.max(12, Math.round(size.height * zoom));
            d.ghost = makeGhost(spec, d);
          }
          place(e);
        },
        onPointerUp(e: ReactPointerEvent<HTMLElement>) {
          const d = drag.current;
          if (!api || !d || d.id !== e.pointerId) return;
          if (!d.ghost) return end();
          skipClick.current = true;
          if (overBar(e.clientX, e.clientY)) return end("return");
          const at = viewportCoordsToSceneCoords({ clientX: e.clientX, clientY: e.clientY }, api.getAppState());
          end("land", () => spec.onDrop(at));
        },
        onPointerCancel: () => end("return"),
        onClick() {
          if (skipClick.current) {
            skipClick.current = false;
            return;
          }
          spec.onClick();
        },
      };
    },
    [api, end],
  );
}

export type BindDrag = ReturnType<typeof useDragOut>;
