import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

async function checkAdminAccess() {
  const supabase = await createClient();
  
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  // Check if user has admin role
  const { data: roles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin");

  return roles && roles.length > 0 ? user : null;
}

export async function GET() {
  const user = await checkAdminAccess();
  
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const supabase = await createClient();

    // Get all stats in parallel
    const [
      totalUsersResult,
      totalStudentsResult,
      totalInstructorsResult,
      totalAdminsResult,
      totalClassroomsResult,
      totalMapsResult,
    ] = await Promise.all([
      // Total users (from auth.users)
      supabase.auth.admin.listUsers(),
      
      // Total students
      supabase
        .from("user_roles")
        .select("user_id", { count: "exact" })
        .eq("role", "student"),
      
      // Total instructors
      supabase
        .from("user_roles")
        .select("user_id", { count: "exact" })
        .eq("role", "instructor"),
      
      // Total admins
      supabase
        .from("user_roles")
        .select("user_id", { count: "exact" })
        .eq("role", "admin"),
      
      // Total classrooms
      supabase
        .from("classrooms")
        .select("id", { count: "exact" }),
      
      // Total learning maps
      supabase
        .from("learning_maps")
        .select("id", { count: "exact" }),
    ]);

    const stats = {
      total_users: totalUsersResult.data?.users?.length || 0,
      total_students: totalStudentsResult.count || 0,
      total_instructors: totalInstructorsResult.count || 0,
      total_admins: totalAdminsResult.count || 0,
      total_classrooms: totalClassroomsResult.count || 0,
      total_maps: totalMapsResult.count || 0,
      recent_activity_count: 0, // TODO: Implement activity tracking
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error("Error fetching admin stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}