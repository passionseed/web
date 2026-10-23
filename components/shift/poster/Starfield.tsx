import { COSMOS } from "@/components/shift/next/cosmos";

/**
 * Deep-space backdrop for poster carousels: a seeded starfield and one
 * milky-way band of dust. Everything is drawn in panorama coordinates and
 * each slide is a 1080px window onto it (`index`), so the band runs
 * unbroken from slide to slide when the carousel is swiped.
 * Deterministic: the same index always draws the same sky.
 */

const W = 1080;
const H = 1440;

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

/** Centre line of the band across the whole panorama: a slow diagonal drift. */
function bandY(x: number) {
  return 1180 - x * 0.06 + 150 * Math.sin(x / 1700);
}

const TINTS = ["#ffffff", "#ffffff", "#ffffff", "#dfe8ff", "#cfe0ff", "#ffe8cf"];

interface Star {
  x: number;
  y: number;
  r: number;
  o: number;
  c: string;
}

function stars(index: number) {
  const rand = rng(9973 * (index + 1));
  const x0 = index * W;
  const pick = () => TINTS[Math.floor(rand() * TINTS.length)];

  // Dust-fine stars, thicker inside the band.
  const fine: Star[] = [];
  while (fine.length < 1300) {
    const x = x0 + rand() * W;
    const y = rand() * H;
    const d = Math.abs(y - bandY(x));
    if (rand() > 0.22 + 0.78 * Math.exp(-((d / 170) ** 2))) continue;
    fine.push({ x, y, r: 0.35 + rand() * 0.6, o: 0.25 + rand() * 0.55, c: pick() });
  }
  const mid: Star[] = Array.from({ length: 34 }, () => ({
    x: x0 + rand() * W,
    y: rand() * H,
    r: 0.9 + rand() * 0.8,
    o: 0.55 + rand() * 0.4,
    c: pick(),
  }));
  const bright: Star[] = Array.from({ length: 3 }, () => ({
    x: x0 + 60 + rand() * (W - 120),
    y: 170 + rand() * (H - 300),
    r: 1.6 + rand() * 0.9,
    o: 1,
    c: pick(),
  }));
  return { fine, mid, bright };
}

/** The band as one smooth path along bandY, a little wider than this window. */
function bandPath(index: number) {
  const from = index * W - 400;
  const pts: string[] = [];
  for (let x = from; x <= from + W + 800; x += 40) pts.push(`${x.toFixed(0)},${bandY(x).toFixed(1)}`);
  return `M${pts.join(" L")}`;
}

export function Starfield({ index }: { index: number }) {
  const { fine, mid, bright } = stars(index);
  const x0 = index * W;
  const id = `sky-${index}`;
  return (
    <svg
      className="pointer-events-none absolute inset-0"
      width={W}
      height={H}
      viewBox={`${x0} 0 ${W} ${H}`}
      aria-hidden="true"
    >
      <defs>
        <filter id={`${id}-dust`} filterUnits="userSpaceOnUse" x={x0} y={0} width={W} height={H}>
          <feTurbulence type="fractalNoise" baseFrequency="0.004 0.008" numOctaves="5" seed="7" result="a" />
          <feColorMatrix in="a" type="matrix" values="0 0 0 0 0.20  0 0 0 0 0.30  0 0 0 0 0.95  0 0 0 2.4 -1.0" result="blue" />
          <feTurbulence type="fractalNoise" baseFrequency="0.006 0.011" numOctaves="4" seed="23" result="b" />
          <feColorMatrix in="b" type="matrix" values="0 0 0 0 0.58  0 0 0 0 0.40  0 0 0 0 1  0 0 0 2.2 -1.05" result="violet" />
          <feMerge>
            <feMergeNode in="blue" />
            <feMergeNode in="violet" />
          </feMerge>
        </filter>
        <filter id={`${id}-soft`} filterUnits="userSpaceOnUse" x={x0 - 200} y={-200} width={W + 400} height={H + 400}>
          <feGaussianBlur stdDeviation="90" />
        </filter>
        <mask id={`${id}-band`} maskUnits="userSpaceOnUse" x={x0} y={0} width={W} height={H}>
          <path d={bandPath(index)} fill="none" stroke="#fff" strokeWidth="340" filter={`url(#${id}-soft)`} />
        </mask>
        <linearGradient id={`${id}-spike-h`} x1="0" x2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.85" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${id}-spike-v`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.85" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>

      <rect x={x0} y={0} width={W} height={H} fill={COSMOS.void} />
      {/* Milky-way dust: cloudy noise, only inside the soft band. */}
      <g mask={`url(#${id}-band)`} opacity="0.18">
        <rect x={x0} y={0} width={W} height={H} filter={`url(#${id}-dust)`} />
      </g>

      {fine.map((s, i) => (
        <circle key={`f${i}`} cx={s.x} cy={s.y} r={s.r} fill={s.c} opacity={s.o} />
      ))}
      {mid.map((s, i) => (
        <g key={`m${i}`} opacity={s.o}>
          <circle cx={s.x} cy={s.y} r={s.r} fill={s.c} />
        </g>
      ))}
      {bright.map((s, i) => (
        <g key={`b${i}`}>
          <rect x={s.x - 18} y={s.y - 0.5} width="36" height="1" fill={`url(#${id}-spike-h)`} />
          <rect x={s.x - 0.5} y={s.y - 18} width="1" height="36" fill={`url(#${id}-spike-v)`} />
          <circle cx={s.x} cy={s.y} r={s.r} fill="#fff" />
        </g>
      ))}
    </svg>
  );
}
