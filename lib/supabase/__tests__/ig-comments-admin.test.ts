/** @jest-environment node */
import { createAdminClient } from "@/utils/supabase/admin";
import {
  ADMIN_COMMENTS_DEFAULT_LIMIT,
  countCommentsForAdmin,
  getCommentsForAdmin,
} from "@/lib/supabase/ig-comments";

jest.mock("@/utils/supabase/admin", () => ({ createAdminClient: jest.fn() }));

/** A chainable PostgREST stand-in that resolves to `result` when awaited. */
function queryMock(result: { data?: unknown; count?: number | null; error: unknown }) {
  const query: Record<string, jest.Mock> & { then?: unknown } = {};
  for (const method of ["select", "eq", "is", "order", "limit", "range"]) {
    query[method] = jest.fn(() => query);
  }
  query.then = (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
    Promise.resolve(result).then(resolve, reject);
  return query;
}

function useQuery(result: Parameters<typeof queryMock>[0]) {
  const query = queryMock(result);
  jest.mocked(createAdminClient).mockReturnValue({ from: jest.fn(() => query) } as never);
  return query;
}

describe("getCommentsForAdmin", () => {
  it("filters unreplied comments in SQL, newest first, with a default cap", async () => {
    const query = useQuery({ data: [], error: null });
    await getCommentsForAdmin({ stage: "building", unrepliedOnly: true });
    expect(query.eq).toHaveBeenCalledWith("stage", "building");
    expect(query.is).toHaveBeenCalledWith("replied_at", null);
    expect(query.order).toHaveBeenCalledWith("commented_at", { ascending: false });
    expect(query.range).toHaveBeenCalledWith(0, ADMIN_COMMENTS_DEFAULT_LIMIT - 1);
  });

  it("pages with an offset, so older comments are reachable", async () => {
    const query = useQuery({ data: [], error: null });
    await getCommentsForAdmin({ offset: 300, limit: 300 });
    // id breaks ties so a page boundary never skips or repeats a comment.
    expect(query.order).toHaveBeenCalledWith("id", { ascending: true });
    expect(query.range).toHaveBeenCalledWith(300, 599);
  });

  it("a page past the end is empty, not an error", async () => {
    useQuery({ data: null, error: { code: "PGRST103", message: "Requested range not satisfiable" } });
    await expect(getCommentsForAdmin({ offset: 9000 })).resolves.toEqual([]);
  });

  it("reads every reply state and stage when no filter is given", async () => {
    const query = useQuery({ data: [], error: null });
    await getCommentsForAdmin();
    expect(query.eq).not.toHaveBeenCalled();
    expect(query.is).not.toHaveBeenCalled();
  });

  it("keeps the limit between 1 and 1,000", async () => {
    const query = useQuery({ data: [], error: null });
    await getCommentsForAdmin({ limit: 50_000 });
    await getCommentsForAdmin({ limit: 0 });
    expect(query.range.mock.calls).toEqual([[0, 999], [0, 0]]);
  });

  it("throws on a failed read instead of showing an empty list", async () => {
    useQuery({ data: null, error: { message: "boom" } });
    jest.spyOn(console, "error").mockImplementation(() => {});
    await expect(getCommentsForAdmin()).rejects.toThrow("Failed to fetch comments");
  });
});

test("countCommentsForAdmin is a head count with the same filters", async () => {
  const query = useQuery({ count: 7, error: null });
  await expect(countCommentsForAdmin({ unrepliedOnly: true })).resolves.toBe(7);
  expect(query.select).toHaveBeenCalledWith("id", { count: "exact", head: true });
  expect(query.is).toHaveBeenCalledWith("replied_at", null);
});
