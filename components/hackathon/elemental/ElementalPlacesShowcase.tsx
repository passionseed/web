"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { motion, useReducedMotion, useTransform } from "framer-motion";

import { EL_FONT } from "@/components/hackathon/poster/elemental/brand";

import { ELEMENT_DETAILS } from "./challenges";
import { ElementDetailSheet } from "./ElementDetailSheet";
import { MoreButton } from "./MoreButton";
import {
  ELEMENT_CHAPTERS,
  ELEMENT_KEYFRAMES,
  elementLabel,
  elementFrameUrl,
  type ElementChapter,
  type ElementKey,
} from "./media";
import { blockThresholds, DISSOLVE_BLOCK_PX, keyframeBlend, seedFromKey } from "./scrub-dissolve";
import { useSectionScroll } from "./use-section-scroll";

const HASH_PREFIX = "#element-";

const CANVAS_W = 600;
const CANVAS_H = 750;

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
 * Scroll-scrubbed chapter: a 220svh sticky runway where scroll position picks
 * the picture on a sharp 4:5 canvas. Only the 6 keyframes are downloaded
 * (about 250 KB a chapter instead of 1.5 MB for all 36 frames); between two
 * keyframes the next one dissolves in block by block, which keeps the glitch
 * look. Frames load once the chapter is about a screen away.
 */
function ScrubbedElementChapter({
  chapter,
  mediaOnRight,
  onOpenDetail,
}: {
  chapter: ElementChapter;
  mediaOnRight: boolean;
  onOpenDetail: () => void;
}) {
  const runwayRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  const scrollYProgress = useSectionScroll({
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
    const layer = document.createElement("canvas");
    layer.width = CANVAS_W;
    layer.height = CANVAS_H;
    const layerCtx = layer.getContext("2d");
    if (!ctx || !layerCtx) return;

    const cols = Math.ceil(CANVAS_W / DISSOLVE_BLOCK_PX);
    const rows = Math.ceil(CANVAS_H / DISSOLVE_BLOCK_PX);
    const thresholds = blockThresholds(cols * rows, seedFromKey(chapter.key));
    const frames: (HTMLImageElement | null)[] = ELEMENT_KEYFRAMES.map(() => null);
    let disposed = false;
    let targetProgress = 0;
    let currentProgress = 0;
    let lastDrawnKey = "";
    let rafId = 0;

    const nearestLoaded = (index: number): HTMLImageElement | null => {
      for (let d = 0; d < frames.length; d++) {
        const before = frames[index - d];
        if (before) return before;
        const after = frames[index + d];
        if (after) return after;
      }
      return null;
    };

    // Draw keyframe `from`, then the blocks of `to` whose threshold the mix has passed.
    const draw = (progress: number): boolean => {
      const { from, to, mix } = keyframeBlend(progress, frames.length);
      const base = frames[from] ?? nearestLoaded(from);
      if (!base) return false;
      drawCover(ctx, base);
      const next = frames[to];
      if (!frames[from] || !next || mix <= 0) return true;

      layerCtx.globalCompositeOperation = "source-over";
      layerCtx.clearRect(0, 0, CANVAS_W, CANVAS_H);
      drawCover(layerCtx, next);
      const mask = new Path2D();
      for (let i = 0; i < thresholds.length; i++) {
        if (thresholds[i] < mix) {
          mask.rect((i % cols) * DISSOLVE_BLOCK_PX, Math.floor(i / cols) * DISSOLVE_BLOCK_PX, DISSOLVE_BLOCK_PX, DISSOLVE_BLOCK_PX);
        }
      }
      layerCtx.globalCompositeOperation = "destination-in";
      layerCtx.fill(mask);
      ctx.drawImage(layer, 0, 0);
      return true;
    };

    const loadKeyframes = () => {
      ELEMENT_KEYFRAMES.forEach((frameNumber, i) => {
        const img = new window.Image();
        img.decoding = "async";
        img.onload = () => {
          if (disposed) return;
          frames[i] = img;
          lastDrawnKey = "";
        };
        img.src = elementFrameUrl(chapter.key, frameNumber);
      });
    };

    const loaderObserver = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          loadKeyframes();
          loaderObserver.disconnect();
        }
      },
      { rootMargin: "800px 0px" }
    );
    loaderObserver.observe(runway);

    // Smooth damped RAF loop synced to Framer Motion scroll progress
    const unsubscribe = scrollYProgress.on("change", (p) => {
      targetProgress = Math.min(1, Math.max(0, p));
      if (progressBarRef.current) {
        progressBarRef.current.style.transform = `scaleX(${targetProgress})`;
      }
    });

    const tick = () => {
      if (disposed) return;
      currentProgress += (targetProgress - currentProgress) * 0.22;
      const { from, mix } = keyframeBlend(currentProgress, frames.length);
      const key = `${from}:${Math.round(mix * 48)}`;
      if (key !== lastDrawnKey && draw(currentProgress)) lastDrawnKey = key;
      rafId = window.requestAnimationFrame(tick);
    };
    rafId = window.requestAnimationFrame(tick);

    return () => {
      disposed = true;
      unsubscribe();
      loaderObserver.disconnect();
      window.cancelAnimationFrame(rafId);
    };
  }, [chapter.key, reduceMotion, scrollYProgress]);

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
            <MoreButton chapter={chapter} onOpen={onOpenDetail} />
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
      {/* Pinned under the fixed top bar, so the bar never covers the picture. */}
      <div className="sticky top-[var(--el-header-h,0px)] flex h-[calc(100svh-var(--el-header-h,0px))] w-full overflow-hidden">
        <div
          className={`flex h-full w-full flex-col lg:items-center ${
            mediaOnRight ? "lg:flex-row-reverse" : "lg:flex-row"
          }`}
        >
          {/* Sharp full-height 4:5 scroll-scrubbed canvas. On phones it takes the height the text leaves. */}
          <div className="relative min-h-0 w-full flex-1 bg-black lg:h-full lg:w-auto lg:flex-none lg:aspect-[4/5] lg:max-w-[54vw]">
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
            className={`relative z-10 flex shrink-0 flex-col justify-center overflow-hidden px-5 pb-16 pt-6 lg:flex-1 lg:px-12 lg:py-16 xl:px-16 ${
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

            <MoreButton chapter={chapter} onOpen={onOpenDetail} />
          </div>
        </div>
      </div>
    </article>
  );
}

function isElementKey(value: string): value is ElementKey {
  return ELEMENT_CHAPTERS.some((c) => c.key === value);
}

/**
 * The five chapters. Each one opens its full brief in a side panel, and the
 * panel is linkable (#element-water), so a post can send people straight to it.
 */
export function ElementalPlacesShowcase({ joinHref, open }: { joinHref: string; open: boolean }) {
  const [activeKey, setActiveKey] = useState<ElementKey | null>(null);

  useEffect(() => {
    const fromHash = () => {
      const hash = window.location.hash;
      if (!hash.startsWith(HASH_PREFIX)) return;
      const key = hash.slice(HASH_PREFIX.length);
      if (isElementKey(key)) setActiveKey(key);
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, []);

  const openDetail = useCallback((key: ElementKey) => {
    setActiveKey(key);
    window.history.replaceState(null, "", `${HASH_PREFIX}${key}`);
  }, []);

  const closeDetail = useCallback(() => {
    setActiveKey(null);
    if (window.location.hash.startsWith(HASH_PREFIX)) {
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }
  }, []);

  return (
    <section id="elements" aria-label="ห้าธาตุ Elemental Hackathon">
      {ELEMENT_CHAPTERS.map((chapter, i) => (
        <ScrubbedElementChapter
          key={chapter.key}
          chapter={chapter}
          mediaOnRight={i % 2 === 1}
          onOpenDetail={() => openDetail(chapter.key)}
        />
      ))}
      {ELEMENT_CHAPTERS.map((chapter) => (
        <ElementDetailSheet
          key={chapter.key}
          chapter={chapter}
          detail={ELEMENT_DETAILS[chapter.key]}
          open={activeKey === chapter.key}
          onOpenChange={(next) => (next ? openDetail(chapter.key) : closeDetail())}
          joinHref={joinHref}
          registrationOpen={open}
        />
      ))}
    </section>
  );
}
