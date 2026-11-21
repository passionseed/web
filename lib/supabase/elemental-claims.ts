import "server-only";

import { createAdminClient } from "@/utils/supabase/admin";

/**
 * Elemental /join codes (elemental_claims, E09) for the registrant's paid page
 * and the admin sign-up card. Service-role reads, like
 * lib/supabase/hackathon-event-registrations.ts: the pay page holds only a
 * pay token and the admin page calls requireAdmin() first.
 *
 * A code is joined to its registration member row for the position and the
 * registration id only. Nothing else about the person is read here: the page
 * already has the names the registrant typed in, and the card has its own
 * admin data. This file never selects another member column (a jest grep
 * test holds that).
 *
 * Self-contained on purpose: E36 cherry-picks this onto main before the rest
 * of Elemental, so it imports nothing from lib/elemental or the bot. Until the
 * migration is pushed the table is missing; every read then returns null and
 * the pages show what they showed before.
 */

/** The real hackathon edition. Its key equals the event slug (ELEMENTAL.slug in facts.ts). */
export const ELEMENTAL_CLAIM_EDITION = "elemental-2026";

const MEMBER_JOIN = "hackathon_event_registration_members!inner(position, registration_id)";
const PAGE_SIZE = 1000;

/** One member position's /join code. */
export interface MemberClaimCode {
  position: number;
  code: string;
  /** A Discord account already used this code. */
  claimed: boolean;
}

/** How many of a registration's codes were used, out of how many were issued. */
export interface ClaimCount {
  claimed: number;
  issued: number;
}

type MemberRef = { position: number; registrationId: string };

/** The embedded member row: PostgREST returns an object for a to-one join, but read an array too. */
function memberRef(value: unknown): MemberRef | null {
  const m = (Array.isArray(value) ? value[0] : value) as Record<string, unknown> | null | undefined;
  if (!m || typeof m !== "object") return null;
  const position = m.position;
  const registrationId = m.registration_id;
  if (typeof position !== "number" || !Number.isInteger(position) || position < 1) return null;
  if (typeof registrationId !== "string" || !registrationId) return null;
  return { position, registrationId };
}

function rowOf(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

/**
 * Claim rows to one code per position, in position order. Rows of another
 * registration, or without a usable code or position, are dropped; if a
 * position somehow came back twice, the first code is kept.
 */
export function toMemberClaimCodes(rows: unknown, registrationId: string): MemberClaimCode[] {
  const byPosition = new Map<number, MemberClaimCode>();
  for (const value of Array.isArray(rows) ? rows : []) {
    const row = rowOf(value);
    const ref = row && memberRef(row.hackathon_event_registration_members);
    if (!row || !ref || ref.registrationId !== registrationId) continue;
    if (typeof row.code !== "string" || !/^[A-Z0-9]{8}$/.test(row.code)) continue;
    if (byPosition.has(ref.position)) continue;
    byPosition.set(ref.position, { position: ref.position, code: row.code, claimed: row.used_at != null });
  }
  return [...byPosition.values()].sort((a, b) => a.position - b.position);
}

/** Claim rows to used/issued counts per registration id. */
export function toClaimCounts(rows: unknown): Map<string, ClaimCount> {
  const counts = new Map<string, ClaimCount>();
  for (const value of Array.isArray(rows) ? rows : []) {
    const row = rowOf(value);
    const ref = row && memberRef(row.hackathon_event_registration_members);
    if (!row || !ref) continue;
    const c = counts.get(ref.registrationId) ?? { claimed: 0, issued: 0 };
    c.issued += 1;
    if (row.used_at != null) c.claimed += 1;
    counts.set(ref.registrationId, c);
  }
  return counts;
}

function logFailure(what: string, error: unknown) {
  const code =
    error && typeof error === "object" && "code" in error
      ? String((error as { code?: unknown }).code ?? "unknown")
      : error instanceof Error
        ? error.name
        : "unknown";
  console.error(`[elemental-claims] ${what} failed: ${code}`);
}

/**
 * The registration's /join codes by member position, or null when they can't
 * be read (migration not pushed yet, env missing, database down). An empty
 * list means no codes were issued yet.
 */
export async function getMemberClaimCodes(
  registrationId: string,
  edition: string = ELEMENTAL_CLAIM_EDITION,
): Promise<MemberClaimCode[] | null> {
  try {
    const { data, error } = await createAdminClient()
      .from("elemental_claims")
      .select(`code, used_at, ${MEMBER_JOIN}`)
      .eq("edition", edition)
      .eq("kind", "member")
      .eq("hackathon_event_registration_members.registration_id", registrationId);
    if (error) {
      logFailure("codes read", error);
      return null;
    }
    return toMemberClaimCodes(data, registrationId);
  } catch (error) {
    logFailure("codes read", error);
    return null;
  }
}

/**
 * Used and issued code counts for every registration of the edition, keyed by
 * registration id, or null when they can't be read. Read in pages so a full
 * event never hits the API's row cap.
 */
export async function getClaimCounts(
  edition: string = ELEMENTAL_CLAIM_EDITION,
): Promise<Map<string, ClaimCount> | null> {
  try {
    const db = createAdminClient();
    const rows: unknown[] = [];
    for (let from = 0; ; from += PAGE_SIZE) {
      const { data, error } = await db
        .from("elemental_claims")
        .select(`id, used_at, ${MEMBER_JOIN}`)
        .eq("edition", edition)
        .eq("kind", "member")
        .order("id")
        .range(from, from + PAGE_SIZE - 1);
      if (error) {
        logFailure("counts read", error);
        return null;
      }
      const page = Array.isArray(data) ? data : [];
      rows.push(...page);
      if (page.length < PAGE_SIZE) break;
    }
    return toClaimCounts(rows);
  } catch (error) {
    logFailure("counts read", error);
    return null;
  }
}
