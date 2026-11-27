import { ADULT_AGE } from "@/lib/hackathon/elemental/registration";
import type { BuddyOwe } from "@/lib/hackathon/elemental/buddy-pass";
import { HEARD_FROM_VALUES } from "@/lib/hackathon/elemental/heard-from";
import { isRudeTeamName } from "@/lib/hackathon/elemental/team-name";

/**
 * The sign-up answers and the rules for each step. Pure, so the flow and the
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
  mode: Mode | null;
  teamName: string;
  fullName: string;
  nickname: string;
  age: string;
  school: string;
  parentName: string;
  parentPhone: string;
  parentConsent: boolean;
  email: string;
  phone: string;
  lineId: string;
  heardFrom: string;
  wantsTeam: boolean;
  noRefund: boolean;
  contactAfter: boolean;
};

export const emptyDraft = (mode: Mode | null = null): Draft => ({
  mode,
  teamName: "",
  fullName: "",
  nickname: "",
  age: "",
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

export type StepKey = "mode" | "name" | "school" | "parent" | "contact" | "heard" | "review";

export type Errors = Partial<Record<keyof Draft, string>>;

export const isMinor = (d: Draft) => d.age !== "" && Number(d.age) < ADULT_AGE;

/**
 * The steps this person sees: a parent only under ADULT_AGE. There is no team-name step: a new
 * team is named "ทีม<nickname>" (suggestTeamName) and renamed on the pay page. The team-name
 * screen lost more people than any other, even after it moved behind the name step and started
 * filled in (funnel, 24 to 26 Nov 2026).
 */
export function stepsFor(d: Draft): StepKey[] {
  const steps: StepKey[] = ["mode", "name", "school"];
  if (d.age === "" || isMinor(d)) steps.push("parent");
  steps.push("contact", "heard", "review");
  return steps;
}

const PHONE_RE = /^(\+66|0)\d{8,9}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const cleanPhone = (v: string) => v.replace(/[\s-]/g, "");

/** 0812345678 → 081-234-5678 as it's typed; leaves +66 numbers alone. */
export function formatPhone(raw: string): string {
  if (raw.trim().startsWith("+")) return raw.replace(/[^\d+]/g, "").slice(0, 12);
  const d = raw.replace(/\D/g, "").slice(0, 10);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
}

/** "ทีมชาย" from the nickname, or the first word of the full name; empty when there's neither. */
export function suggestTeamName(d: Pick<Draft, "nickname" | "fullName">): string {
  const who = d.nickname.trim() || d.fullName.trim().split(/\s+/)[0] || "";
  return who ? `ทีม${who}`.slice(0, 80) : "";
}

/** The name a new team is created with: what they typed, else "ทีม<nickname>". */
export const teamNameFor = (d: Pick<Draft, "teamName" | "nickname" | "fullName">) => d.teamName.trim() || suggestTeamName(d);

export const TEAM_NAME_RUDE = "ชื่อนี้ใช้ไม่ได้ ลองชื่ออื่น";

/** What's wrong on one step, in Thai, keyed by field. Empty means the step is done. */
export function validateStep(step: StepKey, d: Draft): Errors {
  const e: Errors = {};
  switch (step) {
    case "mode":
      if (!d.mode) e.mode = "เลือกแบบที่จะสมัครก่อน";
      break;
    case "name":
      if (!d.fullName.trim()) e.fullName = "ใส่ชื่อ-นามสกุล";
      // A new team is named after the nickname, so the team-name check happens here.
      else if (d.mode === "create" && isRudeTeamName(teamNameFor(d))) e.nickname = TEAM_NAME_RUDE;
      break;
    case "school": {
      const age = Number(d.age);
      if (!d.age || !Number.isInteger(age) || age < 10 || age > 99) e.age = "เลือกอายุ";
      if (!d.school.trim()) e.school = "ใส่ชื่อโรงเรียนหรือสถาบัน";
      break;
    }
    case "parent":
      if (!isMinor(d)) break;
      if (!d.parentName.trim()) e.parentName = "ใส่ชื่อผู้ปกครอง";
      if (!PHONE_RE.test(cleanPhone(d.parentPhone))) e.parentPhone = "ใส่เบอร์ผู้ปกครอง 10 หลัก";
      if (!d.parentConsent) e.parentConsent = "ต้องได้รับความยินยอมจากผู้ปกครองก่อน";
      break;
    case "contact":
      if (!d.email.trim()) e.email = "ใส่อีเมล";
      else if (!EMAIL_RE.test(d.email.trim())) e.email = "ใส่อีเมลที่ใช้ได้";
      if (!PHONE_RE.test(cleanPhone(d.phone))) e.phone = "ใส่เบอร์โทร 10 หลัก";
      break;
    case "heard":
      if (!(HEARD_FROM_VALUES as string[]).includes(d.heardFrom)) e.heardFrom = "เลือกก่อนไปต่อ";
      break;
    case "review":
      if (!d.noRefund) e.noRefund = "ติ๊กเพื่อรับทราบก่อนสมัคร";
      break;
  }
  return e;
}

/** The first step with a problem, so the review can send people straight back to it. */
export function firstInvalidStep(d: Draft): StepKey | null {
  return stepsFor(d).find((s) => Object.keys(validateStep(s, d)).length > 0) ?? null;
}

/** Which step owns a field the server rejected (zod issue path), e.g. ["members", 0, "age"] → school. */
export function stepForServerPath(path: (string | number)[]): StepKey {
  const key = String(path[path.length - 1] ?? "");
  if (key === "inviteCode") return "mode";
  // The team name comes from the nickname, so a rejected one is fixed there.
  if (key === "teamName") return "name";
  if (key === "fullName" || key === "nickname") return "name";
  if (key === "age" || key === "school") return "school";
  if (key.startsWith("parent")) return "parent";
  if (key.startsWith("contact")) return "contact";
  if (key === "heardFrom") return "heard";
  return "review";
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
  const mode = d.mode ?? "solo";
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
    heardFrom: d.heardFrom || undefined,
    source,
    utm,
  };
}
