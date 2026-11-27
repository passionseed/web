"use client";

import { useState } from "react";

import type { ElementKey } from "@/components/hackathon/elemental/media";
import type { SongId } from "@/lib/hackathon/elemental/quiz-music";
import { sfxElement } from "@/lib/hackathon/elemental/quiz-sfx";

import { IconFx } from "./PixelArt";
import { hitClass, hitStyle } from "./hit";
import styles from "./quiz.module.css";
import { play, startMusic } from "./sound";

/**
 * An icon you can tap: its effect starts over from the top, it reacts the
 * way its element would (see hit.ts), and it plays its element's sound. A
 * new tap, here or on another icon, cuts the last one's sound, so taps never
 * pile up. `music`: the page's song, which the first tap starts (a tap is
 * what lets the browser start audio).
 */
export function PlayableIcon({ element, cell, id, label, music }: { element: ElementKey; cell: number; id: string; label: string; music?: SongId }) {
  const [taps, setTaps] = useState(0);
  function tap() {
    setTaps((n) => n + 1);
    play((o, t) => sfxElement(o, t, element), { channel: "preview", replace: true });
    if (music) startMusic(music);
  }
  return (
    <button type="button" onClick={tap} aria-label={label} className={styles.playable}>
      {/* A new key restarts the effect at its first frame, in time with the sound. */}
      <div key={taps} className={taps ? hitClass(element) : undefined} style={hitStyle(cell)}>
        <IconFx element={element} cell={cell} id={id} />
      </div>
    </button>
  );
}
