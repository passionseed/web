import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createPathReport } from "@/lib/supabase/pathlab-reports";

async function requireAdminOrInstructor() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { supabase, user: null, allowed: false };
  }
  return { supabase, user, allowed: true };
}

export async function POST(request: NextRequest) {
  try {
    const { user, allowed } = await requireAdminOrInstructor();
    if (!user || !allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const enrollmentId = body?.enrollmentId as string | undefined;
    const reportText = body?.reportText as string | undefined;

    if (!enrollmentId) {
      return NextResponse.json({ error: "enrollmentId is required" }, { status: 400 });
    }

    const report = await createPathReport({
      enrollmentId,
      generatedBy: user.id,
      reportText: reportText || null,
    });

    return NextResponse.json({ success: true, report });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to generate report" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { supabase, allowed } = await requireAdminOrInstructor();
    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const enrollmentId = searchParams.get("enrollmentId");

    if (!enrollmentId) {
      return NextResponse.json({ error: "enrollmentId is required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("path_reports")
      .select("*")
      .eq("enrollment_id", enrollmentId)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, reports: data || [] });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to fetch reports" },
      { status: 500 }
    );
  }
}
