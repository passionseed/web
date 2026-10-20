"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";

import { alumniCalendarEvents, rsvpDates, withRsvpTotals } from "@/lib/brain/alumni";
import { recordBrainEvent } from "@/lib/brain/events";
import { compactAlumniDoc, parseAlumniCalendarDoc, type AlumniCalendarDoc } from "@/lib/content/shift-alumni";
import { currentShiftAdmin } from "@/lib/shift/admin";
import { loadAlumniCalendar } from "@/lib/supabase/shift-alumni-calendar";
import { countAlumniRsvps } from "@/lib/supabase/shift-alumni-rsvps";

export type SaveResult = { ok: true; updatedAt: string } | { ok: false; error: string };

/** Saves the whole alumni calendar. Admins only (checked here and by RLS). */
export async function saveAlumniCalendar(raw: unknown): Promise<SaveResult> {
  const doc = parseAlumniCalendarDoc(raw);
  if (!doc) return { ok: false, error: "ข้อมูลไม่ถูกต้อง เช็กเวลาเลิกให้หลังเวลาเริ่ม" };

  const admin = await currentShiftAdmin();
  if (!admin) return { ok: false, error: "เฉพาะแอดมินที่ล็อกอินแล้วแก้ได้" };
  const { supabase, user } = admin;

  // Read before saving, so the company brain hears only what changed.
  const { doc: before } = await loadAlumniCalendar();
  const content = compactAlumniDoc(doc);

  const updatedAt = new Date().toISOString();
  const { error } = await supabase.from("shift_alumni_calendar").upsert({
    id: "main",
    content,
    updated_at: updatedAt,
    updated_by: user.id,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/shift/alumni");
  revalidatePath("/shift");
  after(() => recordCalendarChanges(before, content));
  return { ok: true, updatedAt };
}

/** Company brain: session dates, titles, times and RSVP totals only. */
async function recordCalendarChanges(before: AlumniCalendarDoc, saved: AlumniCalendarDoc) {
  const events = alumniCalendarEvents(compactAlumniDoc(before), saved);
  if (events.length === 0) return;
  const counts = await countAlumniRsvps(rsvpDates(events));
  for (const event of withRsvpTotals(events, counts)) {
    await recordBrainEvent(event, "shift/alumni/calendar");
  }
}
