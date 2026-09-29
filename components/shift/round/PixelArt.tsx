import { deck, sinkingCert } from "@/components/shift/poster/grid/deckCritters";
import { scaled, weed } from "@/components/shift/poster/grid/bangkokKit";
import { PIXEL_FONT, Rects } from "@/components/shift/poster/pixel/PixelRects";
import { CREW, ICON_PALETTE, SIGNPOST, TROPHY } from "@/components/shift/poster/pixel/pixelIcons";
import { PX, mix, sprite, type Rect } from "@/components/shift/poster/pixel/pixelKit";

/**
 * Pixel versions of the round-page illustrations for SHIFT[1], drawn with
 * the IG grid's kit: certificates sinking through the flood, a live window,
 * and the three SDT sprites. Every SVG's viewBox is in grid cells.
 */

const W = 80;
const H = 56;

function Scene({
  children,
  label,
}: {
  children: React.ReactNode;
  label?: string;
}) {
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-auto w-full max-w-[280px]"
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      {children}
      {label && (
        <text x={W - 2} y={7} textAnchor="end" fontSize="6" fill={PX.cloudShade} style={PIXEL_FONT}>
          {label}
        </text>
      )}
    </svg>
  );
}

/** Paper certificates drifting down into deep water. */
export function PixelCertArt() {
  const water: Rect[] = [
    [0, 22, W, 1, PX.waterLight],
    [0, 23, W, 2, PX.water],
    [0, 25, W, H - 25, PX.waterDeep],
  ];
  return (
    <Scene label="x1,000">
      <Rects rects={water} />
      <Rects rects={sinkingCert(6, 10, 2, 0)} />
      <Rects rects={sinkingCert(34, 24, 2, 0.35)} />
      <Rects rects={sinkingCert(52, 40, 2, 0.6)} />
      <Rects rects={deck.bubbles(30, 22, 4)} />
      <Rects rects={deck.bubbles(66, 38, 3)} />
      <Rects rects={weed(4, H, 12, mix(PX.plant, PX.ink, 0.5))} />
    </Scene>
  );
}

const CURSOR = ["C...", "CC..", "CCC.", "CCCC", "CC..", "..C."];

/** A live window: bars that move, a blinking LIVE light, a real cursor. */
export function PixelLiveArt() {
  const frame: Rect[] = [
    [12, 12, 60, 40, PX.waterDeep],
    [9, 9, 60, 40, PX.cream],
    [11, 15, 56, 32, PX.ink],
    [12, 11, 2, 2, PX.accent],
    [16, 11, 2, 2, PX.accentLight],
    [20, 11, 2, 2, PX.mid],
    [15, 42, 48, 1, PX.mid],
  ];
  const bars: Rect[] = [
    [17, 32, 6, 10, PX.accent],
    [27, 26, 6, 16, PX.waterLight],
    [37, 29, 6, 13, PX.accentLight],
    [47, 20, 6, 22, PX.accent],
  ];
  return (
    <Scene>
      <Rects rects={frame} />
      {bars.map(([x, y, w, h, fill]) => (
        <rect key={x} className="shift-bar" x={x} y={y} width={w} height={h} fill={fill} />
      ))}
      <rect className="shift-blink" x={52} y={11} width={2} height={2} fill={PX.accent} />
      <text x={56} y={13} fontSize="4" fill={PX.ink} style={PIXEL_FONT}>
        LIVE
      </text>
      <g className="shift-float">
        <Rects rects={scaled(sprite(CURSOR, { C: PX.cream }, 0, 0), 58, 34, 2)} />
      </g>
    </Scene>
  );
}

/** Autonomy, competence, relatedness as three sprites joined by a dotted loop. */
export function PixelSdtArt({ labels }: { labels: [string, string, string] }) {
  const spots = [
    { grid: SIGNPOST, x: 34, y: 4, lx: 45, ly: 38 },
    { grid: TROPHY, x: 8, y: 50, lx: 19, ly: 82 },
    { grid: CREW, x: 58, y: 58, lx: 70, ly: 82 },
  ];
  const dots: Rect[] = [];
  const line = (x0: number, y0: number, x1: number, y1: number) => {
    const steps = Math.round(Math.hypot(x1 - x0, y1 - y0) / 4);
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      dots.push([Math.round(x0 + (x1 - x0) * t), Math.round(y0 + (y1 - y0) * t), 1, 1, PX.mid]);
    }
  };
  line(38, 42, 22, 50);
  line(52, 42, 68, 56);
  line(32, 66, 56, 66);
  return (
    <svg
      viewBox="0 0 90 86"
      className="h-auto w-full max-w-[300px]"
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      <Rects rects={dots} />
      <rect x={44} y={56} width={2} height={2} fill={PX.cream} />
      {spots.map((spot, i) => (
        <g key={i} className={["shift-float", "shift-float shift-float-b", "shift-float shift-float-c"][i]}>
          <Rects rects={scaled(sprite(spot.grid, ICON_PALETTE, 0, 0), spot.x, spot.y, 2)} />
        </g>
      ))}
      {spots.map((spot, i) => (
        <text
          key={labels[i]}
          x={spot.lx}
          y={spot.ly}
          textAnchor="middle"
          fontSize="5"
          fill={[PX.accent, PX.waterLight, PX.accentLight][i]}
          style={PIXEL_FONT}
        >
          {labels[i].toUpperCase()}
        </text>
      ))}
    </svg>
  );
}
