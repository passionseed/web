/** @jest-environment node */
import { createAdminClient } from "@/utils/supabase/admin";
import {
  getConversationsForAdmin,
  getDmLeadFacets,
  invalidateDmLeadCache,
  type DmLeadSignalMap,
} from "@/lib/supabase/dm-leads";

jest.mock("@/utils/supabase/admin", () => ({ createAdminClient: jest.fn() }));

/** A chainable PostgREST stand-in that resolves to `result` when awaited. */
function queryMock(result: { data: unknown; error: unknown }) {
  const query: Record<string, jest.Mock> & { then?: unknown } = {};
  for (const method of ["select", "eq", "is", "or", "lte", "contains", "not", "in", "order", "range"]) {
    query[method] = jest.fn(() => query);
  }
  query.then = (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
    Promise.resolve(result).then(resolve, reject);
  return query;
}

/** Preloaded, so the loaders never read dm_conversation_signals. */
const NO_SIGNALS: DmLeadSignalMap = new Map();

function lead(id: string, lead_status: string, last_message_direction: "inbound" | "outbound") {
  return {
    id,
    lead_status,
    last_message_direction,
    stage: "unknown",
    grade_level: null,
    interests: [],
    pathlab_pay_ready: false,
    starred: false,
    follow_up_at: null,
    admin_tags: [],
  };
}

function useRows(rows: unknown[]) {
  const query = queryMock({ data: rows, error: null });
  jest.mocked(createAdminClient).mockReturnValue({ from: jest.fn(() => query) } as never);
  return query;
}

beforeEach(() => invalidateDmLeadCache());

describe("openOnly", () => {
  it("hides converted, lost and spam in SQL, so the list never needs a second pass", async () => {
    const query = useRows([]);
    await getConversationsForAdmin({ openOnly: true }, NO_SIGNALS);
    expect(query.not).toHaveBeenCalledWith("lead_status", "in", "(converted,lost,spam)");
  });

  it("applies the same rule to the facets, so counts match the list", async () => {
    const query = useRows([]);
    await getDmLeadFacets({ openOnly: true }, NO_SIGNALS);
    expect(query.not).toHaveBeenCalledWith("lead_status", "in", "(converted,lost,spam)");
  });

  it("leaves closed conversations in when it is off", async () => {
    const query = useRows([]);
    await getConversationsForAdmin({}, NO_SIGNALS);
    expect(query.not).not.toHaveBeenCalledWith("lead_status", "in", expect.anything());
  });
});

describe("myTurnOnly", () => {
  it("leaves out closed conversations, so the list matches the needsReply chip", async () => {
    const query = useRows([]);
    await getConversationsForAdmin({ myTurnOnly: true }, NO_SIGNALS);
    expect(query.eq).toHaveBeenCalledWith("last_message_direction", "inbound");
    expect(query.not).toHaveBeenCalledWith("lead_status", "in", "(converted,lost,spam)");
  });

  it("adds the closed-status filter once when combined with openOnly", async () => {
    const query = useRows([]);
    await getConversationsForAdmin({ myTurnOnly: true, openOnly: true }, NO_SIGNALS);
    const closed = query.not.mock.calls.filter((call) => call[0] === "lead_status");
    expect(closed).toHaveLength(1);
  });
});

test("needsReply counts only open conversations where the lead wrote last", async () => {
  useRows([
    lead("a", "new", "inbound"),
    lead("b", "qualified", "inbound"),
    lead("c", "converted", "inbound"),
    lead("d", "spam", "inbound"),
    lead("e", "contacted", "outbound"),
  ]);
  const facets = await getDmLeadFacets({}, NO_SIGNALS);
  expect(facets.total).toBe(5);
  expect(facets.needsReply).toBe(2);
  // The closed ones sit in the done bucket instead, the same rule as the overview count.
  expect(facets.bucketCounts.done).toBe(2);
});

describe("Radar-origin threads (spec 5.6)", () => {
  it("are excluded from the lead list and its buckets by default", async () => {
    const query = useRows([]);
    await getConversationsForAdmin({}, NO_SIGNALS);
    expect(query.is).toHaveBeenCalledWith("origin", null);
    expect(query.eq).not.toHaveBeenCalledWith("origin", "radar");
  });

  it("are excluded from the facets and bucket counts, so counts match the list", async () => {
    const query = useRows([]);
    await getDmLeadFacets({ bucket: "hot" }, NO_SIGNALS);
    expect(query.is).toHaveBeenCalledWith("origin", null);
  });

  it("show only under the separate Radar filter", async () => {
    const query = useRows([]);
    await getConversationsForAdmin({ origin: "radar" }, NO_SIGNALS);
    expect(query.eq).toHaveBeenCalledWith("origin", "radar");
    expect(query.is).not.toHaveBeenCalledWith("origin", null);
  });
});

describe("before the origin migration is applied", () => {
  const MISSING = { code: "42703", message: "column dm_conversations.origin does not exist" };

  /** Rejects any read that filtered on origin, like PostgREST without the column. */
  function useRowsWithoutOrigin(rows: unknown[]) {
    const queries: Array<Record<string, jest.Mock>> = [];
    jest.mocked(createAdminClient).mockReturnValue({
      from: jest.fn(() => {
        let named = false;
        const query: Record<string, jest.Mock> & { then?: unknown } = {};
        for (const method of ["select", "eq", "is", "or", "lte", "contains", "not", "in", "order", "range"]) {
          query[method] = jest.fn((...args: unknown[]) => {
            if (args.some((a) => typeof a === "string" && a.includes("origin"))) named = true;
            return query;
          });
        }
        query.then = (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
          Promise.resolve(named ? { data: null, error: MISSING } : { data: rows, error: null }).then(resolve, reject);
        queries.push(query);
        return query;
      }),
    } as never);
    return queries;
  }

  beforeEach(() => jest.spyOn(console, "warn").mockImplementation(() => {}));
  afterEach(() => jest.restoreAllMocks());

  it("lists the inbox without the origin filter instead of throwing", async () => {
    useRowsWithoutOrigin([lead("a", "new", "inbound")]);
    const rows = await getConversationsForAdmin({}, NO_SIGNALS);
    expect(rows.map((r) => r.id)).toEqual(["a"]);
  });

  it("shows an empty Radar filter (no Radar threads exist yet)", async () => {
    useRowsWithoutOrigin([lead("a", "new", "inbound")]);
    expect(await getConversationsForAdmin({ origin: "radar" }, NO_SIGNALS)).toEqual([]);
  });

  it("still computes facets and the scoreboard", async () => {
    useRowsWithoutOrigin([lead("a", "new", "inbound"), lead("b", "new", "outbound")]);
    const facets = await getDmLeadFacets({}, NO_SIGNALS);
    expect(facets.needsReply).toBe(1);
  });
});
