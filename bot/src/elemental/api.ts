import type pg from "pg";

/**
 * The Elemental module's only door into the database: public.elemental_bot_*
 * functions, called as the least-privilege elemental_bot login (it may
 * execute those and read no table). Every rule that matters (who may claim,
 * team sizes, slots, caps, PII) is enforced in SQL, so this layer stays thin.
 *
 * Errors the functions raise on purpose carry a bare code as the whole
 * message, optionally prefixed: RAISE EXCEPTION 'el:island_full' (or
 * 'island_full'). Those become ElementalError(code). Anything else is logged
 * by function name and SQLSTATE only: messages can contain student text.
 */

export const CALLABLE = /^elemental_bot_[a-z_]+$/;

/** A rule the database (or the bot, before calling it) refused. */
export class ElementalError extends Error {
  constructor(
    public readonly code: string,
    public readonly detail?: string,
    public readonly fn?: string
  ) {
    super(`el:${code}`);
    this.name = "ElementalError";
  }
}

/** Any other database failure: function name and SQLSTATE only, never the message. */
export class ElementalDbError extends Error {
  constructor(
    public readonly fn: string,
    public readonly sqlstate: string
  ) {
    super(`${fn} failed`);
    this.name = "ElementalDbError";
  }
}

export interface ElementalApi {
  /** select public.<fn>($1, ...) as r: one value (jsonb, scalar or null). */
  call<T = unknown>(fn: string, ...args: unknown[]): Promise<T>;
  /** select * from public.<fn>($1, ...): a set-returning function. */
  rows<T = Record<string, unknown>>(fn: string, ...args: unknown[]): Promise<T[]>;
}

/** Throws before any network call unless fn is an elemental_bot_* function name. */
export function assertCallable(fn: string): void {
  if (typeof fn !== "string" || !CALLABLE.test(fn) || fn.startsWith("elemental_bot__")) {
    throw new Error(`Not a callable elemental function: ${String(fn).slice(0, 64)}`);
  }
}

function placeholders(args: unknown[]): string {
  return args.map((_, i) => `$${i + 1}`).join(", ");
}

/** Lock waits that lost a race or ran out of time: safe to try again. */
const RETRYABLE_SQLSTATES = new Set(["40P01", "40001", "55P03", "57014"]);

const RAISED = /^(?:el:)?([a-z][a-z0-9_]*)$/;

/** node-postgres' message when query_timeout fires (the connection is then dropped). */
const READ_TIMEOUT = "Query read timeout";

export function toElementalError(error: unknown, fn: string): Error {
  const err = error as { message?: string; detail?: string; code?: string };
  if (err?.message === READ_TIMEOUT) {
    console.error(`[elemental] ${fn} busy (no answer in time)`);
    return new ElementalError("busy", undefined, fn);
  }
  const match = RAISED.exec((err?.message ?? "").trim());
  if (match) return new ElementalError(match[1], err.detail, fn);
  if (err?.code && RETRYABLE_SQLSTATES.has(err.code)) {
    console.error(`[elemental] ${fn} busy (SQLSTATE ${err.code})`);
    return new ElementalError("busy", undefined, fn);
  }
  console.error(`[elemental] ${fn} failed (SQLSTATE ${err?.code ?? "unknown"})`);
  return new ElementalDbError(fn, err?.code ?? "unknown");
}

/** The pool's one method this layer uses, so tests pass a fake. */
export type Queryable = Pick<pg.Pool, "query">;

/**
 * How long one call may wait for its answer. A database that stops answering
 * must not leave a deferred reply "thinking" for Discord's whole 15 minutes:
 * after this the person sees the "busy" line and may try again, so a write
 * that did land late must be safe to repeat (the SQL contract for every
 * elemental_bot_* write). pg-pool drops that connection.
 */
export const QUERY_TIMEOUT_MS = 15_000;

export function createElementalApi(pool: Queryable, opts: { queryTimeoutMs?: number } = {}): ElementalApi {
  const timeout = opts.queryTimeoutMs ?? QUERY_TIMEOUT_MS;
  async function query(fn: string, sql: string, args: unknown[]): Promise<pg.QueryResult> {
    try {
      return await pool.query({ text: sql, values: args, query_timeout: timeout } as pg.QueryConfig);
    } catch (error) {
      throw toElementalError(error, fn);
    }
  }

  return {
    async call<T>(fn: string, ...args: unknown[]): Promise<T> {
      assertCallable(fn);
      const { rows } = await query(fn, `select public.${fn}(${placeholders(args)}) as r`, args);
      return rows[0]?.r as T;
    },
    async rows<T>(fn: string, ...args: unknown[]): Promise<T[]> {
      assertCallable(fn);
      const { rows } = await query(fn, `select * from public.${fn}(${placeholders(args)})`, args);
      return rows as T[];
    },
  };
}
