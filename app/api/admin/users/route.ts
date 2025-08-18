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

    // Get all users from auth.users (admin only)
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error("Error fetching auth users:", authError);
      return NextResponse.json(
        { error: "Failed to fetch users" },
        { status: 500 }
      );
    }

    // Get all user profiles and roles
    const userIds = authUsers.users.map(u => u.id);
    
    const [profilesResult, rolesResult] = await Promise.all([
      // Get profiles for all users
      supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url")
        .in("id", userIds),
      
      // Get all user roles
      supabase
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", userIds),
    ]);

    // Combine the data
    const users = authUsers.users.map(authUser => {
      const profile = profilesResult.data?.find(p => p.id === authUser.id);
      const userRoles = rolesResult.data?.filter(r => r.user_id === authUser.id) || [];

      return {
        id: authUser.id,
        email: authUser.email,
        created_at: authUser.created_at,
        profiles: profile || null,
        user_roles: userRoles,
      };
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}