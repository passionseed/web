"use client";

import { useEffect, useRef, useState } from "react";

import {
  LETTER_CHAPTERS,
  PROLOGUE,
  SHORE,
  TICKET,
} from "@/lib/content/shift-island-invite";
import type { IslandViewer } from "@/lib/shift/islandInvite";

import { BottleShore } from "./BottleShore";
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
  const rootRef = useRef<HTMLElement>(null);
  const focusedScene = useRef(scene);

  // The control that changed the scene unmounts with it, so focus would fall
  // to the body. Move it into the new scene: its `data-scene-focus` element,
  // else the page root. Skipped on first load (and React's dev re-run of it).
  useEffect(() => {
    if (focusedScene.current === scene) return;
    focusedScene.current = scene;
    const root = rootRef.current;
    const target = root?.querySelector<HTMLElement>("[data-scene-focus]") ?? root;
    target?.focus({ preventScroll: true });
  }, [scene]);

  const goTo = (next: Scene) => {
    // Each scene starts at its own top; the prologue leaves the page scrolled.
    window.scrollTo(0, 0);
    setScene(next);
  };

  return (
    <main ref={rootRef} className={styles.root} data-scene={scene} tabIndex={-1}>
      {scene === "prologue" && <IslandPrologue lines={PROLOGUE} onDone={() => goTo("shore")} />}
      {scene === "shore" && <BottleShore onOpen={() => goTo("letter")} hint={SHORE.hint} />}
      {scene === "letter" && <LetterPlaceholder viewer={viewer} festival={festival} />}
    </main>
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
