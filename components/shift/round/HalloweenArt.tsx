import { scaled } from "@/components/shift/poster/grid/bangkokKit";
import { PIXEL_FONT, Rects } from "@/components/shift/poster/pixel/PixelRects";
import {
  BAT,
  BAT_PALETTE,
  GHOST,
  GHOST_DIM_PALETTE,
  HALLOWEEN_ICON_PALETTE,
  HX,
  PUMPKIN,
  PUMPKIN_PALETTE,
  fogWisps,
  tombstone,
} from "@/components/shift/poster/pixel/halloween/halloweenKit";
import { bands, sprite, type Rect } from "@/components/shift/poster/pixel/pixelKit";

import { PixelSdtArt, type SdtColors } from "./PixelArt";

/**
 * The round-page illustrations for the Halloween page: SHIFT[1]'s pixel
 * versions (PixelArt.tsx) redrawn at night. Certificates become headstones
 * sinking into the graveyard; the live window keeps glowing. Every SVG's
 * viewBox is in grid cells.
 */

const W = 80;
const H = 56;
const GROUND = 40;

function Scene({ children, label }: { children: React.ReactNode; label?: string }) {
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-auto w-full max-w-[280px]"
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      {children}
      {label && (
        <text x={W - 2} y={7} textAnchor="end" fontSize="6" fill={HX.lavender} style={PIXEL_FONT}>
          {label}
        </text>
      )}
    </svg>
  );
}

/** A headstone carved like a certificate: title lines and a wax seal. */
function certStone(x: number, bottom: number, w: number, h: number): Rect[] {
  const top = bottom - h;
  return [
    ...tombstone(x, bottom, w, h),
    [x + 2, top + 7, w - 7, 1, HX.stoneDark],
    [x + w - 5, top + 9, 3, 3, HX.pumpkinDark],
  ];
}

/** The same certificate x1,000, sinking deeper into the graveyard, one by one. */
export function HalloweenCertArt() {
  return (
    <Scene label="x1,000">
      <Rects
        rects={[
          ...certStone(6, GROUND + 4, 16, 22),
          ...certStone(32, GROUND + 12, 16, 22),
          ...certStone(58, GROUND + 18, 16, 22),
        ]}
      />
      <Rects
        rects={[
          ...bands(0, W, [
            [GROUND, HX.groundTop],
            [GROUND + 3, HX.ground],
            [H, HX.ground],
          ]),
          ...fogWisps(GROUND - 2, GROUND + 8, 6, W),
        ]}
      />
      <g className="shift-float shift-float-b">
        <Rects rects={sprite(GHOST, GHOST_DIM_PALETTE, 46, 10)} />
      </g>
    </Scene>
  );
}

const CURSOR = ["C...", "CC..", "CCC.", "CCCC", "CC..", "..C."];

/** A live window at night: bars that move, a blinking LIVE light, a real cursor. */
export function HalloweenLiveArt() {
  const frame: Rect[] = [
    [12, 12, 60, 40, HX.hat],
    [9, 9, 60, 40, HX.ghost],
    [11, 15, 56, 32, HX.ink],
    [12, 11, 2, 2, HX.pumpkin],
    [16, 11, 2, 2, HX.flame],
    [20, 11, 2, 2, HX.stone],
    [15, 42, 48, 1, HX.stoneDark],
  ];
  const bars: Rect[] = [
    [17, 32, 6, 10, HX.pumpkin],
    [27, 26, 6, 16, HX.lavender],
    [37, 29, 6, 13, HX.flame],
    [47, 20, 6, 22, HX.pumpkin],
  ];
  return (
    <Scene>
      <Rects rects={frame} />
      {bars.map(([x, y, w, h, fill]) => (
        <rect key={x} className="shift-bar" x={x} y={y} width={w} height={h} fill={fill} />
      ))}
      <rect className="shift-blink" x={52} y={11} width={2} height={2} fill={HX.pumpkin} />
      <text x={56} y={13} fontSize="4" fill={HX.ink} style={PIXEL_FONT}>
        LIVE
      </text>
      <Rects rects={sprite(PUMPKIN, PUMPKIN_PALETTE, 62, 43)} />
      <g className="shift-float">
        <Rects rects={scaled(sprite(CURSOR, { C: HX.ghost }, 0, 0), 58, 34, 2)} />
      </g>
      <g className="shift-float shift-float-c">
        <Rects rects={sprite(BAT, BAT_PALETTE, 66, 1)} />
      </g>
    </Scene>
  );
}

const SDT_NIGHT: SdtColors = {
  palette: HALLOWEEN_ICON_PALETTE,
  inks: [HX.pumpkin, HX.lavender, HX.flame],
  dot: HX.stone,
  center: HX.ghost,
};

/** Autonomy, competence, relatedness: the pixel SDT sprites in night colours. */
export function HalloweenSdtArt({ labels }: { labels: [string, string, string] }) {
  return <PixelSdtArt labels={labels} colors={SDT_NIGHT} />;
}
