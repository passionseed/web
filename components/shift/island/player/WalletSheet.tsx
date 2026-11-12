"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { PixelIcon } from "@/components/shift/poster/pixel/PixelRects";
import { loadWallet } from "@/app/shift/island/wallet-actions";
import type { EarnRate, IslandConsent, WalletDetail } from "@/lib/supabase/shift-quests/playerTypes";

import { ConsentBanner } from "../consent/ConsentBanner";
import { thaiShortDate } from "../copy";
import island from "../island.module.css";
import { IslandSheet } from "../IslandSheet";
import { PALETTE, WEB_SPRITES } from "../sprites";
import world from "../world.module.css";
import { coinNumber, WALLET } from "./copy";
import styles from "./player.module.css";
import { ShopList } from "./ShopList";

type WalletState = { status: "loading" } | { status: "error"; error: string } | { status: "ready"; data: WalletDetail };

/**
 * The wallet, read when the sheet opens (and again after a redeem or a
 * cancel), never with the page. A newer read drops an older answer, and
 * nothing lands after unmount. While a read runs, the last answer stays.
 */
function useWallet(open: boolean): { state: WalletState; reload: () => void } {
  const [state, setState] = useState<WalletState>({ status: "loading" });
  const round = useRef(0);
  const reload = useCallback(() => {
    const mine = ++round.current;
    loadWallet().then(
      (result) => {
        if (mine !== round.current) return;
        setState(result.ok ? { status: "ready", data: result.data } : { status: "error", error: result.error });
      },
      () => {
        if (mine === round.current) setState({ status: "error", error: WALLET.error });
      },
    );
  }, []);
  useEffect(() => {
    if (open) reload();
  }, [open, reload]);
  useEffect(
    () => () => {
      round.current++;
    },
    [],
  );
  return { state, reload };
}

interface WalletSheetProps {
  open: boolean;
  onClose: () => void;
  /** null or undefined: consent is not known, so nothing is gated in the UI (the database still is). */
  consent?: IslandConsent | null;
  onOpenConsent: () => void;
}

/**
 * "กระเป๋า Passioncoin": the balance, how coins are earned (approved work and
 * community value, never hours), the latest ledger lines and the shop.
 */
export function WalletSheet({ open, onClose, consent, onOpenConsent }: WalletSheetProps) {
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
          <WalletBody wallet={state.data} consent={consent} onOpenConsent={onOpenConsent} onChanged={reload} />
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

function WalletBody({
  wallet,
  consent,
  onOpenConsent,
  onChanged,
}: {
  wallet: WalletDetail;
  consent?: IslandConsent | null;
  onOpenConsent: () => void;
  onChanged: () => void;
}) {
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

      {consent && !consent.ok ? <ConsentBanner consent={consent} onOpen={onOpenConsent} compact /> : null}
      <ShopList wallet={wallet} onChanged={onChanged} />
    </>
  );
}
