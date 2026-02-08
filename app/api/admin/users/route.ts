import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { requireAdmin, safeServerError } from "@/lib/security/route-guards";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  try {
    const { supabase } = admin.value;
    const adminSupabase = createAdminClient();

    const { data: authUsers, error: authError } = await adminSupabase.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

    if (authError) {
      return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
    }

    const userIds = authUsers.users.map((u) => u.id);

    const [profilesResult, rolesResult] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url, discord_uid")
        .in("id", userIds),
      supabase
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", userIds),
    ]);

    if (profilesResult.error) {
      console.error("Error fetching profiles:", profilesResult.error);
    }

    if (rolesResult.error) {
      console.error("Error fetching roles:", rolesResult.error);
    }

    const profiles = profilesResult.data || [];
    const roles = rolesResult.data || [];

    const users = authUsers.users.map((authUser) => {
      const profile = profiles.find((p) => p.id === authUser.id);
      const userRoles = roles.filter((r) => r.user_id === authUser.id) || [];

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
    return safeServerError("Failed to fetch users", error);
  }
}

export async function PUT(request: Request) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  try {
    const { supabase } = admin.value;
    const { userId, username, full_name, discord_uid } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    // Check for username uniqueness if being updated
    if (username && username.trim()) {
      const { data: existingUser } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", username.trim())
        .neq("id", userId)
        .single();

      if (existingUser) {
        return NextResponse.json({ error: "Username is already taken" }, { status: 409 });
      }
    }

    const updateData: Record<string, string | null> = {};
    if (username !== undefined) updateData.username = username.trim() || null;
    if (full_name !== undefined) updateData.full_name = full_name.trim() || null;
    if (discord_uid !== undefined) updateData.discord_uid = discord_uid.trim() || null;

    if (Object.keys(updateData).length > 0) {
      const { error: updateError } = await supabase
        .from("profiles")
        .update(updateData)
        .eq("id", userId);

      if (updateError) {
        return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return safeServerError("Failed to update user profile", error);
  }
}
