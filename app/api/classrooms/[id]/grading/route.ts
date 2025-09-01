import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id: classroomId } = await params;
    
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

    // Get all submissions for this classroom
    const { data: submissions, error: submissionsError } = await supabase
      .from("assessment_submissions")
      .select(`
        id,
        submitted_at,
        text_answer,
        file_urls,
        image_url,
        quiz_answers,
        student_node_progress!inner (
          user_id,
          profiles!inner (
            username,
            full_name,
            email,
            avatar_url
          )
        ),
        node_assessments!inner (
          id,
          assessment_type,
          is_graded,
          map_nodes!inner (
            id,
            title,
            learning_maps!inner (
              id,
              title,
              classroom_maps!inner (
                classroom_id
              )
            )
          )
        ),
        submission_grades (
          id,
          grade,
          points_awarded,
          comments,
          graded_at,
          graded_by
        )
      `)
      .eq("node_assessments.map_nodes.learning_maps.classroom_maps.classroom_id", classroomId)
      .order("submitted_at", { ascending: false });

    if (submissionsError) {
      console.error("Error fetching submissions:", submissionsError);
      return NextResponse.json({ error: "Failed to fetch submissions" }, { status: 500 });
    }

    // Transform submissions data
    const transformedSubmissions = submissions.map((submission: any) => {
      const grade = submission.submission_grades[0];
      const student = submission.student_node_progress.profiles;
      const node = submission.node_assessments.map_nodes;
      const map = node.learning_maps;

      return {
        id: submission.id,
        student_user_id: submission.student_node_progress.user_id,
        student_name: student.full_name || student.username,
        map_title: map.title,
        node_title: node.title,
        assessment_type: submission.node_assessments.assessment_type,
        text_answer: submission.text_answer,
        file_urls: submission.file_urls,
        image_url: submission.image_url,
        quiz_answers: submission.quiz_answers,
        submitted_at: submission.submitted_at,
        grade: grade?.grade || null,
        points_awarded: grade?.points_awarded || null,
        comments: grade?.comments || null,
        graded_at: grade?.graded_at || null,
        graded_by: grade?.graded_by || null,
        status: grade ? "graded" : "ungraded",
        is_grading_enabled: submission.node_assessments.is_graded
      };
    });

    // Get student summary data
    const studentMap = new Map();
    
    transformedSubmissions.forEach((submission: any) => {
      const studentId = submission.student_user_id;
      if (!studentMap.has(studentId)) {
        studentMap.set(studentId, {
          user_id: studentId,
          username: submission.student_name.split(" ")[0], // Simple username extraction
          full_name: submission.student_name,
          email: "", // We'd need to fetch this separately if needed
          avatar_url: null,
          submissions: [],
          total_submissions: 0,
          graded_submissions: 0,
          pending_submissions: 0,
          total_points: 0,
          graded_count: 0
        });
      }
      
      const student = studentMap.get(studentId);
      student.submissions.push(submission);
      student.total_submissions++;
      
      if (submission.status === "graded") {
        student.graded_submissions++;
        if (submission.points_awarded !== null) {
          student.total_points += submission.points_awarded;
          student.graded_count++;
        }
      } else {
        student.pending_submissions++;
      }
    });

    // Calculate average grades
    const students = Array.from(studentMap.values()).map((student: any) => ({
      ...student,
      average_grade: student.graded_count > 0 ? Math.round(student.total_points / student.graded_count) : null
    }));

    return NextResponse.json({
      submissions: transformedSubmissions,
      students: students
    });

  } catch (error) {
    console.error("Error in grading route:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

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

    const { submission_id, grade, points_awarded, comments } = body;

    // Create or update the grade
    const { data: existingGrade } = await supabase
      .from("submission_grades")
      .select("id")
      .eq("submission_id", submission_id)
      .single();

    if (existingGrade) {
      // Update existing grade
      const { error: updateError } = await supabase
        .from("submission_grades")
        .update({
          grade,
          points_awarded,
          comments,
          graded_at: new Date().toISOString(),
          graded_by: user.id
        })
        .eq("id", existingGrade.id);

      if (updateError) {
        console.error("Error updating grade:", updateError);
        return NextResponse.json({ error: "Failed to update grade" }, { status: 500 });
      }
    } else {
      // Create new grade
      const { error: insertError } = await supabase
        .from("submission_grades")
        .insert({
          submission_id,
          grade,
          points_awarded,
          comments,
          graded_at: new Date().toISOString(),
          graded_by: user.id
        });

      if (insertError) {
        console.error("Error creating grade:", insertError);
        return NextResponse.json({ error: "Failed to create grade" }, { status: 500 });
      }
    }

    return NextResponse.json({ message: "Grade submitted successfully" });

  } catch (error) {
    console.error("Error in grading POST route:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}