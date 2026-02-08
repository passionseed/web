import { createClient } from "@/utils/supabase/server";
import type { PathDay, PathEnrollment } from "@/types/pathlab";

export async function getPathBySeedId(seedId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("paths")
    .select("*")
    .eq("seed_id", seedId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function getPathDays(pathId: string): Promise<PathDay[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("path_days")
    .select("*")
    .eq("path_id", pathId)
    .order("day_number", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data || []) as PathDay[];
}

export async function getPathDay(pathId: string, dayNumber: number): Promise<PathDay | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("path_days")
    .select("*")
    .eq("path_id", pathId)
    .eq("day_number", dayNumber)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as PathDay | null) || null;
}

export async function getEnrollmentById(enrollmentId: string): Promise<PathEnrollment | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("path_enrollments")
    .select("*")
    .eq("id", enrollmentId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as PathEnrollment | null) || null;
}

export async function getEnrollmentWithPath(enrollmentId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("path_enrollments")
    .select(
      `
      *,
      path:paths(
        *,
        seed:seeds(*)
      )
    `
    )
    .eq("id", enrollmentId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function upsertMapEnrollmentForSeed(userId: string, mapId: string) {
  const supabase = await createClient();

  const { error } = await supabase.from("user_map_enrollments").upsert(
    {
      user_id: userId,
      map_id: mapId,
      status: "active",
      enrolled_at: new Date().toISOString(),
    },
    { onConflict: "user_id,map_id", ignoreDuplicates: false }
  );

  if (error) {
    throw new Error(error.message);
  }
}

export async function createOrResumePathEnrollment(params: {
  userId: string;
  pathId: string;
  whyJoined?: string | null;
}) {
  const supabase = await createClient();
  const { userId, pathId, whyJoined } = params;

  const { data: existing, error: existingError } = await supabase
    .from("path_enrollments")
    .select("*")
    .eq("user_id", userId)
    .eq("path_id", pathId)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (existing) {
    const { data: updated, error: updateError } = await supabase
      .from("path_enrollments")
      .update({
        why_joined: existing.why_joined || whyJoined || null,
        status: existing.status === "explored" ? "explored" : "active",
        completed_at: existing.status === "explored" ? existing.completed_at : null,
      })
      .eq("id", existing.id)
      .select("*")
      .single();

    if (updateError) {
      throw new Error(updateError.message);
    }

    return updated;
  }

  const { data, error } = await supabase
    .from("path_enrollments")
    .insert({
      user_id: userId,
      path_id: pathId,
      why_joined: whyJoined || null,
      current_day: 1,
      status: "active",
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function upsertPathDays(pathId: string, days: Array<{
  id?: string;
  day_number: number;
  context_text: string;
  reflection_prompts: string[];
  node_ids: string[];
}>) {
  const supabase = await createClient();

  const payload = days.map((day) => ({
    id: day.id,
    path_id: pathId,
    day_number: day.day_number,
    context_text: day.context_text,
    reflection_prompts: day.reflection_prompts || [],
    node_ids: day.node_ids || [],
  }));

  const { error } = await supabase.from("path_days").upsert(payload, {
    onConflict: "path_id,day_number",
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function deletePathDaysNotIn(pathId: string, dayNumbers: number[]) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("path_days")
    .delete()
    .eq("path_id", pathId)
    .not("day_number", "in", `(${dayNumbers.join(",") || 0})`);

  if (error) {
    throw new Error(error.message);
  }
}
