import { NextResponse } from "next/server";

import { requireAdmin, safeServerError } from "@/lib/security/route-guards";
import { newShiftJoinToken, shiftJoinPath } from "@/lib/shift/joinLink";
import { createAdminClient } from "@/utils/supabase/admin";
import type { ShiftApplicationRow } from "@/types/shift";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * Returns the /shift/join link for a paid application, minting its token on
 * first use. The same link keeps working, so admins can copy it again.
 */
export async function POST(request: Request, { params }: RouteContext) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  try {
    const { id } = await params;
    const supabase = createAdminClient();

    const { data: app, error } = await supabase
      .from("shift_applications")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error || !app) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }
    if (!app.paid_at) {
      return NextResponse.json({ error: "Mark the application paid first" }, { status: 409 });
    }

    let application = app as ShiftApplicationRow;
    if (!application.join_token) {
      const { data: updated, error: updateError } = await supabase
        .from("shift_applications")
        .update({ join_token: newShiftJoinToken() })
        .eq("id", id)
        .is("join_token", null)
        .select()
        .maybeSingle();
      if (updateError) {
        return NextResponse.json({ error: "Failed to create link" }, { status: 500 });
      }
      // A concurrent request may have minted it first; read whichever won.
      application = (updated ??
        (await supabase.from("shift_applications").select("*").eq("id", id).single()).data) as ShiftApplicationRow;
    }

    const origin = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
    const url = new URL(shiftJoinPath(application.join_token!), origin).toString();
    return NextResponse.json({ url, application });
  } catch (error) {
    return safeServerError("Failed to create SHIFT join link", error);
  }
}
