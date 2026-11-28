import { ADULT_AGE, GRADE_VALUES, contactEmailSchema, type Grade } from "@/lib/hackathon/elemental/registration";
import type { BuddyOwe } from "@/lib/hackathon/elemental/buddy-pass";
import { HEARD_FROM_VALUES } from "@/lib/hackathon/elemental/heard-from";
import { isRudeTeamName } from "@/lib/hackathon/elemental/team-name";

/**
 * The sign-up answers and the rules for each screen. Pure, so the flow and the
 * tests share it. The API route checks the same things again with zod
 * (lib/hackathon/elemental/registration.ts).
 */

export type Mode = "solo" | "create" | "join" | "buddy";

export type BuddyPassOffer = {
  code: string;
  senderName: string;
  owe: BuddyOwe;
};

export type Draft = {
  /** null only in drafts saved before the form started on a team (28 Nov 2026); read as "create". */
  mode: Mode | null;
  teamName: string;
  fullName: string;
  nickname: string;
  age: string;
  /** "" until picked; one of GRADE_VALUES after. */
  grade: string;
  school: string;
  parentName: string;
  parentPhone: string;
  parentConsent: boolean;
  email: string;
  phone: string;
  lineId: string;
  /** Optional since 28 Nov 2026: one tap on the review screen, or "". */
  heardFrom: string;
  wantsTeam: boolean;
  noRefund: boolean;
  contactAfter: boolean;
};

/**
 * Team first (Big, 2026-11-28): a new sign-up starts a team at the group price
 * unless it came from a friend's team link or a buddy pass. Alone is one tap away.
 */
export const defaultMode = (opts: { team?: boolean; buddyPass?: boolean } = {}): Mode =>
  opts.team ? "join" : opts.buddyPass ? "buddy" : "create";

export const modeOf = (d: Pick<Draft, "mode">): Mode => d.mode ?? "create";

export const emptyDraft = (mode: Mode | null = "create"): Draft => ({
  mode,
  teamName: "",
  fullName: "",
  nickname: "",
  age: "",
  grade: "",
  school: "",
  parentName: "",
  parentPhone: "",
  parentConsent: false,
  email: "",
  phone: "",
  lineId: "",
  heardFrom: "",
  wantsTeam: true,
  noRefund: false,
  contactAfter: false,
});

/**
 * Three screens (28 Nov 2026), replacing one question a screen (mode, name, school, parent,
 * contact, heard, review): about you, then contact with the parent's details for under-20s,
 * then review and agree. The funnel key of each is SIGNUP_SCREENS in lib/hackathon/elemental/funnel.ts.
 */
export type StepKey = "about" | "contact" | "review";

export const STEPS: readonly StepKey[] = ["about", "contact", "review"];

export type Errors = Partial<Record<keyof Draft, string>>;

/** The fields each screen asks for, in the order they appear. */
export const STEP_FIELDS: Record<StepKey, readonly (keyof Draft)[]> = {
  about: ["fullName", "nickname", "grade", "age", "school"],
  contact: ["email", "phone", "parentName", "parentPhone", "parentConsent"],
  review: ["noRefund"],
};

export const isMinor = (d: Pick<Draft, "age">) => d.age !== "" && Number(d.age) < ADULT_AGE;

/**
 * Ages to tap for each school year, so most people never type one. The box beside them
 * takes any other age. "other" (vocational, gap year) types it.
 */
export const AGE_CHOICES: Record<Grade, readonly string[]> = {
  m3: ["14", "15", "16"],
  m4: ["15", "16", "17"],
  m5: ["16", "17", "18"],
  m6: ["17", "18", "19"],
  other: [],
};

export const ageChoicesFor = (grade: string): readonly string[] =>
  (GRADE_VALUES as readonly string[]).includes(grade) ? AGE_CHOICES[grade as Grade] : [];

const PHONE_RE = /^(\+66|0)\d{8,9}$/;
const THAI_RE = /[฀-๿]/;
export const cleanPhone = (v: string) => v.replace(/[\s-]/g, "");

/** 0812345678 → 081-234-5678 as it's typed; leaves +66 numbers alone. */
export function formatPhone(raw: string): string {
  if (raw.trim().startsWith("+")) return raw.replace(/[^\d+]/g, "").slice(0, 12);
  const d = raw.replace(/\D/g, "").slice(0, 10);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
}

/** Emails have no spaces: drop them as they're typed (a phone keyboard adds one after autocomplete). */
export const cleanEmailInput = (raw: string) => raw.replace(/\s+/g, "");

/** "ทีมชาย" from the nickname, or the first word of the full name; empty when there's neither. */
export function suggestTeamName(d: Pick<Draft, "nickname" | "fullName">): string {
  const who = d.nickname.trim() || d.fullName.trim().split(/\s+/)[0] || "";
  return who ? `ทีม${who}`.slice(0, 80) : "";
}

/** The name a new team is created with: what they typed, else "ทีม<nickname>". */
export const teamNameFor = (d: Pick<Draft, "teamName" | "nickname" | "fullName">) => d.teamName.trim() || suggestTeamName(d);

export const TEAM_NAME_RUDE = "ชื่อนี้ใช้ไม่ได้ ลองชื่ออื่น";

/** Mail providers students use, for "did you mean". Real look-alikes (ymail, mail.com) are listed so they're left alone. */
const MAIL_DOMAINS = [
  "gmail.com",
  "hotmail.com",
  "outlook.com",
  "yahoo.com",
  "icloud.com",
  "live.com",
  "hotmail.co.th",
  "outlook.co.th",
  "yahoo.co.th",
  "ymail.com",
  "mail.com",
  "me.com",
];

function editDistance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const temp = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = temp;
    }
  }
  return row[b.length];
}

/**
 * "name@gmial.con" → "name@gmail.com": a fix for a mistyped mail provider, or null.
 * Only a suggestion to tap; the email is never changed without it.
 */
export function suggestEmail(raw: string): string | null {
  const email = raw.trim().toLowerCase();
  const at = email.lastIndexOf("@");
  if (at < 1 || at === email.length - 1) return null;
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  if (MAIL_DOMAINS.includes(domain)) return null;
  // "name@gmail" with no ending.
  const bare = MAIL_DOMAINS.find((d) => d.split(".")[0] === domain);
  if (bare) return `${local}@${bare}`;
  let best: string | null = null;
  let bestDistance = 3;
  for (const d of MAIL_DOMAINS) {
    const distance = editDistance(domain, d);
    if (distance < bestDistance) {
      best = d;
      bestDistance = distance;
    }
  }
  return best ? `${local}@${best}` : null;
}

/**
 * What's wrong with one answer, in Thai, or undefined. The screens and the
 * check when a box loses focus both use it.
 */
export function fieldError(field: keyof Draft, d: Draft): string | undefined {
  const minor = isMinor(d);
  switch (field) {
    case "fullName":
      return d.fullName.trim() ? undefined : "ใส่ชื่อ-นามสกุล";
    case "nickname":
      // A new team is named after the nickname, so the team-name check happens here.
      return modeOf(d) === "create" && isRudeTeamName(teamNameFor(d)) ? TEAM_NAME_RUDE : undefined;
    case "grade":
      return (GRADE_VALUES as readonly string[]).includes(d.grade) ? undefined : "เลือกชั้น";
    case "age": {
      const age = Number(d.age);
      return d.age && Number.isInteger(age) && age >= 10 && age <= 99 ? undefined : "เลือกอายุ";
    }
    case "school":
      return d.school.trim() ? undefined : "ใส่ชื่อโรงเรียนหรือสถาบัน";
    case "email":
      if (!d.email.trim()) return "ใส่อีเมล";
      // PLACEHOLDER copy (Angpao)
      if (THAI_RE.test(d.email)) return "อีเมลมีตัวอักษรไทย เปลี่ยนแป้นพิมพ์เป็นภาษาอังกฤษ";
      return contactEmailSchema.safeParse(d.email).success ? undefined : "ใส่อีเมลที่ใช้ได้";
    case "phone":
      return PHONE_RE.test(cleanPhone(d.phone)) ? undefined : "ใส่เบอร์โทร 10 หลัก";
    case "parentName":
      return minor && !d.parentName.trim() ? "ใส่ชื่อผู้ปกครอง" : undefined;
    case "parentPhone":
      return minor && !PHONE_RE.test(cleanPhone(d.parentPhone)) ? "ใส่เบอร์ผู้ปกครอง 10 หลัก" : undefined;
    case "parentConsent":
      return minor && !d.parentConsent ? "ต้องได้รับความยินยอมจากผู้ปกครองก่อน" : undefined;
    case "noRefund":
      return d.noRefund ? undefined : "ติ๊กเพื่อรับทราบก่อนสมัคร";
    default:
      return undefined;
  }
}

/**
 * The check when a box loses focus: only the format of something typed, so
 * tabbing past an empty box never shows an error. Empty boxes are caught by "next".
 */
export function blurError(field: keyof Draft, d: Draft): string | undefined {
  const value = d[field];
  if (typeof value !== "string" || !value.trim()) return undefined;
  return fieldError(field, d);
}

/** What's wrong on one screen, keyed by field. Empty means the screen is done. */
export function validateStep(step: StepKey, d: Draft): Errors {
  const e: Errors = {};
  for (const field of STEP_FIELDS[step]) {
    const error = fieldError(field, d);
    if (error) e[field] = error;
  }
  return e;
}

/** The first screen with a problem, so the review can send people straight back to it. */
export function firstInvalidStep(d: Draft): StepKey | null {
  return STEPS.find((s) => Object.keys(validateStep(s, d)).length > 0) ?? null;
}

/** Which screen owns a field the server rejected (zod issue path), e.g. ["members", 0, "age"] → about. */
export function stepForServerPath(path: (string | number)[]): StepKey {
  const key = String(path[path.length - 1] ?? "");
  // The team or the pass is shown at the top of the first screen; a new team is named after the nickname.
  if (key === "inviteCode" || key === "passCode" || key === "teamName") return "about";
  if (key === "fullName" || key === "nickname" || key === "age" || key === "grade" || key === "school") return "about";
  if (key.startsWith("parent") || key.startsWith("contact")) return "contact";
  return "review";
}

/** A screen saved by the old one-question-a-screen form (or nothing), as a screen of this one. */
export function restoredStep(saved: string | undefined, d: Draft): StepKey {
  if (saved && (STEPS as readonly string[]).includes(saved)) return saved as StepKey;
  return firstInvalidStep(d) ?? "review";
}

/** The body for POST /api/hackathon/elemental/register. */
export function registrationBody(
  d: Draft,
  inviteCode: string | undefined,
  source?: string,
  utm?: Record<string, string>,
  buddyPass?: BuddyPassOffer,
) {
  const minor = isMinor(d);
  const mode = modeOf(d);
  return {
    teamMode: mode,
    teamName: mode === "create" ? teamNameFor(d) : undefined,
    inviteCode: mode === "join" ? inviteCode : undefined,
    passCode: mode === "buddy" ? buddyPass?.code : undefined,
    buddyOwe: mode === "buddy" ? buddyPass?.owe : undefined,
    members: [
      {
        fullName: d.fullName,
        nickname: d.nickname,
        age: Number(d.age),
        grade: (GRADE_VALUES as readonly string[]).includes(d.grade) ? (d.grade as Grade) : undefined,
        school: d.school,
        parentName: minor ? d.parentName : undefined,
        parentPhone: minor ? cleanPhone(d.parentPhone) : undefined,
        parentConsent: minor ? d.parentConsent : false,
      },
    ],
    contactEmail: d.email,
    contactPhone: cleanPhone(d.phone),
    contactLineId: d.lineId,
    wantsTeamMatching: mode === "solo" && d.wantsTeam,
    noRefundAck: d.noRefund,
    contactAfterConsent: d.contactAfter,
    // Optional now: only one of the listed answers is sent.
    heardFrom: (HEARD_FROM_VALUES as readonly string[]).includes(d.heardFrom) ? (d.heardFrom as (typeof HEARD_FROM_VALUES)[number]) : undefined,
    source,
    utm,
  };
}
