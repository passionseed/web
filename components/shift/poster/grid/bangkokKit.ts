import { PX, mix, sprite, type Rect } from "../pixel/pixelKit";

/**
 * Bangkok pieces for the SHIFT[1] flood: landmarks for the skyline, street
 * things half under water, and the animals that come with a Bangkok flood.
 * Same rules as the base kit: plain rects in grid cells, `.` is transparent.
 */

const r = (x: number, y: number, w: number, h: number, fill: string): Rect => [x, y, w, h, fill];

function hash(x: number, y: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

/** Draw local-cell rects at `scale`x, placed at (ox, oy) in world cells. */
export function scaled(rects: Rect[], ox: number, oy: number, scale: number): Rect[] {
  return rects.map(([x, y, w, h, fill]) => [ox + x * scale, oy + y * scale, w * scale, h * scale, fill]);
}

/** Mirror an ASCII sprite left to right. */
export function flip(grid: string[]): string[] {
  return grid.map((row) => row.split("").reverse().join(""));
}

// ─── Landmarks ──────────────────────────────────────────────────────────────

/**
 * Wat Arun style prang: a corncob tower in stacked tiers, each tier a step
 * narrower, a thin spire on top. Silhouetted against the sunrise in tile C.
 */
export function prang(cx: number, baseY: number, height: number, halfBase: number, fill: string): Rect[] {
  const out: Rect[] = [];
  const spire = Math.round(height * 0.22);
  const body = height - spire;
  for (let dy = 0; dy < body; dy++) {
    const t = dy / body;
    const tier = dy % 6 === 0 ? 1 : 0;
    const half = Math.max(1, Math.round(halfBase * Math.pow(1 - t, 0.75)) + tier);
    out.push(r(cx - half, baseY - dy - 1, half * 2 + 1, 1, fill));
  }
  out.push(r(cx, baseY - height, 1, spire, fill), r(cx - 1, baseY - body - 3, 3, 1, fill));
  return out;
}

/**
 * MahaNakhon: a slim tower with its famous "pixels" carved out of it in a
 * band that spirals up, drawn here as notches that walk from edge to edge.
 */
export function mahanakhon(
  x: number,
  top: number,
  w: number,
  bottom: number,
  fill: string,
  /** Background colour at a given row, so the carved pixels show the sky behind. */
  sky: (y: number) => string,
): Rect[] {
  const out: Rect[] = [r(x, top, w, bottom - top, fill)];
  for (let y = top; y < bottom - 8; y += 2) {
    const phase = Math.sin((y - top) / 9);
    const edge = phase > 0 ? x + w - 1 : x;
    const depth = 1 + Math.floor(Math.abs(phase) * 3);
    const dx = phase > 0 ? edge - depth + 1 : edge;
    if (hash(x, y) > 0.25) out.push(r(dx, y, depth, 2, sky(y)));
  }
  out.push(r(x + Math.floor(w / 2), top - 4, 1, 4, fill));
  return out;
}

/**
 * Thai temple hall: low walls under two stacked gabled roofs, gold trim on
 * the eaves and a chofa hook at each gable peak.
 */
export function templeHall(x: number, w: number, baseY: number, wall: string, roof: string, trim: string): Rect[] {
  const out: Rect[] = [];
  const wallH = 6;
  out.push(r(x + 2, baseY - wallH, w - 4, wallH, wall));
  const tier = (left: number, width: number, eaveY: number, rise: number) => {
    const mid = left + Math.floor(width / 2);
    for (let i = 0; i < rise; i++) {
      const half = Math.round((width / 2) * (1 - i / rise));
      out.push(r(mid - half, eaveY - i, half * 2, 1, roof));
    }
    out.push(r(left - 1, eaveY, width + 2, 1, trim));
    out.push(r(mid, eaveY - rise - 2, 1, 2, trim), r(mid + 1, eaveY - rise - 2, 1, 1, trim));
  };
  tier(x, w, baseY - wallH, 7);
  tier(x + 4, w - 8, baseY - wallH - 6, 6);
  return out;
}

// ─── BTS and the street ─────────────────────────────────────────────────────

/** BTS viaduct: a beam on T-shaped pillars that stand in the flood. */
export function skytrainTrack(x0: number, x1: number, beamY: number, waterY: number, pillarXs: number[], fill: string): Rect[] {
  const out: Rect[] = [r(x0, beamY, x1 - x0, 3, fill), r(x0, beamY + 3, x1 - x0, 1, mix(fill, PX.ink, 0.35))];
  for (const px of pillarXs) {
    out.push(r(px - 3, beamY + 4, 7, 1, fill), r(px - 1, beamY + 5, 3, waterY - beamY - 5, fill));
  }
  return out;
}

/** Three BTS cars: cream body, the green and blue livery stripes, a window row. */
export function skytrain(x: number, bottomY: number, cars = 3): Rect[] {
  const out: Rect[] = [];
  const carW = 22;
  for (let c = 0; c < cars; c++) {
    const cx = x + c * (carW + 1);
    const top = bottomY - 7;
    out.push(r(cx, top, carW, 7, PX.cream));
    for (let wx = cx + 2; wx < cx + carW - 2; wx += 4) out.push(r(wx, top + 1, 3, 2, PX.windowDark));
    out.push(r(cx, top + 4, carW, 1, PX.plant), r(cx, top + 5, carW, 1, PX.denim));
    if (c === 0) out.push(r(cx, top + 1, 1, 5, PX.near));
  }
  return out;
}

/** Leaning concrete poles with the famous tangle of sagging cables. */
export function powerLines(poles: [number, number][], bottomY: number): Rect[] {
  const out: Rect[] = [];
  const pole = mix(PX.near, PX.mid, 0.3);
  for (const [px, top] of poles) {
    out.push(r(px, top, 2, bottomY - top, pole), r(px - 3, top + 2, 8, 1, pole));
  }
  for (let i = 0; i < poles.length - 1; i++) {
    const [ax, at] = poles[i];
    const [bx, bt] = poles[i + 1];
    for (let wire = 0; wire < 4; wire++) {
      const sag = 3 + wire * 2;
      for (let x = ax + 2; x < bx; x++) {
        const t = (x - ax) / (bx - ax);
        const y = Math.round(at + 2 + wire + (bt - at) * t + sag * 4 * t * (1 - t));
        out.push(r(x, y, 1, 1, wire === 2 ? PX.near : PX.ink));
      }
    }
  }
  return out;
}

/** Tuk-tuk up to its doors in water, facing right. Only the top half shows. */
export const TUKTUK = [
  "..CCCCCCCCCCCCC..",
  ".CCCCCCCCCCCCCCC.",
  ".P.....P......PW.",
  ".P.....P......PWW",
  "BBBBBBBBBBBBBBBBB",
  "BBYYBBBBBBBBBBBBH",
];
export const TUKTUK_PALETTE = {
  C: PX.plant,
  P: PX.ink,
  W: mix(PX.sky, PX.cream, 0.4),
  B: PX.denim,
  Y: PX.windowLit,
  H: PX.sun,
};

/** Red plastic street-food stool, floating upside down. */
export const STOOL = ["S....S", "S....S", "SSSSSS", ".SSSS."];
export const STOOL_PALETTE = { S: mix(PX.accentDark, PX.mid, 0.2) };

// ─── Animals ────────────────────────────────────────────────────────────────

/**
 * Crocodile swimming right: tapered tail, a row of back scutes, the eye up on
 * the head, a long snout with teeth showing along the jaw, a pale belly.
 */
export const CROC = [
  "......................KK....",
  "....B.B.B.B.B.B.B.B..KEK....",
  "TTRRRRRRRRRRRRRRRRRRRRRRRRRN",
  "..TTRRRRRRRRRRRRRRRRRRWRWRWR",
  "....DDDDDDDDDDDDDDDDDDDDDDD.",
  "......LL.......LL...........",
  ".....LL.......LL............",
];

/** Just the eyes and nostrils at the surface, the classic flood photo. */
export const CROC_PEEK = ["KE........N", "RRRRRRRRRRR"];

export function crocPalette(water: string) {
  const body = mix(PX.plant, water, 0.22);
  return {
    K: body,
    R: body,
    T: body,
    B: mix(body, PX.ink, 0.35),
    L: mix(body, PX.ink, 0.35),
    E: PX.windowLit,
    W: PX.cream,
    D: mix(body, PX.cream, 0.18),
    N: mix(body, PX.ink, 0.5),
  };
}

/** Small fish swimming left. */
export const FISH = [".OOO..T", "OEOOOTT", ".OOO..T"];
/** Pla buek sized fish, swimming left. */
export const BIG_FISH = [
  "..OOOOO...T",
  ".OOOOOOO.TT",
  "OEOOOOOOOTT",
  ".OOOOOOO.TT",
  "..OOOOO...T",
];

export function fishPalette(body: string, eye: string) {
  return { O: body, T: body, E: eye };
}

/** A school of fish, deterministic, facing left or right. */
export function school(x: number, y: number, count: number, body: string, eye: string, right = false): Rect[] {
  const grid = right ? flip(FISH) : FISH;
  const out: Rect[] = [];
  for (let i = 0; i < count; i++) {
    const fx = x + Math.floor(hash(i, x) * 22);
    const fy = y + Math.floor(hash(y, i) * 12);
    out.push(...sprite(grid, fishPalette(body, eye), fx, fy));
  }
  return out;
}

/** Rising bubbles: a short column of 1-cell dots, drifting. */
export function bubbles(x: number, y: number, n: number, fill: string): Rect[] {
  const out: Rect[] = [];
  for (let i = 0; i < n; i++) out.push(r(x + (i % 2), y - i * 3, 1, 1, fill));
  return out;
}

/** Waterweed rising from the bottom: wavering stalks of 1-cell steps. */
export function weed(x: number, bottomY: number, height: number, fill: string): Rect[] {
  const out: Rect[] = [];
  for (let s = 0; s < 3; s++) {
    const sx = x + s * 3;
    const h = height - s * 3 - Math.floor(hash(x, s) * 4);
    for (let i = 0; i < h; i++) {
      const sway = Math.round(Math.sin((i + s * 2) / 3));
      out.push(r(sx + sway, bottomY - i - 1, 1, 1, fill));
    }
  }
  return out;
}
