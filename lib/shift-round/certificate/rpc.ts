import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  certificatePublicDataSchema,
  isValidPublicId,
  rpcEnvelopeSchema,
  snapshotV1Schema,
  type CertificateLookup,
} from "./types";

/**
 * Public certificate reads (spec 3.3, 6.1, E13). Always the anon key, never
 * the service role, and no cookies: the page and image are the same for every
 * visitor.
 */

type RpcClient = Pick<SupabaseClient, "rpc">;

export function createPublicClient(): RpcClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) throw new Error("supabase_not_configured");
  return createSupabaseClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

const RPC_TIMEOUT_MS = 8000;

function withTimeout<T>(promise: PromiseLike<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("rpc_timeout")), ms);
    Promise.resolve(promise).then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

/**
 * Look up a certificate. Only an explicit `certificate_not_found` (or an id
 * that cannot exist) is "not found"; every other failure is "error" so the
 * page shows web.error with a 5xx, never "not found" or "revoked".
 */
export async function fetchCertificate(
  publicId: string,
  client?: RpcClient
): Promise<CertificateLookup> {
  if (!isValidPublicId(publicId)) return { kind: "not_found", publicId };
  try {
    const supabase = client ?? createPublicClient();
    const { data, error } = await withTimeout(
      supabase.rpc("shift_round_certificate_public", { p_public_id: publicId }),
      RPC_TIMEOUT_MS
    );
    if (error) return { kind: "error", publicId, reason: `rpc:${error.code ?? "unknown"}` };

    const envelope = rpcEnvelopeSchema.safeParse(data);
    if (!envelope.success) return { kind: "error", publicId, reason: "bad_envelope" };
    if (!envelope.data.ok) {
      return envelope.data.error.code === "certificate_not_found"
        ? { kind: "not_found", publicId }
        : { kind: "error", publicId, reason: `code:${envelope.data.error.code}` };
    }

    const parsed = certificatePublicDataSchema.safeParse(envelope.data.data);
    if (!parsed.success) return { kind: "error", publicId, reason: "bad_data" };
    const cert = parsed.data;

    if (cert.tombstone) return { kind: "tombstone", publicId, data: { ...cert, snapshot: null, summary: null } };
    if (!cert.snapshot) return { kind: "error", publicId, reason: "missing_snapshot" };
    if (cert.status === "revoked") {
      return { kind: "revoked", publicId, data: { ...cert, summary: null }, snapshot: cert.snapshot };
    }
    // A valid certificate must carry the full v1 snapshot (holder, track, counts).
    const full = snapshotV1Schema.safeParse(cert.snapshot);
    if (!full.success) return { kind: "error", publicId, reason: "incomplete_snapshot" };
    return { kind: "valid", publicId, data: cert, snapshot: full.data };
  } catch (error) {
    return {
      kind: "error",
      publicId,
      reason: error instanceof Error ? error.message.slice(0, 60) : "unknown",
    };
  }
}

const BOT_RE =
  /bot|crawl|spider|slurp|facebookexternalhit|facebot|whatsapp|telegram|discord|slack|linkedin|embedly|preview|vercel-screenshot|headless|lighthouse|pingdom|uptime|curl|wget|python-requests|go-http-client|node-fetch|axios/i;

export function isBotUserAgent(ua: string | null | undefined): boolean {
  if (!ua) return true;
  return BOT_RE.test(ua);
}

/** Raw ref is passed through; the RPC normalizes it to share/qr/link/other. */
export function cleanRef(ref: unknown): string | null {
  const value = Array.isArray(ref) ? ref[0] : ref;
  if (typeof value !== "string" || !value) return null;
  return value.slice(0, 32);
}

export async function logCertificateVisit(
  publicId: string,
  ref: string | null,
  client?: RpcClient
): Promise<void> {
  try {
    const supabase = client ?? createPublicClient();
    await withTimeout(
      supabase.rpc("shift_round_log_certificate_visit", { p_public_id: publicId, p_ref: ref }),
      RPC_TIMEOUT_MS
    );
  } catch {
    // Visit counting is best effort and must never break the page.
  }
}

/** Thrown by the verify page so the request fails with a 5xx and error.tsx shows web.error. */
export class CertificateUnavailableError extends Error {
  constructor(reason: string) {
    super(`shift_certificate_unavailable:${reason}`);
    this.name = "CertificateUnavailableError";
  }
}
