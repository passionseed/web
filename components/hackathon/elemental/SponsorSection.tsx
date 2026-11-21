import Link from "next/link";

import { EL, EL_FONT } from "@/components/hackathon/poster/elemental/brand";
import { ELEMENTAL } from "@/components/hackathon/poster/elemental/facts";

import styles from "./elemental-cinema.module.css";

const BODY_FONT = "var(--font-bai-jamjuree), sans-serif";

/**
 * Become a sponsor: the three packages and a link to the sponsor deck.
 * It sits after the poster, so it doesn't get in the way of students
 * signing up. What sponsors fund: the prize pool (Big, 2026-11-19).
 * Packages: facts.ts. What each package gets is in the deck, not here.
 */
export function SponsorSection() {
  return (
    <section
      id="sponsors"
      aria-labelledby="sponsors-title"
      className="border-t border-[#f3efe6]/12 py-20 sm:py-28"
      style={{ backgroundColor: EL.char, color: EL.cream }}
    >
      <div className="mx-auto max-w-5xl px-5 sm:px-10">
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
        <p className="mt-5 max-w-xl text-base leading-relaxed sm:text-lg" style={{ fontFamily: BODY_FONT, color: EL.creamSoft }}>
          เงินสนับสนุนช่วยสร้างเงินรางวัลให้น้อง ๆ ที่ลงมือแก้ปัญหาสิ่งแวดล้อมของจริง ตลอด {ELEMENTAL.days} วันของ{" "}
          {ELEMENTAL.edition} Hackathon
        </p>

        <ul className="mt-12 grid grid-cols-1 border-y border-[#f3efe6]/15 sm:grid-cols-3">
          {ELEMENTAL.sponsorPackagesBaht.map((baht, i) => (
            <li
              key={baht}
              className={`py-6 sm:py-8 ${i > 0 ? "border-t border-[#f3efe6]/15 sm:border-l sm:border-t-0 sm:pl-8" : "sm:pr-8"}`}
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
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm" style={{ fontFamily: BODY_FONT, color: EL.creamSoft }}>
          สนับสนุนเป็นเงิน หรือเป็นสินค้ามูลค่าเท่ากันก็ได้
        </p>

        <div className="mt-10">
          <Link
            href="/hackathon/elemental/sponsor"
            className={`${styles.textLink} text-2xl italic`}
            style={{ fontFamily: EL_FONT.display, fontWeight: 300, color: EL.flameCore }}
          >
            ดูข้อเสนอการสนับสนุน →
          </Link>
        </div>
      </div>
    </section>
  );
}
