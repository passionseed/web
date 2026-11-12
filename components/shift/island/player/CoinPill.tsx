"use client";

import { PixelIcon } from "@/components/shift/poster/pixel/PixelRects";
import type { CharacterStats } from "@/lib/supabase/shift-quests/playerTypes";

import { PALETTE, WEB_SPRITES } from "../sprites";
import world from "../world.module.css";
import { coinNumber, PLAYER } from "./copy";
import styles from "./player.module.css";

/** Shown while coins are live, or once there is something in the wallet. */
export function showCoinPill(character: CharacterStats | null | undefined): character is CharacterStats {
  return !!character && (character.coins.live || character.coins.balance !== 0);
}

/**
 * Under the HUD chip: the Passioncoin balance as a small glass pill with a
 * pixel coin. A 44px tap area around a 32px pill; opens the wallet.
 */
export function CoinPill({ balance, onOpen }: { balance: number; onOpen: () => void }) {
  const shown = coinNumber(balance);
  return (
    <button type="button" className={styles.coinPill} aria-label={PLAYER.coinPill(shown)} aria-haspopup="dialog" onClick={onOpen}>
      <span className={`${styles.coinFace} ${world.glass}`} aria-hidden="true">
        <PixelIcon grid={WEB_SPRITES.coin} palette={PALETTE} scale={1} />
        <span>{shown}</span>
      </span>
    </button>
  );
}
