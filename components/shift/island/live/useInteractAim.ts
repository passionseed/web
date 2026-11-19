"use client";

import { useEffect, useRef, type RefObject } from "react";

import { REACH_PX, mapCentre, toNative } from "@/lib/shift-island/live/interact";
import { HUD_RESERVE, type Insets } from "@/lib/shift-island/live/world";

import type { IslandInteract } from "./IslandCanvas";

/** A screen whose main pointer can hover: the outline follows the mouse there. */
const HOVER_POINTER = "(hover: hover) and (pointer: fine)";

interface AimInput {
  /** The world that scrolls the island. */
  world: RefObject<HTMLDivElement | null>;
  /** The picture's box over the canvas; `size` is its native size. */
  overlay: HTMLDivElement | null;
  size: { width: number; height: number } | null;
  /** CSS px per native px. */
  scale: number;
  /** The whole island between the HUD bars: it never scrolls, so only a mouse aims there. */
  whole: boolean;
  safe: Insets;
  /** The living island's steering (IslandCanvas `interact`). */
  steer: RefObject<IslandInteract | null>;
  /** Off: no aim (nothing to pick, or the canvas does not draw). */
  on: boolean;
  /** Changes when the aim must be read again without a scroll or a move (the canvas became ready, the layout changed). */
  watch: unknown;
}

/**
 * Where the interact outline looks (interact.ts): on a touch screen the
 * middle of the visible map, between the HUD bars, as the player scrolls;
 * on a desktop the mouse pointer, and nowhere once it leaves the map. A
 * touch on a desktop that has one switches to the middle, a mouse move back
 * to the pointer. Plain DOM listeners and at most one read per animation
 * frame: the point goes straight to the living island, never through React.
 */
export function useInteractAim(input: AimInput): void {
  const latest = useRef(input);
  useEffect(() => {
    latest.current = input;
  });
  /** How the player aims, and the mouse's last point (client px); kept across re-reads. */
  const how = useRef<{ mode: "centre" | "pointer" | null; pointer: { x: number; y: number } | null }>({ mode: null, pointer: null });
  const { world, steer, on, watch } = input;

  useEffect(() => {
    const element = world.current;
    if (!element || !on) {
      steer.current?.aim(null);
      return;
    }
    const state = how.current;
    if (!state.mode) state.mode = typeof window.matchMedia === "function" && window.matchMedia(HOVER_POINTER).matches ? "pointer" : "centre";
    let frame = 0;

    const read = () => {
      frame = 0;
      const { overlay, size, scale, whole, safe } = latest.current;
      const handle = steer.current;
      if (!handle) return;
      const mode = state.mode ?? "centre";
      let client: { x: number; y: number } | null = null;
      if (mode === "pointer") client = state.pointer;
      else if (!whole) {
        const box = element.getBoundingClientRect();
        client = mapCentre(
          { left: box.left + element.clientLeft, top: box.top + element.clientTop, width: element.clientWidth, height: element.clientHeight },
          { top: safe.top + HUD_RESERVE.top, bottom: safe.bottom + HUD_RESERVE.bottom }
        );
      }
      const point = client && overlay && size && scale > 0 ? toNative(client, overlay.getBoundingClientRect(), size) : null;
      handle.aim(point ? { x: point.x, y: point.y, reach: REACH_PX[mode] / scale } : null);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(read);
    };
    const move = (event: PointerEvent) => {
      if (event.pointerType === "mouse") {
        state.mode = "pointer";
        state.pointer = { x: event.clientX, y: event.clientY };
      } else {
        state.mode = "centre";
      }
      schedule();
    };
    const leave = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      state.pointer = null;
      schedule();
    };

    element.addEventListener("pointermove", move, { passive: true });
    element.addEventListener("pointerdown", move, { passive: true });
    element.addEventListener("pointerleave", leave);
    element.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    schedule();
    return () => {
      element.removeEventListener("pointermove", move);
      element.removeEventListener("pointerdown", move);
      element.removeEventListener("pointerleave", leave);
      element.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [world, steer, on, watch]);
}
