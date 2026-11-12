import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { expireAdminOverviewKpis } from "@/lib/admin/overview/cache";
import { isUuid } from "@/lib/admin/queue-tools/url";
import { requireAdmin, safeServerError } from "@/lib/security/route-guards";
import { createServiceRoleClient } from "@/utils/supabase/server";

const reviewSchema = z.object({
  action: z.enum(["approve", "reject"]),
  note: z.string().max(2000).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  try {
    const { userId } = admin.value;
    const { id } = await params;
    if (!isUuid(id)) {
      return NextResponse.json({ error: "Trial not found" }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const parsed = reviewSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    const { action, note } = parsed.data;

    // RLS blocks user-side updates on trial_accesses; use the service role.
    const service = createServiceRoleClient();
    const { data: trial, error: fetchError } = await service
      .from("trial_accesses")
      .select("id, status, payment_deadline")
      .eq("id", id)
      .single();

    if (fetchError || !trial) {
      return NextResponse.json({ error: "Trial not found" }, { status: 404 });
    }

    const now = new Date();
    const isBeforeDeadline =
      now.getTime() < new Date(trial.payment_deadline).getTime();

    const update =
      action === "approve"
        ? {
            status: "paid",
            paid_at: now.toISOString(),
            verified_by: userId,
            verified_at: now.toISOString(),
            admin_note: note ?? null,
          }
        : {
            // Slip rejected: give the student their remaining time back if
            // the deadline has not passed yet, otherwise the trial lapses.
            status: isBeforeDeadline ? "active" : "expired",
            admin_note: note ?? null,
          };

    const { error: updateError } = await service
      .from("trial_accesses")
      .update(update)
      .eq("id", trial.id);

    if (updateError) {
      return safeServerError("Failed to update trial", updateError);
    }

    // Approving adds the trial to revenue; rejecting a trial that was already
    // paid takes it out again. Either way the overview KPIs must recompute.
    expireAdminOverviewKpis();

    return NextResponse.json({ success: true, status: update.status });
  } catch (error) {
    return safeServerError("Failed to update trial", error);
  }
}
