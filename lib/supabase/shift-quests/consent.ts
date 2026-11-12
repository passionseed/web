import "server-only";

import { QuestDbError, QuestError, type QuestApi } from "@/bot/src/quests/api";
import { ShiftImportError, importShiftConsent } from "@/lib/shift-island/consent/shiftImport";

import type { ConsentBasis, ConsentState, IslandConsent } from "./playerTypes";

/**
 * The viewer's island consent (parent consent for minors, or their own at
 * the adult age), read through shift_quest_consent_get (migration
 * 20261111095000_shift_quest_player.sql, web only). Until consent is ok the
 * student plays privately: no public team name, no Discord posts or AI news
 * about them, no shop, no money prizes. The database enforces all of that;
 * this only tells the UI what to show.
 */

const STATES: ReadonlySet<string> = new Set<ConsentState>(["none", "waiting", "granted", "declined", "withdrawn"]);
const BASES: ReadonlySet<string> = new Set<ConsentBasis>(["parent", "adult", "shift_parent", "shift_adult"]);
const DEFAULT_ADULT_AGE = 20;

function isObject(raw: unknown): raw is Record<string, unknown> {
  return !!raw && typeof raw === "object" && !Array.isArray(raw);
}

function isoOrNull(raw: unknown): string | null {
  if (typeof raw !== "string" || Number.isNaN(Date.parse(raw))) return null;
  return raw;
}

/**
 * The consent_get shape ({required, state, basis, ai, ok, link_expires_at,
 * adult_age, parent_said_no}) as an IslandConsent, or null when it is not
 * one. Fails safe: anything unclear counts as required and not ok, and AI
 * news counts only when the database says so (the kill switch never turns it
 * on).
 */
export function parseConsent(raw: unknown): IslandConsent | null {
  if (!isObject(raw) || typeof raw.state !== "string" || !STATES.has(raw.state)) return null;
  const state = raw.state as ConsentState;
  const required = raw.required !== false;
  const basis = typeof raw.basis === "string" && BASES.has(raw.basis) ? (raw.basis as ConsentBasis) : null;
  const ok = !required || raw.ok === true;
  const age = Number(raw.adult_age);
  return {
    required,
    state,
    basis,
    ok,
    ai: raw.ai === true && (state === "granted" || !required),
    // Waiting for a parent, or an AI-line link out for a granted student.
    linkExpiresAt: state === "waiting" || state === "granted" ? isoOrNull(raw.link_expires_at) : null,
    adultAge: Number.isInteger(age) && age >= 13 && age <= 25 ? age : DEFAULT_ADULT_AGE,
    parentSaidNo: raw.parent_said_no === true,
  };
}

/**
 * True when the student's SHIFT application could change what the island has
 * on file. shift_quest_consent_import never overrides an answer given on the
 * island (basis parent or adult, granted or withdrawn) or a parent's decline
 * there, so those skip the SHIFT lookup on every page load.
 */
export function needsShiftImport(consent: IslandConsent): boolean {
  if (consent.basis === "parent" || consent.basis === "adult" || consent.state === "declined") return false;
  return consent.state !== "granted" || consent.basis === "shift_parent" || consent.basis === "shift_adult";
}

/**
 * Logged once per process: gaps every page load would hit (the function
 * missing before the migration, 42883, or not granted, 42501, and no
 * service-role key for the SHIFT lookup). Anything else is logged each time.
 */
const ONCE = new Set(["SQLSTATE 42883", "SQLSTATE 42501", "import SQLSTATE 42883", "import SQLSTATE 42501", "import unconfigured"]);
const logged = new Set<string>();

function logFailure(code: string): void {
  if (ONCE.has(code)) {
    if (logged.has(code)) return;
    logged.add(code);
  }
  console.error(`[shift-island] consent read failed: ${code}`);
}

/** A code for the log line, never a message (messages can carry student text). */
export function consentFailureCode(error: unknown): string {
  if (error instanceof QuestError) return `sq:${error.code}`;
  if (error instanceof QuestDbError) return `SQLSTATE ${error.sqlstate}`;
  if (error instanceof ShiftImportError) return error.code;
  return error instanceof Error ? error.name : "unknown";
}

/**
 * Runs the SHIFT import when it could change anything and returns the fresh
 * consent; on any import failure logs a code and returns `current`.
 */
async function withShiftImport(
  api: QuestApi,
  viewer: { actor: string; userId: string },
  current: IslandConsent,
): Promise<IslandConsent> {
  if (!needsShiftImport(current)) return current;
  try {
    const raw = await importShiftConsent(api, viewer, current);
    if (raw === null) return current;
    const fresh = parseConsent(raw);
    if (!fresh) {
      logFailure("import malformed");
      return current;
    }
    return fresh;
  } catch (error) {
    logFailure(`import ${consentFailureCode(error)}`);
    return current;
  }
}

/**
 * For server actions: the same read as consentOf, but a failed
 * shift_quest_consent_get throws (QuestError, QuestDbError, or
 * Error("consent_malformed")) so the action gate maps it to Thai. The SHIFT
 * import still fails soft.
 */
export async function readConsent(api: QuestApi, viewer: { actor: string; userId: string }): Promise<IslandConsent> {
  const consent = parseConsent(await api.call<unknown>("shift_quest_consent_get", viewer.actor));
  if (!consent) throw new Error("consent_malformed");
  return withShiftImport(api, viewer, consent);
}

/**
 * The viewer's consent for the island page, or null to gate nothing in the
 * UI (the function missing before the migration, a refusal, a database
 * error or a malformed answer; each logs only a code). When the state is
 * not granted, or was imported from SHIFT, it also re-checks the student's
 * SHIFT application and returns the fresh state; an import failure keeps
 * what the database already had.
 */
export async function consentOf(api: QuestApi, viewer: { actor: string; userId: string }): Promise<IslandConsent | null> {
  let consent: IslandConsent | null;
  try {
    consent = parseConsent(await api.call<unknown>("shift_quest_consent_get", viewer.actor));
  } catch (error) {
    logFailure(consentFailureCode(error));
    return null;
  }
  if (!consent) {
    logFailure("malformed");
    return null;
  }
  return withShiftImport(api, viewer, consent);
}

// ---------------------------------------------------------------------------
// The parent's link (/shift/island/parent/{token}): token-scoped, no viewer.
// ---------------------------------------------------------------------------

export interface ParentLinkView {
  state: Exclude<ConsentState, "none">;
  /** The nickname the student typed for the parent. The only thing the page shows about them. */
  studentLabel: string;
  expiresAt: string | null;
  /** waiting, declined, or granted with an AI-line link out; and not expired. */
  answerable: boolean;
  /** granted by a parent through this link. */
  withdrawable: boolean;
  /** The student already has consent: this link asks the parent for the AI news line only. */
  aiOnly: boolean;
}

/** shift_quest_consent_parent_view's answer, or null when it is not one (or the link is unknown). */
export function parseParentView(raw: unknown): ParentLinkView | null {
  if (!isObject(raw) || typeof raw.state !== "string" || !STATES.has(raw.state) || raw.state === "none") return null;
  const label = typeof raw.student_label === "string" ? raw.student_label.trim().slice(0, 40) : "";
  return {
    state: raw.state as ParentLinkView["state"],
    studentLabel: label,
    expiresAt: isoOrNull(raw.expires_at),
    answerable: raw.answerable === true,
    withdrawable: raw.withdrawable === true,
    aiOnly: raw.ai_only === true,
  };
}

/** Raw link tokens are 32 random bytes in base64url (generateParentLinkToken): 43 characters. */
const LINK_TOKEN = /^[A-Za-z0-9_-]{32,128}$/;

export function isParentLinkToken(raw: unknown): raw is string {
  return typeof raw === "string" && LINK_TOKEN.test(raw);
}
