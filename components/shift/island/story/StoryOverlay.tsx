"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type RefObject } from "react";

import { IslandLive } from "@/components/shift/island/live/IslandLive";
import { PixelIcon } from "@/components/shift/poster/pixel/PixelRects";

import { PALETTE, treeGrid } from "../sprites";
import { STORY, storyLine, type StoryCta } from "./copy";
import { fitPanel, storyPanels, type PanelFit, type StoryPanel } from "./scenes";
import styles from "./story.module.css";
import { usePageVisible, useReducedMotion } from "./useStorySeen";

/** How long each panel holds before a hard cut to the next one. */
export const PANEL_MS = 3600;

/** The box assumed until the stage is measured (and in tests, where nothing has a size). */
const FALLBACK_BOX = { w: 320, h: 240, dpr: 1 };
/** The tallest a panel gets on a big screen, in CSS px. */
const MAX_STAGE_H = 540;
/** The gap under the picture plus the least room left above and below the picture and line together. */
const STAGE_GAP = 16;
const BREATHING = 24;

export type StoryCloseVia = "skip" | "cta";

export interface StoryOverlayProps {
  open: boolean;
  /** The season's Demo Day (ISO date); null shows the undated festival line. */
  demoDay: string | null;
  cta: StoryCta;
  /** Skip, Escape or the last panel's button: the caller marks the story seen and closes it. */
  onClose: (via: StoryCloseVia) => void;
  /** Radix's close auto-focus, so the caller decides where focus lands once the overlay is gone. */
  onCloseAutoFocus?: (event: Event) => void;
}

/**
 * The four-panel story: a full-screen Dawn dialog with one pixel panel, one
 * line, four dots and a skip button. Panels hold PANEL_MS and then cut hard
 * (no slide, no zoom); a tap goes to the next one; the last one waits for its
 * button. Reduced motion: still frames, no auto-advance, a "next" button.
 */
export function StoryOverlay({ open, demoDay, cta, onClose, onCloseAutoFocus }: StoryOverlayProps) {
  const content = useRef<HTMLDivElement>(null);
  return (
    <DialogPrimitive.Root open={open} onOpenChange={(next) => (next ? undefined : onClose("skip"))}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className={styles.backdrop} />
        <DialogPrimitive.Content
          lang="th"
          className={styles.dialog}
          aria-describedby={undefined}
          ref={content}
          // Focus the dialog itself, not "ข้าม": a story that opened by itself shows no focus ring.
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            content.current?.focus();
          }}
          onCloseAutoFocus={onCloseAutoFocus}
        >
          <StoryBody demoDay={demoDay} cta={cta} onClose={onClose} content={content} />
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

/** Mounted only while the dialog is open, so every opening starts on panel 1. */
function StoryBody({
  demoDay,
  cta,
  onClose,
  content,
}: Pick<StoryOverlayProps, "demoDay" | "cta" | "onClose"> & {
  /** The dialog element, where focus sits when the story opens: the arrow keys listen there. */
  content: RefObject<HTMLDivElement | null>;
}) {
  const panels = useMemo(() => storyPanels(), []);
  const last = panels.length - 1;
  const [index, setIndex] = useState(0);
  const [failed, setFailed] = useState<ReadonlySet<number>>(() => new Set());
  const reduced = useReducedMotion();
  const visible = usePageVisible();
  const column = useRef<HTMLDivElement>(null);
  const head = useRef<HTMLDivElement>(null);
  const foot = useRef<HTMLDivElement>(null);
  const box = useStageBox(column, head, foot);
  const fits = useMemo(() => panels.map((p) => fitPanel(p.view, p.focus, box, box.dpr)), [panels, box]);
  // One height for every panel, so the line under the picture never moves on a cut.
  const stageHeight = Math.max(...fits.map((fit) => fit.height));

  // One timer for the panel on screen; a tap restarts it. Reduced motion and a hidden tab never advance.
  useEffect(() => {
    if (reduced || !visible || index >= last) return;
    const timer = window.setTimeout(() => setIndex((i) => Math.min(i + 1, last)), PANEL_MS);
    return () => window.clearTimeout(timer);
  }, [index, last, reduced, visible]);

  const advance = () => setIndex((i) => Math.min(i + 1, last));
  const fail = (i: number) => setFailed((current) => new Set(current).add(i));

  // On the dialog itself, not a child: it holds focus when the story opens. Right is next, left is back.
  useEffect(() => {
    const element = content.current;
    if (!element) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") setIndex((i) => Math.min(i + 1, last));
      else if (event.key === "ArrowLeft") setIndex((i) => Math.max(i - 1, 0));
    };
    element.addEventListener("keydown", onKeyDown);
    return () => element.removeEventListener("keydown", onKeyDown);
  }, [content, last]);

  return (
    <div ref={column} className={styles.body}>
      <div ref={head} className={styles.head}>
        <DialogPrimitive.Title className="sr-only">{STORY.dialog}</DialogPrimitive.Title>
        <button type="button" className={styles.skip} onClick={() => onClose("skip")}>
          {STORY.skip}
        </button>
      </div>

      <div className={styles.spacer} />
      {/* A tap anywhere on the picture is "next"; keyboards use ArrowRight or the buttons. */}
      <div
        role="group"
        aria-label={STORY.panel(index + 1, panels.length)}
        className={styles.stage}
        style={{ height: `${stageHeight}px` }}
        data-last={index === last}
        onClick={advance}
      >
        {panels.map((panel, i) =>
          // The panel on screen and the next one (drawn ahead, paused), so a cut never waits.
          i === index || i === index + 1 ? (
            <Panel
              key={panel.n}
              panel={panel}
              fit={fits[i]}
              current={i === index}
              still={reduced}
              failed={failed.has(i) || panel.scene === null}
              onFail={() => fail(i)}
            />
          ) : null,
        )}
      </div>

      <div ref={foot} className={styles.foot}>
        <div className={styles.lineBox} aria-live="polite">
          <p key={index} className={styles.line}>
            {storyLine(index, demoDay)}
          </p>
        </div>
        <ol className={styles.dots} aria-hidden="true">
          {panels.map((panel, i) => (
            <li key={panel.n} className={i === index ? styles.dotOn : styles.dot} />
          ))}
        </ol>
        <div className={styles.actions}>
          {index === last ? (
            <button type="button" className={`ei-button-dawn ${styles.cta}`} onClick={() => onClose("cta")}>
              <span>{STORY.cta[cta]}</span>
            </button>
          ) : reduced ? (
            <button type="button" className={styles.next} onClick={advance}>
              {STORY.next}
            </button>
          ) : null}
        </div>
      </div>
      <div className={styles.spacer} />
    </div>
  );
}

interface PanelProps {
  panel: StoryPanel;
  fit: PanelFit;
  current: boolean;
  still: boolean;
  failed: boolean;
  onFail: () => void;
}

function Panel({ panel, fit, current, still, failed, onFail }: PanelProps) {
  const size: CSSProperties = { width: `${fit.width}px`, height: `${fit.height}px` };
  return (
    <div className={styles.frame} style={size} data-phase={panel.phase} aria-hidden={current ? undefined : true}>
      {failed || !panel.scene ? (
        <PixelIcon
          grid={treeGrid(panel.fallback)}
          palette={PALETTE}
          scale={fallbackScale(fit)}
          className={styles.fallback}
        />
      ) : (
        // Behind the same error boundary as the island: a chunk that fails to load shows the tree instead.
        <IslandLive
          scene={panel.scene}
          phase={panel.phase}
          paused={!current}
          still={still}
          ambient={panel.ambient}
          actors={panel.actors}
          crop={fit.crop}
          className={styles.canvas}
          onFail={onFail}
        />
      )}
    </div>
  );
}

/** The fallback tree fills about two thirds of the panel's height, in whole CSS pixels per sprite pixel. */
function fallbackScale(fit: PanelFit): number {
  return Math.max(2, Math.floor((Math.min(fit.width, fit.height) * 0.66) / 40));
}

/**
 * The room a panel may take, in CSS px, and the device pixel ratio: the
 * column's content height minus the skip row, the line and its buttons, a gap
 * and some breathing room. Measured from elements whose size never depends on
 * the picture, so it cannot loop; kept current as the window or fonts change.
 */
function useStageBox(
  column: RefObject<HTMLDivElement | null>,
  head: RefObject<HTMLDivElement | null>,
  foot: RefObject<HTMLDivElement | null>,
) {
  const [box, setBox] = useState(FALLBACK_BOX);
  useLayoutEffect(() => {
    const element = column.current;
    if (!element) return;
    const read = () => {
      const style = window.getComputedStyle(element);
      const paddingY = (parseFloat(style.paddingTop) || 0) + (parseFloat(style.paddingBottom) || 0);
      const paddingX = (parseFloat(style.paddingLeft) || 0) + (parseFloat(style.paddingRight) || 0);
      const used = (head.current?.offsetHeight ?? 0) + (foot.current?.offsetHeight ?? 0) + STAGE_GAP + BREATHING;
      const w = Math.floor(element.clientWidth - paddingX);
      const h = Math.floor(Math.min(MAX_STAGE_H, element.clientHeight - paddingY - used));
      const next = w > 0 && h > 0 ? { w, h, dpr: window.devicePixelRatio || 1 } : FALLBACK_BOX;
      setBox((current) => (current.w === next.w && current.h === next.h && current.dpr === next.dpr ? current : next));
    };
    read();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(read);
    observer.observe(element);
    if (foot.current) observer.observe(foot.current);
    return () => observer.disconnect();
  }, [column, head, foot]);
  return box;
}
