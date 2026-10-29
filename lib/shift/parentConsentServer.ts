/**
 * SHIFT parent consent storage and email. Server only: every call uses the
 * service-role client. The parent has no account; the link token is the
 * credential, and only its sha256 is stored.
 */

import "server-only";

import { getShiftCohortByName } from "@/lib/content/shift-cohort";
import { SEEDSTACK_NOTICE_VERSION } from "@/lib/seedstack/consent";
import { generateParentLinkToken, sha256Hex } from "@/lib/seedstack/tokens";
import { buildShiftParentEmail } from "@/lib/shift/parentEmail";
import { siteUrl } from "@/lib/shift/notifyDiscord";
import { configuredParentEmailTransport } from "@/lib/trials/parent-email";
import { createAdminClient } from "@/utils/supabase/admin";
import type { ShiftApplicationRow } from "@/types/shift";

export const SHIFT_PARENT_PREFIX = "/shift/parent/";

export function shiftParentUrl(token: string): string {
  return `${siteUrl()}${SHIFT_PARENT_PREFIX}${token}`;
}

/** A fresh link: the raw token goes in the email, the hash in the row. */
export function newShiftParentLink(): { token: string; hash: string } {
  const token = generateParentLinkToken();
  return { token, hash: sha256Hex(token) };
}

export async function findShiftParentTarget(rawToken: string): Promise<ShiftApplicationRow | null> {
  if (rawToken.length < 32) return null;
  const { data, error } = await createAdminClient()
    .from("shift_applications")
    .select("*")
    .eq("parent_token_hash", sha256Hex(rawToken))
    .maybeSingle();
  if (error) throw new Error(`shift parent link lookup failed: ${error.message}`);
  return (data as ShiftApplicationRow | null) ?? null;
}

/**
 * Emails the parent link and stamps parent_email_sent_at. Best effort:
 * false when Resend is not configured or refuses, so the admin page shows
 * "not sent" and the admin can copy the link to LINE instead.
 */
export async function sendShiftParentEmail(
  app: Pick<ShiftApplicationRow, "cohort" | "nickname" | "full_name" | "parent_email">,
  rawToken: string,
): Promise<boolean> {
  const cohort = getShiftCohortByName(app.cohort);
  if (!app.parent_email || !cohort) return false;

  const email = buildShiftParentEmail({
    nickname: app.nickname,
    fullName: app.full_name,
    cohort,
    url: shiftParentUrl(rawToken),
  });
  const result = await configuredParentEmailTransport().send({
    to: app.parent_email,
    ...email,
    idempotencyKey: `shift-parent-${sha256Hex(rawToken).slice(0, 32)}`,
  });
  if (!result.ok) {
    console.error(`[shift-parent] email not sent: ${result.code}`);
    return false;
  }

  const { error } = await createAdminClient()
    .from("shift_applications")
    .update({ parent_email_sent_at: new Date().toISOString() })
    .eq("parent_token_hash", sha256Hex(rawToken));
  if (error) console.error("[shift-parent] failed to record email sent:", error.message);
  return true;
}

/** Replaces the link (the old one stops working) and returns the new raw token. */
export async function rotateShiftParentLink(applicationId: string): Promise<{ token: string; app: ShiftApplicationRow }> {
  const { token, hash } = newShiftParentLink();
  const { data, error } = await createAdminClient()
    .from("shift_applications")
    .update({ parent_token_hash: hash })
    .eq("id", applicationId)
    .select()
    .single();
  if (error) throw new Error(`shift parent link rotate failed: ${error.message}`);
  return { token, app: data as ShiftApplicationRow };
}

export interface ParentSignature {
  parentName: string;
  relationship: string;
  ip: string | null;
  userAgent: string | null;
}

export interface ParentAnswer {
  agree: boolean;
  /** The separate, optional tick for AI progress tracking. Ignored when declining. */
  aiAgreed: boolean;
}

/**
 * Records the parent's answer with what they typed and where they answered
 * from, the evidence for an electronic signature. Open until they agree: a
 * declined parent may change to agree, an agreed one withdraws instead.
 * False if the link is unusable or already agreed.
 */
export async function recordShiftParentDecision(
  rawToken: string,
  { agree, aiAgreed }: ParentAnswer,
  signature: ParentSignature,
): Promise<boolean> {
  const now = new Date().toISOString();
  const ai = agree && aiAgreed;
  const { data, error } = await createAdminClient()
    .from("shift_applications")
    .update({
      parent_name: signature.parentName,
      parent_relationship: signature.relationship,
      parent_consented_at: agree ? now : null,
      parent_declined_at: agree ? null : now,
      parent_ai_consented_at: ai ? now : null,
      parent_ai_notice_version: ai ? SEEDSTACK_NOTICE_VERSION : null,
      parent_consent_ip: signature.ip,
      parent_consent_user_agent: signature.userAgent,
    })
    .eq("parent_token_hash", sha256Hex(rawToken))
    .is("parent_consented_at", null)
    .is("parent_withdrawn_at", null)
    .select("id");
  if (error) throw new Error(`shift parent decision failed: ${error.message}`);
  return (data?.length ?? 0) > 0;
}

/**
 * Withdrawal is recorded, not acted on: the seat, refund and Discord role
 * are the team's call, so the admin page flags it for them.
 */
export async function withdrawShiftParentConsent(rawToken: string): Promise<boolean> {
  // The original signature (name, IP, browser) stays: it is the record of
  // what was agreed until now.
  const { data, error } = await createAdminClient()
    .from("shift_applications")
    .update({ parent_withdrawn_at: new Date().toISOString() })
    .eq("parent_token_hash", sha256Hex(rawToken))
    .not("parent_consented_at", "is", null)
    .is("parent_withdrawn_at", null)
    .select("id");
  if (error) throw new Error(`shift parent withdraw failed: ${error.message}`);
  return (data?.length ?? 0) > 0;
}

/**
 * One parent answer covers SeedStack too: when the parent ticked AI tracking
 * on the SHIFT page (which shows the SeedStack notice), a student waiting on
 * a SeedStack parent needs no second link. Runs whichever side comes first:
 * after the student agrees in SeedStack, and after the parent answers here.
 * True when SeedStack consent is now complete.
 */
export async function applyShiftParentAiConsent(userId: string): Promise<boolean> {
  const supabase = createAdminClient();
  const { data: app, error } = await supabase
    .from("shift_applications")
    .select("parent_name, parent_relationship, parent_ai_consented_at")
    .eq("user_id", userId)
    .eq("parent_ai_notice_version", SEEDSTACK_NOTICE_VERSION)
    .not("parent_ai_consented_at", "is", null)
    .is("parent_withdrawn_at", null)
    .order("parent_ai_consented_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`shift parent AI consent lookup failed: ${error.message}`);
  if (!app) return false;

  const { data, error: updateError } = await supabase
    .from("seedstack_consents")
    .update({
      parent_name: app.parent_name,
      parent_relationship: app.parent_relationship,
      parent_consented_at: app.parent_ai_consented_at,
      parent_declined_at: null,
    })
    .eq("user_id", userId)
    .eq("notice_version", SEEDSTACK_NOTICE_VERSION)
    .not("student_consented_at", "is", null)
    .is("parent_consented_at", null)
    .is("withdrawn_at", null)
    .select("user_id");
  if (updateError) throw new Error(`seedstack parent consent from SHIFT failed: ${updateError.message}`);
  return (data?.length ?? 0) > 0;
}

/** A parent who withdraws from the SeedStack link withdraws the SHIFT AI tick too, so it never re-applies. */
export async function clearShiftParentAiConsent(userId: string): Promise<void> {
  const { error } = await createAdminClient()
    .from("shift_applications")
    .update({ parent_ai_consented_at: null, parent_ai_notice_version: null })
    .eq("user_id", userId)
    .not("parent_ai_consented_at", "is", null);
  if (error) throw new Error(`shift parent AI consent clear failed: ${error.message}`);
}
