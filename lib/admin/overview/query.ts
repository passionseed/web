/**
 * Small, defensive query helpers shared by the overview loaders: per-query
 * timeouts, head counts that fail loudly (so allSettled can null them), and
 * timestamp paging with a hard row cap. No Supabase client is created here.
 */

/** Per-query budget. The counts route polls, so one slow table must not stall it. */
export const QUERY_TIMEOUT_MS = 2500;

/** Rows per page when paging timestamp-only selects. Matches PostgREST max_rows. */
export const PAGE_SIZE = 1000;

/** Hard cap per source so a KPI never walks an unbounded table. */
export const ROW_CAP = 20_000;

/** Abort signal for one PostgREST request. */
export function timeoutSignal(ms: number = QUERY_TIMEOUT_MS): AbortSignal {
  return AbortSignal.timeout(ms);
}

/** Rejects when `promise` takes longer than `ms`. For calls that take no signal. */
export async function withTimeout<T>(
  promise: PromiseLike<T>,
  ms: number = QUERY_TIMEOUT_MS,
  label = "query",
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
  try {
    return await Promise.race([Promise.resolve(promise), timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

interface CountResponse {
  count: number | null;
  error: unknown;
}

/** The exact count from a head query, or a thrown error (never a silent 0). */
export async function readCount(query: PromiseLike<CountResponse>): Promise<number> {
  const { count, error } = await query;
  if (error) throw new Error(errorMessage(error));
  if (typeof count !== "number") throw new Error("count missing from response");
  return count;
}

interface RowsResponse<T> {
  data: T[] | null;
  error: unknown;
}

export interface PagedRows<T> {
  rows: T[];
  /** True when the cap stopped the read before the last page. */
  truncated: boolean;
}

/**
 * Reads every page of a query up to `cap` rows. Advances by the rows actually
 * returned and stops on an empty page, so a server row limit smaller than
 * `pageSize` cannot silently cut the result short.
 */
export async function readAllPages<T>(
  page: (from: number, to: number) => PromiseLike<RowsResponse<T>>,
  { cap = ROW_CAP, pageSize = PAGE_SIZE }: { cap?: number; pageSize?: number } = {},
): Promise<PagedRows<T>> {
  const rows: T[] = [];
  while (rows.length < cap) {
    const size = Math.min(pageSize, cap - rows.length);
    const { data, error } = await page(rows.length, rows.length + size - 1);
    if (error) throw new Error(errorMessage(error));
    if (!data || data.length === 0) return { rows, truncated: false };
    rows.push(...data.slice(0, cap - rows.length));
  }
  return { rows, truncated: true };
}

export function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return String(error);
}

/** The single related row of a to-one embed, whichever shape PostgREST returned. */
export function embedded<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}
