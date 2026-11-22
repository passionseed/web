"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";

import { EL, EL_FONT } from "@/components/hackathon/poster/elemental/brand";
import { ELEMENTAL, prizeTotal, thaiDateLine } from "@/components/hackathon/poster/elemental/facts";
import { formatThaiDate } from "@/lib/content/shift-cohort";

import { EditorialLink } from "./EditorialLink";
import { KEY_VISUAL_MEDIA } from "./media";

export function ElementalHero({ joinHref, open }: { joinHref: string; open: boolean }) {
  const runwayRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const reduceMotion = useReducedMotion();
  const [corrupted, setCorrupted] = useState(false);

  const { scrollYProgress } = useScroll({
    target: runwayRef,
    offset: ["start start", "end start"],
  });

  // Apple-style depth parallax as you leave the valley
  const valleyScale = useTransform(scrollYProgress, [0, 1], [1, 1.1]);
  const valleyY = useTransform(scrollYProgress, [0, 1], ["0%", "8%"]);
  const titleY = useTransform(scrollYProgress, [0, 1], ["0%", "-38%"]);
  const titleOpacity = useTransform(scrollYProgress, [0, 0.72], [1, 0]);

  // Beat 1 (0–600ms): pristine calm valley still.
  // Beat 2 (600ms+): corruption arrives as the scene loop crossfades in.
  useEffect(() => {
    if (reduceMotion) return;
    const timer = window.setTimeout(() => {
      setCorrupted(true);
      videoRef.current?.play().catch(() => {});
    }, 600);
    return () => window.clearTimeout(timer);
  }, [reduceMotion]);

  const handleVideoKeyDown = (e: React.KeyboardEvent<HTMLVideoElement>) => {
    if (e.key === " " || e.key.toLowerCase() === "k") {
      e.preventDefault();
      const v = videoRef.current;
      if (!v) return;
      if (v.paused) v.play().catch(() => {});
      else v.pause();
    }
  };

  return (
    <section ref={runwayRef} id="top" className="relative h-[130svh] w-full" style={{ backgroundColor: "#0c0d0c" }}>
      <div className="sticky top-0 flex h-[100svh] flex-col justify-between overflow-hidden">
        {/* Full-bleed valley with scroll parallax */}
        <motion.div
          className="absolute inset-0 will-change-transform"
          style={reduceMotion ? undefined : { scale: valleyScale, y: valleyY }}
        >
          <Image
            src={KEY_VISUAL_MEDIA.scenePoster}
            alt="หุบเขาริมแม่น้ำที่สงบก่อนถูกทำลาย"
            fill
            priority
            sizes="100vw"
            className="object-cover object-[50%_40%] md:object-[60%_35%]"
          />

          {!reduceMotion && (
            <video
              ref={videoRef}
              src={KEY_VISUAL_MEDIA.sceneLoop}
              poster={KEY_VISUAL_MEDIA.scenePoster}
              muted
              loop
              playsInline
              preload="auto"
              tabIndex={0}
              aria-label="ภาพเคลื่อนไหวหุบเขา Elemental Hackathon กด Space หรือ K เพื่อหยุดหรือเล่น"
              onKeyDown={handleVideoKeyDown}
              className={`absolute inset-0 h-full w-full object-cover object-[50%_40%] transition-opacity duration-500 md:object-[60%_35%] ${
                corrupted ? "opacity-100" : "opacity-0"
              }`}
            />
          )}
        </motion.div>

        {/* Solid-anchored bottom fade so the quiet fact strip always has crisp contrast */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[38svh]"
          style={{
            background:
              "linear-gradient(to top, #0c0d0c 0%, rgba(12,13,12,0.95) 48%, rgba(12,13,12,0.45) 78%, transparent 100%)",
          }}
        />

        {/* Ink title sitting directly on the pale blue sky, rising in parallax on scroll */}
        <motion.div
          style={reduceMotion ? undefined : { y: titleY, opacity: titleOpacity }}
          className="relative z-10 mx-auto w-full max-w-7xl px-5 pt-[12svh] will-change-transform sm:px-10 sm:pt-[10svh]"
        >
          {/* Sized by height too, so on short screens the title stays above the smoke. */}
          <h1 style={{ fontFamily: EL_FONT.display, color: EL.ink, lineHeight: 0.92 }}>
            <span className="block tracking-tight" style={{ fontSize: "clamp(4rem, min(13vw, 15svh), 9.5rem)", fontWeight: 200 }}>
              {ELEMENTAL.edition}
            </span>
            <span
              className="block italic tracking-tight"
              style={{ fontSize: "clamp(3.6rem, min(11.4vw, 13.2svh), 8.4rem)", fontWeight: 300 }}
            >
              Hackathon
            </span>
          </h1>
        </motion.div>

        {/* No tagline here: the page's line (หาทางออกให้ธรรมชาติ) lands once, in TeaserTheater. */}
        <div className="relative z-10 w-full">
          {/* Quiet bottom detail strip: Space Mono [tags], hairlines only, no card */}
          <div className="relative z-10 w-full border-t border-[#f3efe6]/20 bg-[#0c0d0c]/80">
            <div className="mx-auto grid max-w-7xl grid-cols-2 md:grid-cols-4">
              <div className="border-b border-r border-[#f3efe6]/18 px-5 py-4 sm:px-8 sm:py-5 md:border-b-0">
                <p className="text-[11px] text-[#d6d0c4]" style={{ fontFamily: EL_FONT.mono }}>
                  [วันที่]
                </p>
                <p
                  className="mt-1 text-lg text-[#faf8f4] sm:text-2xl"
                  style={{ fontFamily: EL_FONT.display, fontWeight: 300 }}
                >
                  {thaiDateLine()}
                </p>
                <p
                  className="mt-0.5 text-xs text-[#e0dad0]"
                  style={{ fontFamily: "var(--font-bai-jamjuree), sans-serif" }}
                >
                  หยุดยาว {ELEMENTAL.days} วัน · {ELEMENTAL.venueTh}
                </p>
              </div>

              <div className="border-b border-[#f3efe6]/18 px-5 py-4 sm:px-8 sm:py-5 md:border-b-0 md:border-r">
                <p className="text-[11px] text-[#d6d0c4]" style={{ fontFamily: EL_FONT.mono }}>
                  [รางวัลรวม]
                </p>
                <p
                  className="mt-1 text-lg text-[#faf8f4] sm:text-2xl"
                  style={{ fontFamily: EL_FONT.display, fontWeight: 300 }}
                >
                  {prizeTotal()} บาท
                </p>
                <p
                  className="mt-0.5 text-xs text-[#e0dad0]"
                  style={{ fontFamily: "var(--font-bai-jamjuree), sans-serif" }}
                >
                  มือใหม่แข่งได้ มีเวิร์กช็อปและพี่เลี้ยง
                </p>
              </div>

              <div className="border-r border-[#f3efe6]/18 px-5 py-4 sm:px-8 sm:py-5">
                <p className="text-[11px] text-[#d6d0c4]" style={{ fontFamily: EL_FONT.mono }}>
                  [ค่าสมัคร]
                </p>
                <p
                  className="mt-1 text-lg text-[#faf8f4] sm:text-2xl"
                  style={{ fontFamily: EL_FONT.display, fontWeight: 300 }}
                >
                  ฿{ELEMENTAL.groupPriceBaht} / คน
                </p>
                <p
                  className="mt-0.5 text-xs text-[#e0dad0]"
                  style={{ fontFamily: "var(--font-bai-jamjuree), sans-serif" }}
                >
                  มากับเพื่อน · คนเดียว ฿{ELEMENTAL.priceBaht}
                </p>
              </div>

              <div className="flex flex-col justify-between px-5 py-4 sm:px-8 sm:py-5">
                <p className="text-[11px] text-[#d6d0c4]" style={{ fontFamily: EL_FONT.mono }}>
                  [ปิดรับสมัคร {formatThaiDate(ELEMENTAL.registrationClosesOn, false)}]
                </p>
                <div className="mt-1">
                  {open ? (
                    <EditorialLink
                      href={joinHref}
                      className="text-xl italic sm:text-2xl"
                      style={{ fontFamily: EL_FONT.display, fontWeight: 300, color: EL.flameCore }}
                    >
                      สมัคร →
                    </EditorialLink>
                  ) : (
                    <span
                      className="text-lg text-[#f3efe6]/40"
                      style={{ fontFamily: EL_FONT.display, fontWeight: 300 }}
                    >
                      ปิดรับสมัครแล้ว
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
