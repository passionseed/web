"use client";

import { useRef } from "react";
import { motion, useReducedMotion, useTransform } from "framer-motion";

import { EL, EL_FONT } from "@/components/hackathon/poster/elemental/brand";
import { ELEMENTAL, type ElementalSlotKind } from "@/components/hackathon/poster/elemental/facts";
import { formatThaiDate } from "@/lib/content/shift-cohort";
import { useSectionScroll } from "./use-section-scroll";

const SCHEDULE_TIME_COLOR: Record<ElementalSlotKind, string> = {
  open: EL.creamSoft,
  workshop: EL.toxicCyan,
  build: EL.toxicCyan,
  due: EL.flame,
  demo: EL.flameCore,
};

/**
 * Beginner-friendly pitch + full schedule. The three fear-to-workshop rows were
 * cut (Big, 2026-11-26): the six steps after the hero (JourneySteps) now say
 * what to do and the help for each, so the rows only repeated them.
 * Sharp editorial lines, zero cards, zero icons, Apple scroll-driven reveal.
 */
export function BeginnerJourneySection() {
  const headRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const scrollYProgress = useSectionScroll({
    target: headRef,
    offset: ["start 90%", "start 35%"],
  });

  const headY = useTransform(scrollYProgress, [0, 1], [30, 0]);
  const headOpacity = useTransform(scrollYProgress, [0, 1], [0.65, 1]);

  return (
    <section className="border-t border-[#f3efe6]/15 bg-[#0c0d0c] py-24 sm:py-36">
      <div className="mx-auto max-w-6xl px-5 sm:px-10">
        {/* Beginner Pitch Headline */}
        <motion.div
          ref={headRef}
          style={reduceMotion ? undefined : { y: headY, opacity: headOpacity }}
          className="max-w-4xl will-change-transform"
        >
          <h2
            className="text-[#faf8f4]"
            style={{
              fontFamily: EL_FONT.display,
              fontSize: "clamp(2.5rem, 6vw, 5.25rem)",
              fontWeight: 200,
              lineHeight: 1.12,
            }}
          >
            มือใหม่ก็สร้างของจริงได้
            <span className="mt-1 block italic" style={{ fontWeight: 300, color: EL.flameCore }}>
              เราช่วยคุณเดินไปด้วยกันทุกก้าว
            </span>
          </h2>

          <p
            className="mt-6 max-w-2xl text-base leading-relaxed text-[#e8e3d9] sm:text-xl"
            style={{ fontFamily: "var(--font-bai-jamjuree), sans-serif" }}
          >
            เริ่มจากศูนย์ได้เลย ทำงานบน Discord มีเวิร์กช็อปและพี่เลี้ยงช่วยจนส่งงาน
          </p>
        </motion.div>

        {/* Full schedule */}
        <div className="mt-20 sm:mt-24">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-baseline">
            <h3
              className="text-3xl text-[#faf8f4] sm:text-4xl"
              style={{ fontFamily: EL_FONT.display, fontWeight: 200 }}
            >
              ตาราง {ELEMENTAL.days} วัน
            </h3>
            <p
              className="text-sm text-[#d4cec2]"
              style={{ fontFamily: "var(--font-bai-jamjuree), sans-serif" }}
            >
              ทีมละ {ELEMENTAL.teamMin}–{ELEMENTAL.teamMax} คน · {ELEMENTAL.venueTh}
            </p>
          </div>

          <ol className="mt-8 border-t border-[#f3efe6]/16">
            {ELEMENTAL.schedule.map((slot) => {
              const isDue = slot.kind === "due";
              return (
                <li
                  key={`${slot.date}-${slot.time}-${slot.kind}`}
                  className="grid grid-cols-1 gap-1 border-b border-[#f3efe6]/16 py-5 sm:grid-cols-[160px_140px_1fr] sm:items-baseline sm:gap-6"
                >
                  <span
                    className="text-lg text-[#faf8f4]"
                    style={{ fontFamily: EL_FONT.display, fontWeight: 300 }}
                  >
                    {formatThaiDate(slot.date, false)}
                  </span>
                  <span
                    className="text-xs tracking-[0.06em]"
                    style={{ fontFamily: EL_FONT.mono, color: SCHEDULE_TIME_COLOR[slot.kind] }}
                  >
                    {slot.time ? `${slot.time} น.` : null}
                  </span>
                  <span
                    className="text-base sm:text-lg"
                    style={{
                      fontFamily: "var(--font-bai-jamjuree), sans-serif",
                      color: isDue ? EL.flameCore : "#faf8f4",
                    }}
                  >
                    {slot.th}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}
