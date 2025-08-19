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

async function logAdminActivity(
  supabase: any,
  adminUserId: string,
  action: string,
  targetUserId: string,
  details: any
) {
  try {
    await supabase
      .from("admin_activity_log")
      .insert({
        admin_user_id: adminUserId,
        action,
        target_user_id: targetUserId,
        target_resource_type: "user_role",
        details,
      });
  } catch (error) {
    console.error("Failed to log admin activity:", error);
  }
}

export async function POST(request: Request) {
  const adminUser = await checkAdminAccess();
  
  if (!adminUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { userId, role, action } = await request.json();

    // Validate inputs
    if (!userId || !role || !action) {
      return NextResponse.json(
        { error: "Missing required fields: userId, role, action" },
        { status: 400 }
      );
    }

    if (!["add", "remove"].includes(action)) {
      return NextResponse.json(
        { error: "Action must be 'add' or 'remove'" },
        { status: 400 }
      );
    }

    if (!["student", "TA", "instructor", "admin"].includes(role)) {
      return NextResponse.json(
        { error: "Invalid role" },
        { status: 400 }
      );
    }

    // Prevent non-admin from modifying admin roles
    if (role === "admin" && adminUser.id !== userId) {
      // Check if target user is already admin or if we're trying to add admin role
      const { data: existingRoles } = await (await createClient())
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin");

      if (existingRoles && existingRoles.length > 0 && action === "remove") {
        return NextResponse.json(
          { error: "Cannot remove admin role from another admin" },
          { status: 403 }
        );
      }
    }

    const supabase = await createClient();

    if (action === "add") {
      // Add role (insert if not exists)
      const { error } = await supabase
        .from("user_roles")
        .insert({
          user_id: userId,
          role: role,
        });

      if (error) {
        // Check if it's a duplicate key error (role already exists)
        if (error.code === "23505") {
          return NextResponse.json(
            { error: "User already has this role" },
            { status: 400 }
          );
        }
        throw error;
      }

      await logAdminActivity(
        supabase,
        adminUser.id,
        `add_role_${role}`,
        userId,
        { role, action: "add" }
      );

    } else if (action === "remove") {
      // Remove role
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", role);

      if (error) {
        throw error;
      }

      await logAdminActivity(
        supabase,
        adminUser.id,
        `remove_role_${role}`,
        userId,
        { role, action: "remove" }
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: `Role ${role} ${action === "add" ? "added to" : "removed from"} user successfully` 
    });

  } catch (error) {
    console.error("Error managing user role:", error);
    return NextResponse.json(
      { error: "Failed to update user role" },
      { status: 500 }
    );
  }
}