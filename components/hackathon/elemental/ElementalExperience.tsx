"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";

import { BACKGROUND, EL, EL_FONT } from "@/components/hackathon/poster/elemental/brand";
import { ELEMENTAL } from "@/components/hackathon/poster/elemental/facts";

import { BeginnerJourneySection } from "./BeginnerJourneySection";
import styles from "./elemental-cinema.module.css";
import { ElementalHero } from "./ElementalHero";
import { ElementalPlacesShowcase } from "./ElementalPlacesShowcase";
import { ELEMENT_CHAPTERS, KEY_VISUAL_MEDIA } from "./media";
import { ScrollHookStatement } from "./ScrollHookStatement";
import { ElementalSoundProvider, useElementalSound } from "./sound-context";
import { TeaserScreening } from "./TeaserTheater";

function GlobalSoundControl() {
  const { soundOn, audioUnlocked, toggleSound } = useElementalSound();
  const label = !soundOn ? "เสียง ปิด" : audioUnlocked ? "เสียง เปิด" : "แตะเพื่อเปิดเสียง";
  return (
    <button
      type="button"
      onClick={toggleSound}
      aria-pressed={soundOn}
      aria-label={soundOn ? "ปิดเสียงวิดีโอ" : "เปิดเสียงวิดีโอ"}
      className="fixed bottom-5 right-5 z-40 cursor-pointer border-0 bg-[#0c0d0c]/85 px-2.5 py-1 text-[11px] tracking-[0.14em] text-[#faf8f4] transition-opacity hover:opacity-100"
      style={{ fontFamily: EL_FONT.mono }}
    >
      {label}
    </button>
  );
}

function ClosingPoster({ joinHref, open }: { joinHref: string; open: boolean }) {
  const sectionRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const linkRef = useRef<HTMLAnchorElement>(null);
  const reduceMotion = useReducedMotion();
  const [isPortraitScreen, setIsPortraitScreen] = useState(false);
  const [linkInView, setLinkInView] = useState(false);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "center center"],
  });
  const posterScale = useTransform(scrollYProgress, [0, 1], [0.93, 1]);

  useEffect(() => {
    const mq = window.matchMedia("(max-aspect-ratio: 3/4)");
    setIsPortraitScreen(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setIsPortraitScreen(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    const section = sectionRef.current;
    const video = videoRef.current;
    if (!section || !video) return;
    if (reduceMotion) {
      video.pause();
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) video.play().catch(() => {});
        else video.pause();
      },
      { threshold: 0.2 }
    );
    observer.observe(section);
    return () => observer.disconnect();
  }, [reduceMotion]);

  useEffect(() => {
    const node = linkRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => setLinkInView(entry.isIntersecting),
      { threshold: 0.6 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLVideoElement>) => {
    if (e.key === " " || e.key.toLowerCase() === "k") {
      e.preventDefault();
      const v = videoRef.current;
      if (!v) return;
      if (v.paused) v.play().catch(() => {});
      else v.pause();
    }
  };

  return (
    <section
      ref={sectionRef}
      className="flex min-h-[100svh] flex-col items-center justify-center bg-[#0c0d0c] px-4 py-12"
    >
      <motion.div
        style={reduceMotion ? undefined : { scale: posterScale }}
        className="will-change-transform"
      >
        <video
          ref={videoRef}
          src={KEY_VISUAL_MEDIA.loop}
          poster={isPortraitScreen ? KEY_VISUAL_MEDIA.posterVertical : KEY_VISUAL_MEDIA.poster}
          autoPlay={!reduceMotion}
          muted
          loop
          playsInline
          preload="metadata"
          tabIndex={0}
          aria-label="โปสเตอร์เคลื่อนไหว Elemental Hackathon กด Space หรือ K เพื่อหยุดหรือเล่น"
          onKeyDown={handleKeyDown}
          className="block h-[82svh] max-w-full aspect-[4/5] object-cover sm:h-[88svh]"
        />
      </motion.div>

      <div className="mt-8">
        {open ? (
          <Link
            ref={linkRef}
            href={joinHref}
            className={`${styles.textLink} ${linkInView ? styles.textLinkInView : ""} text-[2rem] italic`}
            style={{ fontFamily: EL_FONT.display, fontWeight: 300, color: EL.flameCore }}
          >
            สมัคร →
          </Link>
        ) : (
          <span
            className="text-xl text-[#f3efe6]/40"
            style={{ fontFamily: EL_FONT.display, fontWeight: 300 }}
          >
            ปิดรับสมัครแล้ว
          </span>
        )}
      </div>
    </section>
  );
}

function ElementalExperienceInner({
  joinHref,
  open,
  fontClassName,
}: {
  joinHref: string;
  open: boolean;
  fontClassName: string;
}) {
  const [pastHero, setPastHero] = useState(false);

  useEffect(() => {
    const onScroll = () => setPastHero(window.scrollY > window.innerHeight * 0.95);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const credits = Array.from(
    new Set([`Key visual: ${BACKGROUND.credit}`, ...ELEMENT_CHAPTERS.map((c) => c.credit)])
  );

  return (
    <main className={`${fontClassName} ${styles.cinemaRoot} min-h-screen`}>
      {/* Global 35mm analog grain */}
      <div className={styles.filmGrain} aria-hidden="true" />

      {/* Minimal Header: ink on sky over hero, solid black + cream once past */}
      <header
        className="fixed inset-x-0 top-0 z-40 transition-colors duration-200"
        style={{
          backgroundColor: pastHero ? "#0c0d0c" : "transparent",
          color: pastHero ? EL.cream : EL.ink,
          borderBottom: pastHero ? "1px solid rgba(243,239,230,0.12)" : "1px solid transparent",
        }}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-10">
          <a
            href="#top"
            className="text-[15px] italic"
            style={{ fontFamily: EL_FONT.display, fontWeight: 300 }}
          >
            {ELEMENTAL.edition}
          </a>

          {open ? (
            <Link
              href={joinHref}
              className={`${styles.textLink} text-[15px] italic`}
              style={{ fontFamily: EL_FONT.display, fontWeight: 300 }}
            >
              สมัคร →
            </Link>
          ) : (
            <span
              className="text-[14px] opacity-50"
              style={{ fontFamily: EL_FONT.display, fontWeight: 300 }}
            >
              ปิดรับสมัครแล้ว
            </span>
          )}
        </div>
      </header>

      {/* Single subtle sound control (default ON) */}
      <GlobalSoundControl />

      {/* ACT 1: THE VALLEY (STICKY PARALLAX HERO) */}
      <ElementalHero joinHref={joinHref} open={open} />

      {/* ACT 2: SCROLL-DRIVEN HOOK ("ทีละนิด นิดๆ ในที่ที่คุณไม่เห็น") */}
      <ScrollHookStatement />

      {/* ACT 3: THE SCREENING (FULL TEASER WITH PARALLAX + DEFAULT-ON SOUND) */}
      <TeaserScreening joinHref={joinHref} open={open} />

      {/* ACT 4: FIVE PLACES (APPLE-STYLE SCROLL-SCRUBBED 60FPS CANVAS CHAPTERS) */}
      <ElementalPlacesShowcase />

      {/* ACT 5: BEGINNER PITCH, WORKSHOPS, MENTOR SUPPORT & 3-DAY SCHEDULE */}
      <BeginnerJourneySection />

      {/* ACT 6: JOIN (PAPER BREAK) */}
      <section className="py-24 sm:py-32" style={{ backgroundColor: EL.cream, color: EL.ink }}>
        <div className="mx-auto max-w-5xl px-5 sm:px-10">
          <h2
            className="text-4xl sm:text-6xl"
            style={{ fontFamily: EL_FONT.display, fontWeight: 200, lineHeight: 1.12 }}
          >
            สมัครครั้งเดียว จ่ายครั้งเดียว ทั้งกลุ่ม
          </h2>

          {/* Two monumental numerals separated by one 1px ink rule */}
          <div className="mt-12 grid grid-cols-1 border-y border-[#1d211f]/20 md:grid-cols-2">
            <div className="py-8 md:pr-10">
              <p
                style={{
                  fontFamily: EL_FONT.display,
                  fontSize: "clamp(5rem, 13vw, 9.5rem)",
                  fontWeight: 200,
                  lineHeight: 0.95,
                }}
              >
                ฿{ELEMENTAL.groupPriceBaht}
              </p>
              <p
                className="mt-3 text-base"
                style={{ fontFamily: "var(--font-bai-jamjuree), sans-serif", color: EL.inkSoft }}
              >
                ต่อคน เมื่อมากับเพื่อน 2–{ELEMENTAL.maxGroupSize} คน โอนรวมกันครั้งเดียว
              </p>
            </div>

            <div className="border-t border-[#1d211f]/20 py-8 md:border-l md:border-t-0 md:pl-10">
              <p
                style={{
                  fontFamily: EL_FONT.display,
                  fontSize: "clamp(4.2rem, 11vw, 8rem)",
                  fontWeight: 200,
                  lineHeight: 0.95,
                  color: EL.inkSoft,
                }}
              >
                ฿{ELEMENTAL.priceBaht}
              </p>
              <p
                className="mt-3 text-base"
                style={{ fontFamily: "var(--font-bai-jamjuree), sans-serif", color: EL.inkSoft }}
              >
                สมัครคนเดียว เราช่วยจับคู่เข้าทีมให้ก่อนเริ่มแข่ง
              </p>
            </div>
          </div>

          {/* 3-step editorial list */}
          <ol className="mt-14 grid gap-8 sm:grid-cols-3">
            {[
              [
                "กรอกชื่อทุกคนในกลุ่ม",
                `มาได้ ${ELEMENTAL.maxGroupSize} คนต่อการสมัคร หรือมาคนเดียวก็ได้ เราหาทีมให้`,
              ],
              ["สแกน QR พร้อมเพย์", "คนเดียวจ่ายให้ทั้งกลุ่มได้เลย ในการโอนครั้งเดียว"],
              ["อัปโหลดสลิป", "ระบบตรวจสลิปให้ทันที แล้วยืนยันที่นั่งบนหน้าเว็บ"],
            ].map(([title, body], i) => (
              <li key={title} className="border-t border-[#1d211f]/20 pt-5">
                <p className="text-sm" style={{ fontFamily: EL_FONT.mono, color: EL.flame }}>
                  0{i + 1}
                </p>
                <p
                  className="mt-2 text-xl font-semibold"
                  style={{ fontFamily: "var(--font-bai-jamjuree), sans-serif" }}
                >
                  {title}
                </p>
                <p
                  className="mt-1.5 text-sm leading-relaxed"
                  style={{ fontFamily: "var(--font-bai-jamjuree), sans-serif", color: EL.inkSoft }}
                >
                  {body}
                </p>
              </li>
            ))}
          </ol>

          {/* Policy: three plain lines, no box, no icon */}
          <div
            className="mt-12 space-y-2 border-t border-[#1d211f]/15 pt-8 text-sm leading-relaxed"
            style={{ fontFamily: "var(--font-bai-jamjuree), sans-serif", color: EL.inkSoft }}
          >
            <p>
              <strong className="font-semibold text-[#1d211f]">อายุต่ำกว่า 20 ปี</strong> ต้องได้รับความยินยอมจากผู้ปกครอง
              เราขอชื่อและเบอร์ผู้ปกครองตอนสมัคร
            </p>
            <p>
              <strong className="font-semibold text-[#1d211f]">ไม่มีการคืนเงิน</strong> หลังชำระค่าสมัครแล้ว
            </p>
            <p>
              <strong className="font-semibold text-[#1d211f]">ขอแค่ชื่อโรงเรียน</strong> เราไม่ขอสำเนาบัตรประชาชน
            </p>
          </div>
        </div>
      </section>

      {/* ACT 7: THE POSTER */}
      <ClosingPoster joinHref={joinHref} open={open} />

      {/* Footer with attribution */}
      <footer className="border-t border-[#f3efe6]/16 bg-[#0c0d0c] py-12 text-sm text-[#e0dad0]">
        <div className="mx-auto max-w-7xl px-5 sm:px-10">
          <div
            className="flex flex-wrap items-center justify-between gap-4"
            style={{ fontFamily: "var(--font-bai-jamjuree), sans-serif" }}
          >
            <div className="flex flex-wrap gap-6">
              <Link href="/hackathon/past" className="underline underline-offset-4 hover:text-[#faf8f4]">
                ดู Hackathon ที่ผ่านมา
              </Link>
              <Link href="/hackathon/elemental/sponsor" className="underline underline-offset-4 hover:text-[#faf8f4]">
                ข้อมูลสำหรับผู้สนับสนุน
              </Link>
            </div>
            <span className="text-xs text-[#cfc9bd]" style={{ fontFamily: EL_FONT.mono }}>
              {ELEMENTAL.series} × PassionSeed · {ELEMENTAL.url}
            </span>
          </div>

          <p
            className="mt-8 text-[11px] leading-relaxed text-[#b8b2a6]"
            style={{ fontFamily: EL_FONT.mono }}
          >
            {credits.join(" · ")}
          </p>
        </div>
      </footer>
    </main>
  );
}

export function ElementalExperience({
  joinHref,
  open,
  fontClassName,
}: {
  joinHref: string;
  open: boolean;
  fontClassName: string;
}) {
  return (
    <ElementalSoundProvider>
      <ElementalExperienceInner joinHref={joinHref} open={open} fontClassName={fontClassName} />
    </ElementalSoundProvider>
  );
}
