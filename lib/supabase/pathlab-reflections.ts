import { createClient } from "@/utils/supabase/server";
import type {
  PathEndReflection,
  PathExitReflection,
  PathReflectionDecision,
  PathWouldExploreDeeper,
} from "@/types/pathlab";

interface SubmitPathReflectionInput {
  enrollmentId: string;
  dayNumber: number;
  energyLevel: number;
  confusionLevel: number;
  interestLevel: number;
  openResponse?: string | null;
  decision: PathReflectionDecision;
  timeSpentMinutes?: number | null;
  extraPromptResponses?: string[];
  exitReflection?: {
    reasonCategory: "boring" | "confusing" | "stressful" | "not_me";
    interestChange: "more" | "less" | "same";
    openResponse?: string | null;
  };
  endReflection?: {
    overallInterest: number;
    fitLevel: number;
    surpriseResponse?: string | null;
    wouldExploreDeeper: PathWouldExploreDeeper;
  };
}

export async function getPathReflections(enrollmentId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("path_reflections")
    .select("*")
    .eq("enrollment_id", enrollmentId)
    .order("day_number", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data || [];
}

export async function getPathExitReflection(enrollmentId: string): Promise<PathExitReflection | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("path_exit_reflections")
    .select("*")
    .eq("enrollment_id", enrollmentId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as PathExitReflection | null) || null;
}

export async function getPathEndReflection(enrollmentId: string): Promise<PathEndReflection | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("path_end_reflections")
    .select("*")
    .eq("enrollment_id", enrollmentId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as PathEndReflection | null) || null;
}

export async function submitPathReflection(input: SubmitPathReflectionInput) {
  const supabase = await createClient();

  const { data: enrollment, error: enrollmentError } = await supabase
    .from("path_enrollments")
    .select(
      `
      *,
      path:paths(*)
    `
    )
    .eq("id", input.enrollmentId)
    .single();

  if (enrollmentError || !enrollment) {
    throw new Error(enrollmentError?.message || "Enrollment not found");
  }

  const { data: reflection, error: reflectionError } = await supabase
    .from("path_reflections")
    .upsert(
      {
        enrollment_id: input.enrollmentId,
        day_number: input.dayNumber,
        energy_level: input.energyLevel,
        confusion_level: input.confusionLevel,
        interest_level: input.interestLevel,
        open_response: input.openResponse || null,
        decision: input.decision,
        time_spent_minutes: input.timeSpentMinutes ?? null,
        extra_prompt_responses: input.extraPromptResponses || null,
      },
      { onConflict: "enrollment_id,day_number" }
    )
    .select("*")
    .single();

  if (reflectionError) {
    throw new Error(reflectionError.message);
  }

  const totalDays = enrollment.path?.total_days || 1;
  const nextDay = Math.min(input.dayNumber + 1, totalDays);

  if (input.decision === "quit") {
    if (!input.exitReflection) {
      throw new Error("Exit reflection is required when quitting");
    }

    const { error: exitError } = await supabase.from("path_exit_reflections").upsert(
      {
        enrollment_id: input.enrollmentId,
        trigger_day: input.dayNumber,
        reason_category: input.exitReflection.reasonCategory,
        interest_change: input.exitReflection.interestChange,
        open_response: input.exitReflection.openResponse || null,
      },
      { onConflict: "enrollment_id" }
    );

    if (exitError) {
      throw new Error(exitError.message);
    }

    const { error: enrollmentUpdateError } = await supabase
      .from("path_enrollments")
      .update({
        status: "quit",
        completed_at: new Date().toISOString(),
      })
      .eq("id", input.enrollmentId);

    if (enrollmentUpdateError) {
      throw new Error(enrollmentUpdateError.message);
    }
  } else if (input.decision === "pause") {
    const { error: enrollmentUpdateError } = await supabase
      .from("path_enrollments")
      .update({
        status: "paused",
        current_day: nextDay,
      })
      .eq("id", input.enrollmentId);

    if (enrollmentUpdateError) {
      throw new Error(enrollmentUpdateError.message);
    }
  } else if (input.decision === "continue_now" || input.decision === "continue_tomorrow") {
    const { error: enrollmentUpdateError } = await supabase
      .from("path_enrollments")
      .update({
        status: "active",
        current_day: nextDay,
      })
      .eq("id", input.enrollmentId);

    if (enrollmentUpdateError) {
      throw new Error(enrollmentUpdateError.message);
    }
  } else if (input.decision === "final_reflection") {
    if (!input.endReflection) {
      throw new Error("End reflection is required at completion");
    }

    const { error: endReflectionError } = await supabase.from("path_end_reflections").upsert(
      {
        enrollment_id: input.enrollmentId,
        overall_interest: input.endReflection.overallInterest,
        fit_level: input.endReflection.fitLevel,
        surprise_response: input.endReflection.surpriseResponse || null,
        would_explore_deeper: input.endReflection.wouldExploreDeeper,
      },
      { onConflict: "enrollment_id" }
    );

    if (endReflectionError) {
      throw new Error(endReflectionError.message);
    }

    const { error: enrollmentUpdateError } = await supabase
      .from("path_enrollments")
      .update({
        status: "explored",
        completed_at: new Date().toISOString(),
        current_day: totalDays,
      })
      .eq("id", input.enrollmentId);

    if (enrollmentUpdateError) {
      throw new Error(enrollmentUpdateError.message);
    }
  }

  const { data: updatedEnrollment, error: updatedEnrollmentError } = await supabase
    .from("path_enrollments")
    .select("*")
    .eq("id", input.enrollmentId)
    .single();

  if (updatedEnrollmentError) {
    throw new Error(updatedEnrollmentError.message);
  }

  return {
    reflection,
    enrollment: updatedEnrollment,
  };
}
