"use client";

import { useEffect, useRef } from "react";

import { CLOSEUP_SIZE, closeupGrid, gridToRgba, type CloseupInput } from "@/lib/shift-island/tree-closeup";

import { useReducedMotion } from "../useReducedMotion";
import styles from "./tree.module.css";

/**
 * "full": sky, tree and the cut-open ground. "tree": a square around the
 * tree, for small previews. "canopy": a small square of the leaves (show it
 * at twice the scale), where the leaf shapes can be told apart.
 */
export type TreeView = "full" | "tree" | "canopy";

/** Each view's window on the 96 x 150 close-up: [top, bottom) rows and [left, right) columns. */
const WINDOWS: Record<TreeView, { rows: readonly [number, number]; cols: readonly [number, number] }> = {
  full: { rows: [0, CLOSEUP_SIZE.h], cols: [0, CLOSEUP_SIZE.w] },
  // From just under the top of the sky to just under the grass.
  tree: { rows: [4, 100], cols: [0, CLOSEUP_SIZE.w] },
  // The top of a stage 5 canopy, or the middle of a bigger one.
  canopy: { rows: [14, 62], cols: [24, 72] },
};
/** One stage of the grow-in. */
const STEP_MS = 140;

/**
 * The grow-in: the seed, then each stage up to the tree's own, its roots
 * growing along, ending on the input itself. An empty plot or a seed is one
 * frame.
 */
export function growFrames(input: CloseupInput): CloseupInput[] {
  const stage = Math.min(Math.max(Math.trunc(input.stage) || 0, 0), 7);
  const frames: CloseupInput[] = [];
  for (let s = 0; s < stage; s++) {
    const k = s / stage;
    frames.push({
      ...input,
      stage: s,
      seeded: true,
      roots: { count: Math.round(input.roots.count * k), recent: Math.round(input.roots.recent * k) },
    });
  }
  frames.push(input);
  return frames;
}

function draw(context: CanvasRenderingContext2D, input: CloseupInput, view: TreeView): void {
  const { rows, cols } = WINDOWS[view];
  const grid = closeupGrid(input)
    .slice(...rows)
    .map((row) => row.slice(...cols));
  const { width, height, data } = gridToRgba(grid, 1);
  const image = context.createImageData(width, height);
  image.data.set(data);
  context.putImageData(image, 0, 0);
}

interface TreeCanvasProps {
  input: CloseupInput;
  /** CSS pixels per close-up pixel: a whole number, so every pixel stays square and crisp. */
  scale: number;
  view?: TreeView;
  /** Grow in from the seed the first time it is drawn (never with reduced motion). */
  grow?: boolean;
  /** The picture's accessible name; without one the canvas is decorative. */
  label?: string;
  className?: string;
}

/**
 * The tree close-up on a canvas: one canvas pixel per grid pixel, scaled up
 * by a whole number with `image-rendering: pixelated`. Draws nothing (and
 * never throws) where there is no 2D canvas.
 */
export function TreeCanvas({ input, scale, view = "full", grow = false, label, className }: TreeCanvasProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();
  // Set once the grow-in has played to its last frame: a new look after that is drawn at once.
  const grown = useRef(false);
  const { shape, leaf, bark, bloom } = input.style;
  const { stage, seeded } = input;
  const { count, recent } = input.roots;

  useEffect(() => {
    const element = canvas.current;
    const context = element && typeof element.getContext === "function" ? element.getContext("2d") : null;
    if (!context) return;
    const final: CloseupInput = { style: { shape, leaf, bark, bloom }, stage, seeded, roots: { count, recent } };
    const frames = grow && !reduced && !grown.current ? growFrames(final) : [final];
    let timer: number | undefined;
    const show = (i: number) => {
      draw(context, frames[i], view);
      if (i + 1 < frames.length) timer = window.setTimeout(() => show(i + 1), STEP_MS);
      else grown.current = true;
    };
    show(0);
    return () => window.clearTimeout(timer);
  }, [shape, leaf, bark, bloom, stage, seeded, count, recent, view, grow, reduced]);

  const { rows, cols } = WINDOWS[view];
  const width = cols[1] - cols[0];
  const height = rows[1] - rows[0];
  const k = Math.max(1, Math.trunc(scale) || 1);
  return (
    <canvas
      ref={canvas}
      width={width}
      height={height}
      className={className ? `${styles.canvas} ${className}` : styles.canvas}
      // The height follows from the canvas's own ratio, so a very narrow screen can shrink it rather than overflow.
      style={{ width: width * k }}
      {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}
    />
  );
}
