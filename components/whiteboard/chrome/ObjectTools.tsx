"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

import type { DrawMode } from "./toolOptions";

/**
 * The tools drawn as objects on the bar, like FigJam's: a pen, a pad of stickies, and a square,
 * a circle and an arrow that are each their own button. The pen and the pad stand on the bar's
 * bottom edge and are cut off by it; the one in use rises and gets a short bloom on the ground
 * under it, not a chip. Flat fills and ink lines only: colours come from `.wb-art` in
 * whiteboard.css, plus the tool's current colour.
 */

type ObjectProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "title" | "children"> & {
  kind: "pen" | "sticky";
  label: string;
  shortcut?: string;
  active: boolean;
  /** Under the active object: the bloom when it is the tool, an ink line when only its options are open. */
  ground?: "bloom" | "ink";
  children: ReactNode;
};

const tipOf = (label: string, shortcut?: string) => (shortcut ? `${label}  ${shortcut}` : label);
const ariaOf = (label: string, shortcut?: string) => (shortcut ? `${label} (${shortcut})` : label);

export function ObjectTool({ kind, label, shortcut, active, ground = "bloom", children, ...rest }: ObjectProps) {
  return (
    <button
      type="button"
      aria-label={ariaOf(label, shortcut)}
      aria-pressed={active}
      data-tip={tipOf(label, shortcut)}
      data-tip-side="top"
      className={`wb-obj wb-obj--${kind} ${active ? `wb-obj--on wb-obj--${ground}` : ""}`}
      {...rest}
    >
      <span className="wb-obj__clip" aria-hidden>
        <span className="wb-obj__art">{children}</span>
      </span>
    </button>
  );
}

/** The shapes on the main bar. Diamond and line are in the options bar. */
export type ClusterShape = "rectangle" | "ellipse" | "arrow";

const SHAPE_ART: Record<ClusterShape, ReactNode> = {
  rectangle: (
    <svg className="wb-art" viewBox="0 0 38 38" focusable="false">
      <rect className="wb-art__tint" x="1" y="1" width="36" height="36" rx="5" />
    </svg>
  ),
  ellipse: (
    <svg className="wb-art" viewBox="0 0 36 36" focusable="false">
      <circle className="wb-art__card" cx="18" cy="18" r="17" />
    </svg>
  ),
  arrow: (
    <svg className="wb-art" viewBox="0 0 34 28" focusable="false">
      <path d="M3 5.5C16 2.5 27 8.5 28.5 22" />
      <path d="M21.5 16.5l7 6.5 4-8.5" />
    </svg>
  ),
};

/** FigJam's cluster: a square on the left, a circle bottom right, a curved arrow top right. */
export function ShapeCluster({ active, children }: { active: boolean; children: ReactNode }) {
  return (
    <div className={`wb-shapes ${active ? "wb-shapes--on" : ""}`} role="group" aria-label="รูปทรง · Shapes">
      {children}
    </div>
  );
}

/** One shape of the cluster: its own button, so the shape you grab is the shape you drag out. */
export function ShapeObject({
  type,
  label,
  shortcut,
  active,
  ...rest
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "title" | "children" | "type"> & { type: ClusterShape; label: string; shortcut: string; active: boolean }) {
  return (
    <button
      type="button"
      aria-label={ariaOf(label, shortcut)}
      aria-pressed={active}
      data-tip={tipOf(label, shortcut)}
      data-tip-side="top"
      className={`wb-shape wb-shape--${type} ${active ? "wb-shape--on" : ""}`}
      {...rest}
    >
      {SHAPE_ART[type]}
    </button>
  );
}

/** A marker (round nib) or a highlighter (chisel nib); the nib and the band carry the stroke colour. */
export function PenArt({ mode, color }: { mode: DrawMode; color: string }) {
  const chisel = mode === "highlighter";
  return (
    <svg className="wb-art" width="45" height="96" viewBox="0 0 30 64" focusable="false">
      {chisel ? (
        <>
          <path d="M11 13V8.2l8-3.7V13z" style={{ fill: color }} />
          <path className="wb-art__card" d="M8.5 21 11 13h8l2.5 8z" />
          <rect className="wb-art__paper" x="6.5" y="21" width="17" height="48" rx="2.5" />
          <rect x="6.5" y="27" width="17" height="5" style={{ fill: color }} />
        </>
      ) : (
        <>
          <path d="M12.2 13 15 4.5l2.8 8.5z" style={{ fill: color }} />
          <path className="wb-art__card" d="M10 21l2.2-8h5.6l2.2 8z" />
          <rect className="wb-art__paper" x="8" y="21" width="14" height="48" rx="2.5" />
          <rect x="8" y="27" width="14" height="5" style={{ fill: color }} />
        </>
      )}
      <path className="wb-art__soft" d="M12 37v30" />
    </svg>
  );
}

/**
 * A pad of stickies in the colour of the next one: two sheets askew at the bottom, the next
 * sheet, and the top sheet with one corner curling up. The top sheet is its own group
 * (`.wb-pad__top`): it lifts on hover and is hidden while it is being dragged out
 * (chrome/useDragOut.ts), which leaves the next sheet showing.
 */
export function StickyArt({ color }: { color: string }) {
  const sheet = { x: 9, y: 8, width: 54, height: 54, rx: 2 };
  return (
    <svg className="wb-art wb-pad" width="72" height="72" viewBox="0 0 72 72" focusable="false">
      <g transform="rotate(-9 36 38)">
        <rect {...sheet} style={{ fill: color }} />
        <rect className="wb-pad__shade wb-pad__shade--deep" {...sheet} />
      </g>
      <g transform="rotate(6 36 38)">
        <rect {...sheet} style={{ fill: color }} />
        <rect className="wb-pad__shade" {...sheet} />
      </g>
      <rect {...sheet} style={{ fill: color }} />
      <g className="wb-pad__top">
        <path d="M11 8h50a2 2 0 0 1 2 2v37L48 62H11a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2z" style={{ fill: color }} />
        <path d="M48 62V50.5a3.5 3.5 0 0 1 3.5-3.5H63z" style={{ fill: color }} />
        <path className="wb-pad__curl" d="M48 62V50.5a3.5 3.5 0 0 1 3.5-3.5H63z" />
      </g>
    </svg>
  );
}

/** Small versions for the pen's options: marker, highlighter, eraser. */
export function NibIcon({ mode, color }: { mode: DrawMode | "eraser"; color?: string }) {
  return (
    <svg className="wb-art wb-art--sm" width="24" height="24" viewBox="0 0 24 24" focusable="false" aria-hidden>
      {mode === "marker" && (
        <>
          <path d="M10.2 7.5 12 2.5l1.8 5z" style={{ fill: color }} />
          <path className="wb-art__card" d="M8.8 12l1.4-4.5h3.6l1.4 4.5z" />
          <rect className="wb-art__paper" x="7.5" y="12" width="9" height="10" rx="1.5" />
        </>
      )}
      {mode === "highlighter" && (
        <>
          <path d="M9.2 7.5V5l5.6-2.5v5z" style={{ fill: color }} />
          <path className="wb-art__card" d="M7.6 12l1.6-4.5h5.6l1.6 4.5z" />
          <rect className="wb-art__paper" x="6.5" y="12" width="11" height="10" rx="1.5" />
        </>
      )}
      {mode === "eraser" && (
        <g transform="rotate(35 12 12)">
          <rect className="wb-art__paper" x="7" y="3" width="10" height="18" rx="2" />
          <path className="wb-art__tint" d="M7 12h10v7a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2z" />
        </g>
      )}
    </svg>
  );
}
