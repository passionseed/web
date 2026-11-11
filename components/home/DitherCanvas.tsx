"use client";

import { useEffect, useRef } from "react";

import { paintDawn, paintSky, type DitherFrame } from "./dither";

/** CSS pixels per dither cell: small enough to read as texture, not blocks. */
const CELL = 3;
/** The sky drifts slowly, so a few frames a second is plenty. */
const FRAME_MS = 110;

const SCENES = {
  /** Fixed behind the whole page; drifts with time and scroll. */
  sky: { paint: paintSky, moves: true, className: "home-dither-sky" },
  /** Fills its section; drawn once per size. */
  dawn: { paint: paintDawn, moves: false, className: "home-dither-dawn" },
} as const;

/**
 * A canvas of dithered pixels, drawn one cell per canvas pixel and scaled up
 * with hard edges. Decoration only: hidden from assistive tech, still under
 * reduced motion, and idle while the tab is in the background.
 */
export function DitherCanvas({ scene }: { scene: keyof typeof SCENES }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const { paint, moves, className } = SCENES[scene];

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const animate =
      moves && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const started = performance.now();
    let image: ImageData | null = null;
    let frame: Omit<DitherFrame, "time" | "scroll"> | null = null;
    let raf = 0;
    let last = 0;

    const draw = () => {
      if (!image || !frame) return;
      const time = animate ? (performance.now() - started) / 1000 : 0;
      paint({ ...frame, time, scroll: animate ? window.scrollY : 0 });
      ctx.putImageData(image, 0, 0);
    };

    const resize = () => {
      const cols = Math.ceil(canvas.clientWidth / CELL);
      const rows = Math.ceil(canvas.clientHeight / CELL);
      if (!cols || !rows) return;
      canvas.width = cols;
      canvas.height = rows;
      image = ctx.createImageData(cols, rows);
      frame = {
        pixels: new Uint32Array(image.data.buffer),
        cols,
        rows,
        cell: CELL,
      };
      draw();
    };

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (now - last < FRAME_MS || document.hidden) return;
      last = now;
      draw();
    };

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();
    if (animate) raf = requestAnimationFrame(tick);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [paint, moves]);

  return (
    <canvas
      ref={ref}
      className={`home-dither ${className}`}
      aria-hidden="true"
    />
  );
}
