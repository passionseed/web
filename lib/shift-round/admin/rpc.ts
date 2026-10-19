import type { AdminError, AdminResult, ErrorCategory } from "./types";

/**
 * Minimal surface of a Supabase client this module needs. Tests pass a plain
 * object with a jest.fn() for `rpc`.
 */
export interface RpcResponse {
  data: unknown;
  error: { code?: string; message?: string; details?: string | null; hint?: string | null } | null;
  status?: number;
}

export interface RpcClient {
  rpc(name: string, args?: Record<string, unknown>): PromiseLike<RpcResponse>;
}

export function fail(
  code: string,
  category: ErrorCategory = code as ErrorCategory,
  extra: Partial<AdminError> = {},
): { ok: false; error: AdminError } {
  return { ok: false, error: { code, category, field: null, details: {}, ...extra } };
}

/**
 * Maps a transport-level PostgREST error (the RPC raised, is missing, or the
 * session is bad) onto the X5 categories. A missing function is `unavailable`,
 * never a business "not found".
 */
export function mapTransportError(
  error: NonNullable<RpcResponse["error"]>,
  status?: number,
): { ok: false; error: AdminError } {
  const code = error.code ?? "";
  const message = error.message ?? "";
  if (code === "PGRST202" || status === 404) {
    return fail("unavailable", "unavailable", { message });
  }
  if (status === 401 || code === "PGRST301" || code === "PGRST302" || /jwt/i.test(message)) {
    return fail("unauthenticated", "unauthenticated", { message });
  }
  if (status === 403 || code === "42501") {
    return fail("forbidden", "forbidden", { message });
  }
  return fail("retryable", "retryable", { message });
}

function isEnvelope(
  body: unknown,
): body is { ok: boolean; data?: unknown; error?: Partial<AdminError>; request_id?: string } {
  return typeof body === "object" && body !== null && "ok" in body;
}

/** Calls a `shift_round_*` RPC and normalizes the `{ok, data|error, request_id}` envelope. */
export async function callRpc<T>(
  client: RpcClient,
  name: string,
  args: Record<string, unknown> = {},
): Promise<AdminResult<T>> {
  let response: RpcResponse;
  try {
    response = await client.rpc(name, args);
  } catch (error) {
    return fail("retryable", "retryable", {
      message: error instanceof Error ? error.message : String(error),
    });
  }

  if (response.error) return mapTransportError(response.error, response.status);

  const body = response.data;
  if (!isEnvelope(body)) {
    return fail("unavailable", "unavailable", { message: `Unexpected response from ${name}` });
  }
  if (body.ok) {
    return { ok: true, data: (body.data ?? {}) as T, request_id: body.request_id };
  }
  const error = body.error ?? {};
  return {
    ok: false,
    error: {
      code: error.code ?? "unavailable",
      category: (error.category as ErrorCategory) ?? "validation",
      field: error.field ?? null,
      retry_after: error.retry_after ?? null,
      details: error.details ?? {},
      request_id: body.request_id,
    },
  };
}

/** Transforms the data of a successful result; errors pass through. */
export function mapResult<T, U>(result: AdminResult<T>, fn: (data: T) => U): AdminResult<U> {
  return result.ok ? { ok: true, data: fn(result.data), request_id: result.request_id } : result;
}

/** Accepts a bare array or `{ [key]: array }` from an RPC whose list shape is not pinned yet. */
export function listFrom<T>(data: unknown, key: string): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object") {
    const value = (data as Record<string, unknown>)[key];
    if (Array.isArray(value)) return value as T[];
  }
  return [];
}
