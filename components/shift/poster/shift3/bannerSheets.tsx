import type { ReactNode } from "react";

import { COSMOS, starlight } from "@/components/shift/next/cosmos";

import { PassionSeedMark } from "../riso";

import { BannerPlanet } from "./bannerPlanet";
import { SHIFT3 } from "./facts";
import { Glass, LATIN, Lockup, PriceCard, StatusPill, WhenCard, cosmosBackground } from "./parts";
import { Sky } from "./Sky";

/**
 * SHIFT[3] listing banners in the cosmos look of the launch poster:
 *   X header      1500x500   avatar sits bottom-left, so nothing readable there
 *   LinkedIn      1584x396   avatar sits left, so text starts past it
 *   LINE square   1040x1040  rich message: the whole image is the tap target
 * Every fact comes from SHIFT_COHORT_3 via ./facts.
 * Export: node scripts/render-poster.mjs --route /shift/poster/3/banner
 *         --ids shift3-banner-x,shift3-banner-li,shift3-banner-square --out <dir>
 */

export const SHIFT3_BANNER_X_ID = "shift3-banner-x";
export const SHIFT3_BANNER_LI_ID = "shift3-banner-li";
export const SHIFT3_BANNER_SQUARE_ID = "shift3-banner-square";

function Sheet({ id, width, height, children }: { id: string; width: number; height: number; children: ReactNode }) {
  return (
    <div
      id={id}
      lang="th"
      className="relative shrink-0 overflow-hidden font-bai-jamjuree antialiased"
      style={{ width, height, ...cosmosBackground(width, height) }}
    >
      {children}
    </div>
  );
}

/** The outcome on one line: N evenings, build something real, bring outsiders in to try it. */
function HookLine({ size }: { size: number }) {
  return (
    <p className="whitespace-nowrap font-semibold" style={{ fontSize: size, lineHeight: 1.3, textShadow: `0 2px 24px ${COSMOS.void}` }}>
      {SHIFT3.days} เย็น ลงมือสร้างของจริง <span style={{ color: COSMOS.aurora }}>แล้วชวนคนนอกมาลองใช้</span>
    </p>
  );
}

/** "พร้อมพอร์ต 1 หน้า ไว้สัมภาษณ์ TCAS รอบ 1". */
function PortfolioLine({ size }: { size: number }) {
  return (
    <p className="whitespace-nowrap font-medium" style={{ fontSize: size, lineHeight: 1.4, color: starlight("d9") }}>
      พร้อม<span className="font-semibold" style={{ color: COSMOS.star }}>พอร์ต 1 หน้า</span> ไว้สัมภาษณ์ TCAS รอบ 1
    </p>
  );
}

function Dot({ size }: { size: number }) {
  return <span className="shrink-0 rounded-full" style={{ width: size, height: size, background: starlight("55") }} />;
}

/** When, how and how much, in one row: dates, evenings on Discord, price. */
function FactRow({ size }: { size: number }) {
  return (
    <p className="flex items-center whitespace-nowrap font-semibold" style={{ fontSize: size, lineHeight: 1.3, gap: size * 0.6 }}>
      <span>{SHIFT3.dates}</span>
      <Dot size={size * 0.22} />
      <span className="font-medium" style={{ color: COSMOS.sol }}>
        ไลฟ์บน Discord {SHIFT3.time} น.
      </span>
      <Dot size={size * 0.22} />
      <span>
        <span style={{ color: COSMOS.sol }}>{SHIFT3.price}</span> ต่อคน
      </span>
    </p>
  );
}

/** Where to apply, then the deadline and seats. */
function ApplyBar({ k = 1, cta = "สมัครที่", wide = false }: { k?: number; cta?: string; wide?: boolean }) {
  return (
    <Glass
      className={`${wide ? "flex" : "inline-flex"} items-center whitespace-nowrap`}
      style={{ padding: `${12 * k}px ${26 * k}px`, gap: 22 * k, borderRadius: 999 }}
    >
      <span
        className="shrink-0 rounded-full"
        style={{ width: 10 * k, height: 10 * k, background: COSMOS.sol, boxShadow: `0 0 ${12 * k}px ${COSMOS.sol}` }}
      />
      <span className={`font-medium ${wide ? "flex-1" : ""}`} style={{ fontSize: 22 * k, color: starlight("cc") }}>
        {cta}{" "}
        <span className="font-medium tracking-[-0.01em]" style={{ fontFamily: LATIN, fontSize: 25 * k, color: COSMOS.aurora }}>
          {SHIFT3.link}
        </span>
      </span>
      <span className="self-stretch border-l" style={{ borderColor: starlight("26") }} />
      <span className="font-semibold" style={{ fontSize: 22 * k }}>
        ปิดรับ {SHIFT3.deadline}
        <span className="font-medium" style={{ color: starlight("b3") }}>
          {" "}
          · รับ {SHIFT3.seats} คน
        </span>
      </span>
    </Glass>
  );
}

/**
 * X header, 1500x500. X lays the avatar over the bottom-left (about x < 400,
 * y > 320) and crops a little off the top and bottom on phones, so the text
 * block stays top-left and the apply bar sits right of the avatar.
 */
export function Shift3BannerX() {
  const W = 1500;
  const H = 500;
  return (
    <Sheet id={SHIFT3_BANNER_X_ID} width={W} height={H}>
      <Sky width={W} height={H} seed={11} band={[0, 470, W, 60]} />
      <BannerPlanet
        width={W}
        height={H}
        cx={1340}
        cy={312}
        r={250}
        orbit={{ rx: 350, ry: 78, tilt: -14 }}
        rocket={{ x: 1020, y: 64, angle: -72, scale: 0.4, curve: [1360, 40, 1180, 30] }}
      />
      {/* Text ends above y=330, where the avatar starts. */}
      <div className="absolute left-[84px] top-[40px]">
        <h1 className="-ml-[6px]">
          <Lockup size={140} />
        </h1>
        <div className="mt-[14px]">
          <HookLine size={40} />
        </div>
        <div className="mt-[2px]">
          <PortfolioLine size={24} />
        </div>
        <div className="mt-[10px]">
          <FactRow size={24} />
        </div>
      </div>
      <div className="absolute left-[440px] top-[392px]">
        <ApplyBar k={0.94} />
      </div>
    </Sheet>
  );
}

/**
 * LinkedIn cover, 1584x396. The profile photo covers the left side (about
 * x < 420 on desktop, and the bottom-left on phones), so the whole message
 * starts past it.
 */
export function Shift3BannerLinkedIn() {
  const W = 1584;
  const H = 396;
  return (
    <Sheet id={SHIFT3_BANNER_LI_ID} width={W} height={H}>
      <Sky width={W} height={H} seed={13} band={[0, 360, W, 40]} />
      <BannerPlanet
        width={W}
        height={H}
        cx={1440}
        cy={262}
        r={220}
        orbit={{ rx: 310, ry: 70, tilt: -14 }}
        rocket={{ x: 1150, y: 50, angle: -74, scale: 0.36, curve: [1460, 40, 1290, 22] }}
      />
      <div className="absolute left-[470px] top-[44px]">
        <div className="flex items-end gap-[28px]">
          <h1 className="-ml-[5px]">
            <Lockup size={128} />
          </h1>
          <div className="pb-[14px]">
            <StatusPill k={0.85}>เปิดรับสมัครแล้ว</StatusPill>
          </div>
        </div>
        <div className="mt-[14px]">
          <HookLine size={34} />
        </div>
        <div className="mt-[6px]">
          <FactRow size={22} />
        </div>
        <div className="mt-[18px]">
          <ApplyBar k={0.82} />
        </div>
      </div>
    </Sheet>
  );
}

/**
 * LINE OA rich message, 1040x1040: the launch feed composition on a square.
 * The whole image opens the apply link, so the bar says tap, not comment.
 */
export function Shift3BannerSquare() {
  const W = 1040;
  const H = 1040;
  return (
    <Sheet id={SHIFT3_BANNER_SQUARE_ID} width={W} height={H}>
      <Sky width={W} height={H} seed={17} band={[0, 900, W, 520]} />
      <BannerPlanet
        width={W}
        height={H}
        cx={856}
        cy={410}
        r={218}
        orbit={{ rx: 310, ry: 70, tilt: -16 }}
        rocket={{ x: 975, y: 156, angle: 30, scale: 0.46, curve: [890, 240, 915, 220] }}
      />
      <div className="relative flex h-full flex-col px-[56px] pb-[52px] pt-[44px]">
        <div className="flex items-center justify-between">
          <PassionSeedMark size={40} />
          <StatusPill k={0.95}>เปิดรับสมัครแล้ว</StatusPill>
        </div>
        <div className="mt-[40px]" style={{ textShadow: `0 2px 24px ${COSMOS.void}` }}>
          <p className="font-semibold" style={{ fontSize: 62, lineHeight: 1.28 }}>
            {SHIFT3.days} เย็น ลงมือสร้างของจริง
          </p>
          <p className="font-semibold" style={{ fontSize: 62, lineHeight: 1.28, color: COSMOS.aurora }}>
            แล้วชวนคนนอกมาลองใช้
          </p>
          <div className="mt-[8px]">
            <PortfolioLine size={30} />
          </div>
        </div>
        <h1 className="-ml-[7px] mt-[18px]">
          <Lockup size={196} />
        </h1>
        <div className="mt-auto space-y-[16px]">
          <div className="flex gap-[16px]">
            <WhenCard k={0.9} className="flex-1" />
            <PriceCard k={0.9} className="w-[330px] shrink-0" />
          </div>
          <ApplyBar k={1.08} cta="แตะเพื่อสมัคร" wide />
        </div>
      </div>
    </Sheet>
  );
}
