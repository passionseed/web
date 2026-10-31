import { NextResponse, after } from "next/server";
import { z } from "zod";

import { toAdminShiftApplication } from "@/lib/admin/queue-tools/shift-applications";
import { expireAdminOverviewKpis } from "@/lib/admin/overview/cache";
import { isUuid } from "@/lib/admin/queue-tools/url";
import { requireAdmin, safeServerError } from "@/lib/security/route-guards";
import { admitPaidStudent, isJoinable, revokeShiftDiscord, syncShiftDiscord } from "@/lib/shift/join";
import {
  blocksPaidAdmission,
  parentConsentState,
  type ParentConsentRow,
  type ParentConsentState,
} from "@/lib/shift/parentConsent";
import { createAdminClient } from "@/utils/supabase/admin";
import type { ShiftApplicationRow } from "@/types/shift";

type RouteContext = { params: Promise<{ id: string }> };

const patchSchema = z
  .object({
    status: z.enum(["new", "accepted", "waitlist", "declined"]).optional(),
    paid: z.boolean().optional(),
    admin_note: z
      .string()
      .max(2000)
      .nullable()
      .optional()
      .transform((v) => (typeof v === "string" ? v.trim() || null : v)),
  })
  .strict();

/** Why "mark paid" is refused, shown to the admin as-is. */
const PARENT_BLOCK: Partial<Record<ParentConsentState, string>> = {
  waiting: "Parent has not agreed yet (applicant is under 20). Resend or copy the parent link first.",
  declined: "Parent declined. The seat cannot be confirmed.",
  withdrawn: "Parent withdrew consent. The seat cannot be confirmed.",
};

type ApplicationUpdate = Partial<Pick<ShiftApplicationRow, "status" | "paid_at" | "admin_note">>;

function toUpdate(input: z.output<typeof patchSchema>): ApplicationUpdate {
  const update: ApplicationUpdate = {};
  if (input.status !== undefined) update.status = input.status;
  if (input.paid !== undefined) update.paid_at = input.paid ? new Date().toISOString() : null;
  if (input.admin_note !== undefined) update.admin_note = input.admin_note;
  return update;
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  try {
    const { id } = await params;
    if (!isUuid(id)) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid update" }, { status: 400 });
    }

    const update = toUpdate(parsed.data);
    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    const supabase = createAdminClient();
    // Paying admits the student to the round: under 20 that needs a parent's
    // consent first (PDPA s.20). Rows from before the consent flow pass.
    if (parsed.data.paid === true) {
      const { data: current, error: readError } = await supabase
        .from("shift_applications")
        .select("birth_date, consent_notice_version, parent_consented_at, parent_declined_at, parent_withdrawn_at")
        .eq("id", id)
        .single();
      if (readError || !current) {
        return NextResponse.json({ error: "Application not found" }, { status: 404 });
      }
      const consent = parentConsentState(current as ParentConsentRow);
      if (blocksPaidAdmission(consent)) {
        return NextResponse.json({ error: PARENT_BLOCK[consent], parentConsent: consent }, { status: 409 });
      }
    }

    const { data, error } = await supabase
      .from("shift_applications")
      .update(update)
      .eq("id", id)
      .select()
      .single();
    if (error) {
      return NextResponse.json({ error: "Failed to update application" }, { status: 500 });
    }

    // paid_at feeds the revenue and paid-seats KPIs on the overview.
    if ("paid_at" in update) expireAdminOverviewKpis();

    const saved = data as ShiftApplicationRow;
    // Applicants link Discord (and get their round's role) straight from the
    // apply page, so admin decisions follow through: paying unlocks the
    // tracker and camp, declining takes the role back.
    if (parsed.data.paid === true) after(() => admitPaidStudent(saved, supabase));
    let application = saved;
    // Any status other than declined: give back what a decline took (the
    // role, and tracker + camp when paid). isJoinable keeps a finished
    // round's role from going to someone who never paid. Both steps are
    // idempotent; the resync is awaited so the row shows them back in.
    if (parsed.data.status && parsed.data.status !== "declined" && saved.discord_user_id) {
      if (!saved.discord_joined_at && isJoinable(saved)) {
        const sync = await syncShiftDiscord(saved, null, supabase);
        application = sync.ok
          ? { ...saved, discord_joined_at: new Date().toISOString(), discord_error: null }
          : { ...saved, discord_error: sync.state === "not_member" ? "not_in_server" : sync.message };
      }
      after(() => admitPaidStudent(saved, supabase));
    }
    if (parsed.data.status === "declined") {
      // Awaited so the returned row already shows them out of the server.
      const removal = await revokeShiftDiscord(application, supabase);
      if (removal?.ok) application = { ...application, discord_joined_at: null, discord_error: null };
    }

    // The full row (with join_token) stays on the server; the browser gets the admin columns.
    return NextResponse.json({ application: toAdminShiftApplication(application) });
  } catch (error) {
    return safeServerError("Failed to update SHIFT application", error);
  }
}
