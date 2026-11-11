/**
 * Shapes the island reads for the player round: consent, character stats,
 * wallet and shop, and the AI island news. Types and two constants only, so
 * client components can import them without pulling in server code. The
 * database functions behind them live in
 * supabase/migrations/20261111095000_shift_quest_player.sql.
 */

export type ConsentState = "none" | "waiting" | "granted" | "declined" | "withdrawn";
export type ConsentBasis = "parent" | "adult" | "shift_parent" | "shift_adult";

export interface IslandConsent {
  /** settings.consent_required */
  required: boolean;
  /** "none" when there is no row yet. */
  state: ConsentState;
  basis: ConsentBasis | null;
  /** !required || state === "granted" */
  ok: boolean;
  /**
   * AI island news allowed: a granted row on the island's adult basis, or a
   * parent who ticked the island's AI line. Never from the kill switch and
   * never from a SHIFT import (SHIFT's AI tick covers a different use).
   */
  ai: boolean;
  /** ISO: while a parent link is out (state "waiting", or "granted" with an AI-line link). */
  linkExpiresAt: string | null;
  /** settings.consent_adult_age (default 20). */
  adultAge: number;
  /** A parent declined or withdrew: no new link and no self-confirmation until staff reset it. */
  parentSaidNo: boolean;
}

export interface WalletSummary {
  /** Awards are live. */
  live: boolean;
  /** Redemption is live. */
  shopLive: boolean;
  /** The ledger sum, signed: an admin reversal of coins already spent can make it negative. */
  balance: number;
  reserved: number;
}

export interface CharacterStats {
  /** 0..7, the project's tree stage, shown as the level. */
  stage: number;
  /** team = stage; mine = distinct milestones 1..7 where the viewer is a confirmed contributor of an approved submission. */
  main: { team: number; mine: number };
  /** team = distinct approved side slugs in the project plus own approved proposed; mine = approved side or proposed instances the viewer contributed to. */
  side: { team: number; mine: number };
  /** milestones = 0..2 (milestones 6, 7 approved in the project); mine = the viewer's approved contributions on milestone 6 or 7, repeats count; thanks = accepted peer recognitions received plus admin recognitions. */
  community: { milestones: number; mine: number; thanks: number };
  /** daysActive = distinct Bangkok days with a tap or note; thisWeek = 0..7 in the Monday-start Bangkok week; run = rest-tolerant run, frozen in rest mode (see the database). */
  checkins: { daysActive: number; thisWeek: number; run: number };
  coins: WalletSummary;
}

export type ShopLock = "consent" | "stage" | "community" | null;

export interface ShopItem {
  id: string;
  name: string;
  description: string | null;
  cost: number;
  inStock: boolean;
  minStage: number;
  requiresCommunity: boolean;
  lock: ShopLock;
  affordable: boolean;
}

export interface WalletEntry {
  amount: number;
  /** Thai, mapped server-side from kind, rule_key and category. */
  label: string;
  title: string | null;
  at: string;
}

export interface EarnRate {
  amount: number;
  cap: number | null;
}

export interface MyRedemption {
  id: string;
  item: string;
  cost: number;
  status: "reserved" | "processing" | "completed" | "cancelled";
  at: string;
  cancellable: boolean;
}

export interface WalletDetail {
  live: boolean;
  shopLive: boolean;
  balance: number;
  reserved: number;
  /** reward_terms */
  terms: string | null;
  earn: {
    main: EarnRate | null;
    side: EarnRate | null;
    community: EarnRate | null;
    taught: EarnRate | null;
    helped: EarnRate | null;
  };
  /** At most 10, newest first, no ledger ids. */
  entries: WalletEntry[];
  stage: number;
  communityDone: boolean;
  consentOk: boolean;
  shop: { live: boolean; terms: string | null; items: ShopItem[]; mine: MyRedemption[] };
}

export interface RedeemResult {
  redemptionId: string;
  status: string;
  duplicate: boolean;
  balance: number;
}

export interface NewsEntry {
  summary: string | null;
  noUpdate: boolean;
  at: string;
  /** YYYY-MM-DD (Bangkok): the day the summary is for; a week recap's is the Sunday it ends on. Null from an older database. */
  day: string | null;
}

export interface TeamNews {
  slot: number;
  name: string;
  day: NewsEntry | null;
  week: NewsEntry | null;
}

export interface IslandNews {
  enabled: boolean;
  /** YYYY-MM-DD, Bangkok. */
  day: string;
  /** Monday YYYY-MM-DD of the latest week recap. */
  weekOf: string | null;
  teams: TeamNews[];
  /** Staff viewers only. */
  hidden?: { slot: number; name: string }[];
}

export const ISLAND_CONSENT_VERSION = "island-2026-11-11";
export const STAFF_AWARD_KEYS = ["taught-next-shift", "helped-most"] as const;
