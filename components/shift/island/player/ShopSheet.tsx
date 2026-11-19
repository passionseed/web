"use client";

import { useId, useMemo } from "react";

import { MOTION_SPRITES } from "@/bot/assets/island/motion-sprites";
import { PALETTE as MAP_PALETTE, SPRITES } from "@/bot/assets/island/sprites";
import { PixelIcon } from "@/components/shift/poster/pixel/PixelRects";
import { litKeysOf } from "@/lib/shift-island/live/atlas";
import { gradeRgb, rgbHex } from "@/lib/shift-island/live/grade";
import { bangkokPhase, paletteRgb } from "@/lib/shift-island/live/lighting";
import { SHIP_FOAM_AT, SHIP_WATER_SPRITES } from "@/lib/shift-island/live/shipWater";
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

/** The sea tile, as rects for an SVG pattern (one tile, repeated under the ship). */
const SEA_RUNS = pixelRuns(SPRITES.water_a);
/** CSS px per native pixel on the deck: the ship at 3x reads as the map's ship, close up. */
const DECK_SCALE = 3;

/** A ship frame with the water lapping at its hull laid under it, as the map draws it (shipWater.ts). */
export function withFoam(ship: readonly string[], foam: readonly string[]): string[] {
  return ship.map((row, j) => {
    const lap = foam[j - SHIP_FOAM_AT.y];
    if (!lap) return row;
    return [...row].map((ch, i) => (ch === "." ? (lap[i - SHIP_FOAM_AT.x] ?? ".") : ch)).join("");
  });
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
  const tile = 16 * DECK_SCALE;
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
  const ship = useMemo(() => hourPalette(phase, litKeysOf("merchant_ship_0")), [phase]);
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
  // Bangkok's hour when the sheet opens, as the island reads it.
  const phase = useMemo(() => (open ? bangkokPhase(Date.now()) : "day"), [open]);
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
