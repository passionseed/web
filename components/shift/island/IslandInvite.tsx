"use client";

import { useState } from "react";

import {
  LETTER_CHAPTERS,
  PROLOGUE,
  SHORE,
  TICKET,
} from "@/lib/content/shift-island-invite";
import type { IslandViewer } from "@/lib/shift/islandInvite";

import { IslandPrologue } from "./IslandPrologue";
import styles from "./islandInvite.module.css";

type Scene = "prologue" | "shore" | "letter";

/**
 * Root of the SHIFT High Island invite. Holds which scene is on screen:
 * the island's story, the bottle on the shore, then the letter with its seal.
 * A visitor who has already RSVPed opens straight onto the letter and ticket.
 */
export function IslandInvite({ viewer, festival }: { viewer: IslandViewer; festival: string }) {
  const [scene, setScene] = useState<Scene>(viewer.kind === "going" ? "letter" : "prologue");

  const goTo = (next: Scene) => {
    // Each scene starts at its own top; the prologue leaves the page scrolled.
    window.scrollTo(0, 0);
    setScene(next);
  };

  return (
    <main className={styles.root} data-scene={scene}>
      {scene === "prologue" && <IslandPrologue lines={PROLOGUE} onDone={() => goTo("shore")} />}
      {scene === "shore" && <ShorePlaceholder onOpen={() => goTo("letter")} />}
      {scene === "letter" && <LetterPlaceholder viewer={viewer} festival={festival} />}
    </main>
  );
}

/** Stand-in for the shore scene (Task 6: `BottleShore`). */
function ShorePlaceholder({ onOpen }: { onOpen: () => void }) {
  return (
    <section className={styles.placeholder}>
      <button type="button" className={styles.next} onClick={onOpen}>
        {SHORE.hint}
      </button>
    </section>
  );
}

/** Stand-in for the letter, seal and ticket (Task 7: `InviteLetter`). */
function LetterPlaceholder({ viewer, festival }: { viewer: IslandViewer; festival: string }) {
  return (
    <section className={styles.placeholder}>
      <h1 className={styles.placeholderHeading}>{LETTER_CHAPTERS[0].title}</h1>
      <p className={styles.placeholderText}>{festival}</p>
      {viewer.kind === "going" && (
        <p className={styles.placeholderText}>
          {TICKET.heading}: {viewer.ticket.nickname}, {viewer.ticket.cohort}
        </p>
      )}
    </section>
  );
}
