"use client";

import { useEffect, useRef, type RefObject } from "react";

import type { IslandScene } from "@/bot/src/quests/island/scene";
import { LiveIsland, type LiveIslandProps } from "@/lib/shift-island/live/engine";
import type { Rect } from "@/lib/shift-island/live/geometry";
import type { LightPhase, LiveActor } from "@/lib/shift-island/live/types";

/**
 * Reads where each actor stands on screen now (LiveIsland.actorBoxes), for
 * taps on the people. Given the actors the caller's indexes point into, it
 * answers null until the engine draws that same list.
 */
export type ActorBoxes = (actors?: readonly LiveActor[]) => readonly (Rect | null)[] | null;

export interface IslandCanvasProps {
  scene: IslandScene;
  /** Default "auto": Asia/Bangkok time, decided after mount (so no hydration mismatch). */
  phase?: LightPhase | "auto";
  /** True stops every timer (a sheet is open). */
  paused?: boolean;
  /** One frame, no loop. prefers-reduced-motion forces it. */
  still?: boolean;
  /** Extra sprites drawn above the trees, native px (the story's people). */
  actors?: LiveActor[];
  /** Boat, gulls and cloud shadows (default true). */
  ambient?: boolean;
  /** Native px; the canvas's intrinsic size becomes crop w and h. Default: the whole scene. */
  crop?: { x: number; y: number; w: number; h: number };
  className?: string;
  /** The first frame is drawn. */
  onReady?: () => void;
  /** No 2D context, or anything threw: keep a fallback. */
  onFail?: () => void;
  /** The light changed (also called once with the first phase): the phase and the open sea's colour in it. */
  onPhase?: (phase: LightPhase, water: string) => void;
  /** The element that scrolls this canvas: only what is on screen is repainted per tick. */
  scroller?: RefObject<HTMLElement | null>;
  /** The whole island fitted to its box: fewer ticks, and a still sea when it is tiny. */
  fit?: boolean;
  /** Gives the canvas role="img" with this name; without it the canvas is hidden from assistive tech. */
  label?: string;
  /** Filled with a reader of the actors' boxes while the engine lives (null otherwise): taps hit-test the people with it. */
  actorBoxes?: { current: ActorBoxes | null };
  /** The slots whose signpost carries a name's board (PlotSigns hangs it there): close view only. */
  signs?: readonly number[];
}

const NO_ACTORS: LiveActor[] = [];
const NO_SIGNS: readonly number[] = [];

/**
 * The living island: one pixelated canvas drawn from the scene (sea frames,
 * foam, boat, gulls, cloud shadows, swaying trees, Bangkok light). Safe to
 * load with next/dynamic and ssr:false. The engine lives as long as this
 * component: new props rebuild what they must and keep the clock.
 */
export default function IslandCanvas({
  scene,
  phase = "auto",
  paused = false,
  still = false,
  actors = NO_ACTORS,
  ambient = true,
  crop,
  className,
  onReady,
  onFail,
  onPhase,
  scroller,
  fit = false,
  label,
  actorBoxes,
  signs = NO_SIGNS,
}: IslandCanvasProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const engine = useRef<LiveIsland | null>(null);
  const events = useRef({ onReady, onFail, onPhase });
  const cropKey = crop ? `${crop.x},${crop.y},${crop.w},${crop.h}` : "";
  const signsKey = signs.join(",");

  const props = (): LiveIslandProps => ({
    scene,
    phase,
    paused,
    still,
    actors,
    ambient,
    crop: crop ? { x: crop.x, y: crop.y, w: crop.w, h: crop.h } : null,
    fit,
    scroller: scroller?.current ?? null,
    signs,
  });
  const latest = useRef(props);

  useEffect(() => {
    events.current = { onReady, onFail, onPhase };
    latest.current = props;
  });

  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const live = new LiveIsland(el, latest.current(), {
      onReady: () => events.current.onReady?.(),
      onFail: () => events.current.onFail?.(),
      onPhase: (p, water) => events.current.onPhase?.(p, water),
    });
    engine.current = live;
    const boxes = actorBoxes;
    if (boxes) boxes.current = (actors) => live.actorBoxes(actors);
    return () => {
      live.destroy();
      engine.current = null;
      if (boxes) boxes.current = null;
    };
    // One engine per canvas; the reader's holder is fixed for its life too.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    engine.current?.update(latest.current());
    // cropKey stands for crop and signsKey for signs; the engine compares actors by value.
  },[scene, phase, paused, still, actors, ambient, cropKey, fit, scroller, signsKey]);

  return (
    <canvas
      ref={canvas}
      className={className}
      width={crop ? Math.max(1, Math.round(crop.w)) : scene.width}
      height={crop ? Math.max(1, Math.round(crop.h)) : scene.height}
      style={{ imageRendering: "pixelated" }}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    />
  );
}
