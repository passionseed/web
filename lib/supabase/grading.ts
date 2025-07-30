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

// --- Grading Functions ---

export type SubmissionWithDetails = {
  id: string;
  submitted_at: string;
  text_answer: string | null;
  file_urls: string[] | null; // Changed from file_url to file_urls
  image_url: string | null;
  quiz_answers: Record<string, string> | null;
  student_node_progress: {
    id: string;
    status: string;
    profiles: {
      id: string;
      username: string;
      avatar_url: string | null;
    };
  };
  node_assessments: {
    assessment_type: string;
    map_nodes: {
      id: string;
      title: string;
    };
  };
  submission_grades: {
    grade: string;
    comments: string | null;
    rating: number | null;
    graded_at: string;
  }[];
};

export const getSubmissionsForMap = async (
  mapId: string
): Promise<SubmissionWithDetails[]> => {
  const supabase = createClient();

  // Step 1: Get all node IDs for the given map.
  const { data: nodes, error: nodesError } = await supabase
    .from("map_nodes")
    .select("id")
    .eq("map_id", mapId);

  if (nodesError) {
    console.error("Error fetching nodes for map:", nodesError);
    throw new Error("Could not fetch nodes for the map.");
  }

  const nodeIds = nodes.map((node) => node.id);
  if (nodeIds.length === 0) {
    return []; // No nodes, so no submissions.
  }

  // Step 2: Get all progress records with submissions (submitted, passed, failed)
  const { data: progressRecords, error: progressError } = await supabase
    .from("student_node_progress")
    .select("id")
    .in("node_id", nodeIds)
    .in("status", ["submitted", "in_progress", "passed", "failed"]); // Include all relevant statuses

  if (progressError) {
    console.error("Error fetching progress records:", progressError);
    throw new Error("Could not fetch progress records for the map.");
  }

  const progressIds = progressRecords?.map((p) => p.id) || [];
  if (progressIds.length === 0) {
    return []; // No relevant progress records, so no submissions to show.
  }

  // Step 3: Get all submissions for these progress records
  const { data, error } = await supabase
    .from("assessment_submissions")
    .select(
      `
            id,
            submitted_at,
            text_answer,
            file_urls,
            image_url,
            quiz_answers,
            student_node_progress!inner (
                id,
                status,
                profiles (
                    id,
                    username,
                    avatar_url
                )
            ),
            node_assessments (
                assessment_type,
                map_nodes (
                    id,
                    title,
                    map_id
                )
            ),
            submission_grades (
                grade,
                comments,
                rating,
                graded_at
            )
        `
    )
    .in("progress_id", progressIds)
    .order("submitted_at", { ascending: false });

  if (error) {
    console.error("Error fetching submissions:", error);
    throw new Error("Could not fetch submissions for the map.");
  }

  return data || [];
};

export const gradeSubmission = async (
  submissionId: string,
  grade: Grade,
  comments: string | null,
  rating: number | null,
  userId: string,
  progressId: string
): Promise<SubmissionGrade> => {
  const supabase = createClient();

  console.log("gradeSubmission called with:", {
    submissionId,
    grade,
    comments,
    rating,
    userId,
    progressId,
  });

  try {
    // Step 1: Enhanced input validation
    if (!submissionId || !grade || !userId || !progressId) {
      throw new Error("Missing required parameters for grading");
    }

    // Validate grade value explicitly
    if (grade !== "pass" && grade !== "fail") {
      throw new Error(
        `Invalid grade value: "${grade}". Must be exactly 'pass' or 'fail'`
      );
    }

    // Validate rating more strictly
    if (rating !== null && rating !== undefined) {
      const numRating = Number(rating);
      if (
        isNaN(numRating) ||
        numRating < 1 ||
        numRating > 5 ||
        !Number.isInteger(numRating)
      ) {
        throw new Error(
          `Invalid rating value: ${rating}. Must be an integer between 1 and 5, or null`
        );
      }
      rating = numRating; // Ensure it's a proper number
    } else {
      rating = null; // Explicitly set to null
    }

    // Step 2: Check if submission exists and validate progress_id
    const { data: existingSubmission, error: submissionCheckError } =
      await supabase
        .from("assessment_submissions")
        .select("id, progress_id")
        .eq("id", submissionId)
        .single();

    if (submissionCheckError) {
      console.error(
        "Error checking submission existence:",
        submissionCheckError
      );
      throw new Error(`Submission not found: ${submissionCheckError.message}`);
    }

    if (existingSubmission.progress_id !== progressId) {
      throw new Error(
        `Progress ID mismatch. Expected: ${progressId}, Got: ${existingSubmission.progress_id}`
      );
    }

    // Step 3: Validate user permissions
    const { data: userRoles, error: rolesError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .in("role", ["instructor", "TA"]);

    if (rolesError) {
      console.error("Error checking user roles:", rolesError);
      throw new Error("Unable to verify grading permissions");
    }

    if (!userRoles || userRoles.length === 0) {
      throw new Error("User does not have permission to grade submissions");
    }

    console.log("User roles verified:", userRoles);

    // Step 4: Create the grade entry with explicit type casting
    const gradePayload = {
      submission_id: submissionId,
      graded_by: userId,
      grade: grade as "pass" | "fail",
      comments: comments || null,
      rating: rating,
    };

    console.log("Creating grade with payload:", gradePayload);

    const { data: gradeData, error: gradeError } = await supabase
      .from("submission_grades")
      .insert([gradePayload])
      .select()
      .single();

    if (gradeError) {
      console.error("Error creating grade - Full error object:", {
        error: gradeError,
        code: gradeError.code,
        message: gradeError.message,
        details: gradeError.details,
        hint: gradeError.hint,
        payload: gradePayload,
      });

      // More specific error handling
      if (gradeError.code === "23503") {
        throw new Error(
          "Foreign key constraint violation - invalid submission or user ID"
        );
      } else if (gradeError.code === "23505") {
        throw new Error(
          "Duplicate grade entry - this submission may already be graded"
        );
      } else if (gradeError.code === "42501") {
        throw new Error("Permission denied - insufficient database privileges");
      } else if (gradeError.code === "23514") {
        const errorMsg = gradeError.message || "";
        if (errorMsg.includes("grade")) {
          throw new Error(
            `Invalid grade value. Database expects 'pass' or 'fail', received: "${grade}"`
          );
        } else if (errorMsg.includes("rating")) {
          throw new Error(
            `Invalid rating value. Database expects 1-5 or null, received: ${rating}`
          );
        } else if (errorMsg.includes("student_node_progress_status_check")) {
          throw new Error(
            `Progress status constraint violation. This is likely due to the database trigger. Please check the trigger function.`
          );
        } else {
          throw new Error(`Check constraint violation: ${errorMsg}`);
        }
      } else {
        throw new Error(
          `Database error: ${gradeError.message} (Code: ${gradeError.code})`
        );
      }
    }

    if (!gradeData) {
      throw new Error("Grade created but no data returned from database");
    }

    console.log("Grade created successfully:", gradeData);

    // Step 5: The trigger should automatically update the progress status
    // Let's verify it worked by checking the updated progress
    console.log(`Checking if trigger updated progress ${progressId}...`);

    const { data: updatedProgress, error: progressCheckError } = await supabase
      .from("student_node_progress")
      .select("status")
      .eq("id", progressId)
      .single();

    if (progressCheckError) {
      console.error("Error checking progress update:", progressCheckError);
      console.warn("Grade created but could not verify progress update");
    } else {
      const expectedStatus = grade === "pass" ? "passed" : "failed";
      if (updatedProgress.status === expectedStatus) {
        console.log(
          `Progress status successfully updated to: ${updatedProgress.status}`
        );
      } else {
        console.warn(
          `Progress status is ${updatedProgress.status}, expected ${expectedStatus}`
        );

        // Manual fallback if trigger failed
        console.log("Attempting manual progress update...");
        const { error: manualUpdateError } = await supabase
          .from("student_node_progress")
          .update({
            status: expectedStatus,
            updated_at: new Date().toISOString(),
          })
          .eq("id", progressId);

        if (manualUpdateError) {
          console.error("Manual progress update failed:", manualUpdateError);
          console.warn("Grade created but progress status may be inconsistent");
        } else {
          console.log("Manual progress update successful");
        }
      }
    }

    return gradeData;
  } catch (error) {
    console.error("gradeSubmission failed with error:", error);

    if (error instanceof Error) {
      throw error;
    } else {
      throw new Error(
        `Unknown error occurred during grading: ${String(error)}`
      );
    }
  }
};

export const getSubmissionGrade = async (
  submissionId: string
): Promise<SubmissionGrade | null> => {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("submission_grades")
    .select("*")
    .eq("submission_id", submissionId)
    .single();

  if (error && error.code !== "PGRST116") {
    console.error("Error fetching submission grade:", error);
    throw new Error("Could not fetch submission grade.");
  }

  return data || null;
};
