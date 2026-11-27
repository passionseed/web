"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion, useTransform } from "framer-motion";

import { BACKGROUND, EL, EL_FONT } from "@/components/hackathon/poster/elemental/brand";
import { ELEMENTAL, prizeTotal } from "@/components/hackathon/poster/elemental/facts";

import { BeginnerJourneySection } from "./BeginnerJourneySection";
import styles from "./elemental-cinema.module.css";
import { ElementalHero } from "./ElementalHero";
import { ElementalPlacesShowcase } from "./ElementalPlacesShowcase";
import { JourneySteps } from "./JourneySteps";
import { ELEMENT_CHAPTERS, KEY_VISUAL_MEDIA } from "./media";
import { ScrollHookStatement } from "./ScrollHookStatement";
import { SponsorSection } from "./SponsorSection";
import { ElementalSoundProvider, useElementalSound } from "./sound-context";
import { TeaserScreening } from "./TeaserTheater";
import { useSectionScroll } from "./use-section-scroll";

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
  // The poster sits at the bottom of the page: load nothing until it's near.
  const [nearViewport, setNearViewport] = useState(false);

  const scrollYProgress = useSectionScroll({
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
    if (!section) return;
    const preloader = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setNearViewport(true);
          preloader.disconnect();
        }
      },
      { rootMargin: "400px 0px" }
    );
    preloader.observe(section);
    return () => preloader.disconnect();
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

  const posterSrc = isPortraitScreen ? KEY_VISUAL_MEDIA.posterVertical : KEY_VISUAL_MEDIA.poster;

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
          poster={nearViewport ? posterSrc : undefined}
          muted
          loop
          playsInline
          preload={nearViewport ? "metadata" : "none"}
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
  const mainRef = useRef<HTMLElement>(null);
  const headerRef = useRef<HTMLElement>(null);

  // Sticky sections read the top bar's height from --el-header-h, so they pin under it.
  useEffect(() => {
    const main = mainRef.current;
    const header = headerRef.current;
    if (!main || !header) return;
    const observer = new ResizeObserver(() => {
      main.style.setProperty("--el-header-h", `${header.offsetHeight}px`);
    });
    observer.observe(header);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const onScroll = () => setPastHero(window.scrollY > window.innerHeight * 0.95);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // The board keeps the tracked link (?src=ig) the same way the sign-up does.
  const boardHref = `/hackathon/elemental/problems${joinHref.includes("?") ? joinHref.slice(joinHref.indexOf("?")) : ""}`;

  const credits = Array.from(
    new Set([`Key visual: ${BACKGROUND.credit}`, ...ELEMENT_CHAPTERS.map((c) => c.credit)])
  );

  return (
    <main ref={mainRef} className={`${fontClassName} ${styles.cinemaRoot} min-h-screen`}>
      {/* Global 35mm analog grain */}
      <div className={styles.filmGrain} aria-hidden="true" />

      {/* Minimal Header: ink on sky over hero, solid black + cream once past */}
      <header
        ref={headerRef}
        className="fixed inset-x-0 top-0 z-40 transition-colors duration-200"
        style={{
          backgroundColor: pastHero ? "#0c0d0c" : "transparent",
          color: pastHero ? EL.cream : EL.ink,
          borderBottom: pastHero ? "1px solid rgba(243,239,230,0.12)" : "1px solid transparent",
        }}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-10">
          {/* Who runs it: The Next Decade × PassionSeed, as on the poster */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <a href="#top" aria-label={`${ELEMENTAL.series}: กลับขึ้นด้านบน`}>
              <Image
                src="/hackathon/HackLogo-header.png"
                alt={ELEMENTAL.series}
                width={70}
                height={28}
                priority
                className="block h-6 w-auto sm:h-7"
                style={{
                  filter: pastHero ? "brightness(0) invert(1)" : "brightness(0)",
                  opacity: 0.85,
                  transition: "filter 200ms ease",
                }}
              />
            </a>
            <span className="text-[11px] opacity-60" style={{ fontFamily: EL_FONT.mono }} aria-hidden="true">
              ×
            </span>
            <Link href="/" className="flex items-center gap-1.5">
              <Image src="/passion-seed-logo-84.png" alt="" width={28} height={28} priority className="block h-6 w-6 sm:h-7 sm:w-7" />
              <span className="text-[15px] sm:text-[17px]" style={{ fontFamily: EL_FONT.display, fontWeight: 400 }}>
                PassionSeed
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-6">
            <Link
              href={boardHref}
              className={`${styles.textLink} hidden text-[15px] sm:inline-block`}
              style={{ fontFamily: EL_FONT.display, fontWeight: 300 }}
            >
              บอร์ดโจทย์
            </Link>
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
        </div>
      </header>

      {/* Single subtle sound control (default ON) */}
      <GlobalSoundControl />

      {/* ACT 1: THE VALLEY (STICKY PARALLAX HERO) */}
      <ElementalHero joinHref={joinHref} open={open} />

      {/* What a student does, in six steps, with the help for each (Big, 2026-11-26: students didn't know what to do). */}
      <JourneySteps boardHref={boardHref} joinHref={open ? joinHref : undefined} />

      {/* ACT 2: SCROLL-DRIVEN HOOK ("ธรรมชาติไม่ได้พังเอง ... ตรงที่ไม่มีใครมอง") */}
      <ScrollHookStatement />

      {/* ACT 3: THE SCREENING (FULL TEASER WITH PARALLAX + DEFAULT-ON SOUND) */}
      <TeaserScreening joinHref={joinHref} open={open} />

      {/* ACT 4: FIVE PLACES (APPLE-STYLE SCROLL-SCRUBBED 60FPS CANVAS CHAPTERS) */}
      <ElementalPlacesShowcase joinHref={joinHref} open={open} />

      {/* After the five places: every problem, and each problem owner's, on one board. */}
      <section className="flex justify-center bg-[#0c0d0c] px-5 py-16 sm:py-20">
        <Link
          href={boardHref}
          className={`${styles.textLink} text-[1.6rem] italic text-[#faf8f4] sm:text-[2rem]`}
          style={{ fontFamily: EL_FONT.display, fontWeight: 300 }}
        >
          ดูบอร์ดโจทย์ →
        </Link>
      </section>

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

          {/* Where the fee goes (Big, 2026-11-22): all of it, after the hackathon's costs, hosts Request for Winners. */}
          <p
            className="mt-6 max-w-2xl text-base leading-relaxed"
            style={{ fontFamily: "var(--font-bai-jamjuree), sans-serif", color: EL.inkSoft }}
          >
            เราไม่เก็บกำไรจากงานนี้ ค่าสมัครที่เหลือหลังหักค่าจัดงาน นำไปจัด{" "}
            <Link href="/request-for-winners" className="underline underline-offset-4" style={{ color: EL.ink }}>
              Request for Winners
            </Link>{" "}
            ทั้งหมด ให้ผลงานที่ดีที่สุดได้ไปต่อจนเป็นธุรกิจจริง
          </p>

          {/*
            Who can join and the prizes (Angpao, 2026-11-24: "update hackathon
            info include participant education level and also prize"). The
            same facts as Instagram slide 2, all from facts.ts.
          */}
          <div className="mt-12 grid grid-cols-1 border-y border-[#1d211f]/20 md:grid-cols-[1fr_1.5fr]" id="who-and-prizes">
            <div className="py-8 md:pr-10">
              <p className="text-sm" style={{ fontFamily: EL_FONT.mono, color: EL.inkSoft }}>
                [ใครสมัครได้]
              </p>
              <p className="mt-2 text-5xl sm:text-6xl" style={{ fontFamily: EL_FONT.display, fontWeight: 200, lineHeight: 1.05 }}>
                {ELEMENTAL.gradesTh}
              </p>
              <p className="mt-3 text-base" style={{ fontFamily: "var(--font-bai-jamjuree), sans-serif", color: EL.inkSoft }}>
                นักเรียนจากทั่วประเทศ ทีมละ {ELEMENTAL.teamMin}–{ELEMENTAL.teamMax} คน
              </p>
            </div>
            <div className="border-t border-[#1d211f]/20 py-8 md:border-l md:border-t-0 md:pl-10">
              <p className="text-sm" style={{ fontFamily: EL_FONT.mono, color: EL.inkSoft }}>
                [รางวัลรวมมูลค่า {prizeTotal()} บาท]
              </p>
              <dl
                className="mt-3 grid grid-cols-[auto_1fr] gap-x-5 gap-y-2 text-base sm:text-lg"
                style={{ fontFamily: "var(--font-bai-jamjuree), sans-serif" }}
              >
                {ELEMENTAL.prizes.map((p) => (
                  <div key={p.place} className="contents">
                    <dt className="font-semibold">ที่ {p.place}</dt>
                    <dd style={{ color: EL.inkSoft }}>
                      {[p.cashBaht ? `เงินสด ฿${p.cashBaht.toLocaleString("en-US")}` : null, `เครดิต Claude ฿${p.creditBaht.toLocaleString("en-US")}`]
                        .filter(Boolean)
                        .join(" + ")}
                    </dd>
                  </div>
                ))}
                <dt className="font-semibold">ผู้ชนะแต่ละธาตุ</dt>
                <dd style={{ color: EL.inkSoft }}>เครดิต Claude ฿{ELEMENTAL.elementPrizeCreditBaht.toLocaleString("en-US")}</dd>
              </dl>
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

      {/* For grown-ups, after the students' story: become a sponsor */}
      <SponsorSection />

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
