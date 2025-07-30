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

// --- Node Functions ---

export const createNode = async (
  nodeData: Partial<MapNode>
): Promise<MapNode> => {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("map_nodes")
    .insert([{ ...nodeData }])
    .select()
    .single();

  if (error) {
    console.error("Error creating node:", error);
    throw new Error("Could not create map node.");
  }
  return data;
};

export const updateNode = async (
  id: string,
  nodeData: Partial<MapNode>
): Promise<MapNode> => {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("map_nodes")
    .update(nodeData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating node:", error);
    throw new Error("Could not update map node.");
  }
  return data;
};

export const deleteNode = async (id: string): Promise<void> => {
  const supabase = createClient();

  try {
    // Delete in proper order to avoid constraint violations

    // 1. Delete quiz questions for assessments of this node
    await supabase
      .from("quiz_questions")
      .delete()
      .in(
        "assessment_id",
        supabase.from("node_assessments").select("id").eq("node_id", id)
      );

    // 2. Delete assessments
    await supabase.from("node_assessments").delete().eq("node_id", id);

    // 3. Delete content
    await supabase.from("node_content").delete().eq("node_id", id);

    // 4. Delete student progress for this node
    await supabase.from("student_node_progress").delete().eq("node_id", id);

    // 5. Delete paths connected to the node
    await supabase.from("node_paths").delete().eq("source_node_id", id);
    await supabase.from("node_paths").delete().eq("destination_node_id", id);

    // 6. Finally delete the node itself
    const { error } = await supabase.from("map_nodes").delete().eq("id", id);

    if (error) {
      console.error("Error deleting node:", error);
      throw new Error("Could not delete map node.");
    }
  } catch (error) {
    console.error("Error in node deletion:", error);
    throw new Error("Could not delete map node and its related data.");
  }
};


// --- Path Functions ---

export const createPath = async (
  source: string,
  target: string
): Promise<NodePath> => {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("node_paths")
    .insert([{ source_node_id: source, destination_node_id: target }])
    .select()
    .single();

  if (error) {
    console.error("Error creating path:", error);
    throw new Error("Could not create node path.");
  }
  return data;
};

export const deletePath = async (pathId: string): Promise<void> => {
  const supabase = createClient();
  const { error } = await supabase.from("node_paths").delete().eq("id", pathId);

  if (error) {
    console.error("Error deleting path:", error);
    throw new Error("Could not delete node path.");
  }
};

// --- Content Functions ---

export const createNodeContent = async (
  contentData: Partial<NodeContent>
): Promise<NodeContent> => {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("node_content")
    .insert([{ ...contentData }])
    .select()
    .single();

  if (error) {
    console.error("Error creating content:", error);
    throw new Error("Could not create node content.");
  }
  return data;
};

export const updateNodeContent = async (
  id: string,
  contentData: Partial<NodeContent>
): Promise<NodeContent> => {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("node_content")
    .update(contentData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating content:", error);
    throw new Error("Could not update node content.");
  }
  return data;
};

export const deleteNodeContent = async (id: string): Promise<void> => {
  const supabase = createClient();
  const { error } = await supabase.from("node_content").delete().eq("id", id);

  if (error) {
    console.error("Error deleting content:", error);
    throw new Error("Could not delete node content.");
  }
};