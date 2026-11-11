"use server";

/**
 * The parent's answer on /shift/island/parent/{token}. No account: the link
 * token is the credential, only its sha256 is stored, and every call is
 * scoped to that one consent row. The database (web role) checks the link
 * is live, records the answer with the time, the notice version, IP and
 * browser, and tells the student in their island inbox. Logs carry a code,
 * never a name or the token.
 */

import { headers } from "next/headers";

import { QuestError } from "@/bot/src/quests/api";
import { PARENT_RELATIONSHIPS } from "@/lib/shift/parentConsent";
import { sha256Hex } from "@/lib/seedstack/tokens";
import { ISLAND_PARENT } from "@/components/shift/island/consent/copy";
import { consentFailureCode, isParentLinkToken, parseParentView } from "@/lib/supabase/shift-quests/consent";
import { questApi } from "@/lib/supabase/shift-quests/db";
import { ISLAND_CONSENT_VERSION } from "@/lib/supabase/shift-quests/playerTypes";

type Result = { ok: true } | { ok: false; error: string };
type Relationship = (typeof PARENT_RELATIONSHIPS)[number];

const RELATIONSHIPS = new Set<string>(PARENT_RELATIONSHIPS);
const ERRORS = ISLAND_PARENT.errors;

/** Where the parent answered from, kept with their typed name as the signature record. */
async function requestOrigin(): Promise<{ ip: string | null; userAgent: string | null }> {
  const h = await headers();
  const ip = (h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "").slice(0, 64) || null;
  return { ip, userAgent: h.get("user-agent")?.slice(0, 400) || null };
}

function logFailure(action: string, error: unknown): void {
  console.error(`[shift-island] parent ${action} failed: ${consentFailureCode(error)}`);
}

/** After a refusal, whether this link already carries a granted answer (a second tap, or another tab). */
async function alreadyGranted(tokenHash: string): Promise<boolean> {
  try {
    const view = parseParentView(await questApi().call<unknown>("shift_quest_consent_parent_view", tokenHash));
    return view?.state === "granted";
  } catch {
    return false;
  }
}

/**
 * Agree (with an optional, separate tick for the AI island news) or decline.
 * Open while the link is live and not yet agreed: a parent who declined may
 * change to agree; one who agreed withdraws instead.
 */
export async function answerIslandParent(input: {
  token: string;
  agree: boolean;
  ai: boolean;
  parentName: string;
  relationship: Relationship;
  confirmed: boolean;
}): Promise<Result> {
  if (!isParentLinkToken(input?.token) || typeof input.agree !== "boolean") return { ok: false, error: ERRORS.linkDead };
  const parentName = typeof input.parentName === "string" ? input.parentName.trim().replace(/\s+/g, " ").slice(0, 120) : "";
  if (Array.from(parentName).length < 2) return { ok: false, error: ERRORS.name };
  if (typeof input.relationship !== "string" || !RELATIONSHIPS.has(input.relationship)) {
    return { ok: false, error: ERRORS.relationship };
  }
  if (input.agree && input.confirmed !== true) return { ok: false, error: ERRORS.confirm };

  const tokenHash = sha256Hex(input.token);
  const ai = input.agree && input.ai === true;
  try {
    const { ip, userAgent } = await requestOrigin();
    await questApi().call<unknown>(
      "shift_quest_consent_parent_answer",
      tokenHash,
      input.agree,
      ai,
      parentName,
      input.relationship,
      ip,
      userAgent,
      ISLAND_CONSENT_VERSION,
    );
    return { ok: true };
  } catch (error) {
    if (error instanceof QuestError && error.code === "consent_link_dead") {
      return { ok: false, error: (await alreadyGranted(tokenHash)) ? ERRORS.already : ERRORS.linkDead };
    }
    if (error instanceof QuestError && error.code === "bad_input") return { ok: false, error: ERRORS.name };
    logFailure("answer", error);
    return { ok: false, error: ERRORS.system };
  }
}

/** Withdraws a parent's agreement from the same link, at any time (the link's expiry does not apply). */
export async function withdrawIslandParent(token: string): Promise<Result> {
  if (!isParentLinkToken(token)) return { ok: false, error: ERRORS.linkDead };
  try {
    await questApi().call<unknown>("shift_quest_consent_parent_withdraw", sha256Hex(token));
    return { ok: true };
  } catch (error) {
    if (error instanceof QuestError && error.code === "consent_link_dead") return { ok: false, error: ERRORS.linkDead };
    logFailure("withdraw", error);
    return { ok: false, error: ERRORS.system };
  }
}
