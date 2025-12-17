import { createClient } from "@/utils/supabase/client";
import { submitNodeProgress, submitNodeProgressLegacy, updateNodeProgress } from "./progresses";
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
  
  // Enhanced debugging
  console.log("📝 Assessment data being inserted:", assessmentData);
  
  // Check authentication
  const { data: user, error: authError } = await supabase.auth.getUser();
  console.log("👤 Current user:", user?.user?.id || "Not authenticated", authError);
  
  const { data, error } = await supabase
    .from("node_assessments")
    .insert([{ ...assessmentData }])
    .select("*, quiz_questions(*)")
    .single();

  if (error) {
    console.error("❌ Error creating assessment:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code
    });
    console.error("❌ Full error object:", error);
    throw new Error(`Could not create assessment: ${error.message}`);
  }
  console.log("✅ Assessment created successfully:", data);
  return data;
};

export const updateNodeAssessment = async (
  id: string,
  updates: Partial<NodeAssessment>
): Promise<NodeAssessment> => {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("node_assessments")
    .update(updates)
    .eq("id", id)
    .select("*, quiz_questions(*)")
    .single();

  if (error) {
    console.error("Error updating assessment:", error);
    throw new Error("Could not update assessment.");
  }
  return data;
};

export const updateAssessmentMetadata = async (
  id: string,
  metadata: Record<string, any>
): Promise<NodeAssessment> => {
  const supabase = createClient();

  console.log("Updating assessment metadata:", { id, metadata });

  const { data, error } = await supabase
    .from("node_assessments")
    .update({ metadata })
    .eq("id", id)
    .select("*, quiz_questions(*)")
    .single();

  if (error) {
    console.error("Error updating assessment metadata:", error);
    console.error("Error details:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code
    });
    throw new Error(`Could not update assessment metadata: ${error.message || 'Unknown error'}`);
  }

  console.log("Successfully updated assessment metadata:", data);
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

  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error("User must be authenticated to submit assessment");
  }

  // Enhanced submission data with group handling
  let enhancedSubmissionData = { ...submissionData };

  // Check if this is a group assessment and handle accordingly
  if (submissionData.assessment_id) {
    try {
      // Get assessment details to check if it's a group assessment
      const { data: assessment, error: assessmentError } = await supabase
        .from("node_assessments")
        .select("id, is_group_assessment")
        .eq("id", submissionData.assessment_id)
        .single();

      if (assessmentError) {
        console.warn("⚠️ Could not fetch assessment details:", assessmentError);
      } else if (assessment?.is_group_assessment) {
        // Get the user's group for this assessment
        const { getUserAssessmentGroup } = await import("./assessment-groups");
        const userGroup = await getUserAssessmentGroup(assessment.id, user.id);

        if (userGroup) {
          enhancedSubmissionData = {
            ...enhancedSubmissionData,
            assessment_group_id: userGroup.id,
            submitted_for_group: true,
          };
        } else {
          console.warn("⚠️ User is not assigned to a group for this assessment");
        }
      }
    } catch (groupError) {
      console.error("❌ Error checking group status:", groupError);
      // Continue with individual submission if group check fails
    }
  }

  const { data, error } = await supabase
    .from("assessment_submissions")
    .insert([enhancedSubmissionData])
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
    console.error("❌ Error creating assessment submission:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code
    });
    console.error("❌ Full error object:", error);
    throw new Error(`Could not create assessment submission: ${error.message}`);
  }

  // Update progress status based on assessment type
  try {

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
        // For checklist assessments, automatically pass the student
        if (data.node_assessments.assessment_type === "checklist") {
          await updateNodeProgress(mapId, progressRecord.node_id, "passed", {
            submitted_at: new Date().toISOString(),
          });
        } else {
          // For other assessment types, mark as submitted for review
          await submitNodeProgress(mapId, progressRecord.node_id);
        }
      } else {
        console.warn("⚠️ No mapId found, using legacy method");
        await submitNodeProgressLegacy(data.progress_id);
      }
    }
  } catch (progressError) {
    console.error("❌ Failed to update progress status:", progressError);
    // Don't throw here - submission was successful, progress update is secondary
  }

  // For quiz assessments, automatically grade the submission
  if (data.node_assessments.assessment_type === "quiz" && data.quiz_answers) {
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

    // Calculate score based on questions actually shown to student
    let correctAnswers = 0;
    let questionsAnswered = 0;
    
    // For randomized quizzes, only count questions the student actually answered
    // For non-randomized quizzes, count all questions
    const isRandomized = submission.node_assessments.metadata?.randomize_questions;
    
    for (const question of quizQuestions) {
      const studentAnswer = studentAnswers[question.id];
      
      // If this question was answered by the student (meaning it was shown to them)
      if (studentAnswer !== undefined) {
        questionsAnswered++;
        const correctAnswer = question.correct_option;

        if (studentAnswer === correctAnswer) {
          correctAnswers++;
        }

        console.log(
          `❓ Question ${question.id}: Student: ${studentAnswer}, Correct: ${correctAnswer}, Match: ${studentAnswer === correctAnswer}`
        );
      } else if (isRandomized) {
        // For randomized quizzes, skip questions that weren't shown
        console.log(`⏭️ Question ${question.id}: Not shown to student (randomized quiz)`);
      } else {
        // For non-randomized quizzes, this is an unanswered question
        console.log(`❌ Question ${question.id}: Not answered by student`);
      }
    }

    // Use the number of questions actually answered for scoring
    const totalQuestionsForScoring = questionsAnswered;
    const score = totalQuestionsForScoring > 0 ? (correctAnswers / totalQuestionsForScoring) * 100 : 0;
    const grade: Grade = score >= 70 ? "pass" : "fail"; // 70% passing threshold
    const rating = Math.min(Math.max(Math.ceil(score / 20), 1), 5); // Convert percentage to 1-5 rating, ensuring valid range
    const pointsAwarded = correctAnswers; // Award points equal to number of correct answers

    console.log(
      `📊 Quiz Results: ${correctAnswers}/${totalQuestionsForScoring} (${score.toFixed(
        1
      )}%) - ${grade.toUpperCase()}${isRandomized ? ' (Randomized Quiz)' : ''}`
    );

    // FIXED: Improved grade insertion with better error handling
    const gradeData = {
      submission_id: submission.id,
      graded_by: null,
      grade: grade,
      rating: rating,
      points_awarded: correctAnswers,
      comments: `Auto-graded quiz: ${correctAnswers}/${totalQuestionsForScoring} correct answers (${score.toFixed(
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
