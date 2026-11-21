"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";

import { EL_FONT } from "@/components/hackathon/poster/elemental/brand";

import {
  ELEMENT_CHAPTERS,
  ELEMENT_SCRUB_FRAME_COUNT,
  elementFrameUrl,
  type ElementChapter,
} from "./media";

const CANVAS_W = 600;
const CANVAS_H = 750;
/** Milestone frames fetched first so fast scrollers immediately see calm -> wrecked progression. */
const MILESTONE_INDICES = [1, 8, 15, 22, 29, 36];

/** "ดิน" reads as "ธาตุดิน"; a name that already says ธาตุ stays as it is. */
function elementLabel(th: string) {
  return th.startsWith("ธาตุ") ? th : `ธาตุ${th}`;
}

/**
 * Thai has no spaces between words, so the browser can break inside one
 * ("ไม่รู้/ตัว", "ดี/ปเฟก"). Keep each phrase between separators on one line.
 */
function Phrases({ text, separator }: { text: string; separator: string }) {
  return (
    <>
      {text.split(separator).map((part, i) => (
        <span key={i}>
          {i > 0 && separator}
          <span className="whitespace-nowrap">{part}</span>
        </span>
      ))}
    </>
  );
}

function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement) {
  const iw = img.naturalWidth || CANVAS_W;
  const ih = img.naturalHeight || CANVAS_H;
  const scale = Math.max(CANVAS_W / iw, CANVAS_H / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  const dx = (CANVAS_W - dw) / 2;
  const dy = (CANVAS_H - dh) / 2;
  ctx.drawImage(img, dx, dy, dw, dh);
}

/**
 * Apple-style scroll-scrubbed chapter:
 * A 220svh sticky runway where vertical scroll directly determines which of the
 * 36 pre-extracted WebP corruption frames is drawn onto a sharp 4:5 canvas.
 * Zero video-seek stutter, silky 60fps forward and backward on iOS/Desktop,
 * lazy-loaded one chapter ahead via IntersectionObserver.
 */
function ScrubbedElementChapter({
  chapter,
  mediaOnRight,
}: {
  chapter: ElementChapter;
  mediaOnRight: boolean;
}) {
  const runwayRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: runwayRef,
    offset: ["start start", "end end"],
  });

  // Apple-style parallax typography with crisp, high-contrast legibility throughout the runway
  const wordY = useTransform(scrollYProgress, [0, 1], ["12%", "-12%"]);
  const subtitleOpacity = useTransform(scrollYProgress, [0, 0.16], [0.78, 1]);
  const subtitleY = useTransform(scrollYProgress, [0, 0.22], [18, 0]);
  const bodyOpacity = useTransform(scrollYProgress, [0.06, 0.28], [0.7, 1]);
  const bodyY = useTransform(scrollYProgress, [0.06, 0.28], [22, 0]);
  const examplesOpacity = useTransform(scrollYProgress, [0.14, 0.36], [0.65, 1]);

  useEffect(() => {
    if (reduceMotion) return;
    const runway = runwayRef.current;
    const canvas = canvasRef.current;
    if (!runway || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const frames: (HTMLImageElement | null)[] = new Array(ELEMENT_SCRUB_FRAME_COUNT).fill(null);
    let loadedStarted = false;
    let disposed = false;
    let targetFloat = 0;
    let currentFloat = 0;
    let lastDrawnIndex = -1;
    let rafId = 0;

    const drawNearestLoaded = (desiredIndex: number) => {
      const clamped = Math.min(ELEMENT_SCRUB_FRAME_COUNT - 1, Math.max(0, desiredIndex));
      let pick = frames[clamped];
      if (!pick) {
        // Fall back to nearest already-loaded frame so canvas is never blank while streaming.
        for (let d = 1; d < ELEMENT_SCRUB_FRAME_COUNT; d++) {
          if (clamped - d >= 0 && frames[clamped - d]) {
            pick = frames[clamped - d];
            break;
          }
          if (clamped + d < ELEMENT_SCRUB_FRAME_COUNT && frames[clamped + d]) {
            pick = frames[clamped + d];
            break;
          }
        }
      }
      if (pick && pick.complete && pick.naturalWidth > 0) {
        drawCover(ctx, pick);
      }
    };

    // Draw pristine before still immediately
    const posterImg = new window.Image();
    posterImg.decoding = "async";
    posterImg.src = chapter.before;
    posterImg.onload = () => {
      if (disposed) return;
      if (!frames[0]) frames[0] = posterImg;
      if (lastDrawnIndex <= 0) drawCover(ctx, posterImg);
    };

    const loadFrame = (oneBasedIndex: number) => {
      const img = new window.Image();
      img.decoding = "async";
      img.src = elementFrameUrl(chapter.key, oneBasedIndex);
      img.onload = () => {
        if (disposed) return;
        frames[oneBasedIndex - 1] = img;
        if (Math.round(currentFloat) === oneBasedIndex - 1) {
          drawCover(ctx, img);
        }
      };
    };

    const startLoadingSequence = () => {
      if (loadedStarted) return;
      loadedStarted = true;
      // Milestones first, then fill in the intermediate frames
      for (const idx of MILESTONE_INDICES) {
        loadFrame(idx);
      }
      const milestoneSet = new Set(MILESTONE_INDICES);
      for (let i = 1; i <= ELEMENT_SCRUB_FRAME_COUNT; i++) {
        if (!milestoneSet.has(i)) loadFrame(i);
      }
    };

    const loaderObserver = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          startLoadingSequence();
          loaderObserver.disconnect();
        }
      },
      { rootMargin: "1400px 0px" }
    );
    loaderObserver.observe(runway);

    // Smooth damped RAF loop synced to Framer Motion scroll progress
    const unsubscribe = scrollYProgress.on("change", (p) => {
      const clampedP = Math.min(1, Math.max(0, p));
      targetFloat = clampedP * (ELEMENT_SCRUB_FRAME_COUNT - 1);
      if (progressBarRef.current) {
        progressBarRef.current.style.transform = `scaleX(${clampedP})`;
      }
    });

    const tick = () => {
      if (disposed) return;
      currentFloat += (targetFloat - currentFloat) * 0.22;
      const idx = Math.round(currentFloat);
      if (idx !== lastDrawnIndex) {
        lastDrawnIndex = idx;
        drawNearestLoaded(idx);
      }
      rafId = window.requestAnimationFrame(tick);
    };
    rafId = window.requestAnimationFrame(tick);

    return () => {
      disposed = true;
      unsubscribe();
      loaderObserver.disconnect();
      window.cancelAnimationFrame(rafId);
    };
  }, [chapter.before, chapter.key, reduceMotion, scrollYProgress]);

  if (reduceMotion) {
    return (
      <article className="relative border-t border-[#f3efe6]/10 bg-[#0c0d0c]">
        <div
          className={`flex w-full flex-col lg:min-h-[100svh] lg:items-center ${
            mediaOnRight ? "lg:flex-row-reverse" : "lg:flex-row"
          }`}
        >
          <div className="relative aspect-[4/5] w-full shrink-0 lg:h-[100svh] lg:w-auto">
            <Image
              src={chapter.after}
              alt={`${chapter.th}: ${chapter.subtitleTh}`}
              fill
              sizes="(max-width: 1024px) 100vw, 720px"
              className="object-cover"
            />
          </div>
          <div
            className={`flex flex-1 flex-col justify-center px-5 py-14 lg:px-14 ${
              mediaOnRight ? "lg:items-end lg:text-right" : "lg:items-start lg:text-left"
            }`}
          >
            <h2
              className="whitespace-nowrap"
              style={{
                fontFamily: EL_FONT.display,
                fontSize:
                  chapter.key === "aether"
                    ? "clamp(2.6rem, 6.5vw, 6.5rem)"
                    : "clamp(5.5rem, 18vw, 16rem)",
                fontWeight: 200,
                color: chapter.color,
                lineHeight: 0.94,
              }}
            >
              {chapter.th}
            </h2>
            <p className="mt-6 text-2xl text-[#faf8f4] sm:text-3xl" style={{ fontFamily: EL_FONT.display, fontWeight: 300 }}>
              <Phrases text={chapter.subtitleTh} separator=" " />
            </p>
            <p className="mt-4 max-w-[34ch] text-base leading-relaxed text-[#e6e1d7]" style={{ fontFamily: "var(--font-bai-jamjuree), sans-serif" }}>
              {chapter.whatHappensTh}
            </p>
            <p className="mt-6 max-w-[46ch] text-xs text-[#cfc9bd]" style={{ fontFamily: EL_FONT.mono }}>
              <Phrases text={chapter.examplesTh} separator=" · " />
            </p>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article
      ref={runwayRef}
      className="relative h-[220svh] w-full border-t border-[#f3efe6]/10 bg-[#0c0d0c]"
    >
      <div className="sticky top-0 flex h-[100svh] w-full overflow-hidden">
        <div
          className={`flex h-full w-full flex-col lg:items-center ${
            mediaOnRight ? "lg:flex-row-reverse" : "lg:flex-row"
          }`}
        >
          {/* Sharp full-height 4:5 scroll-scrubbed canvas */}
          <div className="relative h-[56svh] w-full shrink-0 bg-black lg:h-[100svh] lg:w-auto lg:aspect-[4/5] lg:max-w-[54vw]">
            <canvas
              ref={canvasRef}
              width={CANVAS_W}
              height={CANVAS_H}
              role="img"
              aria-label={`${elementLabel(chapter.th)}: ${chapter.subtitleTh} เลื่อนหน้าจอเพื่อดูการเปลี่ยนแปลงจากสภาพปกติจนถูกทำลาย`}
              className="block h-full w-full object-cover"
            />
            {/* Hair-thin 1px bottom progress trace in element accent */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] bg-[#f3efe6]/10">
              <div
                ref={progressBarRef}
                className="h-full origin-left will-change-transform"
                style={{ backgroundColor: chapter.color, transform: "scaleX(0)" }}
              />
            </div>
          </div>

          {/* Opposite editorial typography moving in parallax */}
          <div
            className={`relative z-10 flex flex-1 flex-col justify-center overflow-hidden px-5 py-6 lg:px-12 lg:py-16 xl:px-16 ${
              mediaOnRight ? "lg:items-end lg:text-right" : "lg:items-start lg:text-left"
            }`}
          >
            <motion.h2
              style={{
                y: wordY,
                fontFamily: EL_FONT.display,
                fontSize:
                  chapter.key === "aether"
                    ? "clamp(2.6rem, 6.5vw, 6.5rem)"
                    : "clamp(4.6rem, 17vw, 16rem)",
                fontWeight: 200,
                color: chapter.color,
                lineHeight: 0.94,
              }}
              className="select-none whitespace-nowrap will-change-transform"
            >
              {chapter.th}
            </motion.h2>


            <motion.p
              style={{
                opacity: subtitleOpacity,
                y: subtitleY,
                fontFamily: EL_FONT.display,
                fontSize: "clamp(1.4rem, 2.5vw, 2.3rem)",
                fontWeight: 300,
                lineHeight: 1.25,
              }}
              className="mt-4 text-[#faf8f4] will-change-transform lg:mt-6"
            >
              <Phrases text={chapter.subtitleTh} separator=" " />
            </motion.p>

            <motion.p
              style={{
                opacity: bodyOpacity,
                y: bodyY,
                fontFamily: "var(--font-bai-jamjuree), sans-serif",
              }}
              className="mt-2.5 max-w-[34ch] text-sm leading-relaxed text-[#eae5dc] will-change-transform sm:text-[1.08rem] lg:mt-4"
            >
              {chapter.whatHappensTh}
            </motion.p>

            <motion.p
              style={{ opacity: examplesOpacity, fontFamily: EL_FONT.mono }}
              className="mt-4 max-w-[46ch] text-xs leading-relaxed text-[#cfc9bd] lg:mt-6"
            >
              <Phrases text={chapter.examplesTh} separator=" · " />
            </motion.p>
          </div>
        </div>
      </div>
    </article>
  );
}

export function ElementalPlacesShowcase() {
  return (
    <section id="elements" aria-label="ห้าธาตุ Elemental Hackathon">
      {ELEMENT_CHAPTERS.map((chapter, i) => (
        <ScrubbedElementChapter
          key={chapter.key}
          chapter={chapter}
          mediaOnRight={i % 2 === 1}
        />
      ))}
    </section>
  );
}
