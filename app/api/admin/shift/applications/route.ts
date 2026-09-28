import { NextResponse } from "next/server";

import { requireAdmin, safeServerError } from "@/lib/security/route-guards";
import { createAdminClient } from "@/utils/supabase/admin";
import type { ShiftApplicationRow } from "@/types/shift";

/** Admin list of SHIFT applications, newest first. `?cohort=SHIFT[1]` filters. */
export async function GET(request: Request) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  try {
    const cohort = new URL(request.url).searchParams.get("cohort");
    const supabase = createAdminClient();

    let query = supabase
      .from("shift_applications")
      .select("*")
      .order("created_at", { ascending: false });
    if (cohort) query = query.eq("cohort", cohort);

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: "Failed to load applications" }, { status: 500 });
    }

    return NextResponse.json({ applications: (data ?? []) as ShiftApplicationRow[] });
  } catch (error) {
    return safeServerError("Failed to load SHIFT applications", error);
  }
}
