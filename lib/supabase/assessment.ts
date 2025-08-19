import { createClient } from "@/utils/supabase/client";
import { submitNodeProgress, submitNodeProgressLegacy } from "./progresses";
import {
  LearningMap,
  MapNode,
  NodePath,
  NodeContent,
  NodeAssessment,
  QuizQuestion,
  StudentNodeProgress,
  AssessmentSubmission,
  SubmissionGrade,
  Grade,
  ProgressStatus,
} from "@/types/map";

// --- Assessment Functions ---

export const createNodeAssessment = async (
  assessmentData: Partial<NodeAssessment>
): Promise<NodeAssessment> => {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("node_assessments")
    .insert([{ ...assessmentData }])
    .select("*, quiz_questions(*)")
    .single();

  if (error) {
    console.error("Error creating assessment:", error);
    throw new Error("Could not create assessment.");
  }
  return data;
};

export const deleteNodeAssessment = async (id: string): Promise<void> => {
  const supabase = createClient();
  // Must delete questions first
  await supabase.from("quiz_questions").delete().eq("assessment_id", id);
  const { error } = await supabase
    .from("node_assessments")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting assessment:", error);
    throw new Error("Could not delete assessment.");
  }
};

export const createQuizQuestion = async (
  questionData: Partial<QuizQuestion>
): Promise<QuizQuestion> => {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("quiz_questions")
    .insert([{ ...questionData }])
    .select()
    .single();

  if (error) {
    console.error("Error creating question:", error);
    throw new Error("Could not create question.");
  }
  return data;
};

export const updateQuizQuestion = async (
  id: string,
  questionData: Partial<QuizQuestion>
): Promise<QuizQuestion> => {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("quiz_questions")
    .update(questionData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating question:", error);
    throw new Error("Could not update question.");
  }
  return data;
};

export const deleteQuizQuestion = async (id: string): Promise<void> => {
  const supabase = createClient();
  const { error } = await supabase.from("quiz_questions").delete().eq("id", id);

  if (error) {
    console.error("Error deleting question:", error);
    throw new Error("Could not delete question.");
  }
};
// --- Assessment Submission Functions ---

export const createAssessmentSubmission = async (
  submissionData: Partial<AssessmentSubmission>
): Promise<AssessmentSubmission> => {
  const supabase = createClient();

  console.log("📝 Creating assessment submission:", submissionData);

  const { data, error } = await supabase
    .from("assessment_submissions")
    .insert([submissionData])
    .select(
      `
      *,
      node_assessments (
        *,
        quiz_questions (*)
      )
    `
    )
    .single();

  if (error) {
    console.error("❌ Error creating assessment submission:", error);
    throw new Error("Could not create assessment submission.");
  }

  console.log("✅ Assessment submission created:", data);

  // Update progress status to "submitted"
  try {
    console.log("📈 Updating progress status to 'submitted'...");

    // For now, try to get mapId and nodeId from the progress record
    const { data: progressRecord, error: progressError } = await supabase
      .from("student_node_progress")
      .select(
        `
        node_id,
        map_nodes!inner (
          map_id
        )
      `
      )
      .eq("id", data.progress_id)
      .single();

    if (progressError || !progressRecord) {
      console.warn(
        "⚠️ Could not fetch progress record for API update, using legacy method"
      );
      await submitNodeProgressLegacy(data.progress_id);
    } else {
      // Use the new API-based approach
      const mapId = (progressRecord.map_nodes as any)?.map_id;
      if (mapId) {
        await submitNodeProgress(mapId, progressRecord.node_id);
      } else {
        console.warn("⚠️ No mapId found, using legacy method");
        await submitNodeProgressLegacy(data.progress_id);
      }
    }

    console.log("✅ Progress status updated to 'submitted'");
  } catch (progressError) {
    console.error("❌ Failed to update progress status:", progressError);
    // Don't throw here - submission was successful, progress update is secondary
  }

  // For quiz assessments, automatically grade the submission
  if (data.node_assessments.assessment_type === "quiz" && data.quiz_answers) {
    console.log("🤖 Auto-grading quiz submission...");
    await autoGradeQuizSubmission(data);
  }

  return data;
};

// New function to automatically grade quiz submissions
const autoGradeQuizSubmission = async (submission: any) => {
  const supabase = createClient();

  try {
    const quizQuestions = submission.node_assessments.quiz_questions;
    const studentAnswers = submission.quiz_answers as Record<string, string>;

    console.log("📊 Quiz questions:", quizQuestions.length);
    console.log("📝 Student answers:", studentAnswers);

    // Calculate score
    let correctAnswers = 0;
    let totalQuestions = quizQuestions.length;

    for (const question of quizQuestions) {
      const studentAnswer = studentAnswers[question.id];
      const correctAnswer = question.correct_option;

      if (studentAnswer === correctAnswer) {
        correctAnswers++;
      }

      console.log(
        `❓ Question ${question.id}: Student: ${studentAnswer}, Correct: ${correctAnswer}, Match: ${studentAnswer === correctAnswer}`
      );
    }

    const score =
      totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;
    const grade: Grade = score >= 70 ? "pass" : "fail"; // 70% passing threshold
    const rating = Math.min(Math.max(Math.ceil(score / 20), 1), 5); // Convert percentage to 1-5 rating, ensuring valid range

    console.log(
      `📊 Quiz Results: ${correctAnswers}/${totalQuestions} (${score.toFixed(
        1
      )}%) - ${grade.toUpperCase()}`
    );

    // FIXED: Improved grade insertion with better error handling
    const gradeData = {
      submission_id: submission.id,
      graded_by: null,
      grade: grade,
      rating: rating,
      comments: `Auto-graded quiz: ${correctAnswers}/${totalQuestions} correct answers (${score.toFixed(
        1
      )}%). ${grade === "pass" ? "Congratulations!" : "Keep practicing and try again."}`,
      graded_at: new Date().toISOString(),
    };

    console.log("📝 Inserting grade data:", gradeData);

    const { data: gradeResult, error: gradeError } = await supabase
      .from("submission_grades")
      .insert([gradeData])
      .select()
      .single();

    if (gradeError) {
      console.error("❌ Error creating auto-grade:", gradeError);
      console.error("❌ Grade data that failed:", gradeData);
      console.error("❌ Error details:", {
        code: gradeError.code,
        message: gradeError.message,
        details: gradeError.details,
        hint: gradeError.hint,
      });

      // Check if it's a constraint violation
      if (gradeError.code === "23502") {
        throw new Error(
          `Database constraint violation: ${gradeError.message}. Check that all required fields are provided.`
        );
      } else if (gradeError.code === "23514") {
        throw new Error(
          `Database check constraint failed: ${gradeError.message}. Rating must be between 1-5.`
        );
      } else {
        throw new Error(
          `Could not create automatic grade for quiz: ${gradeError.message}`
        );
      }
    }

    console.log("✅ Quiz auto-graded successfully:", gradeResult);
    return gradeResult;
  } catch (error) {
    console.error("❌ Error in auto-grading quiz:", error);
    console.error("❌ Submission data:", submission);

    // Re-throw with more context for debugging
    if (error instanceof Error) {
      throw new Error(`Auto-grading failed: ${error.message}`);
    } else {
      throw new Error(
        `Auto-grading failed with unknown error: ${String(error)}`
      );
    }
  }
};

export const getAssessmentSubmissions = async (
  progressId: string,
  assessmentId: string
): Promise<AssessmentSubmission[]> => {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("assessment_submissions")
    .select("*")
    .eq("progress_id", progressId)
    .eq("assessment_id", assessmentId)
    .order("submitted_at", { ascending: false });

  if (error) {
    console.error("Error fetching submissions:", error);
    throw new Error("Could not fetch assessment submissions.");
  }

  return data || [];
};

export const deleteFileSubmission = async (fileName: string): Promise<void> => {
  try {
    const response = await fetch(
      `/api/upload?fileName=${encodeURIComponent(fileName)}`,
      {
        method: "DELETE",
      }
    );

    if (!response.ok) {
      throw new Error("Failed to delete file from storage");
    }
  } catch (error) {
    console.error("Error deleting file:", error);
    throw new Error("Could not delete file from storage.");
  }
};
