"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";

import { PROLOGUE_SAMPLE_TAG, SHORE } from "@/lib/content/shift-island-invite";
import { SHIFT_ISLAND } from "@/lib/content/shift-island";

import styles from "./islandInvite.module.css";
import { useReducedMotion } from "./useReducedMotion";

/**
 * Scene 0: the island's story over a slow pan of the sample island. Lines
 * appear one at a time as the visitor scrolls or taps "ต่อ"; "ต่อ" after the
 * last line, or "ข้าม" at any time, hands over to the shore.
 *
 * Scrolling: the stage is sticky inside a taller section. Each later line has
 * a marker that runs from its trigger point to the bottom of the section, so
 * a marker stays in view once passed and a fast jump reveals every line it
 * skipped.
 */
export function IslandPrologue({
  lines,
  onDone,
}: {
  lines: readonly string[];
  onDone: () => void;
}) {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(1);
  const visible = reduced ? lines.length : Math.min(shown, lines.length);
  const markers = useRef<(HTMLDivElement | null)[]>([]);

  const reveal = useCallback((count: number) => {
    setShown((current) => Math.max(current, count));
  }, []);

  useEffect(() => {
    if (reduced) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) reveal(Number((entry.target as HTMLElement).dataset.line));
        }
      },
      // Only the top half of the viewport counts: a line appears once its
      // marker has scrolled up to the middle of the screen.
      { rootMargin: "0px 0px -50% 0px" },
    );
    for (const marker of markers.current) if (marker) observer.observe(marker);
    return () => observer.disconnect();
  }, [reduced, reveal, lines.length]);

  const next = () => {
    if (visible >= lines.length) onDone();
    else reveal(visible + 1);
  };

  return (
    <section
      className={styles.prologue}
      data-still={reduced || undefined}
      style={{ "--steps": lines.length - 1 } as CSSProperties}
    >
      <div className={styles.prologueStage}>
        <div className={styles.pan} aria-hidden="true">
          <Image
            src={SHIFT_ISLAND.sample.src}
            width={SHIFT_ISLAND.sample.width}
            height={SHIFT_ISLAND.sample.height}
            alt=""
            priority
            unoptimized
            className={styles.panImage}
          />
        </div>
        <div className={styles.prologueTint} aria-hidden="true" />
        <span className={styles.sampleTag}>{PROLOGUE_SAMPLE_TAG}</span>

        <button type="button" className={styles.skip} onClick={onDone}>
          {SHORE.skip}
        </button>

        <div className={styles.prologueBody}>
          <ol className={styles.prologueLines} aria-live="polite">
            {lines.map((line, index) => {
              const state = index < visible - 1 ? "past" : index === visible - 1 ? "current" : "hidden";
              return (
                <li
                  key={line}
                  className={styles.prologueLine}
                  data-state={state}
                  aria-hidden={state === "hidden" || undefined}
                >
                  {line}
                </li>
              );
            })}
          </ol>

          <div className={styles.prologueControls}>
            <span className={styles.progress} aria-hidden="true">
              {lines.map((line, index) => (
                <span key={line} className={styles.progressDot} data-on={index < visible || undefined} />
              ))}
            </span>
            <button type="button" className={styles.next} onClick={next}>
              {SHORE.next}
            </button>
          </div>
        </div>
      </div>

      {!reduced &&
        lines.slice(1).map((line, index) => (
          <div
            key={line}
            ref={(node) => {
              markers.current[index] = node;
            }}
            className={styles.marker}
            data-line={index + 2}
            style={{ "--i": index } as CSSProperties}
            aria-hidden="true"
          />
        ))}
    </section>
  );
}
