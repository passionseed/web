/**
 * CEO dashboard helpers: recorded-payment sums (the old MRR was a hard-coded
 * 0), lazy client creation, and a weekly retro free of hard-coded names.
 */

const createClientMock = jest.fn();

jest.mock("@/utils/supabase/client", () => ({
  createClient: () => createClientMock(),
}));

import {
  generateRetro,
  parsePaymentEvent,
  paymentRecorderIds,
  percentChange,
  summarizeRecordedPayments,
} from "../ceo-dashboard";

/** Every chained call returns the builder; awaiting it yields `{ data, error }`. */
function emptyClient() {
  const builder: Record<string, unknown> = {};
  for (const method of ["select", "eq", "in", "gte", "order", "limit", "insert", "update"]) {
    builder[method] = () => builder;
  }
  builder.single = () => Promise.resolve({ data: null, error: null });
  builder.then = (resolve: (v: unknown) => unknown) => Promise.resolve({ data: [], error: null }).then(resolve);
  return { from: () => builder };
}

const NOW = new Date("2026-10-26T12:00:00Z");
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000).toISOString();
const ADMIN = "aaaaaaaa-0000-4000-8000-000000000001";
const ADMINS = new Set([ADMIN]);
/** Metadata as POST /api/admin/track-payment writes it. */
const byAdmin = (meta: Record<string, unknown>) => ({ recorded_by: ADMIN, ...meta });

describe("recorded payments", () => {
  test("parses amounts, currencies and products, and drops junk rows", () => {
    expect(
      parsePaymentEvent(
        {
          event_timestamp: daysAgo(1),
          metadata: byAdmin({ amount: 1500, currency: "THB", product_name: "Camp", payment_method: "camp", notes: "secret" }),
        },
        ADMINS,
      ),
    ).toEqual({ at: daysAgo(1), amount: 1500, currency: "THB", productName: "Camp", paymentMethod: "camp" });
    expect(
      parsePaymentEvent({ event_timestamp: daysAgo(1), metadata: byAdmin({ amount: "20", currency: "USD" }) }, ADMINS),
    ).toMatchObject({ amount: 20, currency: "USD" });
    expect(parsePaymentEvent({ event_timestamp: daysAgo(1), metadata: byAdmin({ amount: -5 }) }, ADMINS)).toBeNull();
    expect(parsePaymentEvent({ event_timestamp: daysAgo(1), metadata: null }, ADMINS)).toBeNull();
    expect(parsePaymentEvent({ event_timestamp: null, metadata: byAdmin({ amount: 5 }) }, ADMINS)).toBeNull();
  });

  test("only counts payments an admin recorded (funnel_events takes inserts from anyone)", () => {
    const forged = { event_timestamp: daysAgo(1), metadata: { amount: 5_000_000, recorded_by: "student-id" } };
    const unsigned = { event_timestamp: daysAgo(1), metadata: { amount: 900 } };
    const upperCase = { event_timestamp: daysAgo(1), metadata: { amount: 10, recorded_by: ADMIN.toUpperCase() } };
    expect(parsePaymentEvent(forged, ADMINS)).toBeNull();
    expect(parsePaymentEvent(unsigned, ADMINS)).toBeNull();
    expect(parsePaymentEvent(upperCase, ADMINS)).toMatchObject({ amount: 10 });
    expect(paymentRecorderIds([{ user_id: ADMIN.toUpperCase() }, { user_id: null }])).toEqual(ADMINS);
    expect(summarizeRecordedPayments([forged, unsigned], ADMINS, NOW).countAll).toBe(0);
  });

  test("sums the last 30 days, the 30 before, and all time per currency", () => {
    const summary = summarizeRecordedPayments(
      [
        { event_timestamp: daysAgo(2), metadata: byAdmin({ amount: 1000, currency: "THB" }) },
        { event_timestamp: daysAgo(10), metadata: byAdmin({ amount: 500, currency: "THB" }) },
        { event_timestamp: daysAgo(12), metadata: byAdmin({ amount: 30, currency: "USD" }) },
        { event_timestamp: daysAgo(45), metadata: byAdmin({ amount: 750, currency: "THB" }) },
        { event_timestamp: daysAgo(90), metadata: byAdmin({ amount: 250, currency: "THB" }) },
        { event_timestamp: daysAgo(3), metadata: byAdmin({ note: "no amount" }) },
      ],
      ADMINS,
      NOW,
    );
    expect(summary.last30).toEqual({ THB: 1500, USD: 30 });
    expect(summary.previous30).toEqual({ THB: 750, USD: 0 });
    expect(summary.allTime).toEqual({ THB: 2500, USD: 30 });
    expect(summary.count30).toBe(3);
    expect(summary.countAll).toBe(5);
    expect(summary.recent.map((p) => p.amount)).toEqual([1000, 500, 30, 750, 250]);
  });

  test("recent entries never carry notes or user IDs", () => {
    const summary = summarizeRecordedPayments(
      [{ event_timestamp: daysAgo(1), metadata: byAdmin({ amount: 10, notes: "parent phone 08x" }) }],
      ADMINS,
      NOW,
    );
    expect(Object.keys(summary.recent[0]).sort()).toEqual(["amount", "at", "currency", "paymentMethod", "productName"]);
  });

  test("percentChange handles an empty previous period", () => {
    expect(percentChange(1500, 750)).toBe(100);
    expect(percentChange(500, 1000)).toBe(-50);
    expect(percentChange(500, 0)).toBe(0);
  });
});

describe("browser client and retro", () => {
  test("importing the module does not create a client", () => {
    expect(createClientMock).not.toHaveBeenCalled();
  });

  test("the generated retro has no hard-coded owners", async () => {
    createClientMock.mockReturnValue(emptyClient());
    const retro = await generateRetro();
    expect(createClientMock).toHaveBeenCalledTimes(1);
    expect(retro.action_items.length).toBeGreaterThan(0);
    for (const item of retro.action_items) expect(item.owner).toBe("");
    const text = JSON.stringify(retro);
    expect(text).not.toMatch(/Bunyasit|Sattakun/);
    expect(text).not.toContain("MRR up");
  });
});
