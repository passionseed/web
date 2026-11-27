import type { ShareKind, SharePhase } from "./share";
import type { StoryProofStatus } from "./story-proof";

/**
 * The rules for Elemental share links. Pure and safe to import in the
 * browser; the database side is lib/supabase/hackathon-share-links.ts.
 *
 * Big, 2026-11-27: sharing earns no free seats, for anyone. It earns looks:
 * team-name styles (unlocked by the devices on the team's links, see
 * team-style.ts) and the team board. A link counts real devices and paid
 * sign-ups, both only up to sign-up close, paid by slip time (paidAt).
 */

/**
 * When a sign-up paid, for counting: when its slip was uploaded (the slip's
 * file name starts with the upload time in ms), or else when it signed up.
 * Never when staff happened to approve it, so a slow check can't move a
 * payment past close.
 */
export function paidAt(r: { slipPath: string | null; createdAt: string }): string {
  const ms = Number(r.slipPath?.match(/\/(\d{12,14})-/)?.[1]);
  return Number.isFinite(ms) && ms > 0 ? new Date(ms).toISOString() : r.createdAt;
}

/**
 * A student's code is the first 8 hex digits of their sign-up's id, which is
 * the whole first group of the uuid, so the ids that carry it are one range.
 * A teacher's random code must not fall in any sign-up's range.
 */
export function codeIdRange(code: string): { from: string; to: string } {
  return { from: `${code}-0000-0000-0000-000000000000`, to: `${code}-ffff-ffff-ffff-ffffffffffff` };
}

export const TEACHER_TOKEN_RE = /^[0-9a-f]{32}$/;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const LINE_ID_RE = /^@?[a-z0-9._-]{3,30}$/;

/** A teacher's email or LINE ID, and the key that keeps one live link per contact. */
export function parseTeacherContact(raw: string): { kind: "email" | "line"; value: string; key: string } | null {
  const value = raw.trim();
  const lower = value.toLowerCase();
  if (value.length > 120) return null;
  if (EMAIL_RE.test(lower)) return { kind: "email", value, key: `email:${lower}` };
  if (LINE_ID_RE.test(lower)) return { kind: "line", value, key: `line:${lower.replace(/^@/, "")}` };
  return null;
}

/** An optional phone number: empty is fine, otherwise 9 to 15 digits. */
export function parseOptionalPhone(raw: string | undefined | null): { ok: true; value: string | null } | { ok: false } {
  const value = (raw ?? "").trim();
  if (!value) return { ok: true, value: null };
  const digits = value.replace(/[\s()+-]/g, "");
  return /^\d{9,15}$/.test(digits) ? { ok: true, value } : { ok: false };
}

/**
 * What the share page and the teacher page show about one link, at load and
 * from their polling GET routes. Nothing in it names a person.
 */
export type ShareLinkView = {
  kind: ShareKind;
  /** The poster code (8 hex): the link tags ?src=share-<code> (students) or ?src=t-<code> (teachers). */
  code: string;
  school: { name: string; province: string | null };
  /** Students may change their school while sign-up is open. Teachers never. */
  canChangeSchool: boolean;
  /** Real devices that opened the link, each network adding at most PER_NETWORK_CAP, up to sign-up close. */
  devices: number;
  /** Paid seats (member_count) of sign-ups that came through the link, slip in by close. */
  paid: number;
  /**
   * "open": until sign-up closes, counting. "after-close": read-only until
   * the end of Demo Day, numbers frozen at close. "off": switched off or over.
   */
  phase: SharePhase;
  /** Students: their own Instagram Story proof. Teachers: always "none". */
  storyProof: StoryProofStatus;
};

/** The view model from a link's stored fields, its counts and the phase. */
export function shareLinkView(input: {
  link: { kind: ShareKind; code: string; schoolName: string; province: string | null };
  counts: { devices: number; paid: number };
  phase: SharePhase;
  storyProof?: StoryProofStatus;
}): ShareLinkView {
  const { link, counts, phase } = input;
  return {
    kind: link.kind,
    code: link.code,
    school: { name: link.schoolName, province: link.province },
    canChangeSchool: link.kind === "student" && phase === "open",
    devices: Math.max(0, counts.devices),
    paid: Math.max(0, counts.paid),
    phase,
    storyProof: link.kind === "student" ? (input.storyProof ?? "none") : "none",
  };
}
