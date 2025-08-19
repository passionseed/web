import { createClient } from "@/utils/supabase/client";

export const debugGradingIssue = async (
  submissionId: string,
  userId: string
) => {
  const supabase = createClient();

  console.log("🔍 Debugging grading issue for:", { submissionId, userId });

  try {
    // Check submission
    const { data: submission, error: submissionError } = await supabase
      .from("assessment_submissions")
      .select(
        `
        id,
        progress_id,
        assessment_id,
        submitted_at,
        student_node_progress (
          id,
          user_id,
          node_id,
          status
        ),
        node_assessments (
          id,
          node_id,
          assessment_type
        )
      `
      )
      .eq("id", submissionId)
      .single();

    console.log("📄 Submission data:", { submission, submissionError });

    if (!submission) {
      throw new Error("Submission not found");
    }

    // Check user permissions
    const { data: userRoles, error: rolesError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    console.log("👤 User roles:", { userRoles, rolesError });

    // Check existing grades
    const { data: existingGrades, error: gradesError } = await supabase
      .from("submission_grades")
      .select("*")
      .eq("submission_id", submissionId);

    console.log("📊 Existing grades:", { existingGrades, gradesError });

    // Test grade creation with minimal data
    const testGradePayload = {
      submission_id: submissionId,
      graded_by: userId,
      grade: "pass",
      comments: "Test grade",
      rating: null,
    };

    console.log("🧪 Testing grade creation with payload:", testGradePayload);

    const { data: testGrade, error: testGradeError } = await supabase
      .from("submission_grades")
      .insert(testGradePayload)
      .select()
      .single();

    console.log("🧪 Test grade result:", { testGrade, testGradeError });

    // Clean up test grade if successful
    if (testGrade) {
      await supabase.from("submission_grades").delete().eq("id", testGrade.id);
      console.log("🧹 Cleaned up test grade");
    }

    return {
      submission,
      userRoles,
      existingGrades,
      testResult: { testGrade, testGradeError },
    };
  } catch (error) {
    console.error("❌ Debug failed:", error);
    throw error;
  }
};

export const validateGradingPermissions = async (userId: string) => {
  const supabase = createClient();

  const { data: roles, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["instructor", "TA"]);

  if (error) {
    throw new Error(`Permission check failed: ${error.message}`);
  }

  const hasPermission = roles && roles.length > 0;

  console.log("🔐 Grading permissions check:", {
    userId,
    roles,
    hasPermission,
  });

  return hasPermission;
};
