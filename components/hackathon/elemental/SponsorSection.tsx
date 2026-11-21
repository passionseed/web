"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { animate, motion, useInView, useReducedMotion, type Variants } from "framer-motion";

import { EL, EL_FONT } from "@/components/hackathon/poster/elemental/brand";
import { ELEMENTAL } from "@/components/hackathon/poster/elemental/facts";

import styles from "./elemental-cinema.module.css";

const BODY_FONT = "var(--font-bai-jamjuree), sans-serif";
const EASE_TENSION = [0.05, 0.7, 0.35, 0.99] as const;

/** The loud pixel colours from brand.ts: the pollution. */
const TOXIC = [EL.flame, EL.ember, EL.toxicCyan, EL.toxicRust, EL.toxicYellow, EL.flameLight];

/** Grid the pixels sit on, top-right of each package. */
const COLS = 7;
const ROWS = 4;
const CELL = 9;

/** Small deterministic PRNG so server and client draw the same pixels. */
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

/**
 * Bigger package, more pollution to clear: pixel count scales with the
 * amount. Pixels cluster toward the bottom-left corner of the grid, like
 * the poster's damage spreading from one spot.
 */
function pixelsFor(baht: number, max: number) {
  const count = Math.max(3, Math.round((baht / max) * 18));
  const rand = seeded(baht);
  const cells = Array.from({ length: COLS * ROWS }, (_, i) => {
    const x = i % COLS;
    const y = Math.floor(i / COLS);
    const pull = (COLS - x) / COLS + (y + 1) / ROWS;
    return { x, y, weight: pull + rand() * 0.7 };
  })
    .sort((a, b) => b.weight - a.weight)
    .slice(0, count);
  return cells.map((c, i) => ({ ...c, color: TOXIC[Math.floor(rand() * TOXIC.length)], order: i }));
}

const pixelVariants: Variants = {
  polluted: (order: number) => ({
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.12, delay: order * 0.012, ease: "linear" },
  }),
  healed: (order: number) => ({
    opacity: 0,
    scale: 0.2,
    y: -10,
    transition: { duration: 0.45, delay: order * 0.035, ease: EASE_TENSION },
  }),
};

/** Shows the final amount on the server and with reduced motion; counts up once in view otherwise. */
function CountUp({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -15% 0px" });
  const reduceMotion = useReducedMotion();
  const [shown, setShown] = useState(value);
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (reduceMotion) return;
    setArmed(true);
    setShown(0);
  }, [reduceMotion]);

  useEffect(() => {
    if (!armed || !inView) return;
    const controls = animate(0, value, {
      duration: 1.4,
      ease: EASE_TENSION,
      onUpdate: (v) => setShown(Math.round(v / 10) * 10),
    });
    return () => controls.stop();
  }, [armed, inView, value]);

  return (
    <span ref={ref} aria-hidden style={{ fontVariantNumeric: "tabular-nums" }}>
      ฿{shown.toLocaleString("en-US")}
    </span>
  );
}

function SponsorPackage({ baht, index, max }: { baht: number; index: number; max: number }) {
  const reduceMotion = useReducedMotion();
  const [healed, setHealed] = useState(false);
  const ref = useRef<HTMLLIElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -15% 0px" });
  const pixels = pixelsFor(baht, max);

  // Phones can't hover, so there the pollution clears on its own once the
  // price has counted up, one package after another. Tap to toggle it.
  useEffect(() => {
    if (!inView || reduceMotion || !window.matchMedia("(hover: none)").matches) return;
    const t = window.setTimeout(() => setHealed(true), 1700 + index * 450);
    return () => window.clearTimeout(t);
  }, [inView, reduceMotion, index]);

  return (
    <motion.li
      ref={ref}
      className={`relative cursor-default select-none py-6 sm:py-8 ${
        index > 0 ? "border-t border-[#f3efe6]/15 sm:border-l sm:border-t-0 sm:pl-8" : "sm:pr-8"
      }`}
      initial={reduceMotion ? false : { opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -10% 0px" }}
      transition={{ duration: 0.9, delay: index * 0.12, ease: EASE_TENSION }}
      onHoverStart={() => setHealed(true)}
      onHoverEnd={() => setHealed(false)}
      onTap={(e) => {
        // A mouse already healed it on hover; only touch toggles.
        if ((e as PointerEvent).pointerType !== "mouse") setHealed((h) => !h);
      }}
    >
      <svg
        aria-hidden
        width={COLS * CELL}
        height={ROWS * CELL}
        viewBox={`0 0 ${COLS * CELL} ${ROWS * CELL}`}
        className="absolute right-0 top-6 sm:right-2 sm:top-8"
        style={{ overflow: "visible" }}
      >
        {pixels.map((p) => (
          <motion.rect
            key={`${p.x}-${p.y}`}
            x={p.x * CELL}
            y={p.y * CELL}
            width={CELL - 1}
            height={CELL - 1}
            fill={p.color}
            custom={p.order}
            variants={pixelVariants}
            initial={false}
            animate={healed && !reduceMotion ? "healed" : "polluted"}
            style={{ transformBox: "fill-box", transformOrigin: "center" }}
          />
        ))}
      </svg>
      <p
        aria-label={`฿${baht.toLocaleString("en-US")}`}
        style={{
          fontFamily: EL_FONT.display,
          fontSize: "clamp(2.6rem, 6vw, 3.6rem)",
          fontWeight: 200,
          lineHeight: 1,
          color: healed ? EL.flameWhite : EL.cream,
          transition: "color 600ms ease",
        }}
      >
        <CountUp value={baht} />
      </p>
    </motion.li>
  );
}

/**
 * Become a sponsor: the three packages and a link to the sponsor deck.
 * It sits after the poster, so it doesn't get in the way of students
 * signing up. What sponsors fund: the prize pool (Big, 2026-11-19).
 * Packages: facts.ts. What each package gets is in the deck, not here.
 *
 * The delight runs the poster's idea backwards: each package carries toxic
 * pixels, more for bigger packages, and pointing at (or tapping) one clears
 * them away (on phones they clear by themselves, and a tap toggles them).
 * Prices count up as they scroll in. Reduced motion: static.
 */
export function SponsorSection() {
  const reduceMotion = useReducedMotion();
  const packages = ELEMENTAL.sponsorPackagesBaht;
  const max = Math.max(...packages);
  const rise = (delay: number) =>
    reduceMotion
      ? {}
      : {
          initial: { opacity: 0, y: 20 },
          whileInView: { opacity: 1, y: 0 },
          viewport: { once: true, margin: "0px 0px -10% 0px" },
          transition: { duration: 0.9, delay, ease: EASE_TENSION },
        };

  return (
    <section
      id="sponsors"
      aria-labelledby="sponsors-title"
      className="border-t border-[#f3efe6]/12 py-20 sm:py-28"
      style={{ backgroundColor: EL.char, color: EL.cream }}
    >
      <div className="mx-auto max-w-5xl px-5 sm:px-10">
        <motion.p className="text-xs" style={{ fontFamily: EL_FONT.mono, color: EL.creamSoft }} {...rise(0)}>
          [ผู้สนับสนุน]
        </motion.p>
        <motion.h2
          id="sponsors-title"
          className="mt-3 text-4xl sm:text-6xl"
          style={{ fontFamily: EL_FONT.display, fontWeight: 200, lineHeight: 1.12 }}
          {...rise(0.08)}
        >
          ร่วมเป็นผู้สนับสนุน
        </motion.h2>
        <motion.p
          className="mt-5 max-w-xl text-base leading-relaxed sm:text-lg"
          style={{ fontFamily: BODY_FONT, color: EL.creamSoft }}
          {...rise(0.16)}
        >
          เงินสนับสนุนช่วยสร้างเงินรางวัลให้น้อง ๆ ที่ลงมือแก้ปัญหาสิ่งแวดล้อมของจริง ตลอด {ELEMENTAL.days} วันของ{" "}
          {ELEMENTAL.edition} Hackathon
        </motion.p>

        <ul className="mt-12 grid grid-cols-1 border-y border-[#f3efe6]/15 sm:grid-cols-3">
          {packages.map((baht, i) => (
            <SponsorPackage key={baht} baht={baht} index={i} max={max} />
          ))}
        </ul>
        <p className="mt-4 text-sm" style={{ fontFamily: BODY_FONT, color: EL.creamSoft }}>
          สนับสนุนเป็นเงิน หรือเป็นสินค้ามูลค่าเท่ากันก็ได้
        </p>

        <div className="mt-10">
          <Link
            href="/hackathon/elemental/sponsor"
            className={`${styles.textLink} ${styles.nudgeLink} text-2xl italic`}
            style={{ fontFamily: EL_FONT.display, fontWeight: 300, color: EL.flameCore }}
          >
            ดูข้อเสนอการสนับสนุน <span className={styles.nudgeArrow}>→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
