"use client";

import { ISLAND_PRIZES_DRAFT } from "@/lib/content/shift-island-economy";
import type { IslandConsent } from "@/lib/supabase/shift-quests/playerTypes";

import { ConsentBanner } from "../consent/ConsentBanner";
import { IslandSheet } from "../IslandSheet";
import { PRIZES_UI } from "./copy";
import styles from "./prizes.module.css";

interface PrizeSheetProps {
  open: boolean;
  onClose: () => void;
  /** null or undefined: consent is not known (the function is missing), so nothing is gated here. */
  consent: IslandConsent | null | undefined;
  /** Opens the consent sheet; without it the consent line shows on its own. */
  onOpenConsent?: () => void;
  /** false: this season gives out no coins, so the coin-only row waits. Unknown (undefined) shows every row. */
  coinsLive?: boolean;
}

/**
 * From the plaza prize board or the menu: the Demo Day prizes, one row each,
 * then the money note (always in view, never folded away) and the judging
 * line. Everything comes from the DRAFT content file. No ranking, no names,
 * no leaderboard. While consent is missing, the consent line and the banner
 * that opens the consent sheet sit at the bottom. While coins are off the
 * Passioncoin prizes are left out and one line says why.
 */
export function PrizeSheet({ open, onClose, consent, onOpenConsent, coinsLive }: PrizeSheetProps) {
  const { judging, moneyNote, consentNote } = ISLAND_PRIZES_DRAFT;
  const coinsOff = coinsLive === false;
  // Coin prizes cannot be paid while awards are off: they wait, and one line says so.
  const prizes = ISLAND_PRIZES_DRAFT.prizes.filter((prize) => !(coinsOff && prize.coins));
  const needsConsent = consent != null && !consent.ok;
  return (
    <IslandSheet
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title={PRIZES_UI.title}
    >
      <div className={styles.stack}>
        <ul className={styles.list} aria-label={PRIZES_UI.list}>
          {prizes.map((prize) => (
            <li key={prize.title} className={styles.row} data-money={prize.money ? "true" : undefined}>
              <span className={styles.emoji} aria-hidden="true">
                {prize.emoji}
              </span>
              <span className={styles.prizeTitle}>{prize.title}</span>
              <span className={styles.reward}>{prize.reward}</span>
            </li>
          ))}
        </ul>
        {coinsOff ? <p className={styles.judging}>{PRIZES_UI.coinsOff}</p> : null}
        <p className={styles.note}>{moneyNote}</p>
        {consent ? <p className={styles.judging}>{PRIZES_UI.selfConfirm(consent.adultAge)}</p> : null}
        <p className={styles.judging}>{judging}</p>
        {needsConsent ? (
          <div className={styles.consent}>
            <p className={styles.consentNote}>{consentNote}</p>
            {onOpenConsent ? <ConsentBanner consent={consent} onOpen={onOpenConsent} compact /> : null}
          </div>
        ) : null}
      </div>
    </IslandSheet>
  );
}
