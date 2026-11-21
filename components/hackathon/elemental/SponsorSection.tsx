"use client";

import { useEffect, useRef, useState } from "react";

import { motion, useInView, useReducedMotion, useScroll, useTransform, type Variants } from "framer-motion";

import { EL, EL_FONT } from "@/components/hackathon/poster/elemental/brand";
import { ELEMENTAL } from "@/components/hackathon/poster/elemental/facts";

import styles from "./elemental-cinema.module.css";
import { EditorialLink } from "./EditorialLink";

const BODY_FONT = "var(--font-bai-jamjuree), sans-serif";

/**
 * Pixel damage beside each package, drawn by hand: it grows from the
 * bottom-right corner, more for bigger packages. X is a pixel. Listed in
 * the same order as ELEMENTAL.sponsorPackagesBaht (largest first).
 */
const DAMAGE = [
  ["....X.", "..XXX.", ".XXXXX", "XXXXXX"],
  ["......", "....X.", "...XXX", "..XXXX"],
  ["......", "......", ".....X", "....XX"],
];
const CELL = 12;
const COLS = 6;
const ROWS = 4;

/** The loud pixel colours from brand.ts. */
const TOXIC = [EL.flame, EL.toxicCyan, EL.ember, EL.toxicYellow, EL.toxicRust, EL.flameLight];

type Pixel = { x: number; y: number; color: string; order: number };

/** Precomputed once. Pixels nearest the corner clear last. */
const PIXELS: Pixel[][] = DAMAGE.map((rows) => {
  const cells: Omit<Pixel, "order">[] = [];
  rows.forEach((row, y) =>
    [...row].forEach((c, x) => {
      if (c === "X") cells.push({ x, y, color: TOXIC[(x * 5 + y * 3) % TOXIC.length] });
    })
  );
  const fromCorner = (c: { x: number; y: number }) => COLS - 1 - c.x + (ROWS - 1 - c.y);
  return cells
    .sort((a, b) => fromCorner(b) - fromCorner(a))
    .map((c, order) => ({ ...c, order }));
});

const pixelVariants: Variants = {
  polluted: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.12, ease: "linear" } },
  healed: (order: number) => ({
    opacity: 0,
    scale: 0.3,
    y: -8,
    transition: { duration: 0.5, delay: order * 0.03, ease: [0.05, 0.7, 0.35, 0.99] },
  }),
};

function SponsorPackage({ baht, index }: { baht: number; index: number }) {
  const reduceMotion = useReducedMotion();
  const ref = useRef<HTMLLIElement>(null);
  const [healed, setHealed] = useState(false);
  // Phones can't hover: there the damage clears once, as you scroll the
  // package into the upper part of the screen.
  const scrolledIn = useInView(ref, { once: true, margin: "0px 0px -40% 0px" });

  useEffect(() => {
    if (scrolledIn && window.matchMedia("(hover: none)").matches) setHealed(true);
  }, [scrolledIn]);

  const pixels = PIXELS[index] ?? [];

  return (
    <motion.li
      ref={ref}
      className={`flex items-end justify-between gap-4 py-6 lg:py-8 ${
        index > 0 ? "border-t border-[#f3efe6]/15 lg:border-l lg:border-t-0 lg:pl-8" : "lg:pr-8"
      }`}
      onHoverStart={() => setHealed(true)}
      onHoverEnd={() => setHealed(false)}
    >
      <p
        style={{
          fontFamily: EL_FONT.display,
          fontSize: "clamp(2.6rem, 6vw, 3.6rem)",
          fontWeight: 200,
          lineHeight: 1,
        }}
      >
        ฿{baht.toLocaleString("en-US")}
      </p>
      <svg
        aria-hidden
        width={COLS * CELL}
        height={ROWS * CELL}
        viewBox={`0 0 ${COLS * CELL} ${ROWS * CELL}`}
        className="mb-1 shrink-0"
        style={{ overflow: "visible" }}
      >
        {pixels.map((p) => (
          <motion.rect
            key={`${p.x}-${p.y}`}
            x={p.x * CELL}
            y={p.y * CELL}
            width={CELL - 2}
            height={CELL - 2}
            fill={p.color}
            custom={p.order}
            variants={pixelVariants}
            initial={false}
            animate={healed && !reduceMotion ? "healed" : "polluted"}
            style={{ transformBox: "fill-box", transformOrigin: "center" }}
          />
        ))}
      </svg>
    </motion.li>
  );
}

/**
 * Become a sponsor: the three packages and a link to the sponsor deck.
 * It sits after the poster, so it doesn't get in the way of students
 * signing up. What sponsors fund: the prize pool (Big, 2026-11-19).
 * Packages: facts.ts. What each package gets is in the deck, not here.
 *
 * Each package has a patch of pixel damage that clears on hover (or when
 * scrolled in, on phones). Reduced motion: it stays put.
 */
export function SponsorSection() {
  const reduceMotion = useReducedMotion();
  const headRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: headRef, offset: ["start 90%", "start 45%"] });
  const headY = useTransform(scrollYProgress, [0, 1], [30, 0]);
  const headOpacity = useTransform(scrollYProgress, [0, 1], [0.65, 1]);

  return (
    <section
      id="sponsors"
      aria-labelledby="sponsors-title"
      className="border-t border-[#f3efe6]/12 py-20 sm:py-28"
      style={{ backgroundColor: EL.char, color: EL.cream }}
    >
      <div className="mx-auto max-w-5xl px-5 sm:px-10">
        <motion.div
          ref={headRef}
          style={reduceMotion ? undefined : { y: headY, opacity: headOpacity }}
          className="will-change-transform"
        >
          <p className="text-xs" style={{ fontFamily: EL_FONT.mono, color: EL.creamSoft }}>
            [ผู้สนับสนุน]
          </p>
          <h2
            id="sponsors-title"
            className="mt-3 text-4xl sm:text-6xl"
            style={{ fontFamily: EL_FONT.display, fontWeight: 200, lineHeight: 1.12 }}
          >
            ร่วมเป็นผู้สนับสนุน
          </h2>
          <p
            className="mt-5 max-w-xl text-base leading-relaxed sm:text-lg"
            style={{ fontFamily: BODY_FONT, color: EL.creamSoft }}
          >
            เงินสนับสนุนช่วยสร้างเงินรางวัลให้น้อง ๆ ที่ลงมือแก้ปัญหาสิ่งแวดล้อมของจริง ตลอด {ELEMENTAL.days} วันของ{" "}
            {ELEMENTAL.edition} Hackathon
          </p>
        </motion.div>

        <ul className="mt-12 grid grid-cols-1 border-y border-[#f3efe6]/15 lg:grid-cols-3">
          {ELEMENTAL.sponsorPackagesBaht.map((baht, i) => (
            <SponsorPackage key={i} baht={baht} index={i} />
          ))}
        </ul>
        <p className="mt-4 text-sm" style={{ fontFamily: BODY_FONT, color: EL.creamSoft }}>
          สนับสนุนเป็นเงิน หรือเป็นสินค้ามูลค่าเท่ากันก็ได้
        </p>

        <div className="mt-10">
          <EditorialLink
            href="/hackathon/elemental/sponsor"
            className={`${styles.nudgeLink} text-2xl italic`}
            style={{ fontFamily: EL_FONT.display, fontWeight: 300, color: EL.flameCore }}
          >
            ดูข้อเสนอการสนับสนุน <span className={styles.nudgeArrow}>→</span>
          </EditorialLink>
        </div>
      </div>
    </section>
  );
}
