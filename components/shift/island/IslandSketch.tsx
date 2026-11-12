import type { CSSProperties } from "react";

import styles from "./islandInvite.module.css";

/*
 * The island as someone sketched it in ink on the letter: the coast, the
 * beach line inside it, a few palms, a small mark in the middle, waves, a
 * compass, and the ship with a dotted way across.
 * Coordinates are in a 320x170 box. Each stroke draws itself on, in order,
 * when its chapter scrolls into view; `--d` is when it starts.
 */
const COAST =
  "M 86 88 C 82 66 104 52 126 56 C 140 40 168 36 186 46 C 204 36 232 40 244 54 C 266 52 284 66 280 84 " +
  "C 294 96 288 116 270 122 C 264 138 240 144 222 138 C 208 150 178 152 164 142 C 144 150 116 144 110 128 " +
  "C 90 124 76 106 86 88 Z";

const PALMS: readonly (readonly [number, number])[] = [
  [130, 80],
  [118, 106],
  [258, 88],
  [212, 70],
  [238, 102],
  [204, 120],
];

/** A palm: a leaning trunk and four fronds from its top. */
const palm = ([x, y]: readonly [number, number]) =>
  `M ${x + 1} ${y + 9} q 1 -5 -1 -9 ` +
  `M ${x} ${y} q -4 -3 -8 0 M ${x} ${y} q 4 -3 8 0 M ${x} ${y} q -3 -5 -6 -6 M ${x} ${y} q 3 -5 6 -6`;

const WAVES: readonly (readonly [number, number])[] = [
  [24, 44],
  [52, 92],
  [300, 76],
  [286, 152],
  [228, 162],
  [96, 162],
];

const wave = ([x, y]: readonly [number, number]) => `M ${x} ${y} q 4 -4 8 0 t 8 0`;

const SHIP =
  "M 20 142 L 62 142 L 55 151 L 28 151 Z M 41 142 V 112 M 42 114 C 54 118 54 130 42 134 " +
  "M 42 134 C 50 135 50 140 42 141 M 41 112 l 8 2 l -8 2";

const COMPASS = "M 292 18 V 54 M 274 36 H 310 M 292 26 L 296 36 L 292 46 L 288 36 Z";

const TRAIL = "M 64 140 C 92 136 98 152 122 134 S 150 104 166 94";

function Ink({ d, delay, className = styles.inkLine }: { d: string; delay: number; className?: string }) {
  return <path d={d} pathLength={1} className={className} style={{ "--d": `${delay}ms` } as CSSProperties} />;
}

export function IslandSketch() {
  return (
    <svg className={styles.sketch} viewBox="0 0 320 170" aria-hidden="true" focusable="false">
      <Ink d={COAST} delay={0} />
      <path
        d={COAST}
        className={styles.inkBeach}
        transform="translate(183 95) scale(0.84) translate(-183 -95)"
      />
      {PALMS.map((at, i) => (
        <Ink key={at.join()} d={palm(at)} delay={700 + i * 90} />
      ))}
      {WAVES.map((at, i) => (
        <Ink key={at.join()} d={wave(at)} delay={300 + i * 120} />
      ))}
      <Ink d={COMPASS} delay={1000} />
      <text x="292" y="13" className={styles.inkLetter}>
        N
      </text>
      <Ink d={SHIP} delay={1300} />
      <path d={TRAIL} className={styles.inkTrail} />
      <path d="M 170 78 l 12 12 M 182 78 l -12 12" className={styles.inkMark} />
    </svg>
  );
}
