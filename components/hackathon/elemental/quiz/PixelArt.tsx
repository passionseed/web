import type { ElementKey } from "@/components/hackathon/elemental/media";
import { EL } from "@/components/hackathon/poster/elemental/brand";
import {
  CREST_COLS,
  CREST_ROWS,
  FX_FRAMES,
  FX_OFFSET,
  ICON_EFFECTS,
  ICON_SIZE,
  QUIZ_CRESTS,
  fxFrame,
  fxRuns,
  iconPixels,
  pixelRuns,
  revealCells,
  type FxPixel,
} from "@/lib/hackathon/elemental/quiz-pixels";

import styles from "./quiz.module.css";

/** Screen pixels per art pixel: always a whole number, so every pixel is the same size. */
const whole = (n: number) => Math.max(1, Math.round(n));

/**
 * The crest across the top of a result: the element's corruption hanging in
 * from the top edge, tiled to any width. `cell` screen pixels per art pixel.
 */
export function PixelCrest({ element, cell }: { element: ElementKey; cell: number }) {
  const c = whole(cell);
  const id = `crest-${element}-${c}`;
  return (
    <svg width="100%" height={CREST_ROWS * c} aria-hidden="true" style={{ display: "block" }}>
      <defs>
        <pattern id={id} width={CREST_COLS * c} height={CREST_ROWS * c} patternUnits="userSpaceOnUse">
          <g transform={`scale(${c})`} shapeRendering="crispEdges">
            {pixelRuns(QUIZ_CRESTS[element]).map(([x, y, length, color]) => (
              <rect key={`${x}-${y}`} x={x} y={y} width={length} height={1} fill={color} />
            ))}
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}

/**
 * The icon's 9x9 box is what lays out, so the icon lines up with the text
 * exactly as it always has; the effect spills out round it.
 */
function Stage({ cell, children }: { cell: number; children: React.ReactNode }) {
  const size = ICON_SIZE * whole(cell);
  return (
    <svg width={size} height={size} viewBox={`${FX_OFFSET} ${FX_OFFSET} ${ICON_SIZE} ${ICON_SIZE}`} aria-hidden="true" style={{ display: "block", overflow: "visible" }}>
      {children}
    </svg>
  );
}

function Pixels({ pixels }: { pixels: readonly FxPixel[] }) {
  return (
    <g shapeRendering="crispEdges">
      {fxRuns(pixels).map(([x, y, length, color, alpha]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width={length} height={1} fill={color} fillOpacity={alpha < 1 ? alpha : undefined} />
      ))}
    </g>
  );
}

/** Aether's filters, as on slide 2: a wide soft aura and a closer glow. */
function AetherDefs({ id }: { id: string }) {
  return (
    <defs>
      <filter id={`${id}-aura`} x="-1" y="-1" width="3" height="3">
        <feGaussianBlur stdDeviation="2.2" />
      </filter>
      <filter id={`${id}-glow`} x="-1" y="-1" width="3" height="3">
        <feGaussianBlur stdDeviation="0.9" />
      </filter>
    </defs>
  );
}

function AetherAura({ id }: { id: string }) {
  return <rect x={FX_OFFSET - 1} y={FX_OFFSET - 1} width={ICON_SIZE + 2} height={ICON_SIZE + 2} fill={EL.aetherViolet} opacity={0.35} filter={`url(#${id}-aura)`} />;
}

/** Only aether glows: a soft violet copy of each pixel sits behind the sharp one. */
function AetherGlow({ id, pixels }: { id: string; pixels: readonly FxPixel[] }) {
  return (
    <g filter={`url(#${id}-glow)`}>
      {pixels.map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x - 0.3} y={y - 0.3} width={1.6} height={1.6} fill={EL.aetherViolet} />
      ))}
    </g>
  );
}

/** An effect plays for as many whole loops as fit in 5 s (at least two), then rests on its still: motion that starts by itself stops by itself (WCAG 2.2.2). */
const FX_PLAY_MS = 5000;
export const fxLoops = (element: ElementKey) => Math.max(2, Math.floor(FX_PLAY_MS / (FX_FRAMES * ICON_EFFECTS[element].frameMs)));

/**
 * One element's icon with its effect playing round it: `cell` screen pixels
 * per icon pixel. Each frame is drawn whole and shown for its turn, so the
 * effect moves a whole pixel at a time. After `fxLoops` it rests on the key
 * frame (remount it to play again). With `still`, or for people who turn
 * motion off, it holds the key frame. `id` must be unique on the page.
 */
export function IconFx({ element, cell, id, still = false }: { element: ElementKey; cell: number; id: string; still?: boolean }) {
  const { frameMs } = ICON_EFFECTS[element];
  const aether = element === "aether";
  const loops = fxLoops(element);
  const frames = still ? [0] : Array.from({ length: FX_FRAMES }, (_, n) => n);
  return (
    <Stage cell={cell}>
      {aether && <AetherDefs id={id} />}
      {aether && <AetherAura id={id} />}
      {frames.map((n) => {
        const pixels = fxFrame(element, n);
        // Frame n starts (8 - n) frames into its loop, so it runs that much longer: every frame then ends at
        // the same moment, after `loops` loops, and the key frame (always shown when nothing animates) holds.
        const lead = (FX_FRAMES - n) % FX_FRAMES;
        return (
          <g
            key={n}
            className={still ? undefined : n === 0 ? styles.fxKey : styles.fx}
            style={
              still
                ? undefined
                : { animationDuration: `${FX_FRAMES * frameMs}ms`, animationDelay: `-${lead * frameMs}ms`, animationIterationCount: loops + lead / FX_FRAMES }
            }
          >
            {aether && <AetherGlow id={id} pixels={pixels} />}
            <Pixels pixels={pixels} />
          </g>
        );
      })}
    </Stage>
  );
}

/** The colour an icon flashes as its reveal lands: its own lightest light. */
const FLASH: Record<ElementKey, string> = { fire: EL.flameWhite, earth: EL.cream, water: EL.cream, air: EL.cream, aether: EL.aetherLilac };

/** The icon's silhouette, lit for one frame as the reveal lands. Lay it exactly over the icon. */
export function IconFlash({ element, cell }: { element: ElementKey; cell: number }) {
  return (
    <Stage cell={cell}>
      <g className={styles.flash}>
        <Pixels pixels={iconPixels(element).map(([x, y]): FxPixel => [x, y, FLASH[element], 1])} />
      </g>
    </Stage>
  );
}

/**
 * The icon building itself pixel by pixel, in its element's order (see
 * revealCells). Each pixel pops in whole: no fades, no half pixels.
 */
export function IconAssemble({ element, cell, durationMs, id }: { element: ElementKey; cell: number; durationMs: number; id: string }) {
  const cells = revealCells(element);
  const aether = element === "aether";
  return (
    <Stage cell={cell}>
      {aether && <AetherDefs id={id} />}
      {aether && (
        <g className={styles.glowIn} style={{ animationDelay: `${durationMs}ms` }}>
          <AetherAura id={id} />
          <AetherGlow id={id} pixels={cells} />
        </g>
      )}
      <g shapeRendering="crispEdges">
        {cells.map(([x, y, color, alpha], i) => (
          <rect
            key={`${x}-${y}`}
            x={x}
            y={y}
            width={1}
            height={1}
            fill={color}
            fillOpacity={alpha < 1 ? alpha : undefined}
            className={styles.pixelIn}
            style={{ animationDelay: `${Math.round((i / cells.length) * durationMs)}ms` }}
          />
        ))}
      </g>
    </Stage>
  );
}
