"use server";

/**
 * The island's wallet and shop: read the viewer's Passioncoin, redeem a shop
 * item, cancel a reservation. Each action re-derives who is asking from the
 * session (the client never sends an actor) and calls exactly one
 * shift_quest_* function through the shared gate (./gate.ts). The database
 * enforces every rule (redemption live, price, stock, balance, tree stage,
 * community quest, consent); refusals come back as Thai text.
 *
 * Only shaped data leaves the server: ledger lines get a Thai label here and
 * lose their ids; shop items keep their id (the redeem call needs it) and
 * nothing else about the catalog.
 */

import { z } from "zod";

import { ECONOMY_RULES_DRAFT, type RuleTarget } from "@/lib/content/shift-island-economy";
import { questApi } from "@/lib/supabase/shift-quests/db";
import type {
  EarnRate,
  MyRedemption,
  RedeemResult,
  ShopItem,
  ShopLock,
  WalletDetail,
  WalletEntry,
} from "@/lib/supabase/shift-quests/playerTypes";
import type { IslandActionResult } from "@/lib/supabase/shift-quests/types";
import { WALLET_LABELS } from "@/components/shift/island/player/copy";

import { withReader, withReadyViewer } from "./gate";

/** loadWallet takes no input; anything a client sends is ignored. */
const noInput = z.unknown().transform(() => null);

const redeemSchema = z.object({
  itemId: z.string().uuid(),
  /** crypto.randomUUID() from when the confirm step opened: a double tap or a retry is the same request. */
  requestKey: z.string().uuid(),
  /** The price the student saw; the database refuses (price_changed) rather than charge another. */
  expectedCost: z.number().int().min(0).max(10_000_000),
});

const cancelSchema = z.object({ redemptionId: z.string().uuid() });

/** At most this many ledger lines reach the sheet. */
const ENTRIES = 10;
const CATEGORY_MAX = 40;

/** The wallet row did not have the shape the database returns. Logged by class name only. */
class WalletShapeError extends Error {
  constructor() {
    super("malformed wallet");
    this.name = "WalletShapeError";
  }
}

type Row = Record<string, unknown>;

const isRow = (value: unknown): value is Row => !!value && typeof value === "object" && !Array.isArray(value);
const rows = (value: unknown): Row[] => (Array.isArray(value) ? value.filter(isRow) : []);

function int(value: unknown, fallback = 0): number {
  const n = typeof value === "number" ? value : typeof value === "string" && value.trim() ? Number(value) : NaN;
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

const text = (value: unknown): string | null => (typeof value === "string" && value.trim() ? value.trim() : null);

/** Rule keys to what they pay for, from the founder's draft; the staff award keys are fixed. */
const RULE_TARGETS: ReadonlyMap<string, RuleTarget> = new Map(ECONOMY_RULES_DRAFT.map((rule) => [rule.key, rule.target]));

function awardLabel(ruleKey: string | null): string {
  if (ruleKey === "taught-next-shift") return WALLET_LABELS.taught;
  if (ruleKey === "helped-most") return WALLET_LABELS.helped;
  switch (ruleKey ? RULE_TARGETS.get(ruleKey) : undefined) {
    case "main":
      return WALLET_LABELS.main;
    case "community":
      return WALLET_LABELS.community;
    case "side":
      return WALLET_LABELS.side;
    default:
      return WALLET_LABELS.award;
  }
}

/** An admin-written award category, one short line. */
function category(value: unknown): string | null {
  const line = text(value)?.replace(/\s+/g, " ");
  return line ? Array.from(line).slice(0, CATEGORY_MAX).join("").trim() : null;
}

/** A Thai line for one ledger entry, from its kind, rule key and recognition category. */
function entryLabel(row: Row): string {
  switch (row.kind) {
    case "award":
      return awardLabel(text(row.rule_key));
    case "recognition": {
      const name = category(row.category);
      return name ? WALLET_LABELS.recognitionIn(name) : WALLET_LABELS.recognition;
    }
    case "reversal":
      return WALLET_LABELS.reversal;
    case "redemption_hold":
      return WALLET_LABELS.hold;
    case "redemption_release":
      return WALLET_LABELS.release;
    default:
      return WALLET_LABELS.other;
  }
}

function toEntry(row: Row): WalletEntry | null {
  const at = text(row.created_at);
  if (!at) return null;
  return { amount: int(row.amount), label: entryLabel(row), title: text(row.title), at };
}

function toRate(value: unknown): EarnRate | null {
  if (!isRow(value)) return null;
  const amount = int(value.amount);
  if (amount <= 0) return null;
  const cap = value.cap == null ? null : int(value.cap, 0);
  return { amount, cap: cap && cap > 0 ? cap : null };
}

const LOCKS: ReadonlySet<string> = new Set(["consent", "stage", "community"]);

/** The database's lock reason, or one worked out from the gates when it only says "locked". */
function lockOf(raw: unknown, item: { minStage: number; requiresCommunity: boolean }, viewer: { stage: number; communityDone: boolean; consentOk: boolean }): ShopLock {
  if (typeof raw === "string" && LOCKS.has(raw)) return raw as ShopLock;
  if (raw !== true) return null;
  if (!viewer.consentOk) return "consent";
  if (viewer.stage < item.minStage) return "stage";
  if (item.requiresCommunity && !viewer.communityDone) return "community";
  return null;
}

function toItem(row: Row, viewer: { balance: number; stage: number; communityDone: boolean; consentOk: boolean }): ShopItem | null {
  const id = text(row.id);
  const name = text(row.name);
  if (!id || !name) return null;
  const cost = Math.max(0, int(row.cost));
  const minStage = Math.min(Math.max(int(row.min_stage), 0), 7);
  const requiresCommunity = row.requires_community === true;
  return {
    id,
    name,
    description: text(row.description),
    cost,
    inStock: row.in_stock === true,
    minStage,
    requiresCommunity,
    lock: lockOf(row.locked, { minStage, requiresCommunity }, viewer),
    affordable: typeof row.affordable === "boolean" ? row.affordable : viewer.balance >= cost,
  };
}

const STATUSES: ReadonlySet<string> = new Set(["reserved", "processing", "completed", "cancelled"]);

function toRedemption(row: Row): MyRedemption | null {
  const id = text(row.id);
  const item = text(row.item);
  const at = text(row.created_at);
  const status = typeof row.status === "string" && STATUSES.has(row.status) ? (row.status as MyRedemption["status"]) : null;
  if (!id || !item || !at || !status) return null;
  return { id, item, cost: Math.max(0, int(row.cost)), status, at, cancellable: status === "reserved" };
}

const present = <T>(value: T | null): value is T => value !== null;

/** shift_quest_wallet's JSON as WalletDetail. Throws WalletShapeError when it is not an object. */
function toWallet(raw: unknown): WalletDetail {
  if (!isRow(raw)) throw new WalletShapeError();
  // Signed: an admin reversal of coins already spent can take the ledger below 0, and the wallet shows the ledger.
  const balance = int(raw.balance);
  const stage = Math.min(Math.max(int(raw.stage), 0), 7);
  const communityDone = raw.community_done === true;
  const consentOk = raw.consent_ok === true;
  const earn = isRow(raw.earn) ? raw.earn : {};
  const shop = isRow(raw.shop) ? raw.shop : {};
  const shopLive = raw.redemption_live === true && shop.live !== false;
  const viewer = { balance, stage, communityDone, consentOk };
  return {
    live: raw.awards_live === true,
    shopLive: raw.redemption_live === true,
    balance,
    reserved: Math.max(0, int(raw.reserved)),
    terms: text(raw.reward_terms),
    earn: {
      main: toRate(earn.main),
      side: toRate(earn.side),
      community: toRate(earn.community),
      taught: toRate(earn.taught),
      helped: toRate(earn.helped),
    },
    entries: rows(raw.entries).map(toEntry).filter(present).slice(0, ENTRIES),
    stage,
    communityDone,
    consentOk,
    shop: {
      live: shopLive,
      terms: text(shop.terms),
      // Nothing is listed unless redemption is live: no unconfirmed availability.
      items: shopLive ? rows(shop.items).map((row) => toItem(row, viewer)).filter(present) : [],
      mine: rows(shop.mine).map(toRedemption).filter(present),
    },
  };
}

/** The viewer's wallet and the shop, read when the wallet sheet opens. Never refreshes the page. */
export async function loadWallet(): Promise<IslandActionResult<WalletDetail>> {
  return withReader("loadWallet", noInput, undefined, async ({ actor }) =>
    toWallet(await questApi().call<unknown>("shift_quest_wallet", actor)),
  );
}

/**
 * Redeem one shop item: the database reserves one unit and its cost under
 * the viewer's lock, after checking consent, tree stage and community quests,
 * and creates the fulfillment request for staff. A repeat of the same
 * request key returns the first answer (duplicate: true). Refusals that mean
 * the sheet is out of date refresh the page (gate.ts STALE_CODES).
 */
export async function redeemItem(input: {
  itemId: string;
  requestKey: string;
  expectedCost: number;
}): Promise<IslandActionResult<RedeemResult>> {
  return withReadyViewer("redeemItem", redeemSchema, input, async ({ actor }, v) => {
    const row = await questApi().call<unknown>("shift_quest_redeem", actor, v.itemId, v.requestKey, v.expectedCost);
    const data = isRow(row) ? row : {};
    return {
      redemptionId: text(data.redemption_id) ?? "",
      status: text(data.status) ?? "reserved",
      duplicate: data.duplicate === true,
      balance: int(data.balance),
    };
  });
}

/** Cancel a reservation before staff start on it: the coins and the stock come back once. */
export async function cancelRedemption(input: { redemptionId: string }): Promise<IslandActionResult<{ cancelled: boolean }>> {
  return withReadyViewer("cancelRedemption", cancelSchema, input, async ({ actor }, v) => {
    const released = await questApi().call<unknown>("shift_quest_redeem_cancel", actor, v.redemptionId);
    return { cancelled: released === true };
  });
}
