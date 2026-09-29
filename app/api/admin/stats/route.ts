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
      totalStudentsResult,
      totalInstructorsResult,
      totalAdminsResult,
      totalClassroomsResult,
      totalMapsResult,
    ] = await Promise.all([
      supabase.from("user_roles").select("user_id", { count: "exact" }).eq("role", "student"),
      supabase.from("user_roles").select("user_id", { count: "exact" }).eq("role", "instructor"),
      supabase.from("user_roles").select("user_id", { count: "exact" }).eq("role", "admin"),
      supabase.from("classrooms").select("id", { count: "exact" }),
      supabase.from("learning_maps").select("id", { count: "exact" }),
    ]);

    // Auth Admin's listUsers endpoint returns one page at a time. Walk every
    // page so the dashboard count remains correct beyond the first 1,000 users.
    const perPage = 1000;
    let totalUsers = 0;
    for (let page = 1; ; page += 1) {
      const { data, error } = await adminSupabase.auth.admin.listUsers({ page, perPage });
      if (error) throw error;
      const usersOnPage = data?.users?.length ?? 0;
      totalUsers += usersOnPage;
      if (usersOnPage < perPage) break;
    }

    return NextResponse.json({
      total_users: totalUsers,
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
