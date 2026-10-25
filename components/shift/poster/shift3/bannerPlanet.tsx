/* eslint-disable @next/next/no-img-element -- export sheet: a plain img keeps the pre-rendered planet at its exact pixel box. */
import type { ReactNode } from "react";

import { COSMOS } from "@/components/shift/next/cosmos";

import { planetBox, planetSpec, planetSrc } from "./planet";

/**
 * The SHIFT planet placed freely on a banner of any size. Banners reuse the
 * feed globe PNG (no new pre-render): it is scaled so its disc lands at
 * (cx, cy, r) in banner pixels, and Bangkok, the orbit and the rocket follow.
 *
 * The feed PNG is clipped where the feed poster's right edge was, so the
 * disc must bleed off the banner's right edge: keep cx + 0.875r >= width.
 */

const SOURCE = "feed" as const;

export interface BannerOrbit {
  rx: number;
  ry: number;
  tilt: number;
}

export interface BannerRocket {
  x: number;
  y: number;
  /** Degrees; 0 points straight up, negative leans left. */
  angle: number;
  scale: number;
  /** Trail control points from Bangkok to the rocket's tail: [c1x, c1y, c2x, c2y]. */
  curve: [number, number, number, number];
}

export interface BannerPlanetProps {
  width: number;
  height: number;
  cx: number;
  cy: number;
  r: number;
  orbit?: BannerOrbit;
  rocket?: BannerRocket;
}

/** Where the globe image and Bangkok land on the banner. */
export function bannerPlanetGeometry({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  const spec = planetSpec(SOURCE);
  const box = planetBox(spec);
  const s = r / spec.r;
  return {
    img: { x: cx + (box.x - spec.cx) * s, y: cy + (box.y - spec.cy) * s, w: box.w * s, h: box.h * s },
    /** Right edge of the image; must reach the banner's right edge. */
    right: cx + (box.x + box.w - spec.cx) * s,
    bangkok: [cx + (spec.bangkok[0] - spec.cx) * s, cy + (spec.bangkok[1] - spec.cy) * s] as const,
  };
}

function Orbit({ cx, cy, orbit, half }: { cx: number; cy: number; orbit: BannerOrbit; half: "back" | "front" }) {
  const { rx, ry, tilt } = orbit;
  const d = half === "back" ? `M${-rx} 0 A ${rx} ${ry} 0 0 1 ${rx} 0` : `M${rx} 0 A ${rx} ${ry} 0 0 1 ${-rx} 0`;
  return (
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
  );
}

/** Same rocket as PlanetScene: nose up, origin at its centre, about 200px tall at scale 1. */
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

export function BannerPlanet({ width: W, height: H, cx, cy, r, orbit, rocket }: BannerPlanetProps) {
  const { img, bangkok } = bannerPlanetGeometry({ cx, cy, r });
  const [bx, by] = bangkok;
  const id = `s3-banner-${W}x${H}`;
  const tail = rocket
    ? {
        x: rocket.x - Math.sin((rocket.angle * Math.PI) / 180) * 120 * rocket.scale,
        y: rocket.y + Math.cos((rocket.angle * Math.PI) / 180) * 120 * rocket.scale,
      }
    : null;
  const svg = (children: ReactNode) => (
    <svg className="pointer-events-none absolute inset-0" width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
      {children}
    </svg>
  );

  return (
    <>
      {orbit && svg(<Orbit cx={cx} cy={cy} orbit={orbit} half="back" />)}
      <img
        src={planetSrc(SOURCE)}
        alt=""
        width={Math.round(img.w)}
        height={Math.round(img.h)}
        className="pointer-events-none absolute max-w-none"
        style={{ left: img.x, top: img.y, width: img.w, height: img.h }}
      />
      {svg(
        <>
          {orbit && <Orbit cx={cx} cy={cy} orbit={orbit} half="front" />}
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
        </>,
      )}
    </>
  );
}
