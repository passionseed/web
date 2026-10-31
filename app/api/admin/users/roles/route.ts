import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/utils/supabase/admin";
import { requireAdmin, safeServerError } from "@/lib/security/route-guards";
import {
  applyRoleChange,
  parseRoleChangeRequest,
  roleChangeGuard,
  type AdminUserRole,
} from "@/lib/supabase/admin-users";

async function logAdminActivity(
  client: SupabaseClient,
  adminUserId: string,
  action: string,
  targetUserId: string,
  details: Record<string, unknown>,
) {
  try {
    await client.from("admin_activity_log").insert({
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

async function logRoleChanges(
  client: SupabaseClient,
  adminUserId: string,
  targetUserId: string,
  requestAction: string,
  added: AdminUserRole[],
  removed: AdminUserRole[],
) {
  await Promise.all([
    ...added.map((role) =>
      logAdminActivity(client, adminUserId, `add_role_${role}`, targetUserId, {
        role,
        action: "add",
        via: requestAction,
      }),
    ),
    ...removed.map((role) =>
      logAdminActivity(client, adminUserId, `remove_role_${role}`, targetUserId, {
        role,
        action: "remove",
        via: requestAction,
      }),
    ),
  ]);
}

/**
 * POST /api/admin/users/roles  { userId, role, action: "add" | "remove" | "set_primary" }
 *
 * `set_primary` adds the new primary role before removing the others, so a
 * failure can never leave the user without a role; a failed removal comes back
 * as 500 with `partial: true`. Admins cannot remove their own admin role.
 */
export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  try {
    const { userId: adminUserId } = admin.value;
    const parsed = parseRoleChangeRequest(await request.json().catch(() => null));
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const change = parsed.value;
    const guardError = roleChangeGuard(adminUserId, change);
    if (guardError) {
      return NextResponse.json({ error: guardError }, { status: 400 });
    }

    // user_roles is read-only for signed-in users, so writes use the
    // service-role client, after the admin check above.
    const service = createAdminClient();
    const result = await applyRoleChange(service, change);

    if (result.status === "error") {
      return NextResponse.json({ error: result.message }, { status: result.httpStatus });
    }

    await logRoleChanges(service, adminUserId, change.userId, change.action, result.added, result.removed);

    if (result.status === "partial") {
      return NextResponse.json(
        {
          success: false,
          partial: true,
          error: result.message,
          added: result.added,
          removed: result.removed,
          failed: result.failed,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      added: result.added,
      removed: result.removed,
    });
  } catch (error) {
    return safeServerError("Failed to update user role", error);
  }
}
