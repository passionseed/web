import { NextResponse } from "next/server";
import { requireAdmin, safeServerError } from "@/lib/security/route-guards";
import { createAdminClient } from "@/utils/supabase/admin";

async function logAdminActivity(
  supabase: any,
  adminUserId: string,
  action: string,
  targetUserId: string,
  details: any
) {
  try {
    await supabase.from("admin_activity_log").insert({
      admin_user_id: adminUserId,
      action,
      target_user_id: targetUserId,
      target_resource_type: "user_role",
      details,
    });
  } catch {
    // Intentionally ignore logging errors
  }
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  try {
    const { supabase, userId: adminUserId } = admin.value;
    const { userId, role, action } = await request.json();

    if (!userId || !role || !action) {
      return NextResponse.json(
        { error: "Missing required fields: userId, role, action" },
        { status: 400 }
      );
    }

    if (![
      "student",
      "TA",
      "instructor",
      "admin",
      "beta-tester",
      "passion-seed-team",
    ].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    if (!["add", "remove"].includes(action)) {
      return NextResponse.json({ error: "Action must be 'add' or 'remove'" }, { status: 400 });
    }

    // authenticated has SELECT only on user_roles; write with the service role
    // now that requireAdmin() has passed.
    const serviceClient = createAdminClient();

    if (action === "add") {
      const { error } = await serviceClient.from("user_roles").insert({ user_id: userId, role });
      if (error?.code === "23505") {
        return NextResponse.json({ error: "User already has this role" }, { status: 400 });
      }
      if (error) {
        return NextResponse.json({ error: "Failed to update user role" }, { status: 500 });
      }

      await logAdminActivity(supabase, adminUserId, `add_role_${role}`, userId, { role, action });
    } else {
      const { error } = await serviceClient
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", role);

      if (error) {
        return NextResponse.json({ error: "Failed to update user role" }, { status: 500 });
      }

      await logAdminActivity(supabase, adminUserId, `remove_role_${role}`, userId, {
        role,
        action,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Role ${role} ${action === "add" ? "added to" : "removed from"} user successfully`,
    });
  } catch (error) {
    return safeServerError("Failed to update user role", error);
  }
}
