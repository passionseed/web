import { randomBytes } from "crypto";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import type { PathReportData } from "@/types/pathlab";
import { getPathEndReflection, getPathExitReflection, getPathReflections } from "./pathlab-reflections";

function createShareToken() {
  return randomBytes(16).toString("hex");
}

export async function getSeedPathEnrollments(seedId: string) {
  const supabase = await createClient();
  const { data: paths, error: pathError } = await supabase
    .from("paths")
    .select("id, seed_id, total_days")
    .eq("seed_id", seedId);

  if (pathError) {
    throw new Error(pathError.message);
  }

  const pathIds = (paths || []).map((path) => path.id);
  if (pathIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("path_enrollments")
    .select("*")
    .in("path_id", pathIds)
    .order("enrolled_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const pathById = (paths || []).reduce((acc: Record<string, any>, path: any) => {
    acc[path.id] = path;
    return acc;
  }, {});

  const enrollments = (data || []).map((enrollment: any) => ({
    ...enrollment,
    path: pathById[enrollment.path_id] || null,
  }));
  const userIds = enrollments.map((item: any) => item.user_id);

  let profileById: Record<string, any> = {};
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, username, email")
      .in("id", userIds);

    profileById = (profiles || []).reduce((acc: Record<string, any>, profile: any) => {
      acc[profile.id] = profile;
      return acc;
    }, {});
  }

  return enrollments.map((enrollment: any) => ({
    ...enrollment,
    profile: profileById[enrollment.user_id] || null,
  }));
}

export async function getSeedEnrollmentDetail(seedId: string, enrollmentId: string) {
  const supabase = await createClient();

  const { data: enrollment, error: enrollmentError } = await supabase
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
    .single();

  if (enrollmentError || !enrollment) {
    throw new Error(enrollmentError?.message || "Enrollment not found");
  }

  if (enrollment.path?.seed_id !== seedId) {
    throw new Error("Enrollment does not belong to this seed");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, username, email")
    .eq("id", enrollment.user_id)
    .maybeSingle();

  const reflections = await getPathReflections(enrollmentId);
  const exitReflection = await getPathExitReflection(enrollmentId);
  const endReflection = await getPathEndReflection(enrollmentId);

  return {
    enrollment,
    profile,
    reflections,
    exitReflection,
    endReflection,
  };
}

export async function buildPathReportData(enrollmentId: string): Promise<PathReportData> {
  const supabase = await createClient();

  const { data: enrollment, error: enrollmentError } = await supabase
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
    .single();

  if (enrollmentError || !enrollment) {
    throw new Error(enrollmentError?.message || "Enrollment not found");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, username")
    .eq("id", enrollment.user_id)
    .maybeSingle();

  const reflections = await getPathReflections(enrollmentId);
  const exitReflection = await getPathExitReflection(enrollmentId);
  const endReflection = await getPathEndReflection(enrollmentId);

  const totalTimeMinutes = reflections.reduce((sum, reflection) => {
    return sum + (reflection.time_spent_minutes || 0);
  }, 0);

  return {
    seed_title: enrollment.path.seed.title,
    student_name: profile?.full_name || profile?.username || null,
    status: enrollment.status,
    days_completed: reflections.length,
    total_days: enrollment.path.total_days,
    total_time_minutes: totalTimeMinutes,
    trend: reflections.map((reflection) => ({
      day_number: reflection.day_number,
      energy_level: reflection.energy_level,
      confusion_level: reflection.confusion_level,
      interest_level: reflection.interest_level,
      time_spent_minutes: reflection.time_spent_minutes,
    })),
    exit_reflection: exitReflection,
    end_reflection: endReflection,
  };
}

export async function createPathReport(params: {
  enrollmentId: string;
  generatedBy: string;
  reportText?: string | null;
}) {
  const supabase = await createClient();
  const reportData = await buildPathReportData(params.enrollmentId);

  const payload = {
    enrollment_id: params.enrollmentId,
    generated_by: params.generatedBy,
    report_data: reportData,
    report_text: params.reportText || null,
    share_token: createShareToken(),
  };

  const { data, error } = await supabase
    .from("path_reports")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function getReportByToken(shareToken: string) {
  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from("path_reports")
    .select(
      `
      *,
      enrollment:path_enrollments(
        *,
        path:paths(
          *,
          seed:seeds(*)
        )
      )
    `
    )
    .eq("share_token", shareToken)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  const userId = (data as any).enrollment?.user_id;
  if (!userId) {
    return data;
  }

  const { data: profile } = await adminClient
    .from("profiles")
    .select("id, full_name, username")
    .eq("id", userId)
    .maybeSingle();

  return {
    ...data,
    profile: profile || null,
  };
}
