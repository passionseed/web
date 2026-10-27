import { NextResponse } from "next/server";
import { z } from "zod";

import {
  ADMIN_SHIFT_APPLICATION_SELECT,
  BULK_APPLICATION_LIMIT,
  type AdminShiftApplication,
} from "@/lib/admin/queue-tools/shift-applications";
import { expireAdminOverviewKpis } from "@/lib/admin/overview/cache";
import { isUuid } from "@/lib/admin/queue-tools/url";
import { requireAdmin, safeServerError } from "@/lib/security/route-guards";
import { createAdminClient } from "@/utils/supabase/admin";

/**
 * Admin list of SHIFT applications, newest first.
 *   ?cohort=SHIFT[3]  one cohort
 *   ?id=<uuid>        one application (to find which cohort a deep link is in)
 * Rows never include join_token; see ADMIN_SHIFT_APPLICATION_COLUMNS.
 */
export async function GET(request: Request) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  try {
    const params = new URL(request.url).searchParams;
    const cohort = params.get("cohort");
    const id = params.get("id");
    if (id !== null && !isUuid(id)) {
      return NextResponse.json({ error: "Invalid application id" }, { status: 400 });
    }

    const supabase = createAdminClient();
    let query = supabase
      .from("shift_applications")
      .select(ADMIN_SHIFT_APPLICATION_SELECT)
      .order("created_at", { ascending: false });
    if (cohort) query = query.eq("cohort", cohort);
    if (id) query = query.eq("id", id);

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: "Failed to load applications" }, { status: 500 });
    }

    return NextResponse.json({
      applications: (data ?? []) as unknown as AdminShiftApplication[],
    });
  } catch (error) {
    return safeServerError("Failed to load SHIFT applications", error);
  }
}

const bulkSchema = z
  .object({
    ids: z.array(z.string().uuid()).min(1).max(BULK_APPLICATION_LIMIT),
    action: z.enum(["accept", "paid"]),
  })
  .strict();

/**
 * Bulk accept or mark paid in one UPDATE. Rows that are already accepted or
 * already paid are left alone, so a paid timestamp is never overwritten.
 * Returns the rows it changed; ids missing from the response were skipped.
 */
export async function PATCH(request: Request) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const parsed = bulkSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid bulk update" }, { status: 400 });
    }
    const { ids, action } = parsed.data;

    const supabase = createAdminClient();
    const base = supabase.from("shift_applications");
    const query =
      action === "accept"
        ? base.update({ status: "accepted" }).in("id", ids).neq("status", "accepted")
        : base.update({ paid_at: new Date().toISOString() }).in("id", ids).is("paid_at", null);

    const { data, error } = await query.select(ADMIN_SHIFT_APPLICATION_SELECT);
    if (error) {
      return NextResponse.json({ error: "Failed to update applications" }, { status: 500 });
    }

    // Newly paid seats move the revenue and paid-seats KPIs on the overview.
    if (action === "paid" && (data?.length ?? 0) > 0) expireAdminOverviewKpis();

    return NextResponse.json({
      applications: (data ?? []) as unknown as AdminShiftApplication[],
    });
  } catch (error) {
    return safeServerError("Failed to bulk update SHIFT applications", error);
  }
}
