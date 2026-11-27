"use client";

import { sfxToggle } from "@/lib/hackathon/elemental/quiz-sfx";

import { play, setSoundOn, useSoundOn } from "./sound";

/** A speaker drawn on the icons' own 9x9 grid: its waves when sound is on, a cross when it is off. */
const SPEAKER_ON = [".........", "...#...#.", "..##.#..#", "####..#.#", "####..#.#", "####..#.#", "..##.#..#", "...#...#.", "........."];
const SPEAKER_OFF = [".........", "...#.....", "..##.....", "####.#.#.", "####..#..", "####.#.#.", "..##.....", "...#.....", "........."];

function Glyph({ rows, cell, color }: { rows: readonly string[]; cell: number; color: string }) {
  return (
    <svg width={9 * cell} height={9 * cell} viewBox="0 0 9 9" shapeRendering="crispEdges" aria-hidden="true" style={{ display: "block" }}>
      {rows.flatMap((row, y) => Array.from(row).map((c, x) => (c === "#" ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={color} /> : null)))}
    </svg>
  );
}

/**
 * Sound on or off for the whole quiz, and the result page. Turning it off
 * cuts whatever is playing; turning it on plays one note, so you know it
 * works. A 48 px target round an 18 px speaker.
 */
export function SoundToggle({ color }: { color: string }) {
  const on = useSoundOn();
  function toggle() {
    setSoundOn(!on);
    if (!on) play(sfxToggle);
  }
  return (
    <button type="button" onClick={toggle} aria-pressed={on} aria-label="เสียง" className="rounded-full p-[15px]">
      <Glyph rows={on ? SPEAKER_ON : SPEAKER_OFF} cell={2} color={color} />
    </button>
  );
}
