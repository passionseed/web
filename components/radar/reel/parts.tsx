"use client";

import { useMemo, type CSSProperties, type ReactNode } from "react";

import { timing, type Timed } from "@/components/shift/poster/testimonial/reelParts";

import { canDotType, dotGrid, DUSK, GLYPH_ROWS, KANIT, PLEX_MONO, skyline } from "./duskCity";
import type { ReelLine } from "./payload";
import type { RadarReelScene } from "./radarReel";

/**
 * Dusk City building blocks for the Career Radar reel: the city backdrop,
 * the signature chrome (edge lines, progress dots, series tag), the lit-window
 * dot type, cards and the subtitle strip.
 */

/** Readable copy stays between here and Meta's bottom 35%. */
export const CONTENT_TOP = 260;
export const CONTENT_BOTTOM = 1240;
export const SIDE = 84;

/** In a scene, gone when it ends (the last scene keeps its content). */
export function sceneTiming(scene: RadarReelScene, start: number, isLast: boolean): Timed {
  return isLast ? timing(start) : timing(start, scene.end);
}

/* ---------- Backdrop ---------- */

export function DuskSky({ seed }: { seed: string }) {
  const buildings = useMemo(() => skyline(seed), [seed]);
  return (
    <svg className="absolute inset-0" width={1080} height={1920} viewBox="0 0 1080 1920" aria-hidden="true">
      <defs>
        <linearGradient id="rr-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2a1232" />
          <stop offset="0.38" stopColor="#7a2a55" />
          <stop offset="0.62" stopColor={DUSK.orangeDeep} />
          <stop offset="0.8" stopColor="#ffc58a" />
        </linearGradient>
        <pattern id="rr-stipple" width="10" height="10" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1.6" fill="#ffffff" opacity="0.18" />
          <circle cx="7" cy="7" r="1.2" fill="#000000" opacity="0.25" />
        </pattern>
        <pattern id="rr-dune" width="8" height="8" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1.5" fill="#f45d48" opacity="0.55" />
        </pattern>
      </defs>
      <rect width="1080" height="1400" fill="url(#rr-sky)" />
      <circle cx="760" cy="1060" r="150" fill="#ffd08a" opacity="0.55" />
      <path d="M0 1150 L180 930 L330 1060 L520 860 L700 1040 L860 900 L1080 1080 L1080 1300 L0 1300 Z" fill={DUSK.peak} />
      <path d="M0 1150 L180 930 L330 1060 L520 860 L700 1040 L860 900 L1080 1080 L1080 1300 L0 1300 Z" fill="url(#rr-stipple)" />
      <path d="M0 1260 Q270 1170 540 1240 T1080 1220 L1080 1600 L0 1600 Z" fill={DUSK.plumSoft} />
      {buildings.map((b, i) => (
        <g key={i}>
          <rect x={b.x} y={b.y} width={b.w} height={b.h} fill={DUSK.plum} />
          {b.windows.map((w, j) =>
            w.color ? <rect key={j} x={w.x} y={w.y} width={9} height={11} fill={w.color} /> : null
          )}
        </g>
      ))}
      <rect y="1500" width="1080" height="420" fill={DUSK.dune} />
      <rect y="1500" width="1080" height="420" fill="url(#rr-dune)" />
      {/* Dim the city behind the copy so cream text always reads. */}
      <rect width="1080" height="1920" fill={DUSK.plum} opacity="0.28" />
    </svg>
  );
}

/* ---------- Signature chrome ---------- */

export function EdgeLines() {
  const line: CSSProperties = { position: "absolute", top: 0, bottom: 0, width: 3, backgroundColor: DUSK.cream, opacity: 0.85 };
  return (
    <>
      <div style={{ ...line, left: 36 }} />
      <div style={{ ...line, right: 36 }} />
    </>
  );
}

export function ProgressDots({ scenes }: { scenes: RadarReelScene[] }) {
  return (
    <div className="absolute inset-x-0 flex justify-center gap-[18px]" style={{ top: 44 }}>
      {scenes.map((s, i) => (
        <span
          key={s.id}
          className={i === scenes.length - 1 ? "rr-dot-last" : "rr-dot"}
          style={{ display: "block", width: 22, height: 22, borderRadius: 11, ...timing(s.start, s.end) }}
        />
      ))}
    </div>
  );
}

export function SeriesTag({ tag }: { tag: string }) {
  return (
    <>
      <div
        className="absolute flex items-center gap-3"
        style={{ left: 60, top: 100, backgroundColor: DUSK.plum, color: DUSK.cream, padding: "12px 22px", borderRadius: 999 }}
      >
        <span style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: DUSK.magenta, display: "block" }} />
        <span style={{ fontFamily: PLEX_MONO, fontSize: 28, letterSpacing: "0.14em", fontWeight: 500 }}>{tag}</span>
      </div>
      <p
        className="absolute"
        style={{ right: 60, top: 112, color: DUSK.cream, fontFamily: PLEX_MONO, fontSize: 24, letterSpacing: "0.18em" }}
      >
        PASSION SEED
      </p>
    </>
  );
}

export function SunsetBand({ height = 14 }: { height?: number }) {
  return (
    <div
      style={{
        height,
        background: `linear-gradient(90deg, ${DUSK.violet}, ${DUSK.magenta} 30%, ${DUSK.orangeDeep} 65%, ${DUSK.windows[2]})`,
      }}
    />
  );
}

/* ---------- Type ---------- */

/** Mostly warm gold, with the odd brighter or deeper window, like a real tower. */
function litWindow(col: number, row: number): string {
  const n = (col * 7 + row * 13) % 9;
  if (n === 0) return DUSK.windows[2];
  if (n === 4) return DUSK.windows[1];
  return DUSK.windows[0];
}

/**
 * One big number or keyword in lit-window dots. Windows switch on left to
 * right from `at`. Falls back to Kanit for characters the dot font lacks.
 */
export function DotType({ text, at, cell = 22, maxWidth = 900 }: { text: string; at: number; cell?: number; maxWidth?: number }) {
  const grid = useMemo(() => dotGrid(text), [text]);
  if (!canDotType(text)) {
    return (
      <span
        className="reel-pop"
        style={{ fontFamily: KANIT, fontWeight: 700, fontSize: Math.min(cell * 5, 110), color: DUSK.orange, lineHeight: 1.1, ...timing(at) }}
      >
        {text}
      </span>
    );
  }
  const size = Math.min(cell, maxWidth / Math.max(1, grid.cols));
  const width = grid.cols * size;
  const height = GLYPH_ROWS * size;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-label={text} role="img" className="rr-glow" style={timing(at)}>
      {grid.dots.map((d, i) => {
        const cx = d.col * size + size / 2;
        const cy = d.row * size + size / 2;
        const box = { x: cx - size * 0.34, y: cy - size * 0.4, width: size * 0.68, height: size * 0.8 };
        // Dark windows stay faint so the lit ones read as one glyph.
        if (!d.lit) return <rect key={i} {...box} fill={DUSK.cream} opacity={0.07} />;
        return <rect key={i} className="rr-lit" {...box} fill={litWindow(d.col, d.row)} style={timing(at + d.col * 0.012)} />;
      })}
    </svg>
  );
}

/** Copy with its number set in orange (Dusk City keyword colour). */
export function Highlighted({ line, size = 48 }: { line: ReelLine; size?: number }) {
  const parts = line.highlight ? line.text.split(line.highlight) : [line.text];
  return (
    <span style={{ fontFamily: KANIT, fontSize: size, lineHeight: 1.3, color: DUSK.cream }}>
      {parts.map((part, i) => (
        <span key={i}>
          {part}
          {i < parts.length - 1 && <span style={{ color: DUSK.orange, fontWeight: 700 }}>{line.highlight}</span>}
        </span>
      ))}
    </span>
  );
}

/** The subtitle strip: cream on plum, three small dots under it. */
export function Strip({ children, size = 52 }: { children: ReactNode; size?: number }) {
  return (
    <div className="flex flex-col items-center">
      <div style={{ backgroundColor: DUSK.plum, color: DUSK.cream, fontFamily: KANIT, fontSize: size, fontWeight: 600, lineHeight: 1.3, padding: "14px 30px", textAlign: "center" }}>
        {children}
      </div>
      <div className="mt-3 flex gap-2">
        {[DUSK.cream, DUSK.cyan, DUSK.magenta].map((c) => (
          <span key={c} style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: c, display: "block" }} />
        ))}
      </div>
    </div>
  );
}

/** An info card: plum, a sunset band on top, no texture. */
export function Card({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{ backgroundColor: `${DUSK.plum}f2`, color: DUSK.cream, boxShadow: "0 18px 0 rgba(0,0,0,0.25)", ...style }}>
      <SunsetBand />
      <div style={{ padding: "30px 40px" }}>{children}</div>
    </div>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <p style={{ fontFamily: KANIT, fontSize: 36, fontWeight: 600, color: DUSK.orange, margin: 0 }}>{children}</p>;
}

export function Sources({ sources }: { sources: string[] }) {
  if (!sources.length) return null;
  return (
    <p className="absolute inset-x-0 text-center" style={{ top: CONTENT_BOTTOM - 10, color: DUSK.cream, opacity: 0.8, fontFamily: KANIT, fontSize: 26 }}>
      ที่มา: {sources.join(" · ")}
    </p>
  );
}
