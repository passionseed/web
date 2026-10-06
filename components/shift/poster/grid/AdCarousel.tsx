import Image from "next/image";
import type { ReactNode } from "react";

import { formatThaiDate, priceLabel } from "@/lib/content/shift-cohort";

import { PassionSeedMark } from "../riso";
import { PIXEL_FONT, Rects } from "../pixel/PixelRects";
import { CELL, PX, mix } from "../pixel/pixelKit";
import {
  AD_COHORT,
  AD_OFFER_POINTS,
  AD_PROOFS,
  AD_WEEK,
  HOOK_COPY,
  enDateRange,
  type AdHook,
  type AdProof,
} from "./adCopy";
import { AD_CARDS, AD_DECK, AD_FOOT, AD_H, AD_PANO_W, AD_W, adSceneRects } from "./adScene";
import { HOT_GRADIENT } from "./ApplyCta";
import { DeckCard, MUTED, Plate, notch } from "./GridSlideFrame";

/**
 * SHIFT Meta ad carousel: five 1080x1350 (4:5) cards cut from one panorama.
 *   1-3 proof: a real SHIFT[0] project on a phone, one claim each
 *   4   how: the week in four beats, no experience needed
 *   5   offer: dated price, capacity, and the details URL
 * Card 1 has a student hook and a parent hook for an A/B test.
 */

const CARD_PX = AD_W * CELL;
const CARD_PX_H = AD_H * CELL;
const DECK_PX = (AD_DECK + 6) * CELL;
const FOOT_PX = (AD_FOOT + 3) * CELL;
const HEADLINE_SHADOW = `${CELL / 2}px ${CELL / 2}px 0 ${PX.cloudShade}`;

function SceneArt() {
  const { scene, front } = adSceneRects();
  return (
    <svg
      className="absolute left-0 top-0"
      width={AD_PANO_W * CELL}
      height={CARD_PX_H}
      viewBox={`0 0 ${AD_PANO_W} ${AD_H}`}
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      <Rects rects={scene} />
      <Rects rects={front} />
    </svg>
  );
}

/** Sky header: pixel tag, a two-line Thai headline, one supporting line. */
function Header({ tag, headline, sub }: { tag: string; headline: string; sub?: ReactNode }) {
  return (
    <div className="absolute inset-x-0 top-[64px] flex flex-col items-center px-[56px] text-center">
      <p className="text-[30px] leading-none tracking-[0.1em]" style={{ ...PIXEL_FONT, color: PX.ink }}>
        {tag}
      </p>
      <span className="mt-3 block h-[4px] w-[260px]" style={{ backgroundColor: PX.ink }} />
      <h2
        className="mt-5 whitespace-pre-line font-kodchasan text-[80px] font-bold leading-[1.2]"
        style={{ color: PX.ink, textShadow: HEADLINE_SHADOW }}
      >
        {headline}
      </h2>
      {sub && (
        <p className="mt-4 font-kodchasan text-[38px] font-semibold leading-[1.3]" style={{ color: PX.ink }}>
          {sub}
        </p>
      )}
    </div>
  );
}

/** Brand mark bottom-left, and a swipe cue on every card but the last. */
function Footer({ swipe = true }: { swipe?: boolean }) {
  return (
    <div className="absolute inset-x-0 bottom-0 flex items-center gap-10 px-[56px]" style={{ top: FOOT_PX }}>
      <PassionSeedMark size={34} />
      {swipe && (
        <p className="text-[26px] tracking-[0.1em]" style={{ ...PIXEL_FONT, color: PX.accentLight }}>
          SWIPE →
        </p>
      )}
    </div>
  );
}

/** Content area on the dark deck, between the wave and the footer. */
function Deck({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`absolute inset-x-0 flex flex-col px-[56px] ${className}`}
      style={{ top: DECK_PX, height: FOOT_PX - DECK_PX - 24 }}
    >
      {children}
    </div>
  );
}

/**
 * A real screenshot contained inside its card, preserving the app controls.
 */
function PhoneShot({ src, alt }: { src: string; alt: string }) {
  const frame = { left: 634, top: 510, width: 390, height: 744 };
  return (
    <div className="absolute" style={frame}>
      <div
        className="absolute inset-0 translate-x-[14px] translate-y-[14px]"
        style={{ backgroundColor: mix(PX.ink, PX.waterDeep, 0.4), clipPath: notch(18) }}
      />
      <div className="absolute inset-0 p-[14px]" style={{ backgroundColor: PX.ink, clipPath: notch(18) }}>
        <div className="relative h-full w-full overflow-hidden bg-white" style={{ clipPath: notch(8) }}>
          <Image src={src} alt={alt} fill unoptimized sizes="400px" className="object-contain object-top" />
        </div>
      </div>
    </div>
  );
}

/** The project, told the way a judge would want it: what, for whom, the evidence. */
function ProofNote({ project, url }: { project: AdProof["project"]; url?: string }) {
  return (
    <DeckCard className="w-[540px] !px-7 !py-7">
      <p className="truncate text-[22px] tracking-[0.02em]" style={{ ...PIXEL_FONT, color: MUTED }}>
        {(url ?? project.url).replace(/^https?:\/\//, "").replace(/\/$/, "")}
      </p>
      <p className="mt-1 font-kodchasan text-[44px] font-bold leading-tight">{project.title}</p>
      <p className="mt-3 font-kodchasan text-[34px] font-bold leading-[1.4] [text-wrap:balance]" style={{ color: PX.accentLight }}>
        {project.pitch}
      </p>
      {project.proof && (
        <div className="mt-5 flex items-start gap-3">
          <span
            className="mt-[4px] shrink-0 px-2 py-0.5 text-[17px] tracking-[0.1em]"
            style={{ ...PIXEL_FONT, backgroundColor: PX.accent, color: PX.ink }}
          >
            PROOF
          </span>
          <p className="text-[36px] font-semibold leading-[1.5]">{project.proof}</p>
        </div>
      )}
    </DeckCard>
  );
}

function ProofCard({ proof }: { proof: AdProof }) {
  return (
    <>
      <Header tag={proof.tag} headline={proof.headline} sub={proof.sub} />
      <PhoneShot src={proof.shot} alt={proof.project.title} />
      <Deck className="justify-center">
        <ProofNote project={proof.project} url={proof.url} />
      </Deck>
      <Footer />
    </>
  );
}

function HookCard({ hook }: { hook: AdHook }) {
  return <ProofCard proof={{ ...AD_PROOFS[0], ...HOOK_COPY[hook] }} />;
}

function HowCard() {
  return (
    <>
      <Header tag={`${AD_COHORT.name} · 7 DAYS ONLINE`} headline={"เลือก สร้าง ทดลอง\nแล้วเล่าเป็นพอร์ต"} />
      <Deck className="justify-between">
        <ol className="space-y-6">
          {AD_WEEK.map((beat, i) => {
            const last = i === AD_WEEK.length - 1;
            return (
              <li key={beat.days} className="flex items-center gap-7">
                <Plate label={beat.days} size={88} hot={last} />
                <div>
                  <p
                    className="font-kodchasan text-[40px] font-bold leading-tight"
                    style={{ color: last ? PX.accentLight : PX.cream }}
                  >
                    {beat.title}
                  </p>
                  <p className="mt-1 text-[34px] leading-[1.4]" style={{ color: MUTED }}>
                    {beat.detail}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
        <p className="text-[32px]" style={{ color: MUTED }}>
          Discord {AD_COHORT.sessionTime} น. · พี่เลี้ยงในห้องทีม
        </p>
      </Deck>
      <Footer />
    </>
  );
}

function PriceCard() {
  return (
    <DeckCard hot fill={HOT_GRADIENT} className="flex items-end justify-between !px-10 !py-6">
      <div>
        <p className="font-kodchasan text-[32px] font-bold">ต่อคน ตลอด 7 วัน</p>
      </div>
      <p className="font-kodchasan text-[170px] font-bold leading-[0.85]" style={{ textShadow: `6px 6px 0 ${PX.accentDark}` }}>
        {priceLabel(AD_COHORT)}
      </p>
    </DeckCard>
  );
}

function OfferCard() {
  return (
    <>
      <Header
        tag={`${AD_COHORT.name} · ${enDateRange(AD_COHORT.startDate, AD_COHORT.endDate)} · ONLINE`}
        headline={"SHIFT คือ 7 วัน\nสร้างโปรเจกต์ของเรา"}
        sub={`${formatThaiDate(AD_COHORT.startDate, false)} ถึง ${formatThaiDate(AD_COHORT.endDate, false)} ${Number(AD_COHORT.endDate.slice(0, 4)) + 543} · Discord`}
      />
      <Deck className="justify-between">
        <div>
          <PriceCard />
          <p className="mt-5 text-[36px] font-semibold" style={{ color: PX.accentLight }}>เป้าหมาย: พอร์ต 1 หน้า</p>
          <p className="mt-2 text-[32px]" style={{ color: PX.cream }}>ความจุรุ่น {AD_COHORT.seats} คน · {AD_COHORT.sessionTime} น.</p>
          <ul className="mt-5 space-y-2">
            {AD_OFFER_POINTS.map((point) => (
              <li key={point} className="flex items-center gap-4 font-kodchasan text-[32px] font-bold" style={{ color: PX.cream }}>
                <span className="h-[14px] w-[14px] shrink-0" style={{ backgroundColor: PX.accent }} />
                {point}
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-col gap-3">
          <p className="font-kodchasan text-[42px] font-bold leading-tight" style={{ color: PX.accent }}>
            ปิดรับ {formatThaiDate(AD_COHORT.applyDeadline, false)} {Number(AD_COHORT.applyDeadline.slice(0, 4)) + 543}
          </p>
          <p className="font-kodchasan text-[30px] font-bold" style={{ color: PX.accentLight }}>
            ดูรายละเอียด: passionseed.org/shift/{AD_COHORT.round}
          </p>
        </div>
      </Deck>
      <Footer swipe={false} />
    </>
  );
}

function cardsFor(hook: AdHook): (() => ReactNode)[] {
  return [
    () => <HookCard hook={hook} />,
    () => <ProofCard proof={AD_PROOFS[1]} />,
    () => <ProofCard proof={AD_PROOFS[2]} />,
    HowCard,
    OfferCard,
  ];
}

/** All five cards side by side, exactly as a swipe reveals them. */
export function AdPanorama({ hook = "student", id }: { hook?: AdHook; id?: string }) {
  return (
    <div
      id={id}
      className="relative shrink-0 overflow-hidden font-bai-jamjuree antialiased"
      style={{ width: AD_PANO_W * CELL, height: CARD_PX_H, backgroundColor: PX.sky }}
    >
      <SceneArt />
      {cardsFor(hook).map((Card, i) => (
        <div key={i} className="absolute top-0 h-full" style={{ left: i * CARD_PX, width: CARD_PX }}>
          <Card />
        </div>
      ))}
    </div>
  );
}

export const AD_CARD_COUNT = AD_CARDS;

/** Screenshot id: shift-ad-1-student, shift-ad-1-parent, shift-ad-2 ... */
export const adCardId = (index: number, hook: AdHook) =>
  index === 0 ? `shift-ad-1-${hook}` : `shift-ad-${index + 1}`;

/** One 1080x1350 card: the panorama seen through its window. */
export function AdCard({ index, hook = "student" }: { index: number; hook?: AdHook }) {
  return (
    <div
      id={adCardId(index, hook)}
      className="relative shrink-0 overflow-hidden"
      style={{ width: CARD_PX, height: CARD_PX_H }}
    >
      <div className="absolute top-0" style={{ left: -index * CARD_PX }}>
        <AdPanorama hook={hook} />
      </div>
    </div>
  );
}
