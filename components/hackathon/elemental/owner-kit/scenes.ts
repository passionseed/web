import { EL } from "@/components/hackathon/poster/elemental/brand";
import type { OwnerElement } from "@/lib/hackathon/elemental/owner-link";

/**
 * Pixel-art example frames for the owner kit: how to film and what to shoot.
 * Drawn people, never photos of real ones. Muted "photo" colours; only the
 * corrupting pixels are loud, in the element colours (brand.ts: the photo is
 * a calm place, the pollution is the pixels).
 */

/** The five 9x9 element marks and colours, as on the info poster. */
export const ELEMENT_MARKS: Record<OwnerElement, { color: string; rows: readonly string[] }> = {
  earth: { color: EL.toxicRust, rows: [".........", ".........", "....#....", "...###...", "..##.##..", ".#######.", "##.###.##", "#########", "#########"] },
  water: { color: EL.toxicCyan, rows: ["....#....", "....#....", "...###...", "..#####..", ".#######.", ".##.####.", ".#.#####.", "..#####..", "...###..."] },
  air: { color: EL.toxicYellow, rows: [".........", "..####...", ".#....#..", "......#..", "######...", ".........", "#######..", ".......#.", "..####..."] },
  fire: { color: EL.flame, rows: ["....#....", "...##....", "...###.#.", "..####.#.", ".#######.", ".###.###.", "###...###", "###...###", ".#######."] },
  aether: { color: EL.aetherViolet, rows: ["#.....#..", "...#.....", ".......##", "..#......", "#....#...", ".........", "...#...#.", ".#.......", "......#.."] },
};

export const ALL_ELEMENTS: OwnerElement[] = ["earth", "water", "air", "fire", "aether"];

const C = {
  sky: "#b9c3c0",
  skyHi: "#e7e1cf",
  hill: "#7f8a78",
  hill2: "#97a08c",
  ground: "#a89c80",
  river: "#62817d",
  riverHi: "#7d9a94",
  body: "#1e1c1a",
  skin: "#d8bf9c",
  skinShade: "#b89c78",
  skinHi: "#e8d3b4",
  shirt: "#6f7d76",
  flame: EL.flame,
  sun: EL.flameCore,
  wall: "#d4cebf",
  glass: "#efe9db",
};

const hash = (x: number, y: number) => {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
};

type Ctx = { a: number; toxic: (x: number, y: number) => string; accent: string };
type Scene = (u: number, v: number, x: number, y: number, ctx: Ctx) => string | null;

type LandOpts = { top?: number; gnd?: number; rc?: number; rw?: number; toxic?: number; bright?: boolean };

function land(u: number, v: number, x: number, y: number, ctx: Ctx, o: LandOpts = {}): string {
  const top = o.top ?? 0.36;
  const hill = top + 0.07 * Math.abs(Math.sin(u * 5.3 + 0.6)) + 0.03 * Math.sin(u * 13);
  const hill2 = top + 0.11 + 0.04 * Math.sin(u * 7 + 2);
  const gnd = o.gnd ?? 0.56;
  const rc = (o.rc ?? 0.7) + 0.035 * Math.sin(u * 4.2);
  const rw = o.rw ?? 0.075;
  if (v < hill) return v < 0.12 && o.bright ? C.skyHi : C.sky;
  if (v < gnd) return v > hill2 ? C.hill2 : C.hill;
  if (Math.abs(v - rc) < rw) {
    if (hash(x, y) < (o.toxic ?? 0.14)) return ctx.toxic(x, y);
    return y % 3 === 0 ? C.riverHi : C.river;
  }
  return C.ground;
}

/** A person: a round head and rounded shoulders. r is a share of the height. */
function person(u: number, v: number, a: number, cx: number, cy: number, r: number, o: { face?: string; shirt?: string } = {}): string | null {
  const dx = (u - cx) * a;
  const dy = v - cy;
  if (dx * dx + dy * dy < r * r) return o.face ?? C.body;
  const top = cy + r * 1.25;
  if (v > top) {
    const t = Math.min(1, (v - top) / (r * 0.9));
    const w = r * 1.45 * (0.55 + 0.45 * Math.sqrt(t));
    if (Math.abs(dx) < w) return o.shirt ?? C.body;
  }
  return null;
}

export const SCENES = {
  tall: (u, v, x, y, c) => person(u, v, c.a, 0.5, 0.47, 0.17) ?? land(u, v, x, y, c),
  wide: (u, v, x, y, c) => person(u, v, c.a, 0.5, 0.52, 0.17) ?? land(u, v, x, y, c),
  eye: (u, v, x, y, c) =>
    Math.abs(v - 0.37) < 0.006 && Math.floor(u * 14) % 2 === 0
      ? c.accent
      : (person(u, v, c.a, 0.5, 0.37, 0.17) ?? land(u, v, x, y, c, { top: 0.52, gnd: 0.62, rc: 0.78 })),
  /** The same speaker filmed from below: a big chin and neck fill the frame, nostrils up, the top of the head cut off. */
  below: (u, v, _x, _y, c) => {
    const dx = (u - 0.5) * c.a;
    if (v > 0.88 && Math.abs(dx) < 0.4 * c.a) return C.shirt;
    if (v > 0.46 && Math.abs(dx) < 0.13) return Math.abs(dx) > 0.09 || v < 0.56 ? C.skinShade : C.skin;
    const hx = dx / (0.36 * c.a);
    const hy = (v - 0.2) / 0.3;
    if (hx * hx + hy * hy < 1) {
      if (v < 0.04) return C.body;
      if (Math.abs(v - 0.2) < 0.016 && Math.abs(Math.abs(dx) - 0.03) < 0.014) return C.body;
      if (v < 0.2 && Math.abs(dx) < 0.05 - (0.2 - v) * 0.2) return C.skinHi;
      return hy > 0.45 ? C.skinShade : C.skin;
    }
    return v < 0.3 ? C.skyHi : C.sky;
  },
  lit: (u, v, x, y, c) => person(u, v, c.a, 0.5, 0.47, 0.17, { face: C.skin, shirt: C.shirt }) ?? land(u, v, x, y, c, { bright: true }),
  backlit: (u, v, _x, _y, c) => {
    const dx = (u - 0.5) * c.a;
    const dy = v - 0.2;
    if (dx * dx + dy * dy < 0.012) return C.sun;
    return person(u, v, c.a, 0.5, 0.5, 0.15) ?? (v < 0.7 ? C.skyHi : "#cfc6ad");
  },
  place: (u, v, x, y, c) => person(u, v, c.a, 0.5, 0.52, 0.15) ?? land(u, v, x, y, c, { top: 0.28, gnd: 0.44, rc: 0.56, rw: 0.06, toxic: 0.2 }),
  /** The same speaker in front of a plain wall: nothing says where the problem is. */
  wall: (u, v, _x, _y, c) => person(u, v, c.a, 0.5, 0.52, 0.15) ?? (v > 0.9 ? "#bfb8a8" : C.wall),
  /** Close to the phone: the speaker fills the frame, so the voice is loud and clear. */
  close: (u, v, x, y, c) => person(u, v, c.a, 0.5, 0.44, 0.24, { face: C.skin, shirt: C.shirt }) ?? land(u, v, x, y, c, { top: 0.4, gnd: 0.55 }),
  /** Far from the phone: a tiny speaker in the open, lost in wind and noise. */
  far: (u, v, x, y, c) => person(u, v, c.a, 0.62, 0.6, 0.05) ?? land(u, v, x, y, c, { top: 0.3, gnd: 0.5, rc: 0.78 }),
  portrait: (u, v, _x, _y, c) => person(u, v, c.a, 0.5, 0.4, 0.2) ?? C.wall,
  land: (u, v, x, y, c) => {
    for (const [hx, w] of [[0.15, 0.05], [0.25, 0.04]] as const) {
      if (Math.abs(u - hx) < w && v > 0.44 && v < 0.54) return "#5e5444";
      if (v > 0.38 && v <= 0.44 && Math.abs(u - hx) < (w * (v - 0.38)) / 0.06) return "#4c4336";
    }
    return land(u, v, x, y, c, { top: 0.25, gnd: 0.52, rc: 0.72, rw: 0.09, toxic: 0.16 });
  },
  evidence: (u, v, x, y, c) => {
    const dx = Math.abs(u - 0.5) * c.a;
    const neck = v > 0.04 && v < 0.2 && dx < 0.1;
    const shoulder = v >= 0.2 && v < 0.28 && dx < 0.1 + (v - 0.2) * 1.6;
    const body = v >= 0.28 && v < 0.96 && dx < 0.23;
    if (neck || shoulder || body) {
      if (v > 0.34 && v < 0.46 && dx < 0.15) return "#f7f3ea";
      if (v > 0.5) return hash(x, y) < 0.32 ? c.toxic(x, y) : y % 3 ? C.river : C.riverHi;
      return C.glass;
    }
    return v > 0.92 ? "#8f8a7c" : "#aeb6b0";
  },
  /** Two adults at work by the river, one taking a water sample (drawn for a 9:16 frame). */
  work: (u, v, x, y, c) => {
    if (u > 0.3 && u < 0.42 && Math.abs(v - (0.6 + (u - 0.3) * 1.5)) < 0.012) return C.body;
    if (Math.abs(u - 0.45) < 0.03 && v > 0.76 && v < 0.84) return C.glass;
    const p = person(u, v, c.a, 0.22, 0.44, 0.055) ?? person(u, v, c.a, 0.8, 0.47, 0.05);
    if (p && v < 0.66) return p;
    return land(u, v, x, y, c, { top: 0.18, gnd: 0.3, rc: 0.8, rw: 0.16, toxic: 0.14 });
  },
} satisfies Record<string, Scene>;

export type SceneName = keyof typeof SCENES;

export type PixelRun = { x: number; y: number; w: number; c: string };

/**
 * Draw a scene on a grid of cols x rows cells, as horizontal runs of one
 * colour (far fewer SVG nodes than one rect per cell).
 */
export function drawScene(
  name: SceneName,
  cols: number,
  rows: number,
  aspect: number,
  elements: readonly OwnerElement[],
  accent: string
): PixelRun[] {
  const palette = elements.map((k) => ELEMENT_MARKS[k].color);
  const ctx: Ctx = {
    a: aspect,
    accent,
    toxic: (x, y) => palette[Math.floor(hash(y * 3.1, x * 7.7) * palette.length)],
  };
  const scene: Scene = SCENES[name];
  const runs: PixelRun[] = [];
  for (let y = 0; y < rows; y++) {
    let run: PixelRun | null = null;
    for (let x = 0; x < cols; x++) {
      const c = scene((x + 0.5) / cols, (y + 0.5) / rows, x, y, ctx);
      if (run && c === run.c) {
        run.w += 1;
        continue;
      }
      if (run) runs.push(run);
      run = c ? { x, y, w: 1, c } : null;
    }
    if (run) runs.push(run);
  }
  return runs;
}
