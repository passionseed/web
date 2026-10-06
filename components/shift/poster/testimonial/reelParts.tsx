"use client";

import { useEffect, useMemo, type CSSProperties, type ReactNode } from "react";

import { SHIFT_COHORT, formatThaiDate, priceLabel } from "@/lib/content/shift-cohort";

import { notch } from "../grid/GridSlideFrame";
import { HERO_TRANSFORM, PANO_W, TILE_H, heroRects, panoramaRects } from "../grid/floodPanorama";
import { PIXEL_FONT, Rects } from "../pixel/PixelRects";
import { CELL, PX } from "../pixel/pixelKit";
import { MarkerHighlight } from "../riso";
import type { ReelCues } from "./reelEngine";
export { OFFER_BEATS } from "./reelEngine";
import "./testimonialReel.css";

/**
 * Building blocks shared by every SHIFT[1] Reel: the stage, the flooded-city
 * panorama, type, the phone, cards and the offer. Timing is passed in as
 * seconds; each block animates with CSS delays so render mode can seek.
 */

export const REEL_W = 1080;
export const REEL_H = 1920;
/** Everything readable stays above Meta's bottom 35% (caption, CTA button). */
export const TOP = 230;
export const HEADLINE_SHADOW = `${CELL}px ${CELL}px 0 ${PX.cloudShade}`;
const EXIT = 0.14;

export type Timed = CSSProperties & { "--in"?: string; "--out"?: string };
export const timing = (start: number, end?: number): Timed => ({
  "--in": `${start}s`,
  ...(end !== undefined && { "--out": `${end - EXIT}s` }),
});
/** A keyframe track that spans the whole Reel. */
export const whole = (name: string, seconds: number): CSSProperties => ({
  animation: `${name} ${seconds}s linear 0s both`,
});

export const cardStyle: CSSProperties = { backgroundColor: `${PX.ink}f0`, clipPath: notch(CELL * 2) };

/* ---------- World ---------- */

export function Panorama({ panKeyframes, seconds }: { panKeyframes: string; seconds: number }) {
  const { back, front } = useMemo(() => panoramaRects(), []);
  return (
    <div className="absolute left-0 top-0" style={{ width: PANO_W * CELL, ...whole("reel-pan", seconds) }}>
      <style>{panKeyframes}</style>
      <svg
        width={PANO_W * CELL}
        height={TILE_H * CELL}
        viewBox={`0 0 ${PANO_W} ${TILE_H}`}
        shapeRendering="crispEdges"
        aria-hidden="true"
      >
        <Rects rects={back} />
        <g className="reel-bob">
          <g transform={HERO_TRANSFORM}>
            <Rects rects={heroRects()} />
          </g>
        </g>
        <Rects rects={front} />
      </svg>
    </div>
  );
}

export function Flash({ keyframes, seconds }: { keyframes: string; seconds: number }) {
  return (
    <>
      <style>{keyframes}</style>
      <div className="pointer-events-none absolute inset-0 bg-white" style={whole("reel-flash", seconds)} />
    </>
  );
}

/* ---------- Type ---------- */

export function Tag({ children }: { children: ReactNode }) {
  return (
    <>
      <p className="text-[34px] leading-none tracking-[0.08em]" style={{ ...PIXEL_FONT, color: PX.ink }}>
        {children}
      </p>
      <span className="mt-3 block h-[4px] w-[300px]" style={{ backgroundColor: PX.ink }} />
    </>
  );
}

export function Lines({ text }: { text: string }) {
  return (
    <>
      {text.split("\n").map((line, i) => (
        <span key={i} className="block whitespace-nowrap">
          {line}
        </span>
      ))}
    </>
  );
}

export function Headline({ children, size = 108, color = PX.ink }: { children: ReactNode; size?: number; color?: string }) {
  return (
    <h2
      className="mt-5 font-kodchasan font-bold leading-[1.1]"
      style={{ fontSize: size, color, textShadow: color === PX.ink ? HEADLINE_SHADOW : "none" }}
    >
      {children}
    </h2>
  );
}

/** Centred block at `top`, slammed in at `start`, gone at `end`. */
export function Top({
  start,
  end,
  top = TOP,
  children,
}: {
  start: number;
  end?: number;
  top?: number;
  children: ReactNode;
}) {
  return (
    <div
      className={`${end === undefined ? "reel-slam-last" : "reel-slam"} absolute inset-x-0 flex flex-col items-center px-[60px] text-center`}
      style={{ top, ...timing(start, end) }}
    >
      {children}
    </div>
  );
}

export function Highlight({ at, children }: { at: number; children: ReactNode }) {
  return (
    <span
      className="reel-marker inline-block whitespace-nowrap px-5"
      style={{
        ...timing(at),
        textShadow: "none",
        backgroundImage: "linear-gradient(100deg, rgba(255,224,138,0.96), rgba(255,213,97,0.92))",
      }}
    >
      {children}
    </span>
  );
}

/* ---------- Phone ---------- */

export function Screens({ shots, swapAt, cover }: { shots: string[]; swapAt?: number; cover: boolean }) {
  return (
    <>
      {shots.map((src, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={src}
          src={src}
          alt=""
          className={`absolute inset-0 h-full w-full ${cover ? "object-cover object-top" : ""} ${i > 0 ? "reel-swap" : ""}`}
          style={i > 0 && swapAt !== undefined ? timing(swapAt + (i - 1) * 2) : undefined}
        />
      ))}
    </>
  );
}

/** App screens in a drawn phone bezel, or bare when the capture has its own. */
export function PhoneBody({ shots, bezel, swapAt }: { shots: string[]; bezel: boolean; swapAt?: number }) {
  return bezel ? (
    <div className="h-full w-full rounded-[56px] p-[15px]" style={{ backgroundColor: "#1c1c1e" }}>
      <div className="relative h-full w-full overflow-hidden rounded-[42px] bg-white">
        <Screens shots={shots} swapAt={swapAt} cover />
      </div>
    </div>
  ) : (
    <Screens shots={shots} swapAt={swapAt} cover={false} />
  );
}

/* ---------- The offer ---------- */

const COHORT = SHIFT_COHORT;

/** SHIFT[1] wordmark, promise, then the price card, one line per beat. */
export function Offer({ start, beat, tag }: { start: number; beat: number; tag: string }) {
  const b = (n: number) => timing(start + n * beat);
  const anchor = COHORT.anchorPriceBaht;
  return (
    <>
      <Top start={start}>
        <Tag>{tag}</Tag>
        <h1 className="mt-4 text-[210px] leading-[0.95]" style={{ ...PIXEL_FONT, color: PX.ink, textShadow: HEADLINE_SHADOW }}>
          {COHORT.name}
        </h1>
        <p className="reel-pop mt-3 font-kodchasan text-[60px] font-bold leading-[1.3]" style={{ color: PX.ink, ...b(1) }}>
          7 วัน ปั้นโปรเจกต์ที่มี
        </p>
        <p className="reel-pop mt-1 text-[88px] leading-[1.2]" style={b(2)}>
          <MarkerHighlight>คนใช้จริง</MarkerHighlight>
        </p>
      </Top>
      <div
        className="reel-rise-last absolute inset-x-[56px] top-[820px] flex flex-col items-center px-[40px] py-[40px] text-center"
        style={{ ...cardStyle, ...b(4) }}
      >
        <p className="font-kodchasan text-[64px] font-bold" style={{ color: PX.cream }}>
          รับแค่ {COHORT.seats} คน{" "}
          {anchor && (
            <span className="reel-strike text-[52px]" style={{ color: `${PX.cream}88`, ...b(4.5) }}>
              ฿{anchor.toLocaleString("en-US")}
            </span>
          )}
        </p>
        <p className="reel-slam-last font-kodchasan text-[190px] font-bold leading-[1]" style={{ color: PX.accentLight, ...b(5) }}>
          <span className="reel-pulse inline-block" style={b(6)}>
            {priceLabel(COHORT)}
          </span>
        </p>
        <p className="reel-pop mt-4 font-kodchasan text-[46px] font-bold" style={{ color: PX.cream, ...b(6) }}>
          ปิดรับ {formatThaiDate(COHORT.applyDeadline)}
        </p>
        <p className="reel-pop mt-3 text-[32px] tracking-[0.1em]" style={{ ...PIXEL_FONT, color: PX.accentLight, ...b(7) }}>
          passionseed.org/shift
        </p>
      </div>
    </>
  );
}

/* ---------- Render mode ---------- */

declare global {
  interface Window {
    __seekReel?: (seconds: number) => void;
    __reelReady?: boolean;
    __reelCues?: ReelCues;
  }
}

/** Pause everything and expose a seek hook for frame-by-frame capture. */
export function useRenderMode(render: boolean, cues: ReelCues) {
  useEffect(() => {
    window.__reelCues = cues;
    if (!render) return;
    const seek = (seconds: number) => {
      for (const a of document.getAnimations()) {
        a.pause();
        a.currentTime = seconds * 1000;
      }
    };
    window.__seekReel = seek;
    Promise.all([
      document.fonts.ready,
      ...Array.from(document.images).map((img) => img.decode().catch(() => undefined)),
    ]).then(() => {
      seek(0);
      window.__reelReady = true;
    });
  }, [render, cues]);
}
