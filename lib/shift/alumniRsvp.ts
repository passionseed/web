import { z } from "zod";

import { SHIFT_COHORTS } from "@/lib/content/shift-cohort";

/**
 * RSVP contract shared by the button on /shift/alumni and
 * /api/shift/alumni/rsvp. Nickname and round only: students are minors, and
 * the public page shows a count, never names. Messages are Thai because
 * students see them as-is.
 */

export const RSVP_COHORTS = SHIFT_COHORTS.map((c) => ({ value: c.name, label: c.name }));

export const alumniRsvpSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  nickname: z.string().trim().min(1, "ใส่ชื่อเล่นด้วยนะ").max(30, "ชื่อยาวเกินไป"),
  cohort: z.enum(RSVP_COHORTS.map((c) => c.value) as [string, ...string[]], {
    message: "เลือกรุ่นด้วยนะ",
  }),
  /** Honeypot. Humans never see it; bots fill it. */
  website: z.string().max(0).optional(),
});

export type AlumniRsvpInput = z.input<typeof alumniRsvpSchema>;

/** One line under the button, so students know what happens to their name. */
export const RSVP_NOTICE = "เก็บแค่ชื่อเล่นกับรุ่นไว้นับคน ทีม PassionSeed เห็นคนเดียว หน้าเว็บโชว์แค่จำนวน";

/** "ลงชื่อแล้ว 3 คน", or an invitation when nobody has yet. */
export function rsvpCountLabel(count: number): string {
  return count > 0 ? `ลงชื่อแล้ว ${count} คน` : "ยังไม่มีใครลงชื่อ เป็นคนแรกเลย";
}
