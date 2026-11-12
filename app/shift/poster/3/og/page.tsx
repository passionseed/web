import type { Metadata } from "next";

import { COSMOS, starlight } from "@/components/shift/next/cosmos";
import { PassionSeedMark } from "@/components/shift/poster/riso";
import { BannerPlanet } from "@/components/shift/poster/shift3/bannerPlanet";
import { SHIFT3 } from "@/components/shift/poster/shift3/facts";
import { Glass, LATIN, Lockup, cosmosBackground } from "@/components/shift/poster/shift3/parts";
import { Sky } from "@/components/shift/poster/shift3/Sky";

/**
 * SHIFT[3] link preview, 1200x630: the /shift gallery card and the Open Graph
 * image for /shift/3 (public/shift/banners/shift-3.png). Cosmos style of the
 * launch kit; every fact comes from SHIFT_COHORT_3 via facts.ts. Chat apps
 * shrink this to ~500px wide, so the type stays large and the copy short.
 * Export: node scripts/render-poster.mjs --route /shift/poster/3/og
 *         --ids shift3-og --out <dir>
 */

const SHIFT3_OG_ID = "shift3-og";

export const metadata: Metadata = {
  title: `${SHIFT3.name} link preview`,
  robots: { index: false, follow: false },
};

const W = 1200;
const H = 630;

function Dot() {
  return <span className="shrink-0 rounded-full" style={{ width: 6, height: 6, background: starlight("55") }} />;
}

function Shift3Og() {
  return (
    <div
      id={SHIFT3_OG_ID}
      lang="th"
      className="relative shrink-0 overflow-hidden font-bai-jamjuree antialiased"
      style={{ width: W, height: H, ...cosmosBackground(W, H) }}
    >
      <Sky width={W} height={H} seed={19} band={[0, 560, W, 120]} />
      <BannerPlanet
        width={W}
        height={H}
        cx={1040}
        cy={380}
        r={250}
        orbit={{ rx: 330, ry: 74, tilt: -14 }}
        rocket={{ x: 820, y: 96, angle: -62, scale: 0.42, curve: [1070, 70, 930, 60] }}
      />
      <div className="relative flex h-full flex-col px-[64px] pb-[52px] pt-[48px]">
        {/* No "open" pill: this image outlives the apply window on the /shift
            gallery, and the deadline below already says when it closes. */}
        <PassionSeedMark size={38} />
        <h1 className="-ml-[7px] mt-[30px]">
          <Lockup size={168} />
        </h1>
        <div className="mt-[22px]" style={{ textShadow: `0 2px 24px ${COSMOS.void}` }}>
          <p className="whitespace-nowrap font-semibold" style={{ fontSize: 44, lineHeight: 1.3 }}>
            {SHIFT3.days} เย็น ลงมือสร้างของจริง
          </p>
          <p className="whitespace-nowrap font-semibold" style={{ fontSize: 44, lineHeight: 1.3, color: COSMOS.aurora }}>
            แล้วชวนคนนอกมาลองใช้
          </p>
        </div>
        <div className="mt-auto">
          <Glass className="inline-flex items-center whitespace-nowrap" style={{ padding: "14px 28px", gap: 20, borderRadius: 999 }}>
            <span className="font-semibold" style={{ fontSize: 28 }}>
              {SHIFT3.dates}
            </span>
            <Dot />
            <span className="font-semibold" style={{ fontSize: 28, color: COSMOS.sol }}>
              {SHIFT3.price}
            </span>
            <Dot />
            <span className="font-medium" style={{ fontSize: 24, color: starlight("cc") }}>
              ปิดรับ {SHIFT3.deadline} · รับ {SHIFT3.seats} คน
            </span>
          </Glass>
          <p
            className="mt-[14px] pl-[4px] font-medium tracking-[-0.01em]"
            style={{ fontFamily: LATIN, fontSize: 24, color: COSMOS.aurora }}
          >
            {SHIFT3.link}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function Shift3OgPage() {
  return (
    <div className="min-h-screen overflow-auto bg-neutral-950 p-10">
      {/* Keep the Next.js dev indicator out of exported screenshots. */}
      <style>{"nextjs-portal{display:none!important}"}</style>
      <Shift3Og />
    </div>
  );
}
