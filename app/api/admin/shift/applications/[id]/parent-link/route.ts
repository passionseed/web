import { NextResponse } from "next/server";
import { z } from "zod";

import { toAdminShiftApplication } from "@/lib/admin/queue-tools/shift-applications";
import { requireAdmin, safeServerError } from "@/lib/security/route-guards";
import { parentConsentState } from "@/lib/shift/parentConsent";
import { rotateShiftParentLink, sendShiftParentEmail, shiftParentUrl } from "@/lib/shift/parentConsentServer";
import { createAdminClient } from "@/utils/supabase/admin";
import type { ShiftApplicationRow } from "@/types/shift";

type RouteContext = { params: Promise<{ id: string }> };

const bodySchema = z.object({ send: z.enum(["email", "copy"]) }).strict();

/**
 * A fresh parent consent link. "email" sends it to the parent email on the
 * application; "copy" returns it so an admin can send it over LINE (also the
 * way to reach parents of applications from before the email field).
 * Either way the previous link stops working.
 */
export async function POST(request: Request, { params }: RouteContext) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  try {
    const { id } = await params;
    const parsed = bodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

    const { data, error } = await createAdminClient()
      .from("shift_applications")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error || !data) return NextResponse.json({ error: "Application not found" }, { status: 404 });
    const current = data as ShiftApplicationRow;

    if (parentConsentState(current) === "not_needed") {
      return NextResponse.json({ error: "Applicant is 20 or older: no parent consent needed" }, { status: 409 });
    }
    if (parsed.data.send === "email" && !current.parent_email) {
      return NextResponse.json({ error: "No parent email on this application. Copy the link instead." }, { status: 409 });
    }

    const { token, app } = await rotateShiftParentLink(id);
    if (parsed.data.send === "email") {
      const sent = await sendShiftParentEmail(app, token);
      if (!sent) return NextResponse.json({ error: "Email not sent. Copy the link instead." }, { status: 502 });
      const { data: refreshed } = await createAdminClient()
        .from("shift_applications")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      return NextResponse.json({ application: toAdminShiftApplication((refreshed as ShiftApplicationRow | null) ?? app) });
    }
    // The browser gets the admin columns only: no join_token or parent_token_hash.
    return NextResponse.json({ url: shiftParentUrl(token), application: toAdminShiftApplication(app) });
  } catch (error) {
    return safeServerError("Failed to create SHIFT parent link", error);
  }
}
