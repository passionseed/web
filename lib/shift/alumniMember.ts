/**
 * Who is looking at the RSVP box on /shift/alumni, decided on the server so
 * the box can render the right step without a flash. Thai copy because
 * students see it as-is.
 */

export type AlumniMemberStatus = "pending" | "confirmed" | "declined";

export interface AlumniMember {
  user_id: string;
  nickname: string;
  cohort: string;
  status: AlumniMemberStatus;
  application_id: string | null;
  created_at: string;
}

export type AlumniViewer =
  /** Needs to sign in or create a PassionSeed account first. */
  | { kind: "signedOut" }
  /** Signed in, never RSVP'd: asks nickname and round once. The suggestion
   *  comes from a paid application linked to the account. */
  | { kind: "new"; suggested: { nickname: string; cohort: string } | null }
  | {
      kind: "member";
      nickname: string;
      cohort: string;
      status: AlumniMemberStatus;
      /** Session dates this account already said yes to. */
      going: string[];
    };

export const ALUMNI_MEMBER_STATUSES: AlumniMemberStatus[] = ["pending", "confirmed", "declined"];

/** One line under the button, by status. Null when nothing needs saying. */
export function memberStatusNote(status: AlumniMemberStatus): string | null {
  if (status === "pending") return "ทีมกำลังเช็กว่าเราเคยลง SHIFT ระหว่างนี้ลงชื่อได้ตามปกติ";
  if (status === "declined") return "บัญชีนี้ยังยืนยันไม่ได้ว่าเคยลง SHIFT ทักทีมในกลุ่ม LINE ได้เลย";
  return null;
}

/** Declined accounts cannot RSVP; pending ones can while the team checks. */
export const canRsvp = (status: AlumniMemberStatus) => status !== "declined";

/** Login link that comes back to the same page, keeping ?round=1. */
export function alumniLoginHref(pathWithSearch: string): string {
  return `/login?next=${encodeURIComponent(pathWithSearch)}`;
}
