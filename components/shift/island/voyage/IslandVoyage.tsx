"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";

import { SHIP_H } from "../shipArt";
import { useReducedMotion } from "../useReducedMotion";
import { VOYAGE_COPY } from "./copy";
import { drawVoyage } from "./draw";
import { lineAt, passengerAt, PASSENGER, VOYAGE, voyageLayout, type VoyageLayout, type VoyageLine } from "./timeline";
import styles from "./voyage.module.css";

/** Pixel-art pace: the picture changes 20 times a second. */
const FRAME_MS = 50;
/** One frame never advances the clock more than this (a hidden tab, a long task). */
const MAX_STEP_MS = 100;
/** Reduced motion: the one frame shown, alongside the jetty at dawn. */
const STILL_AT = VOYAGE.dock + 300;
/** A tap on the picture skips ahead to just before the ship comes alongside. */
const TAP_TO = VOYAGE.dock - 500;

export interface IslandVoyageProps {
  open: boolean;
  /** The student's name, floating over them on the ship. */
  name: string;
  /** The circle starts closing: the island underneath is about to be seen. */
  onReveal?: () => void;
  /** Finished, skipped or closed: the caller marks it seen and closes it. */
  onDone: () => void;
}

/**
 * The crossing from the invite's beach to the island: a full-screen pixel
 * cutscene, about ten seconds. The ship that waited offshore behind the letter
 * weighs anchor with the student waving from the stern, sails through the
 * night, and comes alongside the island's jetty at dawn; then a circle closes
 * on the student and the living island underneath takes the screen.
 *
 * "ข้าม" or Escape ends it at once; a tap on the picture skips to the arrival.
 * Reduced motion: one still frame alongside the jetty and a button ashore.
 */
export function IslandVoyage({ open, name, onReveal, onDone }: IslandVoyageProps) {
  const content = useRef<HTMLDivElement>(null);
  return (
    <DialogPrimitive.Root open={open} onOpenChange={(next) => (next ? undefined : onDone())}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Content
          lang="th"
          className={styles.dialog}
          aria-describedby={undefined}
          ref={content}
          // Focus the dialog, not "ข้าม": a cutscene that started by itself shows no focus ring.
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            content.current?.focus();
          }}
          // The island story usually opens next and takes focus itself.
          onCloseAutoFocus={(event) => event.preventDefault()}
        >
          <VoyageBody name={name} onReveal={onReveal} onDone={onDone} />
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

/**
 * Night over the island while the crossing gets ready. Rendered on the server
 * with the island, so a student sent from the ticket never sees the island
 * before the ship; the caller drops it once the circle starts opening.
 */
export function VoyageCover() {
  return <div className={styles.cover} aria-hidden="true" data-voyage-cover="" />;
}

/** Where the circle closes, in CSS px from the top left of the screen. */
interface Iris {
  x: number;
  y: number;
}

/** Mounted only while open, so every crossing starts at the beach. */
function VoyageBody({ name, onReveal, onDone }: Omit<IslandVoyageProps, "open">) {
  const reduced = useReducedMotion();
  const canvas = useRef<HTMLCanvasElement>(null);
  const tag = useRef<HTMLSpanElement>(null);
  /** Ms of the crossing played so far; a tap moves it ahead. */
  const clock = useRef(0);
  const finished = useRef(false);
  const [line, setLine] = useState<VoyageLine>(0);
  const [iris, setIris] = useState<Iris | null>(null);

  // The latest callbacks, read by the animation loop without restarting it.
  const callbacks = useRef({ onReveal, onDone });
  useEffect(() => {
    callbacks.current = { onReveal, onDone };
  }, [onReveal, onDone]);

  const finish = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    callbacks.current.onDone();
  }, []);

  useEffect(() => {
    const element = canvas.current;
    // No 2D canvas (jsdom, a locked-down browser): the lines and buttons still work.
    const ctx = element && typeof element.getContext === "function" ? element.getContext("2d") : null;
    let layout: VoyageLayout | null = null;
    let frame = 0;
    let last = 0;
    let lastDraw = -Infinity;
    let irisStarted = false;

    const place = (t: number) => {
      const node = tag.current;
      if (!node || !layout) return;
      const scale = layout.px / (window.devicePixelRatio || 1);
      const head = passengerAt(layout, t, SHIP_H);
      node.style.transform = `translate(${head.x * scale}px, ${head.y * scale}px)`;
    };

    const paint = (t: number) => {
      if (!layout) return;
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        drawVoyage(ctx, layout, t);
      }
      place(t);
    };

    const resize = () => {
      if (!element) return;
      const { width, height } = element.getBoundingClientRect();
      if (width === 0 || height === 0) return;
      const dpr = window.devicePixelRatio || 1;
      layout = voyageLayout(width, height, dpr);
      element.width = Math.round(width * dpr);
      element.height = Math.round(height * dpr);
      paint(reduced ? STILL_AT : clock.current);
    };

    const startIris = () => {
      if (layout) {
        const scale = layout.px / (window.devicePixelRatio || 1);
        const head = passengerAt(layout, VOYAGE.dock, SHIP_H);
        // On the student's chest, so the last thing in the circle is them.
        setIris({ x: head.x * scale, y: (head.y + PASSENGER.h / 2) * scale });
      } else {
        // Never measured (no size yet): close on the middle of the screen.
        setIris({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
      }
      callbacks.current.onReveal?.();
    };

    const tick = (now: number) => {
      frame = requestAnimationFrame(tick);
      const step = last === 0 ? 0 : Math.min(now - last, MAX_STEP_MS);
      last = now;
      clock.current += step;
      const t = clock.current;
      setLine(lineAt(t));
      if (t >= VOYAGE.iris && !irisStarted) {
        irisStarted = true;
        startIris();
      }
      if (t >= VOYAGE.end) {
        cancelAnimationFrame(frame);
        finish();
        return;
      }
      if (now - lastDraw >= FRAME_MS) {
        lastDraw = now;
        paint(t);
      }
    };

    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(resize);
    if (element) observer?.observe(element);
    resize();
    if (reduced) setLine(2);
    else frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
    };
  }, [reduced, finish]);

  /** A tap on the picture: straight to the arrival. */
  const hurry = () => {
    if (reduced) return;
    clock.current = Math.max(clock.current, TAP_TO);
  };

  const irisStyle = iris ? ({ "--iris-x": `${iris.x}px`, "--iris-y": `${iris.y}px` } as CSSProperties) : undefined;

  return (
    <div className={styles.body} data-iris={iris ? "true" : undefined} data-still={reduced ? "true" : undefined} style={irisStyle}>
      <DialogPrimitive.Title className="sr-only">{VOYAGE_COPY.dialog}</DialogPrimitive.Title>
      <canvas ref={canvas} className={styles.canvas} aria-hidden="true" onClick={hurry} />
      <span ref={tag} className={styles.tag} aria-hidden="true">
        <span className={styles.tagText}>{name}</span>
      </span>

      <div className={styles.head}>
        <button type="button" className={styles.skip} onClick={finish}>
          {VOYAGE_COPY.skip}
        </button>
      </div>

      <div className={styles.foot}>
        <div className={styles.lineBox} aria-live="polite">
          <p key={line} className={styles.line}>
            {VOYAGE_COPY.lines[line]}
          </p>
        </div>
        {reduced ? (
          <button type="button" className={`ei-button-dawn ${styles.ashore}`} onClick={finish}>
            <span>{VOYAGE_COPY.ashore}</span>
          </button>
        ) : null}
      </div>
    </div>
  );
}
