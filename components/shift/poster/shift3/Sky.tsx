import { COSMOS } from "@/components/shift/next/cosmos";

/**
 * Deep-space backdrop sized to any poster: a seeded starfield with one soft
 * milky-way band, the same recipe as ../Starfield.tsx but for a free canvas
 * (story and banner are not 1080x1440). Deterministic per seed.
 */

/** Small seeded PRNG (mulberry32), so server renders are stable. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const TINTS = ["#ffffff", "#ffffff", "#ffffff", "#dfe8ff", "#cfe0ff", "#ffe8cf"];

interface Star {
  x: number;
  y: number;
  r: number;
  o: number;
  c: string;
}

export interface SkyProps {
  width: number;
  height: number;
  seed?: number;
  /** Band centre line from (x0, y0) to (x1, y1), with a slow wobble. */
  band?: [number, number, number, number];
  /** Stars per million square pixels. */
  density?: number;
}

export function Sky({ width: W, height: H, seed = 3, band = [0, H * 0.82, W, H * 0.48], density = 900 }: SkyProps) {
  const rand = rng(9973 * seed);
  const pick = () => TINTS[Math.floor(rand() * TINTS.length)];
  const [bx0, by0, bx1, by1] = band;
  const bandY = (x: number) => by0 + ((by1 - by0) * (x - bx0)) / (bx1 - bx0 || 1) + 40 * Math.sin(x / 260);

  const count = Math.round((W * H * density) / 1e6);
  const fine: Star[] = [];
  while (fine.length < count) {
    const x = rand() * W;
    const y = rand() * H;
    const d = Math.abs(y - bandY(x));
    if (rand() > 0.22 + 0.78 * Math.exp(-((d / 170) ** 2))) continue;
    fine.push({ x, y, r: 0.35 + rand() * 0.6, o: 0.25 + rand() * 0.55, c: pick() });
  }
  const mid: Star[] = Array.from({ length: Math.round(count / 38) }, () => ({
    x: rand() * W,
    y: rand() * H,
    r: 0.9 + rand() * 0.8,
    o: 0.55 + rand() * 0.4,
    c: pick(),
  }));
  const bright: Star[] = Array.from({ length: Math.max(2, Math.round(count / 420)) }, () => ({
    x: 40 + rand() * (W - 80),
    y: 40 + rand() * (H - 80),
    r: 1.5 + rand() * 0.9,
    o: 1,
    c: pick(),
  }));

  const pts: string[] = [];
  for (let x = -200; x <= W + 200; x += 40) pts.push(`${x},${bandY(x).toFixed(1)}`);
  const id = `s3sky-${seed}-${W}x${H}`;

  return (
    <svg className="pointer-events-none absolute inset-0" width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
      <defs>
        <filter id={`${id}-dust`} filterUnits="userSpaceOnUse" x={0} y={0} width={W} height={H}>
          <feTurbulence type="fractalNoise" baseFrequency="0.004 0.008" numOctaves="5" seed={seed * 7} result="a" />
          <feColorMatrix in="a" type="matrix" values="0 0 0 0 0.20  0 0 0 0 0.30  0 0 0 0 0.95  0 0 0 2.4 -1.0" result="blue" />
          <feTurbulence type="fractalNoise" baseFrequency="0.006 0.011" numOctaves="4" seed={seed * 7 + 16} result="b" />
          <feColorMatrix in="b" type="matrix" values="0 0 0 0 0.58  0 0 0 0 0.40  0 0 0 0 1  0 0 0 2.2 -1.05" result="violet" />
          <feMerge>
            <feMergeNode in="blue" />
            <feMergeNode in="violet" />
          </feMerge>
        </filter>
        <filter id={`${id}-soft`} filterUnits="userSpaceOnUse" x={-200} y={-200} width={W + 400} height={H + 400}>
          <feGaussianBlur stdDeviation="90" />
        </filter>
        <mask id={`${id}-band`} maskUnits="userSpaceOnUse" x={0} y={0} width={W} height={H}>
          <path d={`M${pts.join(" L")}`} fill="none" stroke="#fff" strokeWidth="340" filter={`url(#${id}-soft)`} />
        </mask>
        <linearGradient id={`${id}-h`} x1="0" x2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.85" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${id}-v`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.85" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>

      <g mask={`url(#${id}-band)`} opacity="0.2">
        <rect x={0} y={0} width={W} height={H} fill={COSMOS.void} filter={`url(#${id}-dust)`} />
      </g>
      {fine.map((s, i) => (
        <circle key={`f${i}`} cx={s.x} cy={s.y} r={s.r} fill={s.c} opacity={s.o} />
      ))}
      {mid.map((s, i) => (
        <circle key={`m${i}`} cx={s.x} cy={s.y} r={s.r} fill={s.c} opacity={s.o} />
      ))}
      {bright.map((s, i) => (
        <g key={`b${i}`}>
          <rect x={s.x - 18} y={s.y - 0.5} width="36" height="1" fill={`url(#${id}-h)`} />
          <rect x={s.x - 0.5} y={s.y - 18} width="1" height="36" fill={`url(#${id}-v)`} />
          <circle cx={s.x} cy={s.y} r={s.r} fill="#fff" />
        </g>
      ))}
    </svg>
  );
}
