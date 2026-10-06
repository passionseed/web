"use client";

import { useMemo, useState } from "react";

import { PIXEL_FONT } from "../pixel/PixelRects";
import { PX } from "../pixel/pixelKit";
import { cameraKeyframes, flashKeyframes, panKeyframes } from "./reelEngine";
import {
  Flash,
  HEADLINE_SHADOW,
  Headline,
  Highlight,
  Lines,
  Offer,
  Panorama,
  PhoneBody,
  REEL_H,
  REEL_W,
  Tag,
  Top,
  cardStyle,
  timing,
  useRenderMode,
  whole,
} from "./reelParts";
import {
  COUNT_DURATION,
  HOOK_BEATS,
  QUOTE_BEATS,
  at,
  chunkTime,
  chunks,
  reelCues,
  scene,
  testimonialShots,
} from "./reelTimeline";
import { BEAT, REEL_SECONDS, type ReelProof, type ReelScene, type TestimonialReel } from "./testimonialReel";

/**
 * SHIFT[1] testimonial Reel, 1080x1920, one student per `reel`. Plays live in
 * the browser; with `render` set, every animation is paused and
 * `window.__seekReel(seconds)` jumps to a frame so
 * scripts/render-shift-testimonial.mjs can film it. `window.__reelCues` is the
 * cue sheet the soundtrack is scored from.
 */

/* ---------- Hook + proof: the shipped app first ---------- */

const PHONE = { w: 400, h: 800, top: 620 };

function Hook({ reel }: { reel: TestimonialReel }) {
  const hook = scene(reel, "hook");
  const proof = scene(reel, "proof");
  return (
    <>
      <div
        className="reel-phone absolute left-1/2"
        style={{ top: PHONE.top, width: PHONE.w, height: PHONE.h, marginLeft: -PHONE.w / 2, ...timing(hook.start, proof.end) }}
      >
        <div className="reel-nudge h-full w-full" style={{ ...timing(proof.start), filter: `drop-shadow(14px 14px 0 ${PX.ink}66)` }}>
          <PhoneBody shots={reel.product.shots} bezel={reel.product.bezel} swapAt={at(hook, HOOK_BEATS.swap)} />
        </div>
      </div>
      <Top start={at(hook, HOOK_BEATS.headline)} end={hook.end}>
        <Tag>{hook.tag}</Tag>
        <Headline size={116}>
          <Lines text={hook.headline} />
        </Headline>
        <p
          className="reel-pop mt-4 font-kodchasan text-[44px] font-bold"
          style={{ color: PX.cream, backgroundColor: PX.accentDark, padding: "4px 24px", ...timing(at(hook, HOOK_BEATS.title)) }}
        >
          {reel.product.title}
        </p>
      </Top>
    </>
  );
}

function ProofStamp({ proof, start }: { proof: ReelProof; start: number }) {
  const big = { color: PX.accentDark, textShadow: HEADLINE_SHADOW };
  if (proof.count === undefined) {
    return (
      <p className="mt-4 font-kodchasan text-[150px] font-bold leading-[1.05]" style={big}>
        {proof.big}
      </p>
    );
  }
  const name = `reel-count-${proof.count}`;
  return (
    <p className="mt-2 font-kodchasan text-[230px] font-bold leading-[1]" style={big}>
      <style>{`@keyframes ${name}{to{--reel-n:${proof.count}}}`}</style>
      <span
        className="reel-count"
        style={{ animation: `${name} ${COUNT_DURATION}s cubic-bezier(0.2, 0.7, 0.3, 1) ${start}s both` }}
      />
      {proof.big}
    </p>
  );
}

function Proof({ reel }: { reel: TestimonialReel }) {
  const proof = scene(reel, "proof");
  return (
    <Top start={proof.start} end={proof.end}>
      <Tag>{proof.tag}</Tag>
      <ProofStamp proof={reel.proof} start={proof.start} />
      <p className="reel-pop font-kodchasan text-[64px] font-bold" style={{ color: PX.ink, ...timing(at(proof, 1)) }}>
        {reel.proof.small}
      </p>
    </Top>
  );
}

/* ---------- Quote scenes: the student's own words ---------- */

function QuoteCard({ s, attribution }: { s: ReelScene; attribution: string }) {
  const words = chunks(s);
  return (
    <div
      className="reel-rise absolute inset-x-[56px] top-[640px] px-[48px] pb-[40px] pt-[44px]"
      style={{ ...cardStyle, ...timing(at(s, QUOTE_BEATS.card), s.end) }}
    >
      <p className="font-kodchasan text-[60px] font-bold leading-[1.35]" style={{ color: PX.cream }}>
        <span style={{ color: PX.accentLight }}>“</span>
        {words.map((w, i) => {
          const last = i === words.length - 1;
          return (
            <span key={i} className="reel-pop" style={timing(chunkTime(s, i))}>
              {w}
              {!last && " "}
              {last && <span style={{ color: PX.accentLight }}>”</span>}
            </span>
          );
        })}
      </p>
      <p className="mt-6 text-[24px] tracking-[0.08em]" style={{ ...PIXEL_FONT, color: `${PX.cream}99` }}>
        {attribution}
      </p>
    </div>
  );
}

function Quote({ s, attribution }: { s: ReelScene; attribution: string }) {
  const [top, bottom] = s.headline.split("\n");
  return (
    <>
      <Top start={s.start} end={s.end}>
        <Tag>{s.tag}</Tag>
        <Headline>
          {s.id === "proud" ? (
            <>
              <span className="block whitespace-nowrap">{top}</span>
              <span className="mt-2 inline-block">
                <Highlight at={at(s, 1)}>{bottom}</Highlight>
              </span>
            </>
          ) : (
            <Lines text={s.headline} />
          )}
        </Headline>
      </Top>
      <QuoteCard s={s} attribution={attribution} />
    </>
  );
}

/* ---------- Stage ---------- */

export function ShiftTestimonialReel({ reel, render = false }: { reel: TestimonialReel; render?: boolean }) {
  const [take, setTake] = useState(0);
  const cues = useMemo(() => reelCues(reel), [reel]);
  useRenderMode(render, cues);
  const cta = scene(reel, "cta");
  return (
    <div
      key={take}
      id="shift-testimonial-reel"
      className="relative shrink-0 overflow-hidden"
      style={{ width: REEL_W, height: REEL_H, backgroundColor: PX.ink }}
      onClick={render ? undefined : () => setTake((t) => t + 1)}
      title={render ? undefined : "Click to replay"}
    >
      <style>{cameraKeyframes(cues)}</style>
      <div className="absolute inset-0 origin-[50%_40%]" style={whole("reel-cam", REEL_SECONDS)}>
        <Panorama panKeyframes={panKeyframes(testimonialShots(reel), REEL_SECONDS)} seconds={REEL_SECONDS} />
        <Hook reel={reel} />
        <Proof reel={reel} />
        {reel.scenes
          .filter((s) => s.caption)
          .map((s) => (
            <Quote key={s.id} s={s} attribution={reel.attribution} />
          ))}
        <Offer start={cta.start} beat={BEAT} tag={cta.tag} />
      </div>
      <Flash keyframes={flashKeyframes(cues)} seconds={REEL_SECONDS} />
    </div>
  );
}
