"use client";

import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";

import { IslandTree } from "@/components/home/IslandTree";
import { ISLAND_STAGES } from "@/lib/content/shift-island";
import { LETTER_CHAPTERS, MAP } from "@/lib/content/shift-island-invite";

import { IslandMap } from "./IslandMap";
import styles from "./islandInvite.module.css";
import { useReducedMotion } from "./useReducedMotion";

/** Open, rolling up, or folded away with the island as the whole view. */
type LetterState = "open" | "folding" | "folded";
/** How long the paper takes to roll up before it leaves the page. */
const FOLD_MS = 460;

type Chapter = (typeof LETTER_CHAPTERS)[number];

/**
 * Scene 2: the letter from the bottle, laid over the island it came from
 * (drawn as a treasure map). A paper scroll unrolls, and each chapter rises
 * into view as it is scrolled to. The seal (or the ticket that replaces it) is
 * passed in as children and sits at the foot of the paper.
 * The letter folds away to show the whole island and opens again. It is
 * hidden, not unmounted, so a seal press in flight still lands.
 */
export function InviteLetter({ festival, children }: { festival: string; children: ReactNode }) {
  const paperRef = useRef<HTMLDivElement>(null);
  const openRef = useRef<HTMLButtonElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const timer = useRef<number | null>(null);
  const reduced = useReducedMotion();
  const [state, setState] = useState<LetterState>("open");
  useReveal(paperRef);

  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    [],
  );

  // Focus follows the letter: the open button once folded, the title once open.
  const focusAfter = useRef<"open" | "title" | null>(null);
  useEffect(() => {
    const target = focusAfter.current;
    if (target === "open" && state === "folded") openRef.current?.focus({ preventScroll: true });
    if (target === "title" && state === "open") titleRef.current?.focus({ preventScroll: true });
    if ((target === "open" && state === "folded") || (target === "title" && state === "open")) {
      focusAfter.current = null;
    }
  }, [state]);

  const fold = () => {
    if (state !== "open") return;
    focusAfter.current = "open";
    if (reduced) {
      setState("folded");
      window.scrollTo(0, 0);
      return;
    }
    setState("folding");
    timer.current = window.setTimeout(() => {
      setState("folded");
      window.scrollTo(0, 0);
    }, FOLD_MS);
  };

  const unfold = () => {
    focusAfter.current = "title";
    window.scrollTo(0, 0);
    setState("open");
  };

  return (
    <section className={styles.letter} data-letter={state}>
      <IslandMap revealed={state === "folded"} />
      {state === "open" && (
        <button type="button" className={`${styles.skip} ${styles.mapFold}`} onClick={fold}>
          {MAP.close}
        </button>
      )}
      <article className={styles.scroll} data-state={state} hidden={state === "folded"}>
        <div className={styles.rod} aria-hidden="true" />
        <div ref={paperRef} className={styles.paper}>
          {LETTER_CHAPTERS.map((chapter, i) => (
            <LetterChapter
              key={chapter.id}
              chapter={chapter}
              first={i === 0}
              festival={festival}
              titleRef={i === 0 ? titleRef : undefined}
            />
          ))}
          <div className={styles.reveal} data-reveal>
            {children}
          </div>
          <Compass />
        </div>
        <div className={`${styles.rod} ${styles.rodEnd}`} aria-hidden="true" />
      </article>
      {state === "folded" && (
        <button ref={openRef} type="button" className={`${styles.next} ${styles.mapOpen}`} onClick={unfold}>
          {MAP.open}
        </button>
      )}
    </section>
  );
}

/*
 * A compass rose for the corner of the map, 13x13. k: ink, w: wax, c: centre.
 */
const COMPASS = [
  "......k......",
  "......k......",
  ".....kwk.....",
  ".....kwk.....",
  "....kwwwk....",
  ".kkkkwcwkkkk.",
  "kwwwwcccwwwwk",
  ".kkkkwcwkkkk.",
  "....kwwwk....",
  ".....kwk.....",
  ".....kwk.....",
  "......k......",
  "......k......",
] as const;

const COMPASS_TONE: Record<string, string> = { k: styles.compassInk, w: styles.compassWax, c: styles.compassInk };

const COMPASS_CELLS = COMPASS.flatMap((row, y) =>
  Array.from(row).flatMap((tone, x) => (tone === "." ? [] : [{ x, y, tone }])),
);

function Compass() {
  return (
    <svg className={styles.compass} viewBox="0 0 13 13" shapeRendering="crispEdges" aria-hidden="true" focusable="false">
      {COMPASS_CELLS.map(({ x, y, tone }) => (
        <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} className={COMPASS_TONE[tone]} />
      ))}
    </svg>
  );
}

function LetterChapter({
  chapter,
  first,
  festival,
  titleRef,
}: {
  chapter: Chapter;
  first: boolean;
  festival: string;
  titleRef?: RefObject<HTMLHeadingElement | null>;
}) {
  return (
    <section className={`${styles.chapter} ${styles.reveal}`} data-reveal data-chapter={chapter.id}>
      {first ? (
        // Where focus lands when the letter opens.
        <h1 ref={titleRef} className={styles.letterTitle} data-scene-focus="" tabIndex={-1}>
          {chapter.title}
        </h1>
      ) : (
        <h2 className={styles.chapterTitle}>{chapter.title}</h2>
      )}
      {chapter.id === "tree" ? (
        <div className={styles.tree}>
          <IslandTree stages={ISLAND_STAGES} caption={chapter.body} />
        </div>
      ) : (
        <p className={styles.chapterBody}>{chapter.body}</p>
      )}
      {chapter.id === "festival" && <p className={styles.festival}>{festival}</p>}
    </section>
  );
}

/**
 * Marks each `[data-reveal]` block inside `ref` with `data-shown` the first
 * time it scrolls into view. Without IntersectionObserver everything shows.
 */
function useReveal(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const blocks = Array.from(root.querySelectorAll<HTMLElement>("[data-reveal]"));
    const show = (el: Element) => el.setAttribute("data-shown", "");
    if (typeof IntersectionObserver === "undefined") {
      blocks.forEach(show);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          show(entry.target);
          io.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.12 },
    );
    blocks.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [ref]);
}
