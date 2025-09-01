import { createClient } from "@/utils/supabase/client";
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
    is_graded: boolean;
    map_nodes: {
      id: string;
      title: string;
      map_id: string;
    };
  };
  submission_grades: {
    grade: string;
    comments: string | null;
    rating: number | null;
    points_awarded: number | null;
    graded_at: string;
    graded_by?: string | null; // User ID of the grader
  }[];
};

export const getSubmissionsForMap = async (
  mapId: string
): Promise<SubmissionWithDetails[]> => {
  const supabase = createClient();

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

export const gradeSubmission = async (
  submissionId: string,
  grade: Grade,
  comments: string | null,
  rating: number | null,
  userId: string,
  progressId: string,
  pointsAwarded: number | null = null
): Promise<SubmissionGrade> => {
  const supabase = createClient();

  console.log("gradeSubmission called with:", {
    submissionId,
    grade,
    comments,
    rating,
    userId,
    progressId,
    pointsAwarded,
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

    // Validate rating to match DB constraint: integer between 1 and 5, or null
    if (rating !== null && rating !== undefined) {
      const numRating = Number(rating);
      if (isNaN(numRating)) {
        throw new Error(
          `Invalid rating value: ${rating}. Must be a valid number or null`
        );
      }

      if (!Number.isInteger(numRating)) {
        throw new Error(
          `Invalid rating value: ${rating}. Rating must be an integer between 1 and 5`
        );
      }

      if (numRating < 1 || numRating > 5) {
        throw new Error(
          `Invalid rating value: ${rating}. Must be between 1 and 5, or null`
        );
      }

      rating = numRating; // Ensure it's a proper integer
    } else {
      rating = null; // Explicitly set to null
    }

    // Validate points_awarded
    if (pointsAwarded !== null && pointsAwarded !== undefined) {
      const numPoints = Number(pointsAwarded);
      if (isNaN(numPoints)) {
        throw new Error(
          `Invalid points_awarded value: ${pointsAwarded}. Must be a valid number or null`
        );
      }

      if (!Number.isInteger(numPoints)) {
        throw new Error(
          `Invalid points_awarded value: ${pointsAwarded}. Must be an integer`
        );
      }

      if (numPoints < 0) {
        throw new Error(
          `Invalid points_awarded value: ${pointsAwarded}. Must be non-negative`
        );
      }

      pointsAwarded = numPoints; // Ensure it's a proper integer
    } else {
      pointsAwarded = null; // Explicitly set to null
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

    // Step 3: Check for existing grades (for regrading handling)
    const { data: existingGrades } = await supabase
      .from("submission_grades")
      .select("id, grade, graded_at")
      .eq("submission_id", submissionId)
      .order("graded_at", { ascending: false });

    if (existingGrades && existingGrades.length > 0) {
      console.log(
        `Found ${existingGrades.length} existing grades for submission ${submissionId}`
      );
      console.log("Most recent grade:", existingGrades[0]);
      console.log("This will be a regrade - creating new grade entry");
    }

    // Step 4: Create the grade entry (always create new entry for regrading history)
    const gradePayload = {
      submission_id: submissionId,
      graded_by: userId,
      grade: grade as "pass" | "fail",
      comments: comments || null,
      rating: rating,
      points_awarded: pointsAwarded,
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

      // Handle specific error cases
      if (gradeError.code === "23503") {
        throw new Error(
          "Foreign key constraint violation - invalid submission or user ID"
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
        } else if (errorMsg.includes("points_awarded")) {
          throw new Error(
            `Invalid points_awarded value. Database expects non-negative integer or null, received: ${pointsAwarded}`
          );
        } else if (errorMsg.includes("student_node_progress_status_check")) {
          throw new Error(
            `Progress status constraint violation. This is likely due to the database trigger.`
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

    // Step 5: Verify the trigger updated the progress status correctly
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

  // Validate input
  if (!submissionId || typeof submissionId !== "string") {
    console.warn(
      "Invalid submission ID provided to getSubmissionGrade:",
      submissionId
    );
    return null;
  }

  const { data, error } = await supabase
    .from("submission_grades")
    .select("*")
    .eq("submission_id", submissionId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      // No grade found - this is normal for ungraded submissions
      return null;
    } else if (error.code === "42501" || error.message?.includes("policy")) {
      // Permission denied / RLS policy violation - student doesn't have access to grades
      console.warn(
        "Permission denied accessing grades for submission:",
        submissionId
      );
      return null;
    } else {
      // Other errors - log but don't throw to prevent breaking the UI
      console.warn("Error fetching submission grade:", error);
      console.warn("Submission ID that caused error:", submissionId);
      return null;
    }
  }

  return data || null;
};

// Get submission information for a specific node and user
export const getNodeSubmission = async (
  userId: string,
  nodeId: string
): Promise<SubmissionWithDetails | null> => {
  const supabase = createClient();

  // First, get the progress record for this user and node
  const { data: progress, error: progressError } = await supabase
    .from("student_node_progress")
    .select("id")
    .eq("user_id", userId)
    .eq("node_id", nodeId)
    .in("status", ["submitted", "passed", "failed"])
    .single();

  if (progressError) {
    // If no progress record exists or user hasn't submitted, return null
    if (progressError.code === "PGRST116") {
      return null;
    }
    console.error("Error fetching progress:", progressError);
    throw new Error("Could not fetch student progress.");
  }

  // Then, get the submission for this progress record
  const { data: submission, error: submissionError } = await supabase
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
            title
        )
    ),
    submission_grades (
        grade,
        comments,
        rating,
        points_awarded,
        graded_at
    )
    `
    )
    .eq("progress_id", progress.id)
    .order("submitted_at", { ascending: false })
    .limit(1)
    .single();

  if (submissionError) {
    // If no submission exists, return null
    if (submissionError.code === "PGRST116") {
      return null;
    }
    console.error("Error fetching submission:", submissionError);
    throw new Error("Could not fetch submission.");
  }

  return submission as unknown as SubmissionWithDetails;
};

// Bulk grading utilities
export interface BulkGradeOptions {
  submissionIds: string[];
  grade: Grade;
  comments?: string;
  rating?: number;
  pointsAwarded?: number;
  userId: string;
}

export interface BulkGradeResult {
  successful: number;
  failed: number;
  errors: Array<{ submissionId: string; error: string }>;
  totalProcessed: number;
}

export const bulkGradeSubmissions = async (
  options: BulkGradeOptions
): Promise<BulkGradeResult> => {
  const { submissionIds, grade, comments, rating, pointsAwarded, userId } = options;
  
  const result: BulkGradeResult = {
    successful: 0,
    failed: 0,
    errors: [],
    totalProcessed: 0
  };

  if (!submissionIds || submissionIds.length === 0) {
    throw new Error("No submission IDs provided for bulk grading");
  }

  // Validate common parameters
  if (grade !== "pass" && grade !== "fail") {
    throw new Error("Invalid grade value. Must be 'pass' or 'fail'");
  }

  const supabase = createClient();

  // Get all submissions with their progress IDs in one query
  const { data: submissions, error: fetchError } = await supabase
    .from("assessment_submissions")
    .select("id, progress_id")
    .in("id", submissionIds);

  if (fetchError) {
    throw new Error(`Failed to fetch submissions: ${fetchError.message}`);
  }

  // Create a map for quick lookup
  const submissionMap = new Map();
  (submissions || []).forEach(sub => {
    submissionMap.set(sub.id, sub.progress_id);
  });

  // Process each submission
  for (const submissionId of submissionIds) {
    try {
      result.totalProcessed++;
      
      const progressId = submissionMap.get(submissionId);
      if (!progressId) {
        result.failed++;
        result.errors.push({
          submissionId,
          error: "Submission not found"
        });
        continue;
      }

      // Use the existing gradeSubmission function
      await gradeSubmission(
        submissionId,
        grade,
        comments || null,
        rating || null,
        userId,
        progressId,
        pointsAwarded || null
      );

      result.successful++;
    } catch (error) {
      result.failed++;
      result.errors.push({
        submissionId,
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }

  return result;
};

// Get submissions for a classroom for grading interface
export const getClassroomSubmissions = async (
  classroomId: string
): Promise<{
  submissions: any[];
  students: any[];
}> => {
  const supabase = createClient();

  // Get all submissions for maps linked to this classroom
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
    throw new Error(`Failed to fetch classroom submissions: ${submissionsError.message}`);
  }

  // Transform and aggregate data
  const transformedSubmissions = (submissions || []).map((submission: any) => {
    const grade = submission.submission_grades[0];
    const student = submission.student_node_progress.profiles;
    const node = submission.node_assessments.map_nodes;
    const map = node.learning_maps;

    return {
      id: submission.id,
      student_user_id: submission.student_node_progress.user_id,
      student_name: student.full_name || student.username,
      student_email: student.email,
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
      status: grade ? "graded" : "ungraded"
    };
  });

  // Aggregate student data
  const studentMap = new Map();
  
  transformedSubmissions.forEach((submission: any) => {
    const studentId = submission.student_user_id;
    if (!studentMap.has(studentId)) {
      studentMap.set(studentId, {
        user_id: studentId,
        username: submission.student_name.split(" ")[0],
        full_name: submission.student_name,
        email: submission.student_email,
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

  return {
    submissions: transformedSubmissions,
    students
  };
};
