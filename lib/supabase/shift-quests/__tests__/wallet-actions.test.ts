/** @jest-environment node */
import { QuestDbError, QuestError } from "@/bot/src/quests/api";
import { WALLET_LABELS } from "@/components/shift/island/player/copy";
import { questErrorText } from "@/lib/supabase/shift-quests/errors";

const call = jest.fn();
const resolveIslandViewer = jest.fn();
const refresh = jest.fn();

jest.mock("next/cache", () => ({ refresh: () => refresh() }));
jest.mock("@/lib/supabase/shift-quests/db", () => ({
  questApi: () => ({ call, rows: jest.fn() }),
}));
jest.mock("@/lib/supabase/shift-quests/viewer", () => ({
  resolveIslandViewer: () => resolveIslandViewer(),
}));

import { cancelRedemption, loadWallet, redeemItem } from "@/app/shift/island/wallet-actions";

const ACTOR = "123456789012345678";
const USER = "0b7f4a52-5c1e-4c9b-9f27-6f0f3c1d2e3a";
const me = { name: "Mint", avatarUrl: null, staff: false };
const ready = { state: "ready", me, actor: ACTOR, userId: USER, session: { onboarded: true, roles: [], unread: 0 } };

const STICKER = "11111111-1111-4111-8111-000000000001";
const MATCHA = "11111111-1111-4111-8111-000000000002";
const SHIRT = "11111111-1111-4111-8111-000000000003";
const HELD = "22222222-2222-4222-8222-000000000001";
const LEDGER_ID = "33333333-3333-4333-8333-000000000001";
const KEY = "44444444-4444-4444-8444-000000000001";

const entry = (over: Record<string, unknown>) => ({
  id: LEDGER_ID,
  member_id: "m1",
  amount: 300,
  kind: "award",
  title: null,
  rule_key: null,
  category: null,
  created_at: "2026-11-11T08:00:00Z",
  ...over,
});

/** shift_quest_wallet's answer for a student at tree stage 3 with no community quest yet. */
const WALLET_ROW = {
  awards_live: true,
  redemption_live: true,
  balance: 2600,
  reserved: 300,
  reward_terms: "coin มาจากงานที่ผ่านการตรวจ",
  entries: [
    entry({ amount: 300, rule_key: "main-quest", title: "ตั้งชื่อปัญหา" }),
    entry({ amount: 500, rule_key: "community-quest", title: "ช่วยเพื่อนอีกทีม" }),
    entry({ amount: 100, rule_key: "side-quest", title: "ทำโปสเตอร์" }),
    entry({ amount: 3000, rule_key: "taught-next-shift" }),
    entry({ amount: 1000, rule_key: "helped-most" }),
    entry({ amount: 200, rule_key: "some-new-rule" }),
    entry({ amount: 50, kind: "recognition", category: "  ช่วยเพื่อน\nเรื่องโค้ด  " }),
    entry({ amount: 50, kind: "recognition" }),
    entry({ amount: -300, kind: "redemption_hold" }),
    entry({ amount: 300, kind: "redemption_release" }),
    entry({ amount: -100, kind: "reversal" }),
  ],
  earn: {
    main: { amount: 300, cap: 5 },
    side: { amount: 100, cap: 11 },
    community: { amount: 500, cap: 4 },
    taught: null,
    helped: { amount: 1000, cap: null },
  },
  stage: 3,
  community_done: false,
  consent_ok: true,
  shop: {
    live: true,
    terms: "ของจะส่งภายใน 2 สัปดาห์",
    items: [
      { id: STICKER, name: "สติกเกอร์ SHIFT High", description: "สติกเกอร์", cost: 300, in_stock: true, min_stage: 0, requires_community: false, locked: null, affordable: true },
      { id: MATCHA, name: "มัทฉะ", description: null, cost: 8000, in_stock: true, min_stage: 5, requires_community: true, locked: "stage", affordable: false },
      { id: SHIRT, name: "เสื้อ PassionSeed", description: null, cost: 12000, in_stock: false, min_stage: 6, requires_community: true, locked: "stage", affordable: false },
    ],
    mine: [
      { id: HELD, item: "สติกเกอร์ SHIFT High", cost: 300, status: "reserved", created_at: "2026-11-11T09:00:00Z" },
      { id: "22222222-2222-4222-8222-000000000002", item: "สติกเกอร์ SHIFT High", cost: 300, status: "completed", created_at: "2026-11-10T09:00:00Z" },
    ],
  },
};

beforeEach(() => {
  call.mockReset();
  refresh.mockReset();
  resolveIslandViewer.mockReset().mockResolvedValue(ready);
  jest.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => jest.restoreAllMocks());

describe("loadWallet", () => {
  it("reads the wallet for the viewer from the session, never refreshing the page", async () => {
    call.mockResolvedValue(WALLET_ROW);
    const result = await loadWallet();
    expect(call).toHaveBeenCalledWith("shift_quest_wallet", ACTOR);
    expect(refresh).not.toHaveBeenCalled();
    if (!result.ok) throw new Error(result.error);
    const wallet = result.data;
    expect(wallet).toMatchObject({
      live: true,
      shopLive: true,
      balance: 2600,
      reserved: 300,
      terms: "coin มาจากงานที่ผ่านการตรวจ",
      stage: 3,
      communityDone: false,
      consentOk: true,
      earn: {
        main: { amount: 300, cap: 5 },
        side: { amount: 100, cap: 11 },
        community: { amount: 500, cap: 4 },
        taught: null,
        helped: { amount: 1000, cap: null },
      },
    });
    expect(wallet.shop.terms).toBe("ของจะส่งภายใน 2 สัปดาห์");
  });

  it("labels each ledger line in Thai on the server, at most 10, without ids", async () => {
    call.mockResolvedValue(WALLET_ROW);
    const result = await loadWallet();
    if (!result.ok) throw new Error(result.error);
    expect(result.data.entries.map((e) => [e.amount, e.label, e.title])).toEqual([
      [300, WALLET_LABELS.main, "ตั้งชื่อปัญหา"],
      [500, WALLET_LABELS.community, "ช่วยเพื่อนอีกทีม"],
      [100, WALLET_LABELS.side, "ทำโปสเตอร์"],
      [3000, WALLET_LABELS.taught, null],
      [1000, WALLET_LABELS.helped, null],
      [200, WALLET_LABELS.award, null],
      // The admin's category, on one line.
      [50, WALLET_LABELS.recognitionIn("ช่วยเพื่อน เรื่องโค้ด"), null],
      [50, WALLET_LABELS.recognition, null],
      [-300, WALLET_LABELS.hold, null],
      [300, WALLET_LABELS.release, null],
    ]);
    const json = JSON.stringify(result.data.entries);
    for (const secret of [LEDGER_ID, "m1", "main-quest", "rule_key", ACTOR]) expect(json).not.toContain(secret);
  });

  it("keeps each shop item's id for redeeming, its gates and the lock reason", async () => {
    call.mockResolvedValue(WALLET_ROW);
    const result = await loadWallet();
    if (!result.ok) throw new Error(result.error);
    expect(result.data.shop.items).toEqual([
      { id: STICKER, name: "สติกเกอร์ SHIFT High", description: "สติกเกอร์", cost: 300, inStock: true, minStage: 0, requiresCommunity: false, lock: null, affordable: true },
      { id: MATCHA, name: "มัทฉะ", description: null, cost: 8000, inStock: true, minStage: 5, requiresCommunity: true, lock: "stage", affordable: false },
      { id: SHIRT, name: "เสื้อ PassionSeed", description: null, cost: 12000, inStock: false, minStage: 6, requiresCommunity: true, lock: "stage", affordable: false },
    ]);
    expect(result.data.shop.mine).toEqual([
      { id: HELD, item: "สติกเกอร์ SHIFT High", cost: 300, status: "reserved", at: "2026-11-11T09:00:00Z", cancellable: true },
      { id: "22222222-2222-4222-8222-000000000002", item: "สติกเกอร์ SHIFT High", cost: 300, status: "completed", at: "2026-11-10T09:00:00Z", cancellable: false },
    ]);
  });

  it("works out the lock in the database's order when it only says locked", async () => {
    const item = { id: MATCHA, name: "มัทฉะ", cost: 8000, in_stock: true, min_stage: 5, requires_community: true, locked: true };
    const read = async (over: Record<string, unknown>) => {
      call.mockResolvedValue({ ...WALLET_ROW, ...over, shop: { ...WALLET_ROW.shop, items: [item] } });
      const result = await loadWallet();
      if (!result.ok) throw new Error(result.error);
      return result.data.shop.items[0].lock;
    };
    expect(await read({ consent_ok: false, stage: 7, community_done: true })).toBe("consent");
    expect(await read({ consent_ok: true, stage: 4, community_done: true })).toBe("stage");
    expect(await read({ consent_ok: true, stage: 5, community_done: false })).toBe("community");
  });

  it("lists no items while redemption is paused, and says coins are off", async () => {
    call.mockResolvedValue({ ...WALLET_ROW, awards_live: false, redemption_live: false });
    const result = await loadWallet();
    if (!result.ok) throw new Error(result.error);
    expect(result.data.live).toBe(false);
    expect(result.data.shop.live).toBe(false);
    expect(result.data.shop.items).toEqual([]);
    // What was already redeemed stays visible.
    expect(result.data.shop.mine).toHaveLength(2);
  });

  it.each([
    ["a refusal", new QuestError("not_started"), "not_started"],
    ["the function missing", new QuestDbError("shift_quest_wallet", "42883"), "unknown"],
    ["a malformed answer", "not an object", "unknown"],
  ])("maps %s to Thai without refreshing", async (_label, failure, code) => {
    call.mockImplementation(async () => {
      if (failure instanceof Error) throw failure;
      return failure;
    });
    await expect(loadWallet()).resolves.toEqual({ ok: false, code, error: questErrorText(code) });
    expect(refresh).not.toHaveBeenCalled();
  });

  it("refuses a viewer who is not ready, before touching the database", async () => {
    resolveIslandViewer.mockResolvedValue({ state: "signed_out" });
    await expect(loadWallet()).resolves.toMatchObject({ ok: false, code: "signed_out" });
    expect(call).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
  });
});

describe("redeemItem", () => {
  const input = { itemId: STICKER, requestKey: KEY, expectedCost: 300 };

  it("redeems with the request key and the price the student saw, then refreshes", async () => {
    call.mockResolvedValue({ redemption_id: HELD, status: "reserved", duplicate: false, balance: 2300 });
    await expect(redeemItem(input)).resolves.toEqual({
      ok: true,
      data: { redemptionId: HELD, status: "reserved", duplicate: false, balance: 2300 },
    });
    expect(call).toHaveBeenCalledWith("shift_quest_redeem", ACTOR, STICKER, KEY, 300);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("answers a repeat of the same key with the first request", async () => {
    call.mockResolvedValue({ redemption_id: HELD, status: "reserved", duplicate: true, balance: 2300 });
    await expect(redeemItem(input)).resolves.toMatchObject({ ok: true, data: { duplicate: true } });
  });

  it.each([
    "redemption_paused",
    "item_unavailable",
    "out_of_stock",
    "price_changed",
    "insufficient_balance",
    "stage_required",
    "community_required",
    "consent_required",
  ])("refuses %s in Thai and refreshes the out-of-date sheet", async (code) => {
    call.mockRejectedValue(new QuestError(code));
    await expect(redeemItem(input)).resolves.toEqual({ ok: false, code, error: questErrorText(code) });
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("refuses a database failure as unknown, logging only the function and SQLSTATE", async () => {
    call.mockRejectedValue(new QuestDbError("shift_quest_redeem", "40001"));
    await expect(redeemItem(input)).resolves.toMatchObject({ ok: false, code: "unknown" });
    const logged = (console.error as jest.Mock).mock.calls.flat().map(String).join("\n");
    expect(logged).toContain("shift_quest_redeem");
    expect(logged).toContain("40001");
    expect(logged).not.toContain(ACTOR);
    expect(refresh).not.toHaveBeenCalled();
  });

  it.each([
    ["an item id that is not a uuid", { ...input, itemId: "sticker" }],
    ["a request key that is not a uuid", { ...input, requestKey: "tap-1" }],
    ["a price that is not a whole number", { ...input, expectedCost: 2.5 }],
    ["a negative price", { ...input, expectedCost: -1 }],
  ])("rejects %s before asking who is there", async (_label, bad) => {
    await expect(redeemItem(bad)).resolves.toMatchObject({ ok: false, code: "invalid_input" });
    expect(resolveIslandViewer).not.toHaveBeenCalled();
    expect(call).not.toHaveBeenCalled();
  });

  it("never lets a viewer who has not started redeem", async () => {
    resolveIslandViewer.mockResolvedValue({ state: "not_started", me, actor: ACTOR, userId: USER });
    await expect(redeemItem(input)).resolves.toMatchObject({ ok: false, code: "not_started" });
    expect(call).not.toHaveBeenCalled();
  });
});

describe("cancelRedemption", () => {
  it("cancels the viewer's own reservation and refreshes", async () => {
    call.mockResolvedValue(true);
    await expect(cancelRedemption({ redemptionId: HELD })).resolves.toEqual({ ok: true, data: { cancelled: true } });
    expect(call).toHaveBeenCalledWith("shift_quest_redeem_cancel", ACTOR, HELD);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("says nothing was released when the database had nothing to release", async () => {
    call.mockResolvedValue(false);
    await expect(cancelRedemption({ redemptionId: HELD })).resolves.toEqual({ ok: true, data: { cancelled: false } });
  });

  it.each(["not_found", "bad_state"])("refuses %s in Thai", async (code) => {
    call.mockRejectedValue(new QuestError(code));
    await expect(cancelRedemption({ redemptionId: HELD })).resolves.toEqual({ ok: false, code, error: questErrorText(code) });
  });

  it("rejects an id that is not a uuid", async () => {
    await expect(cancelRedemption({ redemptionId: "1" })).resolves.toMatchObject({ ok: false, code: "invalid_input" });
    expect(call).not.toHaveBeenCalled();
  });
});
