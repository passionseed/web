import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { requireAdmin, safeServerError } from "@/lib/security/route-guards";
import {
  getAdminUser,
  isUuid,
  listAdminUsers,
  parseAdminUsersQuery,
  parseProfileUpdate,
  profileEditDetails,
  type ProfileSnapshot,
} from "@/lib/supabase/admin-users";

/**
 * GET /api/admin/users?q=&role=&page=&pageSize=&sort=   one page of users
 * GET /api/admin/users?id=<uuid>                        a single user
 */
export async function GET(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  try {
    const service = createAdminClient();
    const rawId = request.nextUrl.searchParams.get("id");

    if (rawId !== null) {
      if (!isUuid(rawId)) {
        return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
      }
      const user = await getAdminUser(service, rawId);
      if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
      return NextResponse.json({ user });
    }

    const query = parseAdminUsersQuery(request.nextUrl.searchParams);
    const page = await listAdminUsers(service, { ...query, id: null });
    return NextResponse.json(page);
  } catch (error) {
    return safeServerError("Failed to fetch users", error);
  }
}

export async function PUT(request: Request) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  try {
    const parsed = parseProfileUpdate(await request.json().catch(() => null));
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const { userId, update } = parsed;
    if (Object.keys(update).length === 0) {
      return NextResponse.json({ success: true });
    }

    // Profiles RLS only lets people edit their own row, so admin edits use
    // the service-role client, after the admin check above. Every change is
    // written to admin_activity_log, like role changes.
    const service = createAdminClient();

    const { data: before, error: beforeError } = await service
      .from("profiles")
      .select("username, full_name, discord_uid")
      .eq("id", userId)
      .maybeSingle();
    if (beforeError) {
      return NextResponse.json({ error: "Failed to load profile" }, { status: 500 });
    }
    if (!before) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (update.username) {
      const { data: existingUser, error: lookupError } = await service
        .from("profiles")
        .select("id")
        .eq("username", update.username)
        .neq("id", userId)
        .limit(1)
        .maybeSingle();

      if (lookupError) {
        return NextResponse.json({ error: "Failed to check username" }, { status: 500 });
      }
      if (existingUser) {
        return NextResponse.json({ error: "Username is already taken" }, { status: 409 });
      }
    }

    const { data: updated, error: updateError } = await service
      .from("profiles")
      .update(update)
      .eq("id", userId)
      .select("id");

    if (updateError) {
      return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
    }
    if (!updated || updated.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const details = profileEditDetails(before as Partial<ProfileSnapshot>, update);
    if (details) {
      const { error: logError } = await service.from("admin_activity_log").insert({
        admin_user_id: admin.value.userId,
        action: "update_profile",
        target_user_id: userId,
        target_resource_type: "profile",
        target_resource_id: userId,
        details,
      });
      // The edit already happened, so a failed log write is reported, not undone.
      if (logError) console.error("[admin/users] profile edit was not logged:", logError.message);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return safeServerError("Failed to update user profile", error);
  }
}
