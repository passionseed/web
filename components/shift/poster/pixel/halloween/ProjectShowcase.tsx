import type { CSSProperties, ReactNode } from "react";

import type { StudioPoint } from "@/lib/marketing/types";

import { Marked } from "./HalloweenSlide";
import { HX } from "./halloweenKit";

/**
 * Past-round projects on the Halloween carousel's proof slide, shown on
 * pixel-art devices instead of flat screenshots: Magnified Lens on a pixel
 * phone, TAX on a pixel CRT (its own retro-monitor look), each with its
 * second screenshot stuck on as a tilted sticker. Screenshots live in
 * public/shift/poster/3/proof; crops are in source pixels.
 */

interface Source {
  src: string;
  width: number;
  height: number;
}

/** [x, y, width, height] in the source screenshot's pixels. */
type CropBox = [number, number, number, number];

const DIR = "/shift/poster/3/proof";
const LENS_ZOOM: Source = { src: `${DIR}/magnified-lens-zoom.webp`, width: 1695, height: 939 };
const LENS_HOME: Source = { src: `${DIR}/magnified-lens-home.webp`, width: 1693, height: 930 };
const TAX_HERO: Source = { src: `${DIR}/tax-hero.webp`, width: 1782, height: 1486 };
const TAX_COMPARE: Source = { src: `${DIR}/tax-compare.webp`, width: 2000, height: 1419 };

/** Notched corners `n` px deep, so frames step like the pixel art around them. */
function notched(n: number): string {
  const p = `${n}px`;
  return `polygon(${p} 0, calc(100% - ${p}) 0, calc(100% - ${p}) ${p}, 100% ${p}, 100% calc(100% - ${p}), calc(100% - ${p}) calc(100% - ${p}), calc(100% - ${p}) 100%, ${p} 100%, ${p} calc(100% - ${p}), 0 calc(100% - ${p}), 0 ${p}, ${p} ${p})`;
}

/** Part of a screenshot scaled to cover a w x h box. */
function Crop({ source, crop, w, h }: { source: Source; crop: CropBox; w: number; h: number }) {
  const [sx, sy, sw, sh] = crop;
  const scale = Math.max(w / sw, h / sh);
  const left = -sx * scale - (sw * scale - w) / 2;
  const top = -sy * scale - (sh * scale - h) / 2;
  return (
    <div
      aria-hidden="true"
      style={{
        width: w,
        height: h,
        backgroundImage: `url(${source.src})`,
        backgroundSize: `${source.width * scale}px ${source.height * scale}px`,
        backgroundPosition: `${left}px ${top}px`,
        backgroundRepeat: "no-repeat",
      }}
    />
  );
}

/** Glow follows the clipped shape, so it goes on a wrapper as a drop-shadow. */
function Glow({ color, children, style }: { color: string; children: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{ filter: `drop-shadow(0 0 28px ${color}) drop-shadow(0 12px 0 ${HX.ink})`, ...style }}>{children}</div>
  );
}

function PixelPhone({ children }: { children: ReactNode }) {
  return (
    <div
      className="flex flex-col items-center px-[12px] pb-[22px] pt-[22px]"
      style={{ clipPath: notched(18), backgroundColor: "#4a3d6e", boxShadow: "inset 6px 6px 0 #6a5b94" }}
    >
      <span className="mb-[10px] h-[6px] w-[48px]" style={{ backgroundColor: HX.ink }} />
      <div style={{ outline: `4px solid ${HX.ink}` }}>{children}</div>
      <span className="mt-[12px] h-[12px] w-[12px]" style={{ backgroundColor: HX.ink }} />
    </div>
  );
}

const CRT_GREEN = "#1f7a3c";
const CRT_LIGHT = "#2fa652";

function PixelMonitor({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col items-center">
      <div
        className="p-[20px] pb-[34px]"
        style={{ clipPath: notched(18), backgroundColor: CRT_GREEN, boxShadow: `inset 0 6px 0 ${CRT_LIGHT}` }}
      >
        <div style={{ clipPath: notched(10), backgroundColor: HX.ink }}>{children}</div>
        <div className="mt-[12px] flex items-center justify-end gap-[8px]">
          <span className="h-[10px] w-[10px]" style={{ backgroundColor: "#7dff9b" }} />
          <span className="h-[10px] w-[10px]" style={{ backgroundColor: HX.ink }} />
          <span className="h-[10px] w-[10px]" style={{ backgroundColor: HX.ink }} />
        </div>
      </div>
      <span className="h-[34px] w-[70px]" style={{ backgroundColor: CRT_GREEN }} />
      <span className="h-[14px] w-[200px]" style={{ backgroundColor: CRT_LIGHT }} />
    </div>
  );
}

/** Second screenshot as a sticker: cream border, slight tilt, hard pixel shadow. */
function Sticker({ rotate, children, style }: { rotate: number; children: ReactNode; style: CSSProperties }) {
  return (
    <div
      className="absolute"
      style={{ transform: `rotate(${rotate}deg)`, filter: `drop-shadow(8px 8px 0 ${HX.ink})`, ...style }}
    >
      <div className="p-[8px]" style={{ backgroundColor: HX.cream }}>
        {children}
      </div>
    </div>
  );
}

/** "**Name** tagline" becomes a name line and a tagline line, so neither breaks mid-phrase. */
function Caption({ point }: { point: StudioPoint }) {
  const [, name, tagline] = point.title.match(/^\*\*(.+?)\*\*\s*(.*)$/) ?? [null, null, point.title];
  return (
    <div className="mt-[22px]">
      {name && (
        <p className="font-kodchasan text-[42px] font-bold leading-[1.2]" style={{ color: HX.flame }}>
          {name}
        </p>
      )}
      <p className="font-kodchasan text-[30px] font-bold leading-[1.35]" style={{ color: HX.cream }}>
        <Marked text={tagline} />
      </p>
      {point.body && (
        <p className="mt-[4px] text-[23px] leading-[1.5]" style={{ color: `${HX.cream}bf` }}>
          <Marked text={point.body} />
        </p>
      )}
    </div>
  );
}

/** Column width; the two projects sit side by side. */
const COL = 456;
const STAGE_H = 500;

function LensStage() {
  return (
    <div className="relative" style={{ width: COL, height: STAGE_H }}>
      <Glow color="rgba(191,232,255,0.6)" style={{ position: "absolute", left: 24, top: 0 }}>
        <PixelPhone>
          <Crop source={LENS_ZOOM} crop={[856, 158, 343, 708]} w={226} h={430} />
        </PixelPhone>
      </Glow>
      <Sticker rotate={6} style={{ left: 214, top: 250 }}>
        <Crop source={LENS_HOME} crop={[850, 190, 353, 330]} w={210} h={196} />
      </Sticker>
    </div>
  );
}

function TaxStage() {
  return (
    <div className="relative" style={{ width: COL, height: STAGE_H }}>
      <Glow color="rgba(57,211,83,0.55)" style={{ position: "absolute", left: 0, top: 24 }}>
        <PixelMonitor>
          <Crop source={TAX_HERO} crop={[385, 345, 995, 715]} w={376} h={270} />
        </PixelMonitor>
      </Glow>
      <Sticker rotate={-6} style={{ left: 250, top: 262 }}>
        <Crop source={TAX_COMPARE} crop={[1100, 360, 690, 740]} w={176} h={190} />
      </Sticker>
    </div>
  );
}

/**
 * TAX's line is taken from its own start screen, so it describes the
 * product, not a result nobody measured.
 */
export const TAX_POINT: StudioPoint = {
  title: "**TAX** คำนวณภาษีให้ง่ายกว่าเดิม",
  body: "กรอกรายได้ เลือกค่าลดหย่อน แล้วดูภาษีที่ต้องจ่ายหรือขอคืน ภ.ง.ด. 91",
};

export function ProjectShowcase({ lens }: { lens: StudioPoint }) {
  return (
    <div className="flex justify-between">
      <div style={{ width: COL }}>
        <LensStage />
        <Caption point={lens} />
      </div>
      <div style={{ width: COL }}>
        <TaxStage />
        <Caption point={TAX_POINT} />
      </div>
    </div>
  );
}
