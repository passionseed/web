import { PIXEL_FONT } from "../PixelRects";
import { HX } from "./halloweenKit";

/**
 * Pixel speech bubble that says "คอมเมนต์ SHIFT": the Instagram call to
 * action on the Halloween posts, in place of a QR code. The keyword is the
 * one the comment-to-DM funnel listens for (SHIFT3.keyword).
 */

/** Notched corners, `n` px deep, so the bubble steps like the pixel art. */
function notched(n: number): string {
  const p = `${n}px`;
  return `polygon(${p} 0, calc(100% - ${p}) 0, calc(100% - ${p}) ${p}, 100% ${p}, 100% calc(100% - ${p}), calc(100% - ${p}) calc(100% - ${p}), calc(100% - ${p}) 100%, ${p} 100%, ${p} calc(100% - ${p}), 0 calc(100% - ${p}), 0 ${p}, ${p} ${p})`;
}

export function CommentBubble({ keyword, scale = 1 }: { keyword: string; scale?: number }) {
  const cell = 6 * scale;
  return (
    <div className="relative inline-block" style={{ paddingBottom: cell * 3 }}>
      <div
        className="flex flex-col items-center"
        style={{
          clipPath: notched(cell),
          backgroundColor: HX.cream,
          padding: `${14 * scale}px ${28 * scale}px ${10 * scale}px`,
        }}
      >
        <span className="font-kodchasan font-bold leading-none" style={{ fontSize: 26 * scale, color: HX.ink }}>
          คอมเมนต์
        </span>
        <span className="leading-none" style={{ ...PIXEL_FONT, fontSize: 64 * scale, color: HX.pumpkin, marginTop: 6 * scale }}>
          {keyword}
        </span>
      </div>
      {/* Stepped tail, bottom left, pointing down at the comment box. */}
      <span className="absolute" style={{ left: cell * 3, bottom: cell * 2, width: cell * 3, height: cell, backgroundColor: HX.cream }} />
      <span className="absolute" style={{ left: cell * 3, bottom: cell, width: cell * 2, height: cell, backgroundColor: HX.cream }} />
      <span className="absolute" style={{ left: cell * 3, bottom: 0, width: cell, height: cell, backgroundColor: HX.cream }} />
    </div>
  );
}
