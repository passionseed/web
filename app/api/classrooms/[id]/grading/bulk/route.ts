import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id: classroomId } = await params;
    const body = await request.json();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    // Check if user can manage this classroom
    const { data: membership, error: membershipError } = await supabase
      .from("classroom_memberships")
      .select("role")
      .eq("classroom_id", classroomId)
      .eq("user_id", user.id)
      .single();

    if (membershipError || !membership || !["instructor", "ta"].includes(membership.role)) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    const { submission_ids, grade, points_awarded, comments } = body;

    if (!Array.isArray(submission_ids) || submission_ids.length === 0) {
      return NextResponse.json({ error: "Invalid submission IDs" }, { status: 400 });
    }

    // Get existing grades for these submissions
    const { data: existingGrades } = await supabase
      .from("submission_grades")
      .select("id, submission_id")
      .in("submission_id", submission_ids);

    const existingGradeMap = new Map();
    (existingGrades || []).forEach((grade: any) => {
      existingGradeMap.set(grade.submission_id, grade.id);
    });

    let updatedCount = 0;
    let createdCount = 0;
    const errors: string[] = [];

    // Process each submission
    for (const submissionId of submission_ids) {
      try {
        const gradeData = {
          grade,
          points_awarded,
          comments,
          graded_at: new Date().toISOString(),
          graded_by: user.id
        };

        if (existingGradeMap.has(submissionId)) {
          // Update existing grade
          const { error: updateError } = await supabase
            .from("submission_grades")
            .update(gradeData)
            .eq("id", existingGradeMap.get(submissionId));

          if (updateError) {
            console.error(`Error updating grade for submission ${submissionId}:`, updateError);
            errors.push(`Failed to update grade for submission ${submissionId}`);
          } else {
            updatedCount++;
          }
        } else {
          // Create new grade
          const { error: insertError } = await supabase
            .from("submission_grades")
            .insert({
              submission_id: submissionId,
              ...gradeData
            });

          if (insertError) {
            console.error(`Error creating grade for submission ${submissionId}:`, insertError);
            errors.push(`Failed to create grade for submission ${submissionId}`);
          } else {
            createdCount++;
          }
        }
      } catch (error) {
        console.error(`Error processing submission ${submissionId}:`, error);
        errors.push(`Error processing submission ${submissionId}`);
      }
    }

    const totalProcessed = updatedCount + createdCount;
    const response = {
      message: `Bulk grading completed`,
      total_requested: submission_ids.length,
      successful: totalProcessed,
      updated: updatedCount,
      created: createdCount,
      failed: errors.length,
      errors: errors.length > 0 ? errors : undefined
    };

    if (errors.length > 0 && totalProcessed === 0) {
      return NextResponse.json({ ...response, error: "All bulk grading operations failed" }, { status: 500 });
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error("Error in bulk grading route:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}