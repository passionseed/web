import { checkRateLimit } from "./rate-limiter";
import { createAdminClient } from "@/utils/supabase/admin";

jest.mock("@/utils/supabase/admin", () => ({ createAdminClient: jest.fn() }));

type Result = { data?: unknown; error?: { code?: string } | null };

// Scripted stand-in for the three PostgREST calls the limiter makes.
function useFakeClient(script: { read: Result[]; update?: Result[]; insert?: Result[] }): string[] {
  const calls: string[] = [];
  jest.mocked(createAdminClient).mockReturnValue({
    from: () => {
      let updating = false;
      const builder = {
        select: () => (updating ? Promise.resolve(script.update?.shift()) : builder),
        eq: () => builder,
        maybeSingle: () => {
          calls.push("read");
          return Promise.resolve(script.read.shift());
        },
        update: () => {
          updating = true;
          calls.push("update");
          return builder;
        },
        insert: () => {
          calls.push("insert");
          return Promise.resolve(script.insert?.shift());
        },
      };
      return builder;
    },
  } as unknown as ReturnType<typeof createAdminClient>);
  return calls;
}

describe("checkRateLimit", () => {
  it("allows and counts the first request in a window", async () => {
    const calls = useFakeClient({ read: [{ data: null }], insert: [{ error: null }] });
    await expect(checkRateLimit("k", 10)).resolves.toMatchObject({ allowed: true, remaining: 9 });
    expect(calls).toEqual(["read", "insert"]);
  });

  it("re-reads after losing an update race instead of passing on a stale count", async () => {
    const calls = useFakeClient({
      read: [{ data: { attempt_count: 9 } }, { data: { attempt_count: 10 } }],
      update: [{ data: [], error: null }],
    });
    await expect(checkRateLimit("k", 10)).resolves.toMatchObject({ allowed: false });
    expect(calls).toEqual(["read", "update", "read"]);
  });

  it("re-reads after another request creates the window row first", async () => {
    useFakeClient({
      read: [{ data: null }, { data: { attempt_count: 1 } }],
      insert: [{ error: { code: "23505" } }],
      update: [{ data: [{ attempt_count: 2 }], error: null }],
    });
    await expect(checkRateLimit("k", 10)).resolves.toMatchObject({ allowed: true, remaining: 8 });
  });

  it("denies under sustained contention on one key", async () => {
    useFakeClient({
      read: [1, 2, 3].map(() => ({ data: { attempt_count: 1 } })),
      update: [1, 2, 3].map(() => ({ data: [], error: null })),
    });
    await expect(checkRateLimit("k", 10)).resolves.toMatchObject({ allowed: false });
  });

  it("propagates storage errors so callers fail closed", async () => {
    useFakeClient({ read: [{ data: null, error: { code: "500" } }] });
    await expect(checkRateLimit("k", 10)).rejects.toEqual({ code: "500" });
  });
});
