"use client";

import { useRef } from "react";
import Image from "next/image";
import { motion, useReducedMotion, useTransform } from "framer-motion";

import { EL, EL_FONT } from "@/components/hackathon/poster/elemental/brand";

import { ELEMENT_CHAPTERS } from "./media";
import { useSectionScroll } from "./use-section-scroll";

/**
 * Apple-style sticky scroll narrative between Hero and Screening.
 * Starts animating the moment it enters view (no dead black scroll) while
 * desaturated glimpses of the ruined places creep in behind the typography:
 * "ธรรมชาติไม่ได้พังเอง" -> "มันถูกทำให้พัง" -> "อย่างช้าๆ" -> "ตรงที่ไม่มีใครมอง"
 * (Big chose this wording on 2026-11-23: line 2 answers line 1.)
 */
export function ScrollHookStatement() {
  const runwayRef = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();

  // Start driving progress as soon as the section enters the bottom 85% of viewport
  // so there is never an empty black pause after "ธรรมชาติไม่ได้พังเอง".
  const scrollYProgress = useSectionScroll({
    target: runwayRef,
    offset: ["start 85%", "end end"],
  });

  // Creeping peripheral landscape glimpses behind the text (earth, fire, aether)
  const earth = ELEMENT_CHAPTERS[0];
  const fire = ELEMENT_CHAPTERS[3];
  const aether = ELEMENT_CHAPTERS[4];

  const bg1Opacity = useTransform(scrollYProgress, [0.05, 0.28, 0.55], [0, 0.38, 0.08]);
  const bg1Y = useTransform(scrollYProgress, [0, 0.6], ["12%", "-8%"]);

  const bg2Opacity = useTransform(scrollYProgress, [0.32, 0.56, 0.82], [0, 0.42, 0.1]);
  const bg2Y = useTransform(scrollYProgress, [0.28, 0.85], ["14%", "-10%"]);

  const bg3Opacity = useTransform(scrollYProgress, [0.58, 0.82, 1], [0, 0.46, 0.35]);
  const bg3Scale = useTransform(scrollYProgress, [0.58, 1], [1.08, 1]);

  // Beat 1: "ธรรมชาติไม่ได้พังเอง" — immediately crisp as soon as it enters
  const line1Opacity = useTransform(scrollYProgress, [0, 0.14, 0.55, 0.8], [0.7, 1, 1, 0.65]);
  const line1Y = useTransform(scrollYProgress, [0, 0.6], [28, -14]);

  // Beat 2: "มันถูกทำให้พัง" creeping from left immediately after
  const line2Opacity = useTransform(scrollYProgress, [0.14, 0.3, 0.72, 0.9], [0, 1, 1, 0.7]);
  const line2X = useTransform(scrollYProgress, [0.14, 0.62], ["-7vw", "1vw"]);

  // Beat 3: "อย่างช้าๆ" whispering off-axis from right
  const line3Opacity = useTransform(scrollYProgress, [0.3, 0.46, 0.82, 0.95], [0, 1, 1, 0.75]);
  const line3X = useTransform(scrollYProgress, [0.3, 0.76], ["9vw", "-1vw"]);

  // Beat 4: "ตรงที่ไม่มีใครมอง" landing with scale tension
  const line4Opacity = useTransform(scrollYProgress, [0.48, 0.66, 1], [0, 1, 1]);
  const line4Scale = useTransform(scrollYProgress, [0.48, 0.86], [0.94, 1.03]);
  const line4Y = useTransform(scrollYProgress, [0.48, 0.86], [28, -4]);

  if (reduceMotion) {
    return (
      <section className="relative overflow-hidden bg-[#0c0d0c] px-5 py-28 sm:px-10 sm:py-36">
        <Image
          src={aether.after}
          alt=""
          aria-hidden="true"
          fill
          sizes="100vw"
          className="object-cover opacity-25"
        />
        <div className="relative z-10 mx-auto max-w-5xl space-y-4" style={{ fontFamily: EL_FONT.display }}>
          <p className="text-4xl text-[#faf8f4] sm:text-6xl" style={{ fontWeight: 200 }}>
            ธรรมชาติไม่ได้พังเอง
          </p>
          <p className="text-3xl italic text-[#e8e3d9] sm:text-5xl" style={{ fontWeight: 300 }}>
            มันถูกทำให้พัง อย่างช้าๆ
          </p>
          <p className="text-4xl sm:text-6xl" style={{ fontWeight: 300, color: EL.flameCore }}>
            ตรงที่ไม่มีใครมอง
          </p>
        </div>
      </section>
    );
  }

  return (
    <section ref={runwayRef} className="relative h-[175svh] w-full bg-[#0c0d0c]">
      <div className="sticky top-0 flex h-[100svh] flex-col justify-center overflow-hidden px-5 sm:px-10">
        {/* Creeping dark landscape layers behind the words */}
        <motion.div
          aria-hidden="true"
          style={{ opacity: bg1Opacity, y: bg1Y }}
          className="pointer-events-none absolute right-0 top-[8%] h-[78svh] w-[72vw] will-change-transform sm:w-[46vw]"
        >
          <Image src={earth.after} alt="" fill sizes="50vw" className="object-cover" />
        </motion.div>

        <motion.div
          aria-hidden="true"
          style={{ opacity: bg2Opacity, y: bg2Y }}
          className="pointer-events-none absolute left-0 top-[14%] h-[74svh] w-[72vw] will-change-transform sm:w-[46vw]"
        >
          <Image src={fire.after} alt="" fill sizes="50vw" className="object-cover" />
        </motion.div>

        <motion.div
          aria-hidden="true"
          style={{ opacity: bg3Opacity, scale: bg3Scale }}
          className="pointer-events-none absolute inset-0 will-change-transform"
        >
          <Image src={aether.after} alt="" fill sizes="100vw" className="object-cover" />
        </motion.div>

        {/* Readability vignette so typography stays sharp over creeping scenes */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, #0c0d0c 0%, rgba(12,13,12,0.58) 28%, rgba(12,13,12,0.58) 72%, #0c0d0c 100%)",
          }}
        />

        {/* Kinetic Typography */}
        <div
          className="relative z-10 mx-auto w-full max-w-6xl"
          style={{ fontFamily: EL_FONT.display, textShadow: "0 4px 32px rgba(0,0,0,0.85)" }}
        >
          <motion.p
            style={{
              opacity: line1Opacity,
              y: line1Y,
              fontSize: "clamp(2.3rem, 6.4vw, 6rem)",
              fontWeight: 200,
              lineHeight: 1.1,
            }}
            className="text-[#faf8f4] will-change-transform"
          >
            ธรรมชาติไม่ได้พังเอง
          </motion.p>

          <div className="mt-4 flex flex-col gap-1 sm:mt-6 sm:flex-row sm:flex-wrap sm:items-baseline sm:gap-x-10">
            <motion.p
              style={{
                opacity: line2Opacity,
                x: line2X,
                fontSize: "clamp(2.3rem, 6.2vw, 5.8rem)",
                fontWeight: 200,
                lineHeight: 1.04,
              }}
              className="italic text-[#faf8f4] will-change-transform"
            >
              มันถูกทำให้พัง
            </motion.p>

            <motion.p
              style={{
                opacity: line3Opacity,
                x: line3X,
                fontSize: "clamp(2.1rem, 5.4vw, 5rem)",
                fontWeight: 300,
                lineHeight: 1.08,
                color: "#eae5dc",
              }}
              className="italic will-change-transform"
            >
              อย่างช้าๆ
            </motion.p>
          </div>

          <motion.p
            style={{
              opacity: line4Opacity,
              scale: line4Scale,
              y: line4Y,
              fontSize: "clamp(2.6rem, 7.2vw, 6.8rem)",
              fontWeight: 300,
              lineHeight: 1.12,
              color: EL.flameCore,
              transformOrigin: "left center",
            }}
            className="mt-6 will-change-transform sm:mt-8"
          >
            ตรงที่ไม่มีใครมอง
          </motion.p>
        </div>
      </div>
    </section>
  );
}
