import { NextRequest, NextResponse } from "next/server";
import { gradeSubmission } from "@/lib/supabase/grading";
import { requireDebugAccess, safeServerError } from "@/lib/security/route-guards";

export async function POST(request: NextRequest) {
  const debug = await requireDebugAccess();
  if (!debug.ok) return debug.response;

  try {
    const { supabase, userId } = debug.value;
    const body = await request.json();
    const { submissionId, grade, comments, rating, progressId } = body;

    const { data: submission } = await supabase
      .from("assessment_submissions")
      .select("id, progress_id")
      .eq("id", submissionId)
      .single();

    if (!submission) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }

    const { data: progress } = await supabase
      .from("student_node_progress")
      .select("id, status")
      .eq("id", progressId)
      .single();

    if (!progress) {
      return NextResponse.json({ error: "Progress record not found" }, { status: 404 });
    }

    const result = await gradeSubmission(submissionId, grade, comments, rating, userId, progressId);

    return NextResponse.json({ success: true, result });
  } catch (error) {
    return safeServerError("Grading failed", error);
  }
}
