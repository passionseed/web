import { createClient } from "@/utils/supabase/server";
import { SubmissionWithDetails } from "./grading";

export const getSubmissionsForMapServer = async (
  mapId: string
): Promise<SubmissionWithDetails[]> => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("assessment_submissions")
    .select(
      `
      *,
      student_node_progress (
        id,
        status,
        profiles (
          id,
          username
        )
      ),
      node_assessments (
        id,
        assessment_type,
        is_graded,
        map_nodes (
          id,
          title,
          map_id
        )
      ),
      submission_grades (
        id,
        grade,
        rating,
        points_awarded,
        comments,
        graded_at,
        graded_by,
        profiles (
          id,
          username
        )
      )
    `
    )
    .eq("node_assessments.map_nodes.map_id", mapId)
    .order("submitted_at", { ascending: false });

  if (error) {
    console.error("Error fetching submissions:", error);
    throw new Error("Could not fetch submissions for this map.");
  }

  // Defensive filter: only include submissions where node_assessments.map_nodes.map_id matches mapId
  const safeData = (data || []).filter(
    (s) => s?.node_assessments?.map_nodes?.map_id === mapId
  );
  return safeData;
};
