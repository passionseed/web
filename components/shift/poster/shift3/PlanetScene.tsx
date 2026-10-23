/* eslint-disable @next/next/no-img-element -- export sheet: a plain img keeps the pre-rendered planet at its exact pixel box. */
import { COSMOS } from "@/components/shift/next/cosmos";

import { planetBox, planetSpec, planetSrc, type PlanetLayout } from "./planet";

/**
 * The SHIFT planet (pre-rendered by scripts/render-shift3-planet.mjs) with a
 * tilted orbit around it, Bangkok lit in sol, and a rocket leaving Bangkok on
 * a dotted trail. Everything is in poster pixels.
 */

export interface RocketSpec {
  x: number;
  y: number;
  /** Degrees; 0 points straight up. */
  angle: number;
  scale: number;
  /** Trail control points from Bangkok to the rocket's tail: [c1x, c1y, c2x, c2y]. */
  curve: [number, number, number, number];
}

export interface OrbitSpec {
  rx: number;
  ry: number;
  tilt: number;
}

function OrbitArc({ cx, cy, orbit, half, W, H }: { cx: number; cy: number; orbit: OrbitSpec; half: "back" | "front"; W: number; H: number }) {
  const { rx, ry, tilt } = orbit;
  const d = half === "back" ? `M${-rx} 0 A ${rx} ${ry} 0 0 1 ${rx} 0` : `M${rx} 0 A ${rx} ${ry} 0 0 1 ${-rx} 0`;
  return (
    <svg className="pointer-events-none absolute inset-0" width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
      <g transform={`translate(${cx} ${cy}) rotate(${tilt})`}>
        <path
          d={d}
          fill="none"
          stroke={COSMOS.orbit}
          strokeWidth="2"
          strokeDasharray="2 9"
          strokeLinecap="round"
          opacity={half === "back" ? 0.4 : 0.75}
        />
      </g>
    </svg>
  );
}

/** Rocket body, nose up, origin at its centre; drawn about 200px tall at scale 1. */
function Rocket({ id }: { id: string }) {
  return (
    <>
      <path d="M-22 72 C -18 130, -6 170, 0 196 C 6 170, 18 130, 22 72 Z" fill={`url(#${id}-flame)`} />
      <path d="M-30 30 L -60 86 L -28 72 Z" fill={COSMOS.flare} />
      <path d="M30 30 L 60 86 L 28 72 Z" fill={COSMOS.flare} />
      <path d="M0 -96 C 34 -64, 40 -4, 32 70 L -32 70 C -40 -4, -34 -64, 0 -96 Z" fill={`url(#${id}-body)`} />
      <circle cx="0" cy="-16" r="16" fill={COSMOS.sea} stroke={COSMOS.aurora} strokeWidth="6" />
      <path d="M-32 70 L 32 70 L 22 84 L -22 84 Z" fill={COSMOS.indigo} />
    </>
  );
}

export function PlanetScene({ layout, orbit, rocket }: { layout: PlanetLayout; orbit?: OrbitSpec; rocket?: RocketSpec }) {
  const spec = planetSpec(layout);
  const box = planetBox(spec);
  const [W, H] = spec.canvas;
  const [bx, by] = spec.bangkok;
  const id = `s3-${layout}`;
  // The trail ends at the flame, a little behind the rocket's centre.
  const tail = rocket
    ? {
        x: rocket.x - Math.sin((rocket.angle * Math.PI) / 180) * 120 * rocket.scale,
        y: rocket.y + Math.cos((rocket.angle * Math.PI) / 180) * 120 * rocket.scale,
      }
    : null;

  return (
    <>
      {orbit && <OrbitArc cx={spec.cx} cy={spec.cy} orbit={orbit} half="back" W={W} H={H} />}
      <img
        src={planetSrc(layout)}
        alt=""
        width={box.w}
        height={box.h}
        className="pointer-events-none absolute max-w-none"
        style={{ left: box.x, top: box.y, width: box.w, height: box.h }}
      />
      {orbit && <OrbitArc cx={spec.cx} cy={spec.cy} orbit={orbit} half="front" W={W} H={H} />}
      <svg className="pointer-events-none absolute inset-0" width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
        <defs>
          <linearGradient id={`${id}-body`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="1" stopColor="#a9b4dc" />
          </linearGradient>
          <linearGradient id={`${id}-flame`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={COSMOS.sol} />
            <stop offset="1" stopColor={COSMOS.flare} stopOpacity="0" />
          </linearGradient>
          <filter id={`${id}-glow`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" />
          </filter>
        </defs>
        <circle cx={bx} cy={by} r="16" fill={COSMOS.sol} opacity="0.85" filter={`url(#${id}-glow)`} />
        <circle cx={bx} cy={by} r="5.5" fill={COSMOS.sol} />
        {rocket && tail && (
          <>
            <path
              d={`M${bx} ${by} C ${rocket.curve.join(" ")}, ${tail.x.toFixed(1)} ${tail.y.toFixed(1)}`}
              fill="none"
              stroke={COSMOS.sol}
              strokeWidth="4"
              strokeDasharray="3 12"
              strokeLinecap="round"
            />
            <g
              transform={`translate(${rocket.x} ${rocket.y}) rotate(${rocket.angle}) scale(${rocket.scale})`}
              filter="drop-shadow(0 0 22px rgba(255,210,154,0.4))"
            >
              <Rocket id={id} />
            </g>
          </>
        )}
      </svg>
    </>
  );
}
