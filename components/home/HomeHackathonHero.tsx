import Image from "next/image";

import { EL, EL_FONT } from "@/components/hackathon/poster/elemental/brand";
import { ELEMENTAL, prizeTotal, thaiDateShort } from "@/components/hackathon/poster/elemental/facts";
import { trirong } from "@/components/hackathon/elemental/fonts";
import { KEY_VISUAL_MEDIA } from "@/components/hackathon/elemental/media";
import { ShiftAttributedLink } from "@/components/shift/ShiftAttributedLink";
import { HOME_HACKATHON } from "@/lib/content/home";
import type { LeadCta } from "@/lib/content/home-lead";
import { formatThaiDate } from "@/lib/content/shift-cohort";
import { LeadButton } from "./LeadButton";
import { MarginNote } from "./MarginNote";

const CREAM = EL.cream;
const CREAM_SOFT = "#d6d0c4";
const GROUND = "#0c0d0c";
/** A soft dark halo so cream type holds over moving smoke. */
const OVER_SMOKE = "0 1px 2px rgba(0,0,0,0.55), 0 0 18px rgba(12,13,12,0.7)";

function Fact({ tag, value, sub }: { tag: string; value: string; sub?: string }) {
  return (
    <div>
      <dt className="text-[11px]" style={{ fontFamily: EL_FONT.mono, color: CREAM_SOFT }}>
        [{tag}]
      </dt>
      <dd className="mt-1 text-xl sm:text-2xl" style={{ fontFamily: EL_FONT.display, fontWeight: 300, color: CREAM }}>
        {value}
      </dd>
      {sub && (
        <dd className="mt-0.5 text-xs" style={{ color: CREAM_SOFT }}>
          {sub}
        </dd>
      )}
    </div>
  );
}

/**
 * Home hero while the Elemental Hackathon leads: its calm valley, slowly
 * corrupted, with the facts from ELEMENTAL. Brand rules are in
 * components/hackathon/poster/elemental/brand.ts: ink title on the pale sky,
 * cream type on the dark ground, Trirong and Space Mono.
 */
export function HomeHackathonHero({ cta }: { cta: LeadCta }) {
  return (
    <section className={`${trirong.variable} relative overflow-hidden`} style={{ backgroundColor: GROUND }}>
      <div className="relative flex min-h-[clamp(640px,96svh,940px)] flex-col justify-between">
        <Image
          src={KEY_VISUAL_MEDIA.scenePoster}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-[50%_40%] md:object-[60%_35%]"
        />
        {/* Decorative loop: muted, no controls, and skipped for reduced motion. */}
        <video
          src={KEY_VISUAL_MEDIA.sceneLoop}
          poster={KEY_VISUAL_MEDIA.scenePoster}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover object-[50%_40%] motion-reduce:hidden md:object-[60%_35%]"
        />

        {/* Top shade keeps the transparent nav readable over the pale sky. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-24"
          style={{ background: "linear-gradient(to bottom, rgba(12,13,12,0.6), transparent)" }}
        />
        {/* The cream copy sits where the pixel smoke drifts, so the ground
            rises behind it: taller on phones, weighted left on wide screens
            so the fire on the right stays bright. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[72%] md:h-[58%]"
          style={{
            background: `linear-gradient(to top, ${GROUND} 0%, rgba(12,13,12,0.95) 42%, rgba(12,13,12,0.78) 62%, rgba(12,13,12,0.35) 84%, transparent 100%)`,
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 hidden md:block"
          style={{
            background: "linear-gradient(90deg, rgba(12,13,12,0.8) 0%, rgba(12,13,12,0.55) 38%, transparent 66%)",
            maskImage: "linear-gradient(to bottom, transparent 36%, black 52%)",
            WebkitMaskImage: "linear-gradient(to bottom, transparent 36%, black 52%)",
          }}
        />

        <div className="relative z-10 mx-auto w-full max-w-5xl px-5 pt-28 sm:px-8 sm:pt-32">
          <p className="text-xs sm:text-sm" style={{ fontFamily: EL_FONT.mono, color: EL.ink }}>
            [{HOME_HACKATHON.tag} · {ELEMENTAL.series}]
          </p>
          <h1 className="mt-3" style={{ fontFamily: EL_FONT.display, color: EL.ink, lineHeight: 0.95 }}>
            <span
              className="block tracking-tight"
              style={{ fontSize: "clamp(3.4rem, min(12vw, 13svh), 8rem)", fontWeight: 200 }}
            >
              {ELEMENTAL.edition}
            </span>
            <span
              className="block italic tracking-tight"
              style={{ fontSize: "clamp(3rem, min(10.5vw, 11.5svh), 7rem)", fontWeight: 300 }}
            >
              Hackathon
            </span>
          </h1>
        </div>

        <div className="relative z-10 mx-auto w-full max-w-5xl px-5 pb-14 pt-10 sm:px-8 sm:pb-16">
          <p
            className="text-[clamp(1.35rem,3.2vw,2rem)] leading-snug"
            style={{ fontFamily: EL_FONT.display, fontWeight: 300, color: CREAM, textShadow: OVER_SMOKE }}
          >
            {ELEMENTAL.taglineTh[0]}
            <br />
            {ELEMENTAL.taglineTh[1]}
          </p>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed sm:text-base" style={{ color: CREAM_SOFT, textShadow: OVER_SMOKE }}>
            {HOME_HACKATHON.pitch} สำหรับ {ELEMENTAL.gradesTh} ทั่วประเทศ
          </p>

          <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-5 border-t pt-6 sm:grid-cols-4" style={{ borderColor: "rgba(243,239,230,0.18)" }}>
            <Fact tag="วันที่" value={thaiDateShort()} sub={`หยุดยาว ${ELEMENTAL.days} วัน · ${ELEMENTAL.venueTh}`} />
            <Fact tag="รางวัลรวม" value={`${prizeTotal()} บาท`} />
            <Fact
              tag="ค่าสมัคร"
              value={`฿${ELEMENTAL.groupPriceBaht} / คน`}
              sub={`มากับเพื่อน · คนเดียว ฿${ELEMENTAL.priceBaht}`}
            />
            <Fact tag="ปิดรับสมัคร" value={formatThaiDate(ELEMENTAL.registrationClosesOn)} />
          </dl>

          <div className="mt-10 flex flex-col items-start gap-5 sm:flex-row sm:items-center">
            <LeadButton cta={cta} location="home_hero" />
            <ShiftAttributedLink href="/shift/next" className="site-ghost">
              {HOME_HACKATHON.shiftLink}
            </ShiftAttributedLink>
          </div>
          <MarginNote className="mt-8 inline-block">{HOME_HACKATHON.note}</MarginNote>
        </div>
      </div>
    </section>
  );
}
