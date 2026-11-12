"use client";

import { useEffect, useRef, useState } from "react";

import { cancelRedemption, redeemItem } from "@/app/shift/island/wallet-actions";
import type { MyRedemption, ShopItem, WalletDetail } from "@/lib/supabase/shift-quests/playerTypes";

import { thaiShortDate } from "../copy";
import island from "../island.module.css";
import { coinNumber, SHOP } from "./copy";
import styles from "./player.module.css";

/** A fresh idempotency key for one confirm step (a v4 UUID, as redeemItem expects). */
export function newRequestKey(): string {
  const cryptoApi = typeof globalThis.crypto === "object" ? globalThis.crypto : undefined;
  if (cryptoApi && typeof cryptoApi.randomUUID === "function") return cryptoApi.randomUUID();
  const bytes = new Uint8Array(16);
  if (cryptoApi && typeof cryptoApi.getRandomValues === "function") cryptoApi.getRandomValues(bytes);
  else for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** Why an item cannot be redeemed right now, in Thai, or null when it can. Gates first, then stock, then coins. */
export function lockReason(item: ShopItem, balance: number): string | null {
  switch (item.lock) {
    case "consent":
      return SHOP.lockConsent;
    case "stage":
      return SHOP.lockStage(item.minStage);
    case "community":
      return SHOP.lockCommunity;
  }
  if (!item.inStock) return SHOP.soldOut;
  if (!item.affordable || balance < item.cost) return SHOP.short(coinNumber(Math.max(item.cost - balance, 0)));
  return null;
}

export interface Requirement {
  key: "consent" | "stage" | "community" | "coins";
  text: string;
  met: boolean;
}

/**
 * Everything an item needs, every line at once, each with where the student
 * is now: so a long-term goal (the matcha at stage 5 plus a community quest)
 * shows its whole path, not only the first gate. Unknown progress (an older
 * wallet without stage) falls back to the database's lock reason.
 */
export function requirements(
  item: ShopItem,
  wallet: Pick<WalletDetail, "balance"> & Partial<Pick<WalletDetail, "stage" | "communityDone" | "consentOk">>,
): Requirement[] {
  // The item's own lock (from the database) always counts as not met.
  const list: Requirement[] = [];
  if (item.lock === "consent" || wallet.consentOk === false) list.push({ key: "consent", text: SHOP.needConsent, met: false });
  if (item.minStage > 0 || item.lock === "stage") {
    const stage = wallet.stage ?? (item.lock === "stage" ? 0 : item.minStage);
    list.push({ key: "stage", text: SHOP.needStage(item.minStage, stage), met: stage >= item.minStage && item.lock !== "stage" });
  }
  if (item.requiresCommunity || item.lock === "community") {
    const done = (wallet.communityDone ?? true) && item.lock !== "community";
    list.push({ key: "community", text: SHOP.needCommunity, met: done });
  }
  const short = Math.max(item.cost - wallet.balance, 0);
  list.push({
    key: "coins",
    text: short > 0 ? SHOP.needCoins(coinNumber(item.cost), coinNumber(short)) : SHOP.cost(coinNumber(item.cost)),
    met: short === 0,
  });
  return list;
}

type Message = { tone: "ok" | "error"; text: string } | null;

interface ShopListProps {
  wallet: Pick<WalletDetail, "balance" | "shop"> & Partial<Pick<WalletDetail, "stage" | "communityDone" | "consentOk">>;
  /** Read the wallet again after a redeem or a cancel, whatever the answer. */
  onChanged: () => void;
}

/**
 * The island shop: each item with its price and, when it cannot be redeemed
 * yet, the reason (consent, tree stage, community quest, stock, coins). A
 * confirm step names the item and the cost; its idempotency key is made when
 * the step opens, so a double tap or a retry is one request. Every refusal
 * comes back in Thai from the server. Reservations can be cancelled until
 * staff start on them. Focus follows the confirm step: to "ยืนยันแลก" when it
 * opens, back to the item's "แลก" when it is cancelled.
 */
export function ShopList({ wallet, onChanged }: ShopListProps) {
  const [confirm, setConfirm] = useState<{ itemId: string; key: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<Message>(null);
  const { shop, balance } = wallet;
  const confirmYes = useRef<HTMLButtonElement>(null);
  const redeemButtons = useRef(new Map<string, HTMLButtonElement>());
  /** The item whose "แลก" gets focus back after "ยังไม่แลก". */
  const [refocus, setRefocus] = useState<string | null>(null);

  useEffect(() => {
    if (confirm) confirmYes.current?.focus();
  }, [confirm]);
  useEffect(() => {
    if (!refocus) return;
    redeemButtons.current.get(refocus)?.focus();
    setRefocus(null);
  }, [refocus]);

  async function redeem(item: ShopItem, key: string) {
    setBusy(true);
    setMessage(null);
    try {
      const result = await redeemItem({ itemId: item.id, requestKey: key, expectedCost: item.cost });
      setConfirm(null);
      setMessage(result.ok ? { tone: "ok", text: SHOP.done(item.name) } : { tone: "error", text: result.error });
      onChanged();
    } catch {
      // The same key on a retry: the database answers with the first request if it went through.
      setMessage({ tone: "error", text: SHOP.retryLater });
    } finally {
      setBusy(false);
    }
  }

  async function cancel(redemption: MyRedemption) {
    setBusy(true);
    setMessage(null);
    try {
      const result = await cancelRedemption({ redemptionId: redemption.id });
      if (!result.ok) setMessage({ tone: "error", text: result.error });
      else setMessage(result.data.cancelled ? { tone: "ok", text: SHOP.cancelled } : { tone: "error", text: SHOP.cancelTooLate });
      onChanged();
    } catch {
      setMessage({ tone: "error", text: SHOP.offline });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={styles.section} aria-label={SHOP.heading}>
      <h3 className={island.detailHeading}>{SHOP.heading}</h3>
      {message ? (
        <p className={styles.message} data-tone={message.tone} role={message.tone === "error" ? "alert" : "status"}>
          {message.text}
        </p>
      ) : null}
      {!shop.live ? (
        <p className={island.hint}>{SHOP.closed}</p>
      ) : shop.items.length === 0 ? (
        <p className={island.hint}>{SHOP.empty}</p>
      ) : (
        <ul className={styles.list}>
          {shop.items.map((item) => {
            const reason = lockReason(item, balance);
            const reasonId = `shop-lock-${item.id}`;
            const open = confirm?.itemId === item.id;
            const needs = requirements(item, wallet);
            return (
              <li key={item.id} className={styles.item}>
                <div className={styles.itemHead}>
                  <p className={styles.itemName}>{item.name}</p>
                  <span className={styles.amount}>{SHOP.cost(coinNumber(item.cost))}</span>
                </div>
                {item.description ? <p className={styles.itemText}>{item.description}</p> : null}
                {reason ? (
                  <p id={reasonId} className={styles.lock}>
                    {reason}
                  </p>
                ) : null}
                {/* A gated item shows its whole path at once, not only the first gate left. */}
                {item.lock && item.inStock ? (
                  <ul className={styles.needs} aria-label={SHOP.needsLabel}>
                    {needs.map((need) => (
                      <li key={need.key} className={styles.need} data-met={need.met ? "true" : undefined}>
                        <span className={styles.needMark} aria-hidden="true" />
                        <span>{need.text}</span>
                        <span className="sr-only">{need.met ? SHOP.met : SHOP.notYet}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
                {open && confirm ? (
                  <div className={styles.confirm}>
                    <p>{SHOP.confirm(item.name, coinNumber(item.cost))}</p>
                    <div className={styles.buttons}>
                      <button
                        ref={confirmYes}
                        type="button"
                        className={`ei-button-dawn ${island.primary}`}
                        disabled={busy}
                        onClick={() => redeem(item, confirm.key)}
                      >
                        <span>{busy ? SHOP.redeeming : SHOP.confirmYes}</span>
                      </button>
                      <button
                        type="button"
                        className={island.quietButton}
                        disabled={busy}
                        onClick={() => {
                          setConfirm(null);
                          setRefocus(item.id);
                        }}
                      >
                        {SHOP.confirmNo}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    ref={(node) => {
                      if (node) redeemButtons.current.set(item.id, node);
                      else redeemButtons.current.delete(item.id);
                    }}
                    type="button"
                    className={island.quietButton}
                    disabled={!!reason || busy}
                    aria-label={SHOP.redeemLabel(item.name)}
                    aria-describedby={reason ? reasonId : undefined}
                    onClick={() => {
                      setMessage(null);
                      setConfirm({ itemId: item.id, key: newRequestKey() });
                    }}
                  >
                    {SHOP.redeem}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {shop.mine.length > 0 ? (
        <div className={styles.section}>
          <h4 className={island.detailHeading}>{SHOP.mineHeading}</h4>
          <ul className={styles.list}>
            {shop.mine.map((redemption) => (
              <li key={redemption.id} className={styles.row}>
                <span className={styles.rowText}>
                  <span>{redemption.item}</span>
                  <span className={styles.rowSub}>
                    {SHOP.status[redemption.status]} · {thaiShortDate(redemption.at)} · {SHOP.cost(coinNumber(redemption.cost))}
                  </span>
                </span>
                {redemption.cancellable ? (
                  <button
                    type="button"
                    className={island.quietButton}
                    disabled={busy}
                    aria-label={SHOP.cancelLabel(redemption.item)}
                    onClick={() => cancel(redemption)}
                  >
                    {SHOP.cancel}
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {shop.live && shop.terms ? <p className={styles.terms}>{shop.terms}</p> : null}
    </section>
  );
}
