import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createPathReport } from "@/lib/supabase/pathlab-reports";

async function requireAuth() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { supabase, user: null };
  }
  return { supabase, user };
}

async function hasAdminOrInstructorRole(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["admin", "instructor"]);

  if (error) {
    throw new Error(error.message);
  }

  return Boolean(data?.length);
}

async function canManageEnrollmentReports(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  enrollmentId: string,
) {
  const [isAdminOrInstructor, enrollmentResult] = await Promise.all([
    hasAdminOrInstructorRole(supabase, userId),
    supabase
      .from("path_enrollments")
      .select(
        `
        id,
        path:paths(
          id,
          seed:seeds(
            id,
            seed_type,
            created_by
          )
        )
      `,
      )
      .eq("id", enrollmentId)
      .maybeSingle(),
  ]);

  if (enrollmentResult.error) {
    throw new Error(enrollmentResult.error.message);
  }

  if (!enrollmentResult.data) {
    return { allowed: false, exists: false };
  }

  const pathRelation = (enrollmentResult.data as any).path;
  const path = Array.isArray(pathRelation) ? pathRelation[0] : pathRelation;
  const seedRelation = path?.seed;
  const seed = Array.isArray(seedRelation) ? seedRelation[0] : seedRelation;

  if (!seed || seed.seed_type !== "pathlab") {
    return { allowed: false, exists: true };
  }

  const isCreator = seed.created_by === userId;
  return { allowed: isAdminOrInstructor || isCreator, exists: true };
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, user } = await requireAuth();
    if (!user) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const enrollmentId = body?.enrollmentId as string | undefined;
    const reportText = body?.reportText as string | undefined;

    if (!enrollmentId) {
      return NextResponse.json({ error: "enrollmentId is required" }, { status: 400 });
    }

    const access = await canManageEnrollmentReports(supabase, user.id, enrollmentId);
    if (!access.exists) {
      return NextResponse.json({ error: "Enrollment not found" }, { status: 404 });
    }
    if (!access.allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
    const { supabase, user } = await requireAuth();
    const { searchParams } = new URL(request.url);
    const enrollmentId = searchParams.get("enrollmentId");

    if (!user) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!enrollmentId) {
      return NextResponse.json({ error: "enrollmentId is required" }, { status: 400 });
    }

    const access = await canManageEnrollmentReports(supabase, user.id, enrollmentId);
    if (!access.exists) {
      return NextResponse.json({ error: "Enrollment not found" }, { status: 404 });
    }
    if (!access.allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
