/** @jest-environment node */
import { ADMIN_QUEUE_BY_KEY, ADMIN_QUEUES, type AdminQueueCount } from "@/lib/admin/console";
import { getShiftCohortByName } from "@/lib/content/shift-cohort";
import { getCommentsMissedByDm } from "@/lib/supabase/ig-comments";
import { createAdminClient } from "@/utils/supabase/admin";

import {
  adminActionTitle,
  brainEventTitle,
  getAdminActivity,
  mergeActivity,
  personLabel,
  signupItems,
} from "@/lib/admin/overview/activity";
import { applicationsHref, daysToDeadline, focusCohort } from "@/lib/admin/overview/cohort";
import { computeAdminKpis, getAdminKpis } from "@/lib/admin/overview/kpis";
import { readAllPages, withTimeout } from "@/lib/admin/overview/query";
import { buildQueueSnapshot, createQueueContext, getAdminQueueSnapshot } from "@/lib/admin/overview/queues";
import { pickLiveRound, type OverviewRound } from "@/lib/admin/overview/rounds";
import { cohortFacts, getAdminShiftSnapshot } from "@/lib/admin/overview/shift";
import { addDays } from "@/lib/admin/overview/time";

jest.mock("server-only", () => ({}));
jest.mock("next/cache", () => ({ unstable_cache: (fn: unknown) => fn }));
jest.mock("@/lib/supabase/ig-comments", () => ({ getCommentsMissedByDm: jest.fn() }));
jest.mock("@/utils/supabase/admin", () => ({ createAdminClient: jest.fn(() => mockDb) }));
jest.mock("@/utils/supabase/server", () => ({ createClient: jest.fn(async () => mockSession) }));

// ---------------------------------------------------------------------------
// A chainable Supabase fake: records every call, answers through mockReply.
// ---------------------------------------------------------------------------

interface Call {
  table: string;
  select?: string;
  options?: { count?: string; head?: boolean };
  ops: unknown[][];
}
type Reply = { data?: unknown; count?: number | null; error?: { message: string } | null };

const mockCalls: Call[] = [];
let mockReply: (call: Call) => Reply = () => ({ count: 0, data: [] });
let mockRpcReply: () => unknown = () => ({ data: { ok: true, data: { rounds: [] } }, error: null });

const CHAIN = [
  "eq", "neq", "not", "in", "is", "or", "gte", "gt", "lte", "lt",
  "ilike", "contains", "order", "limit", "range", "abortSignal",
];

function mockBuilder(call: Call) {
  const builder: Record<string, unknown> = {
    select(columns: string, options?: Call["options"]) {
      call.select = columns;
      call.options = options;
      return builder;
    },
    then(resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) {
      return Promise.resolve()
        .then(() => ({ data: null, count: null, error: null, ...mockReply(call) }))
        .then(resolve, reject);
    },
  };
  for (const name of CHAIN) {
    builder[name] = (...args: unknown[]) => {
      call.ops.push([name, ...args]);
      return builder;
    };
  }
  return builder;
}

const mockDb = {
  from: jest.fn((table: string) => {
    const call: Call = { table, ops: [] };
    mockCalls.push(call);
    return mockBuilder(call);
  }),
};
const mockSession = {
  rpc: jest.fn(() => ({ abortSignal: () => Promise.resolve(mockRpcReply()) })),
};

/** Arguments of the first `name` op on `column`, or undefined. */
function op(call: Call, name: string, column?: string): unknown[] | undefined {
  return call.ops.find((o) => o[0] === name && (column === undefined || o[1] === column));
}
const firstPageOnly = (call: Call) => {
  const range = op(call, "range");
  return !range || range[1] === 0;
};

const NOW = new Date("2026-10-26T05:00:00Z"); // 12:00 in Bangkok
const ROUNDS = [
  { id: "r1", number: 3, title_en: "Ship it", status: "published", phase: "active", pending_review: 2, entrants: 25, certificates_issued: 0, application_cohort: "SHIFT[3]" },
  { id: "r2", number: 2, title_en: "Old", status: "published", phase: "finished", pending_review: 0, entrants: 18, certificates_issued: 15 },
];

beforeEach(() => {
  mockCalls.length = 0;
  mockReply = () => ({ count: 0, data: [] });
  mockRpcReply = () => ({ data: { ok: true, data: { rounds: ROUNDS } }, error: null });
  jest.mocked(createAdminClient).mockImplementation(() => mockDb as never);
  jest.mocked(getCommentsMissedByDm).mockResolvedValue([]);
});

// ---------------------------------------------------------------------------
// Queues
// ---------------------------------------------------------------------------

describe("queue snapshot", () => {
  const byKey = (queues: AdminQueueCount[]) => Object.fromEntries(queues.map((q) => [q.key, q]));

  function realisticReplies(call: Call): Reply {
    switch (call.table) {
      case "trial_accesses":
        return { count: 3 };
      case "dm_conversations":
        if (op(call, "lte", "follow_up_at")) return { count: 4 };
        return { count: op(call, "gte", "last_message_at") ? 2 : 5 };
      case "line_contacts":
        return { error: { message: "relation does not exist" } };
      case "shift_applications":
        if (op(call, "eq", "status")?.[2] === "new") return { count: 6 };
        if (op(call, "eq", "status")?.[2] === "accepted") return { count: 2 };
        return { count: 1 };
      case "shift_round_summary_revisions":
        return { data: [{ id: "s1", shift_round_entries: { round_id: "r2" } }], count: 1 };
      case "talent_profiles":
        return { count: 9 };
      case "dm_messages":
        return { count: 1 };
      case "line_messages":
        return { count: 2 };
      default:
        return { count: 0 };
    }
  }

  test("counts every queue in registry order, with deep links and context", async () => {
    mockReply = realisticReplies;
    jest.mocked(getCommentsMissedByDm).mockResolvedValue([{}, {}] as never);
    const ctx = createQueueContext(NOW);
    const snapshot = await buildQueueSnapshot(ctx);
    const cohort = encodeURIComponent(ctx.cohort.name);

    expect(snapshot.generatedAt).toBe(NOW.toISOString());
    expect(snapshot.queues.map((q) => q.key)).toEqual(ADMIN_QUEUES.map((q) => q.key));
    const q = byKey(snapshot.queues);
    expect(q.trials_pending).toEqual({ key: "trials_pending", count: 3, href: "/admin/trials" });
    expect(q.dm_awaiting_reply).toMatchObject({ count: 5, context: "2 inside the 24h window" });
    expect(q.dm_followup_due.count).toBe(4);
    expect(q.shift_new_applications).toMatchObject({
      count: 6,
      context: ctx.cohort.name,
      href: `/admin/shift/applications?cohort=${cohort}&status=new`,
    });
    expect(q.shift_awaiting_payment.href).toBe(
      `/admin/shift/applications?cohort=${cohort}&status=accepted&paid=unpaid`,
    );
    expect(q.shift_paid_not_in_discord.href).toBe(
      `/admin/shift/applications?cohort=${cohort}&status=all&paid=not_in_discord`,
    );
    expect(q.ig_missed.count).toBe(2);
    expect(getCommentsMissedByDm).toHaveBeenCalledWith(7);
    expect(q.round_evidence_review).toMatchObject({
      count: 2,
      href: "/admin/shift/rounds/r1/review",
      context: "Round 3: Ship it",
    });
    expect(q.round_summaries_pending).toMatchObject({
      count: 1,
      href: "/admin/shift/rounds/r2/summaries",
    });
    expect(q.talent_unverified.count).toBe(9);
    expect(q.messages_failed).toMatchObject({ count: 3, context: "1 DM, 2 LINE" });
    expect(q.meta_webhook_failures.count).toBe(0);
  });

  test("a failing query is null and does not stop the others", async () => {
    mockReply = realisticReplies;
    const snapshot = await buildQueueSnapshot(createQueueContext(NOW));
    const q = byKey(snapshot.queues);
    expect(q.line_unanswered).toEqual({
      key: "line_unanswered",
      count: null,
      href: ADMIN_QUEUE_BY_KEY.line_unanswered.href,
    });
    expect(q.trials_pending.count).toBe(3);
  });

  test("queues are filtered the way the tools define them", async () => {
    await buildQueueSnapshot(createQueueContext(NOW));
    const calls = (table: string) => mockCalls.filter((c) => c.table === table);

    const dm = calls("dm_conversations");
    for (const call of dm) expect(op(call, "not", "admin_tags")).toEqual(["not", "admin_tags", "cs", "{internal}"]);
    const awaiting = dm.find((c) => op(c, "eq", "last_message_direction"))!;
    expect(op(awaiting, "not", "lead_status")).toEqual(["not", "lead_status", "in", "(converted,lost,spam)"]);

    const line = calls("line_contacts")[0];
    expect(op(line, "eq", "last_message_direction")?.[2]).toBe("inbound");
    expect(op(line, "eq", "is_following")?.[2]).toBe(true);

    expect(op(calls("talent_profiles")[0], "or")).toEqual(["or", "verified.is.null,verified.eq.false"]);
    expect(op(calls("meta_webhook_receipts")[0], "in", "status")).toEqual(["in", "status", ["failed", "partial"]]);
    for (const table of ["dm_messages", "line_messages"]) {
      const call = calls(table)[0];
      expect(op(call, "eq", "direction")?.[2]).toBe("outbound");
      expect(op(call, "eq", "send_status")?.[2]).toBe("failed");
    }
    for (const call of calls("shift_applications")) expect(op(call, "eq", "cohort")).toBeDefined();
  });

  test("every head count is exact, ships no rows, and carries a timeout", async () => {
    await buildQueueSnapshot(createQueueContext(NOW));
    const heads = mockCalls.filter((c) => c.options?.head);
    expect(heads.length).toBeGreaterThan(10);
    for (const call of heads) {
      expect(call.select).toBe("id");
      expect(call.options).toEqual({ count: "exact", head: true });
      expect(op(call, "abortSignal")?.[1]).toBeInstanceOf(AbortSignal);
    }
  });

  test("never throws: no service role and a refused RPC give nulls", async () => {
    jest.mocked(createAdminClient).mockImplementation(() => {
      throw new Error("Missing env.SUPABASE_SERVICE_ROLE_KEY");
    });
    mockRpcReply = () => ({ data: { ok: false, error: { code: "forbidden" } }, error: null });
    jest.mocked(getCommentsMissedByDm).mockRejectedValue(new Error("boom"));
    const snapshot = await getAdminQueueSnapshot();
    expect(snapshot.queues).toHaveLength(ADMIN_QUEUES.length);
    expect(snapshot.queues.every((q) => q.count === null)).toBe(true);
  });

  test("several rounds with work link to the rounds list", async () => {
    mockRpcReply = () => ({
      data: { ok: true, data: { rounds: [{ ...ROUNDS[0] }, { ...ROUNDS[1], pending_review: 4 }] } },
      error: null,
    });
    const q = byKey((await buildQueueSnapshot(createQueueContext(NOW))).queues);
    expect(q.round_evidence_review).toMatchObject({
      count: 6,
      href: "/admin/shift/rounds",
      context: "2 rounds",
    });
  });
});

// ---------------------------------------------------------------------------
// Query helpers
// ---------------------------------------------------------------------------

describe("query helpers", () => {
  test("paging advances by rows returned and stops on an empty page", async () => {
    const pages = [[1, 2, 3], [4], []];
    const ranges: number[][] = [];
    const result = await readAllPages<number>(async (from, to) => {
      ranges.push([from, to]);
      return { data: pages.shift() ?? [], error: null };
    }, { pageSize: 3 });
    expect(result).toEqual({ rows: [1, 2, 3, 4], truncated: false });
    expect(ranges).toEqual([[0, 2], [3, 5], [4, 6]]);
  });

  test("paging stops at the cap and says so", async () => {
    const result = await readAllPages<number>(async () => ({ data: [1, 1], error: null }), {
      pageSize: 2,
      cap: 5,
    });
    expect(result.rows).toHaveLength(5);
    expect(result.truncated).toBe(true);
  });

  test("paging fails loudly on an error instead of returning a partial count", async () => {
    await expect(
      readAllPages(async () => ({ data: null, error: { message: "timeout" } })),
    ).rejects.toThrow("timeout");
  });

  test("withTimeout rejects a call that hangs", async () => {
    await expect(withTimeout(new Promise(() => {}), 10, "slow")).rejects.toThrow("slow timed out");
    await expect(withTimeout(Promise.resolve(7), 10)).resolves.toBe(7);
  });
});

// ---------------------------------------------------------------------------
// KPIs
// ---------------------------------------------------------------------------

describe("KPIs", () => {
  const shiftPrice = getShiftCohortByName("SHIFT[3]")!.priceBaht;

  function kpiReplies(call: Call): Reply {
    if (!firstPageOnly(call)) return { data: [] };
    switch (call.table) {
      case "trial_accesses":
        return { data: [{ price_amount: 1490, paid_at: "2026-10-20T03:00:00Z", verified_at: null }] };
      case "user_roles":
        return { data: [{ user_id: "ADMIN-1" }] };
      case "funnel_events":
        return {
          data: [
            { event_timestamp: "2026-10-21T03:00:00Z", amount: "500", currency: "THB", recorded_by: "admin-1" },
            { event_timestamp: "2026-10-21T03:00:00Z", amount: "20", currency: "USD", recorded_by: "admin-1" },
            { event_timestamp: "2026-09-10T03:00:00Z", amount: 1000, currency: null, recorded_by: "admin-1" },
            // Any signed-in user can insert funnel_events: these never count.
            { event_timestamp: "2026-10-22T03:00:00Z", amount: "5000000", currency: "THB", recorded_by: "student-9" },
            { event_timestamp: "2026-10-22T03:00:00Z", amount: "900", currency: "THB", recorded_by: null },
            { event_timestamp: "2026-10-23T03:00:00Z", amount: "-5000000", currency: "THB", recorded_by: "admin-1" },
          ],
        };
      case "shift_applications":
        return { data: [{ cohort: "SHIFT[3]", paid_at: "2026-10-22T03:00:00Z" }] };
      case "hackathon_event_registrations":
        // Revenue reads amounts; the seat KPIs read one row per sign-up.
        return call.select === "amount_baht, paid_at, created_at"
          ? { data: [{ amount_baht: 199, paid_at: "2026-10-25T03:00:00Z", created_at: "2026-10-25T02:00:00Z" }] }
          : {
              data: [
                { status: "paid", member_count: 1, source: null, created_at: "2026-10-25T02:00:00Z", paid_at: "2026-10-25T03:00:00Z" },
                { status: "paid", member_count: 3, source: "ig", created_at: "2026-10-26T01:00:00Z", paid_at: "2026-10-26T02:00:00Z" },
                { status: "pending", member_count: 2, source: null, created_at: "2026-10-26T01:00:00Z", paid_at: null },
                { status: "cancelled", member_count: 5, source: null, created_at: "2026-10-24T01:00:00Z", paid_at: null },
              ],
            };
      case "hackathon_pipeline":
        return {
          data: [
            { kind: "sponsor", stage: "signed", element: null, amount_thb: 5000, in_kind: false },
            { kind: "sponsor", stage: "talking", element: null, amount_thb: null, in_kind: false },
            { kind: "speaker", stage: "yes", element: "water", amount_thb: null, in_kind: false },
          ],
        };
      case "dm_conversations":
        return { error: { message: "timeout" } };
      default:
        return { data: [] };
    }
  }

  test("leads with the Elemental hackathon: seats, pace, sponsors and voices", async () => {
    mockReply = kpiReplies;
    const kpis = await computeAdminKpis(NOW);
    expect(kpis.map((k) => k.key)).toEqual([
      "elemental_seats",
      "elemental_seats_per_day",
      "elemental_sponsors",
      "elemental_voices",
      "revenue_30d",
      "new_leads_7d",
    ]);
    const byKey = Object.fromEntries(kpis.map((k) => [k.key, k]));

    // Paid sign-ups count every member; pending and cancelled ones count nothing.
    expect(byKey.elemental_seats).toMatchObject({ value: 4, total: 350, format: "ratio", href: "/admin/hackathon/elemental" });
    expect(byKey.elemental_seats.series).toHaveLength(30);
    expect(byKey.elemental_seats.series!.slice(-2)).toEqual([1, 3]);

    // 26 Oct to the 50-seat checkpoint on 26 Nov: 46 seats over 32 selling days.
    expect(byKey.elemental_seats_per_day).toMatchObject({ value: 2, label: "Seats a day needed for 50 by 26 Nov" });

    expect(byKey.elemental_sponsors).toMatchObject({ value: 1, total: 3 });
    expect(byKey.elemental_sponsors.hint).toContain("1 talking");
    expect(byKey.elemental_voices).toMatchObject({ value: 1, total: 5 });
    expect(byKey.elemental_voices.hint).toContain("Missing: earth, air, fire, aether.");

    // Sign-ups are read once and shared by both seat KPIs.
    const seatReads = mockCalls.filter(
      (c) => c.table === "hackathon_event_registrations" && c.select !== "amount_baht, paid_at, created_at",
    );
    expect(seatReads).toHaveLength(1);
  });

  test("revenue adds paid hackathon sign-ups to trials, manual payments and SHIFT seats", async () => {
    mockReply = kpiReplies;
    const kpis = Object.fromEntries((await computeAdminKpis(NOW)).map((k) => [k.key, k]));

    // 1490 trial + 500 THB manual + one SHIFT seat + one ฿199 sign-up; USD skipped; Sep 10 is the previous window.
    // Rows not recorded by an admin, and non-positive amounts, add nothing.
    expect(kpis.revenue_30d).toMatchObject({ value: 1490 + 500 + shiftPrice + 199, previous: 1000, format: "baht" });
    const roles = mockCalls.find((c) => c.table === "user_roles")!;
    expect(op(roles, "eq", "role")).toEqual(["eq", "role", "admin"]);
    expect(kpis.revenue_30d.hint).toContain("estimate");
    const hackathon = mockCalls.find((c) => c.table === "hackathon_event_registrations" && c.select?.startsWith("amount_baht"))!;
    expect(op(hackathon, "eq", "status")).toEqual(["eq", "status", "paid"]);

    expect(kpis.new_leads_7d.value).toBeNull();
    const leads = mockCalls.find((c) => c.table === "dm_conversations")!;
    expect(op(leads, "not", "admin_tags")).toEqual(["not", "admin_tags", "cs", "{internal}"]);
  });

  test("getAdminKpis never throws, even when nothing is readable", async () => {
    mockReply = () => ({ error: { message: "down" } });
    const kpis = await getAdminKpis();
    expect(kpis).toHaveLength(6);
    expect(kpis.every((k) => k.value === null)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Activity
// ---------------------------------------------------------------------------

describe("activity feed", () => {
  test("names people by nickname or handle only", () => {
    expect(personLabel("Mint", "mint.dev")).toBe("Mint");
    expect(personLabel(" ", "@@pond")).toBe("@pond");
    expect(personLabel(null, null)).toBeNull();
  });

  test("signups collapse into one item per Bangkok day", () => {
    const items = signupItems(
      ["2026-10-26T02:00:00Z", "2026-10-26T01:00:00Z", "2026-10-25T16:00:00Z", "2026-10-24T01:00:00Z"],
      "2026-10-26",
    );
    expect(items).toEqual([
      expect.objectContaining({ id: "signup:2026-10-26", title: "2 new signups", detail: "Today", at: "2026-10-26T02:00:00Z" }),
      expect.objectContaining({ id: "signup:2026-10-25", title: "1 new signup", detail: "Yesterday" }),
      expect.objectContaining({ id: "signup:2026-10-24", detail: "2026-10-24" }),
    ]);
  });

  test("program and admin events get readable titles", () => {
    expect(
      brainEventTitle({ id: "b1", type: "shift_round_published", payload: { round: 3 }, created_at: NOW.toISOString() }, "2026-10-26"),
    ).toMatch(/published/);
    expect(brainEventTitle({ id: "b2", type: "made_up", payload: {}, created_at: NOW.toISOString() }, "2026-10-26")).toBeNull();
    expect(adminActionTitle("add_role_admin")).toBe("Role added: admin");
    expect(adminActionTitle("remove_role_student")).toBe("Role removed: student");
    expect(adminActionTitle("bulk_export")).toBe("Bulk export");
  });

  test("merges newest first, stable on ties, and cuts to the limit", () => {
    const item = (id: string, at: string) => ({ id, kind: "lead" as const, at, title: id });
    const merged = mergeActivity(
      [[item("b", "2026-10-26T01:00:00Z"), item("x", "bad")], [item("a", "2026-10-26T01:00:00Z"), item("c", "2026-10-26T03:00:00Z")]],
      2,
    );
    expect(merged.map((i) => i.id)).toEqual(["c", "a"]);
  });

  test("loads every source, skips the unreadable one, and never selects contact data", async () => {
    jest.useFakeTimers({ now: NOW, doNotFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval", "setImmediate", "nextTick", "queueMicrotask"] });
    try {
      mockReply = (call) => {
        switch (call.table) {
          case "shift_applications":
            return call.select!.includes("paid_at")
              ? { data: [{ id: "a2", cohort: "SHIFT[3]", nickname: null, ig_handle: "@pond", paid_at: "2026-10-26T04:00:00Z" }] }
              : { data: [{ id: "a1", cohort: "SHIFT[3]", nickname: "Mint", ig_handle: "mint.dev", created_at: "2026-10-26T03:00:00Z" }] };
          case "dm_conversations":
            return { data: [{ id: "d1", username: null, platform: "instagram", created_at: "2026-10-25T03:00:00Z" }] };
          case "trial_accesses":
            return op(call, "eq", "status")?.[2] === "pending"
              ? { data: [{ id: "t1", updated_at: "2026-10-24T10:00:00Z", seed: { title: "Vet PathLab" } }] }
              : { error: { message: "boom" } };
          case "expert_profiles":
            return { data: [{ id: "e1", name: "Dr. A", title: "Vet", company: "Clinic", created_at: "2026-10-26T01:00:00Z" }] };
          case "profiles":
            return { data: [{ created_at: "2026-10-26T02:00:00Z" }, { created_at: "2026-10-26T01:30:00Z" }] };
          case "brain_events":
            return { data: [{ id: "b1", type: "shift_round_published", payload: { round: 3 }, created_at: "2026-10-25T05:00:00Z" }] };
          case "admin_activity_log":
            return { data: [{ id: "l1", action: "add_role_admin", target_resource_type: "user_role", created_at: "2026-10-24T05:00:00Z" }] };
          default:
            return { data: [] };
        }
      };
      const items = await getAdminActivity(20);
      expect(items.map((i) => i.id)).toEqual([
        "payment:shift:a2",
        "application:a1",
        "signup:2026-10-26",
        "expert:e1",
        "program:b1",
        "lead:d1",
        "trial:slip:t1",
        "admin:l1",
      ]);
      expect(items[0]).toMatchObject({ kind: "payment", title: "SHIFT seat paid: @pond" });
      expect(items[1]).toMatchObject({
        title: "New SHIFT application: Mint",
        href: applicationsHref("SHIFT[3]", { id: "a1" }),
      });
      expect(items.find((i) => i.id === "lead:d1")?.title).toBe("New Instagram lead");
      expect(items.find((i) => i.id === "signup:2026-10-26")).toMatchObject({ title: "2 new signups", detail: "Today" });

      const selects = mockCalls.map((c) => c.select ?? "").join(" ");
      expect(selects).not.toMatch(/email|phone|full_name|parent_contact|join_token|display_name/);
      for (const call of mockCalls) {
        // Signups are whole Bangkok days, so they start at midnight of the window's first day.
        const from = call.table === "profiles" ? "2026-10-22T17:00:00.000Z" : "2026-10-23T05:00:00.000Z";
        expect(op(call, "gte")?.[2]).toBe(from);
      }
      expect((await getAdminActivity(3)).length).toBe(3);
    } finally {
      jest.useRealTimers();
    }
  });
});

// ---------------------------------------------------------------------------
// SHIFT snapshot
// ---------------------------------------------------------------------------

describe("SHIFT snapshot", () => {
  const round = (patch: Partial<OverviewRound>) => ({ ...ROUNDS[0], ...patch }) as OverviewRound;

  test("the open cohort comes first, then the running one", () => {
    const open = focusCohort("2026-10-26");
    expect(open.name).toBe("SHIFT[3]");
    expect(cohortFacts(open, "2026-10-26")).toMatchObject({
      status: "open",
      daysToDeadline: daysToDeadline(open, "2026-10-26"),
    });
    expect(daysToDeadline(open, open.applyDeadline)).toBe(0);
    // SHIFT[3] takes applications through Day 1, so it runs from the day after.
    const afterDeadline = addDays(open.applyDeadline, 1);
    const running = focusCohort(afterDeadline);
    expect(cohortFacts(running, afterDeadline)).toMatchObject({ status: "running", daysToDeadline: null });
  });

  test("the live round is a published round running or in review, preferring the cohort's", () => {
    expect(pickLiveRound([round({ status: "draft" }), round({ id: "x", phase: "finished" })], "SHIFT[3]")).toBeNull();
    const own = round({ id: "own", number: 2, phase: "review" });
    const other = round({ id: "other", number: 5, application_cohort: "SHIFT[9]" });
    expect(pickLiveRound([other, own], "SHIFT[3]")?.id).toBe("own");
    expect(pickLiveRound([own, other], "SHIFT[1]")?.id).toBe("other");
  });

  test("reads the funnel and live round; a failed count nulls only the funnel", async () => {
    mockReply = (call) => {
      if (op(call, "eq", "status")?.[2] === "new") return { count: 10 };
      if (op(call, "not", "paid_at")) return { count: 4 };
      return { count: 1 };
    };
    const snapshot = await getAdminShiftSnapshot();
    expect(snapshot?.funnel).toMatchObject({ newCount: 10, paid: 4, applied: 1, inDiscord: 1 });
    expect(snapshot?.liveRound).toEqual({
      id: "r1",
      title: "Round 3: Ship it",
      entrants: 25,
      pendingReview: 2,
      certificatesIssued: 0,
      href: "/admin/shift/rounds/r1",
    });

    mockReply = (call) => (op(call, "eq", "status")?.[2] === "waitlist" ? { error: { message: "x" } } : { count: 1 });
    mockRpcReply = () => ({ data: null, error: { message: "JWT expired" } });
    const degraded = await getAdminShiftSnapshot();
    expect(degraded?.funnel).toBeNull();
    expect(degraded?.liveRound).toBeNull();
    expect(degraded?.cohort.name).toBe(focusCohort().name);
  });
});
