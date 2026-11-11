/** Minimal PostgREST builder mock for the admin Radar route tests. */
type Reply = { data?: unknown; error?: { code?: string; message: string } | null };

export function createMockDb(replies: Record<string, Reply[]>) {
  const calls: Array<{ table: string; method: string; args: unknown[] }> = [];
  const from = (table: string) => {
    const next = () => {
      const reply = replies[table]?.shift() ?? {};
      return Promise.resolve({ data: reply.data ?? null, error: reply.error ?? null });
    };
    const b: Record<string, unknown> = {};
    for (const method of ["select", "eq", "neq", "gte", "in", "not", "order", "limit", "insert", "update"]) {
      b[method] = (...args: unknown[]) => {
        calls.push({ table, method, args });
        return b;
      };
    }
    b.maybeSingle = next;
    b.single = next;
    b.then = (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) => next().then(resolve, reject);
    return b;
  };
  return { db: { from }, calls };
}

export const ADMIN_ID = "0b7c6f5e-1d2a-4c3b-9e8f-7a6b5c4d3e2f";
