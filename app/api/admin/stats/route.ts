import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { requireAdmin, safeServerError } from "@/lib/security/route-guards";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  try {
    const { supabase } = admin.value;
    const adminSupabase = createAdminClient();

    const [
      totalUsersResult,
      totalStudentsResult,
      totalInstructorsResult,
      totalAdminsResult,
      totalClassroomsResult,
      totalMapsResult,
    ] = await Promise.all([
      adminSupabase.auth.admin.listUsers({ page: 1, perPage: 1000 }),
      supabase.from("user_roles").select("user_id", { count: "exact" }).eq("role", "student"),
      supabase.from("user_roles").select("user_id", { count: "exact" }).eq("role", "instructor"),
      supabase.from("user_roles").select("user_id", { count: "exact" }).eq("role", "admin"),
      supabase.from("classrooms").select("id", { count: "exact" }),
      supabase.from("learning_maps").select("id", { count: "exact" }),
    ]);

    return NextResponse.json({
      total_users: totalUsersResult.data?.users?.length || 0,
      total_students: totalStudentsResult.count || 0,
      total_instructors: totalInstructorsResult.count || 0,
      total_admins: totalAdminsResult.count || 0,
      total_classrooms: totalClassroomsResult.count || 0,
      total_maps: totalMapsResult.count || 0,
      recent_activity_count: 0,
    });
  } catch (error) {
    return safeServerError("Failed to fetch stats", error);
  }
}
