"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";

import { SHIFT_COHORT, formatThaiDate, priceLabel } from "@/lib/content/shift-cohort";

import { PIXEL_FONT, Rects } from "../pixel/PixelRects";
import { CELL, PX } from "../pixel/pixelKit";
import { MarkerHighlight } from "../riso";
import { BAND, HERO_TRANSFORM, PANO_W, TILE_H, heroRects, panoramaRects } from "../grid/floodPanorama";
import {
  PAN_STOPS,
  REEL_SECONDS,
  type ReelProduct,
  type ReelScene,
  type TestimonialReel,
} from "./testimonialReel";
import "./testimonialReel.css";

/**
 * SHIFT[1] testimonial Reel, 1080x1920, one student per `reel`. Plays live in the browser; with
 * `render` set, every animation is paused and `window.__seekReel(seconds)`
 * jumps to a frame so scripts/render-shift-testimonial.mjs can film it.
 */

const COHORT = SHIFT_COHORT;
export const REEL_W = 1080;
export const REEL_H = 1920;
const BAND_TOP = (BAND + 5) * CELL;
const HEADLINE_SHADOW = `${CELL}px ${CELL}px 0 ${PX.cloudShade}`;
const EXIT = 0.35;

type Timed = CSSProperties & { "--in"?: string; "--out"?: string };
const timing = (start: number, end?: number): Timed => ({
  "--in": `${start}s`,
  ...(end !== undefined && { "--out": `${end - EXIT}s` }),
});

/** Camera keyframes from PAN_STOPS, eased between stops. */
function panKeyframes(): string {
  const steps = PAN_STOPS.map(
    ([s, x]) =>
      `${((s / REEL_SECONDS) * 100).toFixed(2)}% { transform: translateX(${x}px); animation-timing-function: cubic-bezier(0.45, 0, 0.25, 1); }`,
  );
  return `@keyframes reel-pan { ${steps.join(" ")} 100% { transform: translateX(${PAN_STOPS.at(-1)![1]}px); } }`;
}

function Panorama() {
  const { back, front } = panoramaRects();
  return (
    <div
      className="absolute left-0 top-0"
      style={{ width: PANO_W * CELL, animation: `reel-pan ${REEL_SECONDS}s linear 0s both` }}
    >
      <style>{panKeyframes()}</style>
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

function Tag({ children }: { children: ReactNode }) {
  return (
    <>
      <p className="text-[34px] leading-none tracking-[0.08em]" style={{ ...PIXEL_FONT, color: PX.ink }}>
        {children}
      </p>
      <span className="mt-3 block h-[4px] w-[300px]" style={{ backgroundColor: PX.ink }} />
    </>
  );
}

function Lines({ text }: { text: string }) {
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

/** Tag + headline in the sky, same layout as the grid covers. */
function SkyHeadline({ scene, children }: { scene: ReelScene; children?: ReactNode }) {
  return (
    <div
      className="reel-in absolute inset-x-0 top-[210px] flex flex-col items-center px-[60px] text-center"
      style={timing(scene.start, scene.end)}
    >
      <Tag>{scene.tag}</Tag>
      {children ?? (
        <h2
          className="mt-6 font-kodchasan text-[104px] font-bold leading-[1.1]"
          style={{ color: PX.ink, textShadow: HEADLINE_SHADOW }}
        >
          <Lines text={scene.headline} />
        </h2>
      )}
    </div>
  );
}

/** Quote chunks pop in one by one across the scene. */
function Caption({ scene }: { scene: ReelScene }) {
  if (!scene.caption) return null;
  const chunks = scene.caption.split("|");
  const first = scene.start + 0.6;
  const step = Math.min(0.9, (scene.end - first - 1.2) / chunks.length);
  return (
    <div
      className="reel-in absolute inset-x-0 flex flex-col px-[72px]"
      style={{ top: BAND_TOP + 50, ...timing(scene.start, scene.end) }}
    >
      <p className="font-kodchasan text-[52px] font-bold leading-[1.35]" style={{ color: PX.cream }}>
        {!scene.narrator && <span style={{ color: PX.accentLight }}>“</span>}
        {chunks.map((chunk, i) => {
          const last = i === chunks.length - 1;
          return (
            <span key={i} className="reel-chunk" style={timing(first + i * step)}>
              {chunk}
              {!last && " "}
              {last && !scene.narrator && <span style={{ color: PX.accentLight }}>”</span>}
            </span>
          );
        })}
      </p>
    </div>
  );
}

const PHONE = { w: 350, h: 700, top: 500 };

/** Screens stacked in the phone; each later one fades in over the last. */
function Screens({ shots, start, cover }: { shots: string[]; start: number; cover: boolean }) {
  return (
    <>
      {shots.map((src, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={src}
          src={src}
          alt=""
          className={`absolute inset-0 h-full w-full ${cover ? "object-cover object-top" : ""} ${i > 0 ? "reel-swap" : ""}`}
          style={i > 0 ? timing(start + 2.4 + (i - 1) * 2) : undefined}
        />
      ))}
    </>
  );
}

function ProductPhone({ scene, product }: { scene: ReelScene; product: ReelProduct }) {
  return (
    <div
      className="reel-phone absolute left-1/2"
      style={{
        top: PHONE.top,
        width: PHONE.w,
        height: PHONE.h,
        marginLeft: -PHONE.w / 2,
        filter: `drop-shadow(12px 12px 0 ${PX.ink}55)`,
        ...timing(scene.start + 0.3, scene.end),
      }}
    >
      {product.bezel ? (
        <div className="h-full w-full rounded-[52px] p-[14px]" style={{ backgroundColor: "#1c1c1e" }}>
          <div className="relative h-full w-full overflow-hidden rounded-[40px] bg-white">
            <Screens shots={product.shots} start={scene.start} cover />
          </div>
        </div>
      ) : (
        <Screens shots={product.shots} start={scene.start} cover={false} />
      )}
    </div>
  );
}

function ProductHeadline({ scene, proof }: { scene: ReelScene; proof: string }) {
  return (
    <SkyHeadline scene={scene}>
      <h2
        className="mt-5 whitespace-nowrap font-kodchasan text-[100px] font-bold leading-[1.05]"
        style={{ color: PX.ink, textShadow: HEADLINE_SHADOW }}
      >
        {scene.headline}
      </h2>
      <p
        className="mt-3 font-kodchasan text-[38px] font-bold"
        style={{ color: PX.cream, backgroundColor: PX.accentDark, padding: "4px 22px" }}
      >
        {proof}
      </p>
    </SkyHeadline>
  );
}

function ProudHeadline({ scene }: { scene: ReelScene }) {
  const [top, bottom] = scene.headline.split("\n");
  return (
    <SkyHeadline scene={scene}>
      <h2 className="mt-6 font-kodchasan text-[108px] font-bold leading-[1.15]" style={{ color: PX.ink }}>
        <span className="block whitespace-nowrap" style={{ textShadow: HEADLINE_SHADOW }}>
          {top}
        </span>
        <span
          className="reel-marker mt-2 inline-block whitespace-nowrap px-5"
          style={{
            ...timing(scene.start + 0.9),
            backgroundImage: "linear-gradient(100deg, rgba(255,224,138,0.96), rgba(255,213,97,0.92))",
          }}
        >
          {bottom}
        </span>
      </h2>
    </SkyHeadline>
  );
}

function CtaScene({ scene }: { scene: ReelScene }) {
  const anchor = COHORT.anchorPriceBaht;
  return (
    <>
      <SkyHeadline scene={{ ...scene, end: REEL_SECONDS + 1 }}>
        <h1
          className="mt-4 text-[200px] leading-[0.95]"
          style={{ ...PIXEL_FONT, color: PX.ink, textShadow: HEADLINE_SHADOW }}
        >
          {scene.headline}
        </h1>
        <p className="mt-3 font-kodchasan text-[56px] font-bold leading-[1.3]" style={{ color: PX.ink }}>
          7 วัน ปั้นโปรเจกต์ที่มี
        </p>
        <p className="mt-2 text-[80px] leading-[1.2]">
          <MarkerHighlight>คนใช้จริง</MarkerHighlight>
        </p>
      </SkyHeadline>
      <div
        className="reel-in-last absolute inset-x-0 flex flex-col items-center gap-4 text-center"
        style={{ top: BAND_TOP + 40, ...timing(scene.start + 0.7) }}
      >
        <p className="font-kodchasan text-[64px] font-bold" style={{ color: PX.cream }}>
          รับแค่ {COHORT.seats} คน{" "}
          {anchor && (
            <span className="text-[48px] line-through" style={{ color: `${PX.cream}88` }}>
              ฿{anchor.toLocaleString("en-US")}
            </span>
          )}{" "}
          <span className="reel-pulse inline-block" style={{ color: PX.accentLight, ...timing(scene.start + 1.5) }}>
            {priceLabel(COHORT)}
          </span>
        </p>
        <p className="font-kodchasan text-[40px] font-semibold" style={{ color: `${PX.cream}cc` }}>
          ปิดรับ {formatThaiDate(COHORT.applyDeadline)} · สมัครที่ลิงก์ในโปรไฟล์
        </p>
        <p className="mt-2 text-[30px] tracking-[0.1em]" style={{ ...PIXEL_FONT, color: PX.accentLight }}>
          passionseed.org/shift
        </p>
      </div>
    </>
  );
}

function Attribution({ reel }: { reel: TestimonialReel }) {
  const last = reel.scenes.find((s) => s.id === "cta")!.start;
  return (
    <p
      className="reel-in absolute inset-x-0 px-[72px] text-[26px] tracking-[0.08em]"
      style={{ top: BAND_TOP + 420, ...PIXEL_FONT, color: `${PX.cream}99`, ...timing(0.4, last) }}
    >
      {reel.attribution}
    </p>
  );
}

function Scene({ scene, product }: { scene: ReelScene; product: ReelProduct }) {
  switch (scene.id) {
    case "product":
      return (
        <>
          <ProductHeadline scene={scene} proof={product.proof} />
          <ProductPhone scene={scene} product={product} />
          <Caption scene={scene} />
        </>
      );
    case "proud":
      return (
        <>
          <ProudHeadline scene={scene} />
          <Caption scene={scene} />
        </>
      );
    case "cta":
      return <CtaScene scene={scene} />;
    default:
      return (
        <>
          <SkyHeadline scene={scene} />
          <Caption scene={scene} />
        </>
      );
  }
}

declare global {
  interface Window {
    __seekReel?: (seconds: number) => void;
    __reelReady?: boolean;
  }
}

/** Pause everything and expose a seek hook for frame-by-frame capture. */
function useRenderMode(render: boolean) {
  useEffect(() => {
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
  }, [render]);
}

export function ShiftTestimonialReel({ reel, render = false }: { reel: TestimonialReel; render?: boolean }) {
  const [take, setTake] = useState(0);
  useRenderMode(render);
  return (
    <div
      key={take}
      id="shift-testimonial-reel"
      className="relative shrink-0 overflow-hidden"
      style={{ width: REEL_W, height: REEL_H, backgroundColor: PX.ink }}
      onClick={render ? undefined : () => setTake((t) => t + 1)}
      title={render ? undefined : "Click to replay"}
    >
      <Panorama />
      {reel.scenes.map((scene) => (
        <Scene key={scene.id} scene={scene} product={reel.product} />
      ))}
      <Attribution reel={reel} />
    </div>
  );
}
