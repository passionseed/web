"use client";

import { useState } from "react";

import { PixelIcon } from "@/components/shift/poster/pixel/PixelRects";
import type { EarnRate, WalletDetail } from "@/lib/supabase/shift-quests/playerTypes";

import { thaiShortDate } from "../copy";
import island from "../island.module.css";
import { IslandSheet } from "../IslandSheet";
import { PALETTE, WEB_SPRITES } from "../sprites";
import world from "../world.module.css";
import { coinNumber, SHOP, WALLET } from "./copy";
import styles from "./player.module.css";
import { useWallet } from "./useWallet";

interface WalletSheetProps {
  open: boolean;
  onClose: () => void;
  /** Opens the shop (the merchant ship's sheet). */
  onOpenShop: () => void;
}

/**
 * "กระเป๋า Passioncoin": the balance, how coins are earned (approved work and
 * community value, never hours), the latest ledger lines, and the way to the
 * shop (the merchant ship, ShopSheet).
 */
export function WalletSheet({ open, onClose, onOpenShop }: WalletSheetProps) {
  const { state, reload } = useWallet(open);
  return (
    <IslandSheet
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title={WALLET.title}
    >
      <div className={world.sheetStack}>
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
          <WalletBody wallet={state.data} onOpenShop={onOpenShop} />
        )}
      </div>
    </IslandSheet>
  );
}

const EARN_LINES: { key: keyof WalletDetail["earn"]; line: (n: string) => string }[] = [
  { key: "main", line: WALLET.earnMain },
  { key: "side", line: WALLET.earnSide },
  { key: "community", line: WALLET.earnCommunity },
  { key: "taught", line: WALLET.earnTaught },
  { key: "helped", line: WALLET.earnHelped },
];

function signed(amount: number): string {
  return amount < 0 ? `-${coinNumber(-amount)}` : `+${coinNumber(amount)}`;
}

/** The newest entries shown before "ดูทั้งหมด". */
const RECENT_FIRST = 3;

function WalletBody({ wallet, onOpenShop }: { wallet: WalletDetail; onOpenShop: () => void }) {
  const rates = EARN_LINES.map(({ key, line }) => ({ key, line, rate: wallet.earn[key] })).filter(
    (row): row is { key: keyof WalletDetail["earn"]; line: (n: string) => string; rate: EarnRate } => row.rate != null,
  );
  const [allEntries, setAllEntries] = useState(false);
  const entries = allEntries ? wallet.entries : wallet.entries.slice(0, RECENT_FIRST);
  return (
    <>
      <section className={styles.balance} aria-label={WALLET.balance}>
        <p className={island.hint}>{WALLET.balance}</p>
        <p className={styles.balanceValue}>
          <PixelIcon grid={WEB_SPRITES.coin} palette={PALETTE} scale={2} />
          <span>{coinNumber(wallet.balance)}</span>
        </p>
        {wallet.reserved > 0 ? <p className={island.hint}>{WALLET.reserved(coinNumber(wallet.reserved))}</p> : null}
        {!wallet.live ? <p className={island.quiet}>{WALLET.off}</p> : null}
      </section>

      <button type="button" className={`ei-button-dawn ${island.primary}`} aria-haspopup="dialog" onClick={onOpenShop}>
        <span>{SHOP.toShip}</span>
      </button>

      <section className={styles.section} aria-label={WALLET.earnHeading}>
        <h3 className={island.detailHeading}>{WALLET.earnHeading}</h3>
        {rates.length > 0 ? (
          <ul className={styles.list}>
            {rates.map(({ key, line, rate }) => (
              <li key={key} className={styles.row}>
                <span className={styles.rowText}>
                  <span>{line(coinNumber(rate.amount))}</span>
                  {rate.cap ? <span className={styles.rowSub}>{WALLET.cap(rate.cap)}</span> : null}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
        <p className={island.hint}>{WALLET.notHours}</p>
        {wallet.terms ? (
          <details>
            <summary className={island.linkButton}>{WALLET.termsHeading}</summary>
            <p className={styles.terms}>{wallet.terms}</p>
          </details>
        ) : null}
      </section>

      <section className={styles.section} aria-label={WALLET.recentHeading}>
        <h3 className={island.detailHeading}>{WALLET.recentHeading}</h3>
        {wallet.entries.length === 0 ? (
          <p className={island.hint}>{WALLET.recentEmpty}</p>
        ) : (
          <ul className={styles.list}>
            {entries.map((entry, i) => (
              // Entries carry no ids (by design); their order is the key.
              <li key={i} className={styles.row}>
                <span className={styles.rowText}>
                  <span>{entry.label}</span>
                  <span className={styles.rowSub}>{entry.title ? `${entry.title} · ${thaiShortDate(entry.at)}` : thaiShortDate(entry.at)}</span>
                </span>
                <span className={styles.amount} data-sign={entry.amount < 0 ? "minus" : "plus"}>
                  {signed(entry.amount)}
                </span>
              </li>
            ))}
          </ul>
        )}
        {!allEntries && wallet.entries.length > RECENT_FIRST ? (
          <button type="button" className={island.linkButton} onClick={() => setAllEntries(true)}>
            {WALLET.recentMore(wallet.entries.length)}
          </button>
        ) : null}
      </section>

    </>
  );
}
