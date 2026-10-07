/**
 * SeedStack consent, token and event storage. Server only: every call uses
 * the service-role client, so callers must authenticate the user first.
 */

import "server-only";

import { createServiceRoleClient } from "@/utils/supabase/server";
import {
  SEEDSTACK_NOTICE_VERSION,
  seedstackConsentState,
  type SeedstackConsentRow,
  type SeedstackConsentState,
} from "@/lib/seedstack/consent";
import type { SeedstackEventInsert } from "@/lib/seedstack/events";
import {
  generateParentLinkToken,
  generateSeedstackToken,
  sha256Hex,
  tokenExpiry,
} from "@/lib/seedstack/tokens";

const CONSENT_COLUMNS =
  "user_id, notice_version, student_consented_at, parent_name, parent_relationship, parent_consented_at, parent_declined_at, withdrawn_at";

export interface SeedstackConsent extends SeedstackConsentRow {
  user_id: string;
  parent_name: string | null;
  parent_relationship: string | null;
}

export async function getSeedstackConsent(userId: string): Promise<SeedstackConsent | null> {
  const { data, error } = await createServiceRoleClient()
    .from("seedstack_consents")
    .select(CONSENT_COLUMNS)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(`seedstack consent lookup failed: ${error.message}`);
  return data as SeedstackConsent | null;
}

/**
 * Student agrees to the current notice. Resets any earlier parent answer, so
 * re-consenting after a withdrawal or a notice change asks the parent again.
 * Returns the raw parent link token (only its hash is stored).
 */
export async function recordStudentConsent(userId: string): Promise<string> {
  const parentToken = generateParentLinkToken();
  const { error } = await createServiceRoleClient()
    .from("seedstack_consents")
    .upsert(
      {
        user_id: userId,
        notice_version: SEEDSTACK_NOTICE_VERSION,
        student_consented_at: new Date().toISOString(),
        parent_token_hash: sha256Hex(parentToken),
        parent_name: null,
        parent_relationship: null,
        parent_consented_at: null,
        parent_declined_at: null,
        withdrawn_at: null,
      },
      { onConflict: "user_id" },
    );
  if (error) throw new Error(`seedstack student consent failed: ${error.message}`);
  return parentToken;
}

/** New parent link for a student still waiting on (or declined by) a parent. */
export async function rotateParentLink(userId: string): Promise<string> {
  const parentToken = generateParentLinkToken();
  const { error } = await createServiceRoleClient()
    .from("seedstack_consents")
    .update({ parent_token_hash: sha256Hex(parentToken), parent_declined_at: null })
    .eq("user_id", userId)
    .is("parent_consented_at", null);
  if (error) throw new Error(`seedstack parent link rotate failed: ${error.message}`);
  return parentToken;
}

export interface ParentLinkTarget {
  userId: string;
  state: SeedstackConsentState;
  nickname: string | null;
}

export async function findParentLinkTarget(rawToken: string): Promise<ParentLinkTarget | null> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("seedstack_consents")
    .select(CONSENT_COLUMNS)
    .eq("parent_token_hash", sha256Hex(rawToken))
    .maybeSingle();
  if (error) throw new Error(`seedstack parent link lookup failed: ${error.message}`);
  if (!data) return null;

  const row = data as SeedstackConsent;
  const { data: app } = await supabase
    .from("shift_applications")
    .select("nickname")
    .eq("user_id", row.user_id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return { userId: row.user_id, state: seedstackConsentState(row), nickname: app?.nickname ?? null };
}

export async function recordParentDecision(params: {
  rawToken: string;
  agree: boolean;
  parentName: string;
  relationship: string;
}): Promise<boolean> {
  const now = new Date().toISOString();
  const { data, error } = await createServiceRoleClient()
    .from("seedstack_consents")
    .update({
      parent_name: params.parentName,
      parent_relationship: params.relationship,
      parent_consented_at: params.agree ? now : null,
      parent_declined_at: params.agree ? null : now,
    })
    .eq("parent_token_hash", sha256Hex(params.rawToken))
    .eq("notice_version", SEEDSTACK_NOTICE_VERSION)
    .is("withdrawn_at", null)
    .not("student_consented_at", "is", null)
    .select("user_id");
  if (error) throw new Error(`seedstack parent decision failed: ${error.message}`);
  return (data?.length ?? 0) > 0;
}

/** Mints a CLI token. Caller must have checked consent is active. */
export async function mintSeedstackToken(userId: string): Promise<string> {
  const raw = generateSeedstackToken();
  const { error } = await createServiceRoleClient()
    .from("seedstack_tokens")
    .insert({ user_id: userId, token_hash: sha256Hex(raw), expires_at: tokenExpiry() });
  if (error) throw new Error(`seedstack token mint failed: ${error.message}`);
  return raw;
}

/** Stops collection and erases what we hold: tokens revoked, events deleted. */
export async function withdrawSeedstackConsent(userId: string): Promise<void> {
  const supabase = createServiceRoleClient();
  const now = new Date().toISOString();
  const results = await Promise.all([
    supabase.from("seedstack_consents").update({ withdrawn_at: now, parent_token_hash: null }).eq("user_id", userId),
    supabase.from("seedstack_tokens").update({ revoked_at: now }).eq("user_id", userId).is("revoked_at", null),
    supabase.from("seedstack_events").delete().eq("user_id", userId),
  ]);
  const failed = results.find((r) => r.error);
  if (failed?.error) throw new Error(`seedstack withdraw failed: ${failed.error.message}`);
}

export type TokenCheck =
  | { ok: true; userId: string; tokenId: string }
  | { ok: false; status: 401 | 403; error: "invalid_token" | "expired_token" | "consent_required" };

/** Resolves a bearer to its owner and confirms consent is still active. */
export async function checkSeedstackToken(raw: string, now = Date.now()): Promise<TokenCheck> {
  const supabase = createServiceRoleClient();
  const { data: token, error } = await supabase
    .from("seedstack_tokens")
    .select("id, user_id, expires_at, revoked_at")
    .eq("token_hash", sha256Hex(raw))
    .maybeSingle();
  if (error) throw new Error(`seedstack token lookup failed: ${error.message}`);
  if (!token || token.revoked_at) return { ok: false, status: 401, error: "invalid_token" };
  if (Date.parse(token.expires_at) <= now) return { ok: false, status: 401, error: "expired_token" };

  const consent = await getSeedstackConsent(token.user_id);
  if (seedstackConsentState(consent) !== "active") {
    return { ok: false, status: 403, error: "consent_required" };
  }
  return { ok: true, userId: token.user_id, tokenId: token.id };
}

/** Inserts events, ignoring ones already synced. Returns how many were new. */
export async function storeSeedstackEvents(
  userId: string,
  tokenId: string,
  events: SeedstackEventInsert[],
): Promise<number> {
  const supabase = createServiceRoleClient();
  const rows = events.map((e) => ({ ...e, user_id: userId }));
  const { data, error } = await supabase
    .from("seedstack_events")
    .upsert(rows, { onConflict: "user_id,client_event_id", ignoreDuplicates: true })
    .select("id");
  if (error) throw new Error(`seedstack event insert failed: ${error.message}`);

  const touch = await supabase
    .from("seedstack_tokens")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", tokenId);
  if (touch.error) console.warn("[seedstack] token touch failed:", touch.error.message);

  return data?.length ?? 0;
}

/** Retention: deletes events older than `days`. Returns rows removed. */
export async function purgeOldSeedstackEvents(days: number, now = Date.now()): Promise<number> {
  const cutoff = new Date(now - days * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await createServiceRoleClient()
    .from("seedstack_events")
    .delete()
    .lt("created_at", cutoff)
    .select("id");
  if (error) throw new Error(`seedstack retention purge failed: ${error.message}`);
  return data?.length ?? 0;
}
