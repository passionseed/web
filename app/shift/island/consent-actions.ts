"use server";

/**
 * Island consent actions for the signed-in student (founder ask 8). Each one
 * runs through the shared gate (app/shift/island/gate.ts): the viewer comes
 * from the session, never from the client, and every refusal is mapped to
 * Thai. The parent's side lives in ./parent/actions.ts and needs no account.
 *
 * Nothing here opens a channel between an adult and the student: the parent
 * link goes from the student to their own parent, by email (sent once, the
 * address never stored) or by the student copying it to LINE.
 */

import { z } from "zod";

import { QuestError } from "@/bot/src/quests/api";
import { generateParentLinkToken, sha256Hex } from "@/lib/seedstack/tokens";
import { sendIslandParentEmail } from "@/lib/shift-island/consent/email";
import { ShiftImportError, ageOn, lookupShiftConsent } from "@/lib/shift-island/consent/shiftImport";
import { siteUrl } from "@/lib/shift/notifyDiscord";
import { plainName } from "@/lib/shift/parentEmail";
import { parseConsent, readConsent } from "@/lib/supabase/shift-quests/consent";
import { questApi } from "@/lib/supabase/shift-quests/db";
import { ISLAND_CONSENT_VERSION, type IslandConsent } from "@/lib/supabase/shift-quests/playerTypes";
import type { IslandActionResult } from "@/lib/supabase/shift-quests/types";

import { withReader, withReadyViewer } from "./gate";

const ISLAND_PARENT_PREFIX = "/shift/island/parent/";
const NICKNAME_MAX = 40;
const EMAIL_MAX = 254;
/** A plain address check; Resend validates again. */
const EMAIL = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:"]{2,}$/;

const chars = (value: string) => Array.from(value).length;

/** Today's date in Thailand as YYYY-MM-DD. */
function bangkokToday(now = Date.now()): string {
  return new Date(now + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/** A real calendar date after 1900 and not after today in Thailand. The database checks the age. */
function validBirthDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) return false;
  return value > "1900-01-01" && value <= bangkokToday();
}

/** loadConsent takes no input; anything a client sends is ignored. */
const noInput = z.unknown().transform(() => null);

const adultSchema = z.object({
  birthDate: z.string().trim().refine(validBirthDate),
});

/**
 * The nickname is cut to letters, marks, spaces, hyphens and apostrophes
 * (plainName, as the SHIFT parent email): the parent page and the email show
 * it, so it can never carry a link or an address.
 */
const parentLinkSchema = z.object({
  nickname: z
    .string()
    .transform((value) => plainName(value))
    .pipe(z.string().min(1).refine((value) => chars(value) <= NICKNAME_MAX)),
  parentEmail: z
    .string()
    .trim()
    .max(EMAIL_MAX)
    .nullish()
    .transform((value) => (value ? value : null))
    .refine((value) => value === null || EMAIL.test(value)),
});

function consentFrom(raw: unknown): IslandConsent {
  const consent = parseConsent(raw);
  if (!consent) throw new Error("consent_malformed");
  return consent;
}

/** The viewer's consent, re-checking their SHIFT application. A read: never refreshes the page. */
export async function loadConsent(): Promise<IslandActionResult<IslandConsent>> {
  return withReader("loadConsent", noInput, undefined, (caller) => readConsent(questApi(), caller));
}

/**
 * Refuses 'consent_too_young' when the student's own SHIFT application gives
 * a birth date under the island's adult age, whatever date they type here.
 * Without the service-role key (local dev) there is no SHIFT data to check
 * against, so it lets the database decide; a failed lookup refuses
 * ('unavailable'), so a database hiccup never lets a minor through.
 */
async function refuseIfShiftSaysMinor(userId: string, adultAge: number): Promise<void> {
  let row: Awaited<ReturnType<typeof lookupShiftConsent>>;
  try {
    row = await lookupShiftConsent(userId);
  } catch (error) {
    if (error instanceof ShiftImportError && error.code === "unconfigured") return;
    throw new QuestError("unavailable");
  }
  const age = ageOn(row?.birth_date ?? null, bangkokToday());
  if (age !== null && age < adultAge) throw new QuestError("consent_too_young");
}

/**
 * At the adult age (settings.consent_adult_age, default 20) the student
 * consents for themselves, AI news line included. The database works out the
 * age in Bangkok and refuses 'consent_too_young' below it, and
 * 'consent_parent_said_no' over a parent's decline or withdrawal; the birth
 * date is kept as the record. A SHIFT application that says the student is
 * younger is refused here first.
 */
export async function confirmAdult(input: { birthDate: string }): Promise<IslandActionResult<IslandConsent>> {
  return withReadyViewer("confirmAdult", adultSchema, input, async ({ actor, userId }, v) => {
    const api = questApi();
    const current = consentFrom(await api.call<unknown>("shift_quest_consent_get", actor));
    await refuseIfShiftSaysMinor(userId, current.adultAge);
    return consentFrom(await api.call<unknown>("shift_quest_consent_adult", actor, v.birthDate, ISLAND_CONSENT_VERSION));
  });
}

/**
 * A fresh parent link: a new random token whose sha256 replaces the old one
 * (the old link stops working), valid 14 days, at most 3 a day (both in the
 * database). With an email address the link is also emailed once; the
 * address is never stored. The link always comes back so the student can
 * copy it to LINE.
 */
export async function requestParentLink(input: {
  nickname: string;
  parentEmail?: string | null;
}): Promise<IslandActionResult<{ url: string; expiresAt: string; emailed: boolean }>> {
  return withReadyViewer("requestParentLink", parentLinkSchema, input, async ({ actor }, v) => {
    const token = generateParentLinkToken();
    const tokenHash = sha256Hex(token);
    const raw = await questApi().call<{ expires_at?: unknown } | null>(
      "shift_quest_consent_link",
      actor,
      tokenHash,
      v.nickname,
      ISLAND_CONSENT_VERSION,
    );
    const expiresAt = typeof raw?.expires_at === "string" && !Number.isNaN(Date.parse(raw.expires_at)) ? raw.expires_at : null;
    if (!expiresAt) throw new Error("consent_link_malformed");

    const url = `${siteUrl()}${ISLAND_PARENT_PREFIX}${token}`;
    const emailed = v.parentEmail
      ? await sendIslandParentEmail({ to: v.parentEmail, nickname: v.nickname, url, expiresAt, tokenHash })
      : false;
    return { url, expiresAt, emailed };
  });
}
