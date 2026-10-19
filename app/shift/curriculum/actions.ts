"use server";

import { revalidatePath } from "next/cache";

import { parseCurriculumDoc } from "@/lib/content/shift2-curriculum";
import { isCurriculumKey } from "@/lib/shift-round/admin/format";
import { createClient } from "@/utils/supabase/server";

export type SaveResult = { ok: true; updatedAt: string } | { ok: false; error: string };

/**
 * Saves the whole curriculum of one round key (`shift_curriculum.round`,
 * which rounds point at with `curriculum_key`). Admins only (checked here and
 * by RLS).
 */
export async function saveCurriculum(round: string, raw: unknown): Promise<SaveResult> {
  if (!isCurriculumKey(round)) return { ok: false, error: "คีย์หลักสูตรไม่ถูกต้อง" };
  const doc = parseCurriculumDoc(raw);
  if (!doc) return { ok: false, error: "ข้อมูลไม่ถูกต้อง" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "ต้องล็อกอินก่อน" };

  const { data: roles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .limit(1);
  if (!roles?.length) return { ok: false, error: "เฉพาะแอดมินแก้ได้" };

  const updatedAt = new Date().toISOString();
  const { error } = await supabase
    .from("shift_curriculum")
    .upsert({ round, content: doc, updated_at: updatedAt, updated_by: user.id });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/shift/curriculum");
  return { ok: true, updatedAt };
}
