"use client";

import { useId, useMemo, useState } from "react";

import { MOTION_SPRITES } from "@/bot/assets/island/motion-sprites";
import { PALETTE as MAP_PALETTE, SPRITES } from "@/bot/assets/island/sprites";
import { PixelIcon } from "@/components/shift/poster/pixel/PixelRects";
import { litKeysOf } from "@/lib/shift-island/live/atlas";
import { SEA_LOOKS, seaLookName, webSprites } from "@/lib/shift-island/live/atmosphere";
import { gradeRgb, rgbHex } from "@/lib/shift-island/live/grade";
import { bangkokPhase, paletteRgb } from "@/lib/shift-island/live/lighting";
import { SHIP_FOAM_AT, SHIP_WATER_SPRITES, SHIP_WATERLINE } from "@/lib/shift-island/live/shipWater";
import type { LightPhase } from "@/lib/shift-island/live/types";
import type { IslandConsent } from "@/lib/supabase/shift-quests/playerTypes";

import { ConsentBanner } from "../consent/ConsentBanner";
import island from "../island.module.css";
import { IslandSheet } from "../IslandSheet";
import { pixelRuns } from "../shipArt";
import { PALETTE, WEB_SPRITES } from "../sprites";
import world from "../world.module.css";
import { coinNumber, SHOP, WALLET } from "./copy";
import styles from "./player.module.css";
import shop from "./shop.module.css";
import { ShopList } from "./ShopList";
import { useWallet } from "./useWallet";

/**
 * The sea under the ship, as rects for an SVG pattern: four of the map's
 * open-sea looks two by two (atmosphere.ts SEA_LOOKS), so the ripples never
 * line up in rows behind it.
 */
const SEA_GRID: string[] = (() => {
  const all = webSprites();
  const look = (n: number) => all[seaLookName("water_a", n % SEA_LOOKS, 0)] ?? SPRITES.water_a;
  const [a, b, c, d] = [0, 1, 2, 3].map(look);
  return [...a.map((row, y) => row + b[y]), ...c.map((row, y) => row + d[y])];
})();
const SEA_RUNS = pixelRuns(SEA_GRID);
/** CSS px per native pixel on the deck: the ship at 3x reads as the map's ship, close up. */
const DECK_SCALE = 3;

/** The palette key the harbour paints the hull's shade on the water with (not one of the map's). */
export const SHADE_KEY = "q";

/** Where the hull's shade lies on the water, per row from the waterline down: [first, last] sprite columns, narrowing. */
const SHADE_ROWS: readonly (readonly [number, number])[] = [
  [8, 57],
  [10, 55],
  [14, 51],
];

/**
 * A ship frame in the water, as the map draws it (shipWater.ts): the foam
 * over the hull's last plank and the water under it, so the hull sits in
 * the sea, and the hull's shade on the water (SHADE_KEY) under the lap.
 */
export function withFoam(ship: readonly string[], foam: readonly string[]): string[] {
  return ship.map((row, j) => {
    const lap = foam[j - SHIP_FOAM_AT.y];
    const shade = SHADE_ROWS[j - SHIP_WATERLINE];
    return [...row]
      .map((ch, i) => {
        const water = lap?.[i - SHIP_FOAM_AT.x];
        if (water && water !== ".") return water;
        if (ch !== ".") return ch;
        return shade && i >= shade[0] && i <= shade[1] ? SHADE_KEY : ".";
      })
      .join("");
  });
}

/** The hull's shade on the harbour's water: the sea, deepened toward the hour's shadow ink (fx.ts SHADOW_INK). */
function shadeOf(sea: string, phase: LightPhase): string {
  const ink: readonly [number, number, number] = phase === "night" ? [4, 8, 32] : phase === "dusk" ? [84, 40, 114] : phase === "dawn" ? [58, 62, 150] : [30, 60, 124];
  const rgb = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i.exec(sea);
  if (!rgb) return sea;
  const mixed = [1, 2, 3].map((k, i) => Math.round(parseInt(rgb[k], 16) * 0.5 + ink[i] * 0.5)) as [number, number, number];
  return rgbHex(mixed);
}

/** The ship at rest and dipped, each with its own lap of foam. */
const SHIP_A = withFoam(MOTION_SPRITES.merchant_ship_0, SHIP_WATER_SPRITES.ship_foam_0);
const SHIP_B = withFoam(MOTION_SPRITES.merchant_ship_1, SHIP_WATER_SPRITES.ship_foam_1);

/**
 * The map's palette in an hour's light (grade.ts, as the island draws it),
 * with `lit` keys left as they are: the ship's lantern, portholes and coin
 * glow after dark, as on the map.
 */
export function hourPalette(phase: LightPhase, lit = ""): Record<string, string> {
  if (phase === "day") return MAP_PALETTE;
  const out: Record<string, string> = {};
  for (const key of Object.keys(MAP_PALETTE)) {
    const rgb = paletteRgb(key);
    out[key] = rgb && !lit.includes(key) ? rgbHex(gradeRgb(rgb, phase)) : MAP_PALETTE[key];
  }
  return out;
}

/** The open sea behind the ship: the island's own water tile, tiled at the deck's scale. */
function Sea({ palette }: { palette: Record<string, string> }) {
  const id = useId();
  const tile = SEA_GRID.length * DECK_SCALE;
  return (
    <svg className={shop.sea} aria-hidden="true" shapeRendering="crispEdges">
      <defs>
        <pattern id={id} width={tile} height={tile} patternUnits="userSpaceOnUse">
          <g transform={`scale(${DECK_SCALE})`}>
            {SEA_RUNS.map((run, i) => (
              <rect key={i} x={run.x} y={run.y} width={run.w} height={1} fill={palette[run.key]} />
            ))}
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}

/**
 * The ship moored at the top of the shop, through a wooden window frame,
 * rocking on two frames (the map's own sprite, the foam lapping at its hull),
 * with the student's coins on a framed plank beside it, in the hour's light
 * like the island behind the sheet. Still under reduced motion
 * (shop.module.css).
 */
export function Harbour({ balance, phase = "day" }: { balance: number | null; phase?: LightPhase }) {
  const sea = useMemo(() => hourPalette(phase), [phase]);
  const ship = useMemo(() => ({ ...hourPalette(phase, litKeysOf("merchant_ship_0")), [SHADE_KEY]: shadeOf(sea.w, phase) }), [phase, sea]);
  return (
    <div className={shop.harbour} style={{ backgroundColor: sea.w }}>
      <Sea palette={sea} />
      <span className={shop.ship} aria-hidden="true">
        <PixelIcon grid={SHIP_A} palette={ship} scale={DECK_SCALE} className={shop.shipA} />
        <PixelIcon grid={SHIP_B} palette={ship} scale={DECK_SCALE} className={shop.shipB} />
      </span>
      {balance != null ? (
        <p className={`${shop.board} ${shop.purse}`}>
          <span className={shop.purseLabel}>{SHOP.balance}</span>
          <span className={shop.purseValue}>
            <PixelIcon grid={WEB_SPRITES.coin} palette={PALETTE} scale={1} className={shop.coin} />
            <span>{coinNumber(balance)}</span>
          </span>
        </p>
      ) : null}
    </div>
  );
}

/**
 * Bangkok's hour when the sheet opened, as the island reads it, kept while
 * it closes: the drawer and the dialog keep their content through the close
 * animation, so the harbour stays in the light it opened in, never a flash
 * of day over a night island.
 */
export function useOpenedHour(open: boolean): LightPhase {
  const opened = useMemo(() => (open ? bangkokPhase(Date.now()) : null), [open]);
  const [last, setLast] = useState<LightPhase>("day");
  if (opened && opened !== last) setLast(opened);
  return opened ?? last;
}

interface ShopSheetProps {
  open: boolean;
  onClose: () => void;
  /** null or undefined: consent is not known, so nothing is gated in the UI (the database still is). */
  consent?: IslandConsent | null;
  onOpenConsent: () => void;
  /** Opens the wallet: how coins are earned and the latest lines. */
  onOpenWallet: () => void;
}

/**
 * "เรือสินค้า": the island shop, a merchant ship moored off the coast. Opened
 * by tapping the ship on the map or from the menu. Reads the wallet when it
 * opens (useWallet) and again after a redeem or a cancel.
 */
export function ShopSheet({ open, onClose, consent, onOpenConsent, onOpenWallet }: ShopSheetProps) {
  const { state, reload } = useWallet(open);
  const phase = useOpenedHour(open);
  return (
    <IslandSheet
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title={SHOP.shipTitle}
      description={SHOP.shipLine}
    >
      <div className={`${world.sheetStack} ${shop.deck}`}>
        <Harbour balance={state.status === "ready" ? state.data.balance : null} phase={phase} />
        {state.status === "loading" ? (
          <p className={island.quiet} role="status" aria-busy="true">
            {WALLET.loading}
          </p>
        ) : state.status === "error" ? (
          <div className={styles.section}>
            <p className={styles.message} data-tone="error" role="alert">
              {state.error}
            </p>
            <button type="button" className={island.quietButton} onClick={reload}>
              {WALLET.retry}
            </button>
          </div>
        ) : (
          <>
            {state.data.reserved > 0 ? <p className={island.hint}>{WALLET.reserved(coinNumber(state.data.reserved))}</p> : null}
            {consent && !consent.ok ? <ConsentBanner consent={consent} onOpen={onOpenConsent} compact /> : null}
            <ShopList wallet={state.data} onChanged={reload} />
            <button type="button" className={island.linkButton} aria-haspopup="dialog" onClick={onOpenWallet}>
              {SHOP.toWallet}
            </button>
          </>
        )}
      </div>
    </IslandSheet>
  );
}
