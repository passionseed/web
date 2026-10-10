/**
 * SeedStack consent, token and event storage. Server only: every call uses
 * the service-role client, so callers must authenticate the user first.
 */

import "server-only";

import { createServiceRoleClient } from "@/utils/supabase/server";
import {
  SEEDSTACK_NOTICE_VERSION,
  canLinkDevice,
  needsParent,
  seedstackConsentState,
  type SeedstackConsentRow,
  type SeedstackConsentState,
} from "@/lib/seedstack/consent";
import type { SeedstackEventInsert } from "@/lib/seedstack/events";
import { LINK_TTL_MS, generateDeviceCode, generateUserCode } from "@/lib/seedstack/link";
import {
  generateParentLinkToken,
  generateSeedstackToken,
  sha256Hex,
  tokenExpiry,
} from "@/lib/seedstack/tokens";

const CONSENT_COLUMNS =
  "user_id, notice_version, student_consented_at, birth_date, parent_name, parent_relationship, parent_consented_at, parent_declined_at, withdrawn_at";

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
 * re-agreeing after a withdrawal or a notice change asks the parent again.
 * Returns the raw parent link token when a parent must agree (only its hash
 * is stored), or null for students aged 20 and over.
 */
export async function recordStudentConsent(userId: string, birthDate: string): Promise<string | null> {
  const parentToken = needsParent(birthDate) ? generateParentLinkToken() : null;
  const { error } = await createServiceRoleClient()
    .from("seedstack_consents")
    .upsert(
      {
        user_id: userId,
        notice_version: SEEDSTACK_NOTICE_VERSION,
        student_consented_at: new Date().toISOString(),
        birth_date: birthDate,
        parent_token_hash: parentToken ? sha256Hex(parentToken) : null,
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
  const { data, error } = await createServiceRoleClient()
    .from("seedstack_consents")
    .update({ parent_token_hash: sha256Hex(parentToken), parent_declined_at: null })
    .eq("user_id", userId)
    .eq("notice_version", SEEDSTACK_NOTICE_VERSION)
    .is("parent_consented_at", null)
    .is("withdrawn_at", null)
    .select("user_id");
  if (error) throw new Error(`seedstack parent link rotate failed: ${error.message}`);
  if (!data?.length) throw new Error("seedstack parent link rotate failed: no open consent");
  return parentToken;
}

/** The parent's own answer, independent of the overall consent state. */
export type ParentDecision = "agreed" | "declined" | null;

export interface ParentLinkTarget {
  userId: string;
  state: SeedstackConsentState;
  parentDecision: ParentDecision;
  nickname: string | null;
}

/**
 * The student turned 20 before the parent answered: their own consent now
 * suffices, so the parent link must not offer a decision that no longer applies.
 */
export function parentNoLongerNeeded(target: ParentLinkTarget): boolean {
  return target.state === "active" && target.parentDecision !== "agreed";
}

function parentDecisionOf(row: SeedstackConsentRow): ParentDecision {
  if (row.parent_consented_at) return "agreed";
  if (row.parent_declined_at) return "declined";
  return null;
}

export async function findParentLinkTarget(rawToken: string): Promise<ParentLinkTarget | null> {
  const { data, error } = await createServiceRoleClient()
    .from("seedstack_consents")
    .select(CONSENT_COLUMNS)
    .eq("parent_token_hash", sha256Hex(rawToken))
    .maybeSingle();
  if (error) throw new Error(`seedstack parent link lookup failed: ${error.message}`);
  if (!data) return null;

  const row = data as SeedstackConsent;
  return {
    userId: row.user_id,
    state: seedstackConsentState(row),
    parentDecision: parentDecisionOf(row),
    nickname: await findShiftNickname(row.user_id),
  };
}

/**
 * Records the parent's answer. Open only until they agree: a declined parent
 * may still change to agree, but an agreed parent must withdraw instead, which
 * also deletes what was stored. False if the link is unusable or already agreed.
 */
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
    .is("parent_consented_at", null)
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

function assertWithdrawStep(result: { error: { message: string } | null }): void {
  if (result.error) throw new Error(`seedstack withdraw failed: ${result.error.message}`);
}

/**
 * Stops collection and erases what we hold. Keeps only the timestamps and
 * notice version as a record that consent was withdrawn.
 *
 * Order matters: consent first, then tokens, then data. In-flight writes
 * re-check consent after writing (see storeSeedstackEvents, pollLinkRequest),
 * so a write that re-checks before step 1 is erased by step 2 or 3, and one
 * that re-checks after step 1 sees the withdrawal and undoes itself.
 */
export async function withdrawSeedstackConsent(userId: string): Promise<void> {
  const supabase = createServiceRoleClient();
  const now = new Date().toISOString();

  assertWithdrawStep(
    await supabase
      .from("seedstack_consents")
      .update({
        withdrawn_at: now,
        parent_token_hash: null,
        birth_date: null,
        parent_name: null,
        parent_relationship: null,
      })
      .eq("user_id", userId),
  );
  assertWithdrawStep(
    await supabase.from("seedstack_tokens").update({ revoked_at: now }).eq("user_id", userId).is("revoked_at", null),
  );
  const erased = await Promise.all([
    supabase.from("seedstack_events").delete().eq("user_id", userId),
    // An approved link not yet collected would otherwise still mint a token.
    supabase.from("seedstack_link_requests").delete().eq("user_id", userId).is("consumed_at", null),
  ]);
  erased.forEach(assertWithdrawStep);
}

async function revokeSeedstackToken(raw: string): Promise<void> {
  const { error } = await createServiceRoleClient()
    .from("seedstack_tokens")
    .update({ revoked_at: new Date().toISOString() })
    .eq("token_hash", sha256Hex(raw));
  if (error) throw new Error(`seedstack token revoke failed: ${error.message}`);
}

export type TokenFailure = {
  ok: false;
  status: 401 | 403;
  error: "invalid_token" | "expired_token" | "consent_required" | "parent_required";
};

export type TokenCheck = { ok: true; userId: string; tokenId: string } | TokenFailure;

/**
 * Resolves a bearer to its owner and confirms consent is active. A linked
 * device whose parent has not agreed gets `parent_required`, so the skill
 * keeps events local and says why.
 */
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

  const state = seedstackConsentState(await getSeedstackConsent(token.user_id), now);
  if (state === "awaiting_parent" || state === "parent_declined") {
    return { ok: false, status: 403, error: "parent_required" };
  }
  if (state !== "active") return { ok: false, status: 403, error: "consent_required" };
  return { ok: true, userId: token.user_id, tokenId: token.id };
}

/** Inserts events, ignoring ones already synced. Returns the client ids that were new. */
async function insertSeedstackEvents(userId: string, events: SeedstackEventInsert[]): Promise<string[]> {
  const rows = events.map((e) => ({ ...e, user_id: userId }));
  const { data, error } = await createServiceRoleClient()
    .from("seedstack_events")
    .upsert(rows, { onConflict: "user_id,client_event_id", ignoreDuplicates: true })
    .select("client_event_id");
  if (error) throw new Error(`seedstack event insert failed: ${error.message}`);
  return (data ?? []).map((row) => row.client_event_id as string);
}

async function deleteSeedstackEvents(userId: string, clientEventIds: string[]): Promise<void> {
  if (!clientEventIds.length) return;
  const { error } = await createServiceRoleClient()
    .from("seedstack_events")
    .delete()
    .eq("user_id", userId)
    .in("client_event_id", clientEventIds);
  if (error) throw new Error(`seedstack event rollback failed: ${error.message}`);
}

async function touchSeedstackToken(tokenId: string): Promise<void> {
  const { error } = await createServiceRoleClient()
    .from("seedstack_tokens")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", tokenId);
  if (error) console.warn("[seedstack] token touch failed:", error.message);
}

/**
 * Stores events for the bearer's owner. Checks the token, inserts, then checks
 * again: if consent was withdrawn meanwhile, the new rows are deleted and the
 * caller gets the same error a fresh request would.
 */
export async function storeSeedstackEvents(
  rawToken: string,
  events: SeedstackEventInsert[],
): Promise<{ ok: true; stored: number } | TokenFailure> {
  const check = await checkSeedstackToken(rawToken);
  if (!check.ok) return check;
  if (!events.length) return { ok: true, stored: 0 };

  const inserted = await insertSeedstackEvents(check.userId, events);
  const recheck = await checkSeedstackToken(rawToken);
  if (!recheck.ok) {
    await deleteSeedstackEvents(check.userId, inserted);
    return recheck;
  }

  await touchSeedstackToken(check.tokenId);
  return { ok: true, stored: inserted.length };
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

  const stale = await createServiceRoleClient()
    .from("seedstack_link_requests")
    .delete()
    .lt("expires_at", new Date(now - 24 * 60 * 60 * 1000).toISOString());
  if (stale.error) console.warn("[seedstack] link request purge failed:", stale.error.message);

  return data?.length ?? 0;
}

/**
 * Any signed-in PassionSeed account can link SeedStack; a SHIFT seat is not
 * required. Returns the SHIFT nickname when the account has a paid seat, so
 * the page can greet them by it, else null.
 */
export async function findShiftNickname(userId: string): Promise<string | null> {
  const { data, error } = await createServiceRoleClient()
    .from("shift_applications")
    .select("nickname")
    .eq("user_id", userId)
    .not("paid_at", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`seedstack student lookup failed: ${error.message}`);
  return data?.nickname ?? null;
}

export async function createLinkRequest(): Promise<{ deviceCode: string; userCode: string; expiresAt: string }> {
  const supabase = createServiceRoleClient();
  const expiresAt = new Date(Date.now() + LINK_TTL_MS).toISOString();

  // Retry on the rare user-code collision with another open request.
  for (let attempt = 0; attempt < 3; attempt++) {
    const deviceCode = generateDeviceCode();
    const userCode = generateUserCode();
    const { error } = await supabase
      .from("seedstack_link_requests")
      .insert({ device_code_hash: sha256Hex(deviceCode), user_code: userCode, expires_at: expiresAt });
    if (!error) return { deviceCode, userCode, expiresAt };
    if (error.code !== "23505") throw new Error(`seedstack link start failed: ${error.message}`);
  }
  throw new Error("seedstack link start failed: code collisions");
}

/** Binds an open, unexpired request to the student. False if the code is unknown or stale. */
export async function approveLinkRequest(userId: string, userCode: string): Promise<boolean> {
  const { data, error } = await createServiceRoleClient()
    .from("seedstack_link_requests")
    .update({ user_id: userId, approved_at: new Date().toISOString() })
    .eq("user_code", userCode)
    .is("approved_at", null)
    .is("consumed_at", null)
    .gt("expires_at", new Date().toISOString())
    .select("id");
  if (error) throw new Error(`seedstack link approve failed: ${error.message}`);
  return (data?.length ?? 0) > 0;
}

export type LinkPoll = { status: "pending" } | { status: "expired" } | { status: "approved"; token: string };

/**
 * Mints the CLI token, then re-checks consent. A withdrawal racing the mint is
 * caught here, or by its own token revoke if it lands after this check.
 */
async function issueLinkedToken(userId: string): Promise<LinkPoll> {
  const token = await mintSeedstackToken(userId);
  if (canLinkDevice(seedstackConsentState(await getSeedstackConsent(userId)))) {
    return { status: "approved", token };
  }
  await revokeSeedstackToken(token);
  return { status: "expired" };
}

/** Atomically consumes an approved request and mints the CLI token exactly once. */
export async function pollLinkRequest(deviceCode: string): Promise<LinkPoll> {
  const supabase = createServiceRoleClient();
  const hash = sha256Hex(deviceCode);
  const now = new Date().toISOString();

  const { data: consumed, error } = await supabase
    .from("seedstack_link_requests")
    .update({ consumed_at: now })
    .eq("device_code_hash", hash)
    .not("approved_at", "is", null)
    .is("consumed_at", null)
    .gt("expires_at", now)
    .select("user_id")
    .maybeSingle();
  if (error) throw new Error(`seedstack link poll failed: ${error.message}`);
  if (consumed?.user_id) return issueLinkedToken(consumed.user_id);

  const { data: open, error: openError } = await supabase
    .from("seedstack_link_requests")
    .select("id")
    .eq("device_code_hash", hash)
    .is("consumed_at", null)
    .gt("expires_at", now)
    .maybeSingle();
  // A failed lookup must not read as "expired": the CLI would give up on a live request.
  if (openError) throw new Error(`seedstack link poll failed: ${openError.message}`);
  return open ? { status: "pending" } : { status: "expired" };
}
