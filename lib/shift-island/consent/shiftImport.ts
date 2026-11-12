import "server-only";

import type { QuestApi } from "@/bot/src/quests/api";
import { parentConsentState, type ParentConsentRow } from "@/lib/shift/parentConsent";
import type { IslandConsent } from "@/lib/supabase/shift-quests/playerTypes";
import { createAdminClient } from "@/utils/supabase/admin";

/**
 * Recognises consent the student already gave when they applied to SHIFT,
 * so a parent who agreed there is not asked twice. Reads the viewer's own
 * newest shift_applications row (service-role client, by the Supabase user
 * id from getUser()) and records it on the island through
 * shift_quest_consent_import:
 *
 * - agreed: imports shift_parent. Never with AI news: SHIFT's separate AI
 *   tick (parent_ai_consented_at) covers short progress notes to the
 *   mentor, not AI summaries shown on the island and in Discord. The island
 *   asks the parent for its own AI line (an AI link from the consent sheet).
 * - not_needed (20 or older at SHIFT's age): imports shift_adult.
 * - withdrawn: withdraws an imported consent (the database leaves an island
 *   parent or adult basis alone).
 * - legacy, waiting, declined, no application: nothing.
 *
 * Server only. Never reads or returns contact details.
 */

export type ShiftConsentRow = ParentConsentRow & {
  parent_ai_consented_at: string | null;
  created_at: string;
};

export interface ShiftImport {
  basis: "shift_parent" | "shift_adult";
  /** When the SHIFT answer was given (the withdrawal time for a withdrawal). */
  decidedAt: string;
  ai: boolean;
  withdrawn: boolean;
}

/** Only the consent columns: no names, contacts or answers leave the table. */
const COLUMNS =
  "birth_date, consent_notice_version, parent_consented_at, parent_declined_at, parent_withdrawn_at, parent_ai_consented_at, created_at";

/** Thrown (and logged by the caller as a code) when the SHIFT lookup fails. */
export class ShiftImportError extends Error {
  constructor(public readonly code: "unconfigured" | "lookup_failed") {
    super(`shift consent import ${code}`);
    this.name = "ShiftImportError";
  }
}

/** What the SHIFT application says the island should record, or null for nothing. */
export function shiftImportFor(row: ShiftConsentRow | null, now = Date.now()): ShiftImport | null {
  if (!row) return null;
  switch (parentConsentState(row, now)) {
    case "agreed":
      return {
        basis: "shift_parent",
        decidedAt: row.parent_consented_at as string,
        ai: false,
        withdrawn: false,
      };
    case "not_needed":
      return { basis: "shift_adult", decidedAt: row.created_at, ai: false, withdrawn: false };
    case "withdrawn":
      return { basis: "shift_parent", decidedAt: row.parent_withdrawn_at as string, ai: false, withdrawn: true };
    default:
      return null;
  }
}

/**
 * True when the island already says what the import would write, so a page
 * load does not write the same row again. Only skips when the current state
 * is known to match; when in doubt it imports (the database is idempotent).
 */
export function importIsNoop(current: IslandConsent, plan: ShiftImport): boolean {
  const imported = current.basis === "shift_parent" || current.basis === "shift_adult";
  if (plan.withdrawn) return !imported || current.state === "withdrawn";
  // An import never carries AI news, so the basis alone says whether it is already on file.
  return current.state === "granted" && current.basis === plan.basis;
}

/**
 * Whole years old at `today` (YYYY-MM-DD, Bangkok) for a YYYY-MM-DD birth
 * date, or null when either is not one. confirmAdult uses it to refuse a
 * self-confirmed adult age that the student's own SHIFT application
 * contradicts.
 */
export function ageOn(birthDate: string | null | undefined, today: string): number | null {
  const b = /^(\d{4})-(\d{2})-(\d{2})/.exec(birthDate ?? "");
  const t = /^(\d{4})-(\d{2})-(\d{2})$/.exec(today);
  if (!b || !t) return null;
  const [by, bm, bd] = [Number(b[1]), Number(b[2]), Number(b[3])];
  const [ty, tm, td] = [Number(t[1]), Number(t[2]), Number(t[3])];
  return ty - by - (tm < bm || (tm === bm && td < bd) ? 1 : 0);
}

/** The viewer's newest SHIFT application's consent columns, or null when they never applied. */
export async function lookupShiftConsent(userId: string): Promise<ShiftConsentRow | null> {
  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch {
    throw new ShiftImportError("unconfigured");
  }
  const { data, error } = await admin
    .from("shift_applications")
    .select(COLUMNS)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new ShiftImportError("lookup_failed");
  return (data as ShiftConsentRow | null) ?? null;
}

/**
 * Looks up SHIFT consent and records it on the island. Returns the raw
 * shift_quest_consent_import result (the consent_get shape), or null when
 * there was nothing to record. Throws ShiftImportError, QuestError or
 * QuestDbError; consentOf turns those into a logged code.
 */
export async function importShiftConsent(
  api: QuestApi,
  viewer: { actor: string; userId: string },
  current: IslandConsent,
): Promise<unknown | null> {
  const plan = shiftImportFor(await lookupShiftConsent(viewer.userId));
  if (!plan || importIsNoop(current, plan)) return null;
  return api.call<unknown>("shift_quest_consent_import", viewer.actor, plan.basis, plan.decidedAt, plan.ai, plan.withdrawn);
}
