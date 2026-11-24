import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";

import { EL } from "@/components/hackathon/poster/elemental/brand";

import { ELEMENT_DETAILS } from "./challenges";
import { elementLabel, type ElementChapter, type ElementKey } from "./media";
import styles from "./more-button.module.css";
import { blockThresholds, seedFromKey } from "./scrub-dissolve";

/**
 * Each element starts clean and gets poisoned on hover, the same story as its
 * chapter: blue water turns green, green land turns rust, clear sky turns to
 * smog, a warm flame turns hazard red, plain light turns violet static.
 */
const CORRUPTION: Record<ElementKey, { clean: string; toxic: string }> = {
  water: { clean: "#4a9fe0", toxic: EL.toxicGreen },
  earth: { clean: "#6e9a3e", toxic: EL.toxicRust },
  air: { clean: "#8fd0f0", toxic: EL.toxicYellow },
  fire: { clean: EL.flameCore, toxic: EL.ember },
  aether: { clean: EL.cream, toxic: EL.aetherViolet },
};

/** The fill is a grid of blocks, like the chapter pictures' block dissolve. */
const COLS = 32;
const ROWS = 4;
/** How long the corruption takes to cover the whole button. */
const SPREAD_MS = 560;

/**
 * One delay and strength per block. The corruption spreads from the left with
 * noise, and every element keeps its own pattern.
 */
function useBlocks(key: ElementKey) {
  return useMemo(() => {
    const count = COLS * ROWS;
    const order = blockThresholds(count, seedFromKey(`more-${key}`));
    const strength = blockThresholds(count, seedFromKey(`more-a-${key}`));
    return Array.from({ length: count }, (_, i) => {
      const col = i % COLS;
      const delay = Math.round((0.55 * order[i] + 0.45 * (col / COLS)) * SPREAD_MS);
      const alpha = (0.35 + 0.35 * strength[i]).toFixed(2);
      return { delay, alpha };
    });
  }, [key]);
}

/**
 * Opens the element's full brief. Lives in each chapter, under its examples.
 * It says "ดูโจทย์", with a small question from one of that element's cases
 * under it, so each chapter still has its own hook. Hover (or, on touch screens, scrolling it into view)
 * corrupts it block by block from the clean colour to the toxic one.
 */
export function MoreButton({ chapter, onOpen }: { chapter: ElementChapter; onOpen: () => void }) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [inView, setInView] = useState(false);
  const blocks = useBlocks(chapter.key);
  const { clean, toxic } = CORRUPTION[chapter.key];
  const hook = ELEMENT_DETAILS[chapter.key].ctaTh;

  useEffect(() => {
    const button = buttonRef.current;
    if (!button) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.6 }
    );
    observer.observe(button);
    return () => observer.disconnect();
  }, []);

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={onOpen}
      data-element={chapter.key}
      className={`${styles.button} ${inView ? styles.inView : ""} pointer-events-auto mt-4 inline-flex flex-col items-start rounded-2xl border px-4 py-2 text-left text-[#faf8f4] sm:px-5 sm:py-2.5 lg:mt-7`}
      style={
        {
          "--clean": clean,
          "--toxic": toxic,
          fontFamily: "var(--font-bai-jamjuree), sans-serif",
        } as CSSProperties
      }
      aria-haspopup="dialog"
      aria-label={`ดูโจทย์${elementLabel(chapter.th)}: ${hook}`}
    >
      <span aria-hidden="true" className={styles.blocks}>
        {blocks.map((b, i) => (
          <span key={i} style={{ "--d": `${b.delay}ms`, "--a": b.alpha } as CSSProperties} />
        ))}
      </span>
      <span className="inline-flex items-center gap-2.5 text-sm sm:text-base">
        <span className={styles.label}>ดูโจทย์</span>
        <span aria-hidden="true" className={styles.arrow}>
          →
        </span>
      </span>
      <span className={`${styles.label} text-xs text-[#e6e1d7]`}>{hook}</span>
    </button>
  );
}
