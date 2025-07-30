import { createClient } from "./client";
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
  const { data, error } = await supabase
    .from("assessment_submissions")
    .insert([{ ...submissionData, submitted_at: new Date().toISOString() }])
    .select()
    .single();

  if (error) {
    console.error("Error creating submission:", error);
    throw new Error("Could not create assessment submission.");
  }

  return data;
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
