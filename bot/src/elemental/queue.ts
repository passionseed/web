/**
 * Keyed serial queues with 429-aware retry. One key runs one task at a time,
 * in order; different keys run side by side. Used for work that Discord or
 * the whiteboard rate-limits or that must not interleave:
 *
 * - channel creation, keyed by guild (E13: 175 teams can activate at once);
 * - canvas writes, keyed by board id (E18: two notes on one board must not
 *   race for the same fractional index).
 *
 * A Discord 429 waits for its retry_after (seconds in the raw error, ms on
 * @discordjs/rest's RateLimitError), a 5xx or network failure backs off
 * exponentially, anything else (a 403, a database refusal) fails at once.
 * discord.js already waits out most 429s inside REST; this is the second
 * layer for the ones it rejects (global or shared limits, rejectOnRateLimit).
 */

export interface RetryOptions {
  /** Total tries including the first. */
  maxAttempts?: number;
  /** First backoff for 5xx and network errors; doubles each try. */
  baseDelayMs?: number;
  maxDelayMs?: number;
  /** Injected in tests so no real time passes. */
  sleep?: (ms: number) => Promise<void>;
  /** Called before each wait, for a log line or a test. */
  onRetry?: (info: { attempt: number; delayMs: number; reason: string }) => void;
}

const DEFAULTS = { maxAttempts: 6, baseDelayMs: 1_000, maxDelayMs: 60_000 };
/** A little extra on top of retry_after, so the retry lands after the bucket resets. */
const RATE_LIMIT_PAD_MS = 250;

export const realSleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const NETWORK_CODES = new Set(["ECONNRESET", "ETIMEDOUT", "ECONNREFUSED", "EAI_AGAIN", "ENOTFOUND", "UND_ERR_CONNECT_TIMEOUT", "UND_ERR_SOCKET"]);

function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}

/** ms to wait from a 429, or null if the error is not a rate limit. */
export function rateLimitDelay(error: unknown): number | null {
  const e = error as {
    name?: string;
    status?: number;
    retryAfter?: unknown;
    retry_after?: unknown;
    rawError?: { retry_after?: unknown };
  } | null;
  if (!e || typeof e !== "object") return null;
  // @discordjs/rest RateLimitError: retryAfter in milliseconds.
  if (e.name === "RateLimitError" || (e.status === undefined && num(e.retryAfter) !== null)) {
    return num(e.retryAfter) ?? 1_000;
  }
  if (e.status !== 429) return null;
  // Discord's body: retry_after in seconds (may be fractional).
  const seconds = num(e.rawError?.retry_after) ?? num(e.retry_after);
  if (seconds !== null) return Math.ceil(seconds * 1000);
  return num(e.retryAfter) ?? 1_000;
}

function isTransient(error: unknown): boolean {
  const e = error as { status?: number; code?: string; name?: string } | null;
  if (!e || typeof e !== "object") return false;
  if (typeof e.status === "number") return e.status >= 500;
  if (typeof e.code === "string" && NETWORK_CODES.has(e.code)) return true;
  return e.name === "AbortError" || e.name === "ConnectTimeoutError";
}

/** How long to wait before the next try, or null to give up now. */
export function retryDelay(error: unknown, attempt: number, opts: RetryOptions = {}): number | null {
  const maxAttempts = opts.maxAttempts ?? DEFAULTS.maxAttempts;
  if (attempt >= maxAttempts) return null;
  const limited = rateLimitDelay(error);
  if (limited !== null) return limited + RATE_LIMIT_PAD_MS;
  if (!isTransient(error)) return null;
  const base = opts.baseDelayMs ?? DEFAULTS.baseDelayMs;
  const max = opts.maxDelayMs ?? DEFAULTS.maxDelayMs;
  return Math.min(max, base * 2 ** (attempt - 1));
}

/** Runs task, retrying 429s and transient failures. Rethrows the last error. */
export async function withRetry<T>(task: (attempt: number) => Promise<T>, opts: RetryOptions = {}): Promise<T> {
  const sleep = opts.sleep ?? realSleep;
  for (let attempt = 1; ; attempt++) {
    try {
      return await task(attempt);
    } catch (error) {
      const delayMs = retryDelay(error, attempt, opts);
      if (delayMs === null) throw error;
      opts.onRetry?.({ attempt, delayMs, reason: rateLimitDelay(error) !== null ? "rate_limited" : "transient" });
      await sleep(delayMs);
    }
  }
}

export interface KeyedQueue {
  /** Queues task behind every earlier task with the same key; resolves with its result. */
  run<T>(key: string, task: (attempt: number) => Promise<T>): Promise<T>;
  /** Tasks waiting or running for key (all keys when omitted). */
  pending(key?: string): number;
  /** Resolves once every queued task has settled. */
  idle(): Promise<void>;
  /** Refuses new tasks; resolves once queued ones have settled. */
  stop(): Promise<void>;
}

export function createKeyedQueue(name: string, opts: RetryOptions = {}): KeyedQueue {
  const tails = new Map<string, Promise<unknown>>();
  const counts = new Map<string, number>();
  let stopped = false;

  const onRetry =
    opts.onRetry ??
    ((info: { attempt: number; delayMs: number; reason: string }) =>
      console.warn(`[elemental] ${name} queue: ${info.reason}, retry ${info.attempt} in ${info.delayMs} ms`));

  async function idle(): Promise<void> {
    while (tails.size > 0) await Promise.all([...tails.values()]);
  }

  return {
    run<T>(key: string, task: (attempt: number) => Promise<T>): Promise<T> {
      if (stopped) return Promise.reject(new Error(`${name} queue is stopped`));
      counts.set(key, (counts.get(key) ?? 0) + 1);
      const previous = tails.get(key) ?? Promise.resolve();
      const result = previous.then(() => withRetry(task, { ...opts, onRetry }));
      // The chain must survive a failure, so the next task for this key still runs.
      const tail = result.then(
        () => undefined,
        () => undefined
      );
      tails.set(key, tail);
      void tail.then(() => {
        const left = (counts.get(key) ?? 1) - 1;
        if (left <= 0) counts.delete(key);
        else counts.set(key, left);
        if (tails.get(key) === tail) tails.delete(key);
      });
      return result;
    },
    pending(key?: string): number {
      if (key !== undefined) return counts.get(key) ?? 0;
      let total = 0;
      for (const n of counts.values()) total += n;
      return total;
    },
    idle,
    async stop(): Promise<void> {
      stopped = true;
      await idle();
    },
  };
}
