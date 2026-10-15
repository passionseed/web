"use server";

import { revalidatePath } from "next/cache";

import { compactAlumniDoc, parseAlumniCalendarDoc } from "@/lib/content/shift-alumni";
import { currentShiftAdmin } from "@/lib/shift/admin";

export type SaveResult = { ok: true; updatedAt: string } | { ok: false; error: string };

/** Saves the whole alumni calendar. Admins only (checked here and by RLS). */
export async function saveAlumniCalendar(raw: unknown): Promise<SaveResult> {
  const doc = parseAlumniCalendarDoc(raw);
  if (!doc) return { ok: false, error: "ข้อมูลไม่ถูกต้อง เช็กเวลาเลิกให้หลังเวลาเริ่ม" };

  const admin = await currentShiftAdmin();
  if (!admin) return { ok: false, error: "เฉพาะแอดมินที่ล็อกอินแล้วแก้ได้" };
  const { supabase, user } = admin;

  const updatedAt = new Date().toISOString();
  const { error } = await supabase.from("shift_alumni_calendar").upsert({
    id: "main",
    content: compactAlumniDoc(doc),
    updated_at: updatedAt,
    updated_by: user.id,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/shift/alumni");
  return { ok: true, updatedAt };
}
