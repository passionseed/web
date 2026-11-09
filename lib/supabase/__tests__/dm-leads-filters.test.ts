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
