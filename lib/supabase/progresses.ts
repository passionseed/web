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

// --- Student Progress Functions ---

export const getStudentProgress = async (
  userId: string,
  nodeId: string
): Promise<StudentNodeProgress | null> => {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("student_node_progress")
    .select("*")
    .eq("user_id", userId)
    .eq("node_id", nodeId)
    .single();

  if (error && error.code !== "PGRST116") {
    console.error("Error fetching progress:", error);
    throw new Error("Could not fetch student progress.");
  }

  return data || null;
};

export const startNodeProgress = async (
  userId: string,
  nodeId: string
): Promise<StudentNodeProgress> => {
  const supabase = createClient();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("student_node_progress")
    .upsert({
      user_id: userId,
      node_id: nodeId,
      status: "in_progress",
      arrived_at: now,
      started_at: now,
    })
    .select()
    .single();

  if (error) {
    console.error("Error starting progress:", error);
    throw new Error("Could not start node progress.");
  }

  return data;
};

export const submitNodeProgress = async (
  progressId: string
): Promise<StudentNodeProgress> => {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("student_node_progress")
    .update({
      status: "submitted",
      submitted_at: new Date().toISOString(),
    })
    .eq("id", progressId)
    .select()
    .single();

  if (error) {
    console.error("Error submitting progress:", error);
    throw new Error("Could not submit progress.");
  }

  return data;
};
