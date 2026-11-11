"use client";

import { useEffect, useRef, type ReactNode, type RefObject } from "react";

import { IslandTree } from "@/components/home/IslandTree";
import { ISLAND_STAGES } from "@/lib/content/shift-island";
import { LETTER_CHAPTERS } from "@/lib/content/shift-island-invite";

import styles from "./islandInvite.module.css";

type Chapter = (typeof LETTER_CHAPTERS)[number];

/**
 * Scene 2: the letter from the bottle. A paper scroll unrolls, and each
 * chapter rises into view as it is scrolled to. The seal (or the ticket that
 * replaces it) is passed in as children and sits at the foot of the paper.
 */
export function InviteLetter({ festival, children }: { festival: string; children: ReactNode }) {
  const paperRef = useRef<HTMLDivElement>(null);
  useReveal(paperRef);

  return (
    <section className={styles.letter}>
      <article className={styles.scroll}>
        <div className={styles.rod} aria-hidden="true" />
        <div ref={paperRef} className={styles.paper}>
          {LETTER_CHAPTERS.map((chapter, i) => (
            <LetterChapter key={chapter.id} chapter={chapter} first={i === 0} festival={festival} />
          ))}
          <div className={styles.reveal} data-reveal>
            {children}
          </div>
        </div>
        <div className={`${styles.rod} ${styles.rodEnd}`} aria-hidden="true" />
      </article>
    </section>
  );
}

function LetterChapter({ chapter, first, festival }: { chapter: Chapter; first: boolean; festival: string }) {
  const Heading = first ? "h1" : "h2";
  return (
    <section className={`${styles.chapter} ${styles.reveal}`} data-reveal data-chapter={chapter.id}>
      <Heading
        className={first ? styles.letterTitle : styles.chapterTitle}
        // The first heading is where focus lands when the letter opens.
        {...(first ? { "data-scene-focus": "", tabIndex: -1 } : {})}
      >
        {chapter.title}
      </Heading>
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
