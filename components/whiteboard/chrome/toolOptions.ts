"use client";

import type { ExcalidrawElementSkeleton } from "@excalidraw/excalidraw/data/transform";
import type { AppState, ExcalidrawImperativeAPI, ToolType } from "@excalidraw/excalidraw/types";
import { useCallback, useEffect, useRef, useState } from "react";

import { STICKY_COLORS } from "@/lib/whiteboard/core";

/** Colour dots in the options bar. The first one is the board's ink. */
export const INK_COLORS = [
  { name: "ดำ · Black", value: "#1e1e1e" },
  { name: "แดง · Red", value: "#e03131" },
  { name: "ส้ม · Orange", value: "#f08c00" },
  { name: "เหลือง · Yellow", value: "#f5c211" },
  { name: "เขียว · Green", value: "#2f9e44" },
  { name: "น้ำเงิน · Blue", value: "#1971c2" },
  { name: "ม่วง · Violet", value: "#7048e8" },
  { name: "ขาว · White", value: "#ffffff" },
] as const;

export const STICKY_THAI: Record<string, string> = {
  Yellow: "เหลือง",
  Orange: "ส้ม",
  Pink: "ชมพู",
  Purple: "ม่วง",
  Blue: "ฟ้า",
  Green: "เขียว",
  Gray: "เทา",
};

export const TEXT_SIZES = [
  { key: "S", label: "เล็ก · Small", value: 16 },
  { key: "M", label: "กลาง · Medium", value: 20 },
  { key: "L", label: "ใหญ่ · Large", value: 28 },
  { key: "XL", label: "ใหญ่มาก · Extra large", value: 36 },
] as const;

export type ShapeType = "rectangle" | "ellipse" | "diamond" | "line" | "arrow";
export const SHAPE_TYPES: readonly ShapeType[] = ["rectangle", "ellipse", "diamond", "line", "arrow"];
export const isShape = (tool: ToolType): tool is ShapeType => (SHAPE_TYPES as readonly string[]).includes(tool);

/** Tools reached from the end of the shapes options. */
export const MORE_TYPES: readonly ToolType[] = ["image", "laser", "embeddable"];

export type DrawMode = "marker" | "highlighter";
export type PenMode = DrawMode | "eraser";
type Nib = { color: string; thick: boolean };

export type ToolOptions = {
  pen: { mode: DrawMode; marker: Nib; highlighter: Nib };
  sticky: string;
  shape: { color: string; fill: boolean };
  text: { size: number; color: string };
};

const INITIAL: ToolOptions = {
  pen: { mode: "marker", marker: { color: INK_COLORS[0].value, thick: false }, highlighter: { color: INK_COLORS[3].value, thick: false } },
  sticky: STICKY_COLORS[0].fill,
  shape: { color: INK_COLORS[0].value, fill: false },
  text: { size: 20, color: INK_COLORS[0].value },
};

const STROKE = { marker: [2, 4], highlighter: [6, 10] } as const;
const HIGHLIGHT_OPACITY = 40;

/** A light wash of a colour, for a shape's fill. */
export function tint(hex: string, amount = 0.82): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const mix = (c: number) => Math.round(c + (255 - c) * amount);
  const out = (mix((n >> 16) & 255) << 16) | (mix((n >> 8) & 255) << 8) | mix(n & 255);
  return `#${out.toString(16).padStart(6, "0")}`;
}

/** What Excalidraw should draw the next element with, for the active tool. Null: leave it alone. */
function defaultsFor(tool: ToolType, o: ToolOptions): Partial<AppState> | null {
  if (tool === "freedraw") {
    const nib = o.pen[o.pen.mode];
    return {
      currentItemStrokeColor: nib.color,
      currentItemStrokeWidth: STROKE[o.pen.mode][nib.thick ? 1 : 0],
      currentItemOpacity: o.pen.mode === "highlighter" ? HIGHLIGHT_OPACITY : 100,
    };
  }
  if (isShape(tool)) {
    return {
      currentItemStrokeColor: o.shape.color,
      currentItemBackgroundColor: o.shape.fill ? tint(o.shape.color) : "transparent",
      ...(o.shape.fill ? { currentItemFillStyle: "solid" as const } : {}),
      currentItemStrokeWidth: 2,
      currentItemOpacity: 100,
    };
  }
  if (tool === "text") {
    return { currentItemStrokeColor: o.text.color, currentItemFontSize: o.text.size, currentItemOpacity: 100 };
  }
  return null;
}

/**
 * The options of the pen, sticky, shape and text tools. They live here, not in Excalidraw: it
 * has one stroke colour for every tool, so each time a tool becomes active (from the bar or
 * from a shortcut) or one of its options changes, its own values are written to Excalidraw.
 */
export function useToolOptions(api: ExcalidrawImperativeAPI | null, tool: ToolType) {
  const [options, setOptions] = useState<ToolOptions>(INITIAL);
  // True while the highlighter's see-through stroke is what Excalidraw holds.
  const faded = useRef(false);

  useEffect(() => {
    if (!api) return;
    const next = defaultsFor(tool, options);
    if (next) {
      faded.current = next.currentItemOpacity !== 100;
      api.updateScene({ appState: next as Pick<AppState, keyof AppState> });
    } else if (faded.current && tool !== "eraser") {
      // Nothing else on the board should come out see-through.
      faded.current = false;
      api.updateScene({ appState: { currentItemOpacity: 100 } });
    }
  }, [api, tool, options]);

  /** Changes the nib (marker or highlighter) that is in use. */
  const setNib = useCallback((value: Partial<Nib>) => {
    setOptions((o) => ({ ...o, pen: { ...o.pen, [o.pen.mode]: { ...o.pen[o.pen.mode], ...value } } }));
  }, []);

  return { options, setOptions, setNib };
}

const SHAPE_SIZE = 160;

/** A shape as it is dropped out of the bar, drawn with the shape options and the board's own style. */
export function shapeSkeleton(type: ShapeType, o: ToolOptions["shape"], appState: AppState): ExcalidrawElementSkeleton {
  const linear = type === "line" || type === "arrow";
  const round = appState.currentItemRoundness === "round";
  return {
    type,
    x: 0,
    y: 0,
    width: SHAPE_SIZE,
    height: linear ? SHAPE_SIZE * 0.6 : SHAPE_SIZE,
    // Lines and arrows run up to the right.
    ...(linear ? { points: [[0, 0], [SHAPE_SIZE, -SHAPE_SIZE * 0.6]] } : {}),
    strokeColor: o.color,
    backgroundColor: !linear && o.fill ? tint(o.color) : "transparent",
    fillStyle: o.fill ? "solid" : appState.currentItemFillStyle,
    strokeWidth: 2,
    strokeStyle: appState.currentItemStrokeStyle,
    roughness: appState.currentItemRoughness,
    roundness: type === "rectangle" && round ? { type: 3 } : type === "diamond" && round ? { type: 2 } : null,
  } as ExcalidrawElementSkeleton;
}

/** On-screen size of a dragged shape or sticky, in scene units. */
export const dropSize = (kind: "sticky" | ShapeType): { width: number; height: number } =>
  kind === "sticky" ? { width: 200, height: 200 } : kind === "line" || kind === "arrow" ? { width: SHAPE_SIZE, height: SHAPE_SIZE * 0.6 } : { width: SHAPE_SIZE, height: SHAPE_SIZE };
