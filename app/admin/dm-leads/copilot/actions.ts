/**
 * Token mint/revoke server actions for /admin/dm-leads/copilot.
 *
 * The raw token is returned to the client exactly once and never persisted;
 * we keep sha256(raw) in `token_hash`. Every read selects only the metadata
 * columns the admin UI needs, so the hash never reaches the browser.
 *
 * Mint and revoke return a result instead of throwing: Next.js hides thrown
 * server-action messages in production, so the UI could not say what failed.
 */

"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import {
  generateCopilotToken,
  hashCopilotToken,
  DEFAULT_TOKEN_TTL_DAYS,
  type CopilotTokenRow,
} from "@/lib/supabase/dm-copilot-tokens";

/** A token row without its hash: the only shape sent to the browser. */
export type CopilotTokenSummary = Omit<CopilotTokenRow, "token_hash">;

export type CopilotActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

/** Raw bearer (shown once) plus the new row. */
export type MintedTokenSummary = { raw: string; row: CopilotTokenSummary };

const SUMMARY_COLUMNS = "id, user_id, name, last_used_at, expires_at, revoked_at, created_at";

/**
 * Minimum Supabase surface we reach for. Kept structural so the action layer
 * does not have to import the heavy SupabaseClient generic — that generic
 * fights structural typing and obscures intent.
 */
type SupabaseQueryResult<T> = Promise<{ data: T | null; error: unknown | null }>;
interface AdminClient {
  from(table: "dm_copilot_tokens"): {
    insert(row: Record<string, unknown>): {
      select(cols: string): { single(): SupabaseQueryResult<CopilotTokenSummary> };
    };
    update(patch: { revoked_at: string }): {
      eq(col: "id", value: string): {
        eq(col: "user_id", value: string): { is(col: "revoked_at", value: null): SupabaseQueryResult<unknown> };
      };
    };
    select(cols: string): {
      eq(col: "user_id", value: string): {
        order(col: "created_at", opts: { ascending: boolean }): SupabaseQueryResult<CopilotTokenSummary[]>;
      };
    };
  };
}

async function adminDb(): Promise<{ userId: string; admin: AdminClient }> {
  const user = await requireAdmin();
  const { createAdminClient } = await import("@/utils/supabase/admin");
  return { userId: user.id, admin: createAdminClient() as unknown as AdminClient };
}

export async function createCopilotTokenAction(input: {
  name: string;
  ttlDays?: number;
}): Promise<CopilotActionResult<MintedTokenSummary>> {
  const { userId, admin } = await adminDb();
  const name = input.name.trim().slice(0, 80);
  if (!name) return { ok: false, error: "ตั้งชื่อ token ก่อน (e.g. 'boon macbook')" };
  const ttl = Math.max(1, Math.min(input.ttlDays ?? DEFAULT_TOKEN_TTL_DAYS, 365));
  const raw = generateCopilotToken();
  const tokenHash = hashCopilotToken(raw);
  const expiresAt = new Date(Date.now() + ttl * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await admin
    .from("dm_copilot_tokens")
    .insert({
      user_id: userId,
      name,
      token_hash: tokenHash,
      expires_at: expiresAt,
    })
    .select(SUMMARY_COLUMNS)
    .single();

  if (error || !data) {
    console.error("[copilot actions] mint failed:", error);
    return { ok: false, error: "สร้าง token ไม่สำเร็จ ลองอีกครั้ง" };
  }

  revalidatePath("/admin/dm-leads/copilot");
  return { ok: true, data: { raw, row: data } };
}

export async function revokeCopilotTokenAction(tokenId: string): Promise<CopilotActionResult> {
  const { userId, admin } = await adminDb();
  if (!tokenId) return { ok: false, error: "ไม่พบ token นี้" };

  const { error } = await admin
    .from("dm_copilot_tokens")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", tokenId)
    .eq("user_id", userId)
    .is("revoked_at", null);

  if (error) {
    console.error("[copilot actions] revoke failed:", error);
    return { ok: false, error: "revoke token ไม่สำเร็จ ลองอีกครั้ง" };
  }
  revalidatePath("/admin/dm-leads/copilot");
  return { ok: true, data: undefined };
}

export async function listCopilotTokensAction(): Promise<CopilotTokenSummary[]> {
  const { userId, admin } = await adminDb();
  const { data, error } = await admin
    .from("dm_copilot_tokens")
    .select(SUMMARY_COLUMNS)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[copilot actions] list failed:", error);
    throw new Error("โหลดรายการ token ไม่สำเร็จ");
  }
  return data ?? [];
}
