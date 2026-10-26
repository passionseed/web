import { NextResponse } from "next/server";

import {
  ADMIN_SHIFT_APPLICATION_SELECT,
  toAdminShiftApplication,
} from "@/lib/admin/queue-tools/shift-applications";
import { isUuid } from "@/lib/admin/queue-tools/url";
import { requireAdmin, safeServerError } from "@/lib/security/route-guards";
import { newShiftJoinToken, shiftJoinPath } from "@/lib/shift/joinLink";
import { createAdminClient } from "@/utils/supabase/admin";
import type { ShiftApplicationRow } from "@/types/shift";

type RouteContext = { params: Promise<{ id: string }> };

/** The admin columns plus the token, which never leaves this route except inside `url`. */
const SELECT_WITH_TOKEN = `${ADMIN_SHIFT_APPLICATION_SELECT}, join_token`;

/**
 * Returns the /shift/join link for a paid application, minting its token on
 * first use. The same link keeps working, so admins can copy it again. The
 * `application` in the response is the browser-safe row, without join_token.
 */
export async function POST(request: Request, { params }: RouteContext) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  try {
    const { id } = await params;
    if (!isUuid(id)) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }
    const supabase = createAdminClient();

    const { data: app, error } = await supabase
      .from("shift_applications")
      .select(SELECT_WITH_TOKEN)
      .eq("id", id)
      .maybeSingle();
    if (error || !app) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    let application = app as unknown as ShiftApplicationRow;
    if (!application.paid_at) {
      return NextResponse.json({ error: "Mark the application paid first" }, { status: 409 });
    }

    if (!application.join_token) {
      const { data: updated, error: updateError } = await supabase
        .from("shift_applications")
        .update({ join_token: newShiftJoinToken() })
        .eq("id", id)
        .is("join_token", null)
        .select(SELECT_WITH_TOKEN)
        .maybeSingle();
      if (updateError) {
        return NextResponse.json({ error: "Failed to create link" }, { status: 500 });
      }
      // A concurrent request may have minted it first; read whichever won.
      application = (updated ??
        (await supabase.from("shift_applications").select(SELECT_WITH_TOKEN).eq("id", id).single())
          .data) as unknown as ShiftApplicationRow;
    }

    const origin = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
    const url = new URL(shiftJoinPath(application.join_token!), origin).toString();
    return NextResponse.json({ url, application: toAdminShiftApplication(application) });
  } catch (error) {
    return safeServerError("Failed to create SHIFT join link", error);
  }
}
