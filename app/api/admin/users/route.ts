import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

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
    const adminSupabase = createAdminClient();

    // Get all users from auth.users (admin only) - requires service role
    const { data: authUsers, error: authError } = await adminSupabase.auth.admin.listUsers();
    
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

export async function PUT(request: Request) {
  const user = await checkAdminAccess();
  
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { userId, username, full_name } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    const supabase = await createClient();

    // Check if username is already taken by another user
    if (username && username.trim()) {
      const { data: existingUser } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", username.trim())
        .neq("id", userId)
        .single();

      if (existingUser) {
        return NextResponse.json(
          { error: "Username is already taken" },
          { status: 409 }
        );
      }
    }

    // Update the user's profile
    const updateData: any = {};
    if (username !== undefined) updateData.username = username.trim() || null;
    if (full_name !== undefined) updateData.full_name = full_name.trim() || null;

    const { error: updateError } = await supabase
      .from("profiles")
      .update(updateData)
      .eq("id", userId);

    if (updateError) {
      console.error("Error updating profile:", updateError);
      return NextResponse.json(
        { error: "Failed to update profile" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating user profile:", error);
    return NextResponse.json(
      { error: "Failed to update user profile" },
      { status: 500 }
    );
  }
}