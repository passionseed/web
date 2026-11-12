"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

import styles from "./islandInvite.module.css";
import { useReducedMotion } from "./useReducedMotion";
import { drawSeaFrame, prepareSea, type Sea } from "./shoreSea";

/** Share of the screen the sand covers, read by both the CSS strip and the sea. */
const SAND = 0.26;
/** The cork pops, then the letter opens. */
const OPEN_DELAY_MS = 600;
/** Pixel-art pace: the sea moves in steps, not at 60fps. */
const FRAME_MS = 1000 / 12;

/**
 * Scene 1: a dusk sea, a bottle drifting in to land on the sand. Tapping the
 * bottle (or Enter on it) pops the cork and opens the letter.
 */
export function BottleShore({ onOpen, hint }: { onOpen: () => void; hint: string }) {
  const reduced = useReducedMotion();
  const [opening, setOpening] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    [],
  );

  const open = () => {
    if (reduced) {
      onOpen();
      return;
    }
    if (opening) return;
    setOpening(true);
    timer.current = window.setTimeout(onOpen, OPEN_DELAY_MS);
  };

  return (
    <section className={styles.shore} style={{ "--sand": `${SAND * 100}%` } as CSSProperties}>
      <SeaCanvas still={reduced} sand={SAND} />
      <div className={styles.sand} aria-hidden="true" />

      <button
        type="button"
        className={styles.bottle}
        aria-label={hint}
        data-state={opening ? "opening" : undefined}
        data-scene-focus
        onClick={open}
      >
        <span className={styles.bottleGlow} aria-hidden="true" />
        <span className={styles.bottleFloat}>
          <PixelBottle />
        </span>
        <span className={styles.bottleHint} aria-hidden="true">
          {hint}
        </span>
      </button>
    </section>
  );
}

/**
 * The sea as a small canvas. Draws in device pixels so each sea "pixel" is a
 * whole number of screen pixels at any devicePixelRatio. The loop runs only
 * while the canvas is on screen and the tab is visible; `still` draws one frame.
 */
function SeaCanvas({ still, sand }: { still: boolean; sand: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    let sea: Sea | null = null;
    let frame = 0;
    let last = 0;
    let onScreen = true;
    const start = performance.now();

    const draw = (now: number) => {
      if (sea) drawSeaFrame(ctx, sea, still ? 0 : (now - start) / 1000);
    };

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const { width, height } = canvas.getBoundingClientRect();
      if (width === 0 || height === 0) return;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      sea = prepareSea(canvas, { dpr, cssWidth: width, sand });
      draw(performance.now());
    };

    const tick = (now: number) => {
      frame = requestAnimationFrame(tick);
      if (now - last < FRAME_MS) return;
      last = now;
      draw(now);
    };

    const run = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      if (!still && onScreen && !document.hidden) frame = requestAnimationFrame(tick);
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    const viewObserver = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      run();
    });
    viewObserver.observe(canvas);
    document.addEventListener("visibilitychange", run);

    resize();
    run();

    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      viewObserver.disconnect();
      document.removeEventListener("visibilitychange", run);
    };
  }, [still, sand]);

  return <canvas ref={canvasRef} className={styles.sea} aria-hidden="true" />;
}

/** A corked bottle lying on its side with a rolled letter inside, in pixels. */
function PixelBottle() {
  return (
    <svg
      className={styles.bottleArt}
      viewBox="0 0 29 12"
      shapeRendering="crispEdges"
      aria-hidden="true"
      focusable="false"
    >
      {/* Glass */}
      <rect x="2" y="2" width="16" height="8" fill="rgba(110, 196, 186, 0.55)" />
      <rect x="18" y="3" width="2" height="6" fill="rgba(110, 196, 186, 0.55)" />
      <rect x="20" y="4" width="4" height="4" fill="rgba(110, 196, 186, 0.6)" />
      <rect x="2" y="9" width="16" height="1" fill="rgba(36, 104, 110, 0.7)" />
      {/* Rolled letter and its ribbon */}
      <rect x="4" y="4" width="12" height="4" fill="#d9c49a" />
      <rect x="5" y="4" width="10" height="3" fill="#f3e6c8" />
      <rect x="9" y="4" width="2" height="4" fill="#b8322f" />
      {/* Light on the glass */}
      <rect x="3" y="2" width="10" height="1" fill="rgba(236, 255, 250, 0.8)" />
      <rect x="21" y="4" width="2" height="1" fill="rgba(236, 255, 250, 0.75)" />
      {/* Outline */}
      <rect x="2" y="1" width="16" height="1" fill="#1f4a50" />
      <rect x="2" y="10" width="16" height="1" fill="#1f4a50" />
      <rect x="1" y="2" width="1" height="8" fill="#1f4a50" />
      <rect x="18" y="2" width="2" height="1" fill="#1f4a50" />
      <rect x="18" y="9" width="2" height="1" fill="#1f4a50" />
      <rect x="20" y="3" width="4" height="1" fill="#1f4a50" />
      <rect x="20" y="8" width="4" height="1" fill="#1f4a50" />
      <rect x="24" y="3" width="1" height="6" fill="#2f6a70" />
      {/* Cork */}
      <g className={styles.cork}>
        <rect x="25" y="4" width="3" height="4" fill="#9a6a43" />
        <rect x="25" y="4" width="3" height="1" fill="#c08a5a" />
        <rect x="25" y="7" width="3" height="1" fill="#6e4729" />
        <rect x="28" y="4" width="1" height="4" fill="#6e4729" />
      </g>
    </svg>
  );
}
