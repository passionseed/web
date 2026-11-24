import { ADULT_AGE } from "@/lib/hackathon/elemental/registration";
import { isRudeTeamName } from "@/lib/hackathon/elemental/team-name";

/**
 * The sign-up answers and the rules for each step. Pure, so the flow and the
 * tests share it. The API route checks the same things again with zod
 * (lib/hackathon/elemental/registration.ts).
 */

export type Mode = "solo" | "create" | "join";

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
  wantsTeam: true,
  noRefund: false,
  contactAfter: false,
});

export type StepKey = "mode" | "team" | "name" | "school" | "parent" | "contact" | "review";

export type Errors = Partial<Record<keyof Draft, string>>;

export const isMinor = (d: Draft) => d.age !== "" && Number(d.age) < ADULT_AGE;

/** The steps this person sees: a team name only when starting a team, a parent only under ADULT_AGE. */
export function stepsFor(d: Draft): StepKey[] {
  const steps: StepKey[] = ["mode"];
  if (d.mode === "create") steps.push("team");
  steps.push("name", "school");
  if (d.age === "" || isMinor(d)) steps.push("parent");
  steps.push("contact", "review");
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

export const TEAM_NAME_RUDE = "ชื่อนี้ใช้ไม่ได้ ลองชื่ออื่น";

/** What's wrong on one step, in Thai, keyed by field. Empty means the step is done. */
export function validateStep(step: StepKey, d: Draft): Errors {
  const e: Errors = {};
  switch (step) {
    case "mode":
      if (!d.mode) e.mode = "เลือกแบบที่จะสมัครก่อน";
      break;
    case "team":
      if (!d.teamName.trim()) e.teamName = "ใส่ชื่อทีมก่อน";
      else if (isRudeTeamName(d.teamName)) e.teamName = TEAM_NAME_RUDE;
      break;
    case "name":
      if (!d.fullName.trim()) e.fullName = "ใส่ชื่อ-นามสกุล";
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
  if (key === "teamName" || key === "inviteCode") return "team";
  if (key === "fullName" || key === "nickname") return "name";
  if (key === "age" || key === "school") return "school";
  if (key.startsWith("parent")) return "parent";
  if (key.startsWith("contact")) return "contact";
  return "review";
}

/** The body for POST /api/hackathon/elemental/register. */
export function registrationBody(d: Draft, inviteCode: string | undefined, source?: string, utm?: Record<string, string>) {
  const minor = isMinor(d);
  const mode = d.mode ?? "solo";
  return {
    teamMode: mode,
    teamName: mode === "create" ? d.teamName : undefined,
    inviteCode: mode === "join" ? inviteCode : undefined,
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
    source,
    utm,
  };
}
