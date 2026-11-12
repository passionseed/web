/**
 * Pure helpers shared by the admin list endpoints (users, maps): URL param
 * parsing, ILIKE-safe search filters for PostgREST, and pagination maths.
 * Client-safe: no Supabase client, no server imports.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

export const MAX_SEARCH_LENGTH = 100;
const MAX_SEARCH_TOKENS = 5;

export function parsePositiveInt(raw: string | null, fallback: number, max = Number.MAX_SAFE_INTEGER): number {
  if (!raw || !/^\d+$/.test(raw.trim())) return fallback;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(n, max);
}

/** Collapse whitespace and cap the length of a free-text search. */
export function normalizeSearch(raw: string | null | undefined, maxLength = MAX_SEARCH_LENGTH): string {
  if (!raw) return "";
  return raw.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

/**
 * Split a search into ILIKE-safe tokens. Every character that is a LIKE
 * wildcard (`%`, `_`, `*`), an escape (`\`), or PostgREST filter syntax
 * (`,`, `(`, `)`, `"`, `'`, `:`, `;`) acts as a separator, so user input can
 * never widen the pattern or break out of the `or()` expression. "jane_doe"
 * becomes ["jane", "doe"] and still finds the username.
 */
export function searchTokens(raw: string, maxTokens = MAX_SEARCH_TOKENS): string[] {
  const tokens = normalizeSearch(raw)
    .split(/[\s%_*\\,()"':;]+/u)
    .map((t) => t.trim())
    .filter(Boolean);
  return Array.from(new Set(tokens.map((t) => t.toLowerCase()))).slice(0, maxTokens);
}

function tokenClause(columns: readonly string[], token: string): string {
  return columns.map((column) => `${column}.ilike.%${token}%`).join(",");
}

/**
 * PostgREST `or()` expression: every token must match at least one column.
 * One token: `a.ilike.%t%,b.ilike.%t%`. Several: `and(or(...),or(...))`.
 * Both shapes are a top-level or-list, so callers may append more
 * alternatives with a comma. Returns null when nothing searchable is left.
 */
export function buildIlikeSearchFilter(raw: string, columns: readonly string[]): string | null {
  const tokens = searchTokens(raw);
  if (tokens.length === 0 || columns.length === 0) return null;
  if (tokens.length === 1) return tokenClause(columns, tokens[0]);
  return `and(${tokens.map((t) => `or(${tokenClause(columns, t)})`).join(",")})`;
}

/** Inclusive row range for PostgREST `.range(from, to)`. */
export function pageRange(page: number, pageSize: number): { from: number; to: number } {
  const safePage = Math.max(1, Math.floor(page));
  const safeSize = Math.max(1, Math.floor(pageSize));
  const from = (safePage - 1) * safeSize;
  return { from, to: from + safeSize - 1 };
}

export function totalPages(total: number, pageSize: number): number {
  if (total <= 0 || pageSize <= 0) return 0;
  return Math.ceil(total / pageSize);
}
