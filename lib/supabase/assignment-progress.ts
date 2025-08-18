import { createClient } from "@/utils/supabase/client";
import { ClassroomError } from "@/types/classroom";
import type {
  AssignmentEnrollment,
  AssignmentProgressStats,
  AssignmentStatus,
} from "@/types/classroom";

/**
 * Calculates assignment progress for a specific enrollment
 * Based on the student's progress through the assigned nodes
 */
export const calculateAssignmentProgress = async (
  enrollmentId: string
): Promise<{
  enrollment: AssignmentEnrollment;
  total_nodes: number;
  completed_nodes: number;
  progress_percentage: number;
  current_status: AssignmentStatus;
}> => {
  const supabase = createClient();

  // Get current user for permission check
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new ClassroomError("AUTH_ERROR", "User must be authenticated");
  }

  // Get enrollment details with assignment and nodes
  const { data: enrollment, error: enrollmentError } = await supabase
    .from("assignment_enrollments")
    .select(
      `
      *,
      classroom_assignments!inner(
        id,
        title,
        classroom_id,
        assignment_nodes(
          id,
          node_id,
          sequence_order,
          is_required
        )
      )
    `
    )
    .eq("id", enrollmentId)
    .single();

  if (enrollmentError) {
    throw new ClassroomError(
      "ENROLLMENT_NOT_FOUND",
      "Assignment enrollment not found"
    );
  }

  // Check permission - user must be the student or an instructor/TA in the classroom
  if (enrollment.user_id !== user.id) {
    const { data: membership, error: membershipError } = await supabase
      .from("classroom_memberships")
      .select("role")
      .eq("classroom_id", enrollment.classroom_assignments.classroom_id)
      .eq("user_id", user.id)
      .in("role", ["instructor", "ta"])
      .single();

    if (membershipError || !membership) {
      throw new ClassroomError(
        "INSUFFICIENT_PERMISSIONS",
        "Cannot view progress for this assignment"
      );
    }
  }

  const assignmentNodes = enrollment.classroom_assignments.assignment_nodes;
  const totalNodes = assignmentNodes.length;

  if (totalNodes === 0) {
    return {
      enrollment,
      total_nodes: 0,
      completed_nodes: 0,
      progress_percentage: 0,
      current_status: enrollment.status,
    };
  }

  // Get student's progress on all assigned nodes
  const nodeIds = assignmentNodes.map((node: any) => node.node_id);
  const { data: nodeProgress, error: progressError } = await supabase
    .from("student_node_progress")
    .select("node_id, status")
    .eq("user_id", enrollment.user_id)
    .in("node_id", nodeIds);

  if (progressError) {
    throw new ClassroomError("PROGRESS_FETCH_FAILED", progressError.message);
  }

  // Count completed nodes (passed status)
  const completedNodes =
    nodeProgress?.filter((progress) => progress.status === "passed").length ||
    0;

  const progressPercentage = Math.round((completedNodes / totalNodes) * 100);

  // Determine current status based on progress and due date
  let currentStatus: AssignmentStatus = enrollment.status;

  if (completedNodes === totalNodes) {
    currentStatus = "completed";
  } else if (completedNodes > 0) {
    currentStatus = "in_progress";
  } else if (
    enrollment.due_date &&
    new Date(enrollment.due_date) < new Date()
  ) {
    currentStatus = "overdue";
  }

  return {
    enrollment,
    total_nodes: totalNodes,
    completed_nodes: completedNodes,
    progress_percentage: progressPercentage,
    current_status: currentStatus,
  };
};

/**
 * Updates assignment enrollment status and progress
 */
export const updateAssignmentStatus = async (
  enrollmentId: string,
  status: AssignmentStatus,
  completedAt?: string
): Promise<AssignmentEnrollment> => {
  const supabase = createClient();

  // Get current user for permission check
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new ClassroomError("AUTH_ERROR", "User must be authenticated");
  }

  // Get enrollment to check permissions
  const { data: enrollment, error: enrollmentError } = await supabase
    .from("assignment_enrollments")
    .select(
      `
      *,
      classroom_assignments!inner(classroom_id)
    `
    )
    .eq("id", enrollmentId)
    .single();

  if (enrollmentError) {
    throw new ClassroomError(
      "ENROLLMENT_NOT_FOUND",
      "Assignment enrollment not found"
    );
  }

  // Check permission - user must be the student or an instructor/TA
  if (enrollment.user_id !== user.id) {
    const { data: membership, error: membershipError } = await supabase
      .from("classroom_memberships")
      .select("role")
      .eq("classroom_id", enrollment.classroom_assignments.classroom_id)
      .eq("user_id", user.id)
      .in("role", ["instructor", "ta"])
      .single();

    if (membershipError || !membership) {
      throw new ClassroomError(
        "INSUFFICIENT_PERMISSIONS",
        "Cannot update status for this assignment"
      );
    }
  }

  // Update enrollment status
  const updateData: any = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (status === "completed" && !enrollment.completed_at) {
    updateData.completed_at = completedAt || new Date().toISOString();
  }

  const { data: updatedEnrollment, error: updateError } = await supabase
    .from("assignment_enrollments")
    .update(updateData)
    .eq("id", enrollmentId)
    .select()
    .single();

  if (updateError) {
    throw new ClassroomError("UPDATE_FAILED", updateError.message);
  }

  console.log(`✅ Assignment status updated: ${enrollmentId} -> ${status}`);
  return updatedEnrollment;
};

/**
 * Gets comprehensive progress statistics for an assignment
 */
export const getAssignmentProgressStats = async (
  assignmentId: string
): Promise<AssignmentProgressStats> => {
  const supabase = createClient();

  // Get current user for permission check
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new ClassroomError("AUTH_ERROR", "User must be authenticated");
  }

  // Get assignment and check permissions
  const { data: assignment, error: assignmentError } = await supabase
    .from("classroom_assignments")
    .select("id, classroom_id")
    .eq("id", assignmentId)
    .single();

  if (assignmentError) {
    throw new ClassroomError("ASSIGNMENT_NOT_FOUND", "Assignment not found");
  }

  // Check if user has access to this classroom
  const { data: membership, error: membershipError } = await supabase
    .from("classroom_memberships")
    .select("role")
    .eq("classroom_id", assignment.classroom_id)
    .eq("user_id", user.id);

  if (membershipError || !membership || membership.length === 0) {
    throw new ClassroomError(
      "INSUFFICIENT_PERMISSIONS",
      "User must be a member of this classroom"
    );
  }

  // Get all enrollments for this assignment
  const { data: enrollments, error: enrollmentsError } = await supabase
    .from("assignment_enrollments")
    .select("id, status, due_date, completed_at")
    .eq("assignment_id", assignmentId);

  if (enrollmentsError) {
    throw new ClassroomError("FETCH_FAILED", enrollmentsError.message);
  }

  const totalEnrollments = enrollments.length;

  if (totalEnrollments === 0) {
    return {
      assignment_id: assignmentId,
      total_enrollments: 0,
      completed_enrollments: 0,
      in_progress_enrollments: 0,
      overdue_enrollments: 0,
      not_started_enrollments: 0,
      average_completion_percentage: 0,
      completion_rate: 0,
      on_time_completion_rate: 0,
    };
  }

  // Calculate statistics
  const now = new Date();
  let completedEnrollments = 0;
  let inProgressEnrollments = 0;
  let overdueEnrollments = 0;
  let notStartedEnrollments = 0;
  let onTimeCompletions = 0;

  for (const enrollment of enrollments) {
    const dueDate = enrollment.due_date ? new Date(enrollment.due_date) : null;
    const completedAt = enrollment.completed_at
      ? new Date(enrollment.completed_at)
      : null;

    switch (enrollment.status) {
      case "completed":
        completedEnrollments++;
        if (dueDate && completedAt && completedAt <= dueDate) {
          onTimeCompletions++;
        }
        break;
      case "in_progress":
        if (dueDate && now > dueDate) {
          overdueEnrollments++;
        } else {
          inProgressEnrollments++;
        }
        break;
      case "overdue":
        overdueEnrollments++;
        break;
      default: // "assigned"
        if (dueDate && now > dueDate) {
          overdueEnrollments++;
        } else {
          notStartedEnrollments++;
        }
    }
  }

  // Calculate progress percentages for all enrollments
  const progressPromises = enrollments.map((enrollment) =>
    calculateAssignmentProgress(enrollment.id)
  );

  try {
    const progressResults = await Promise.all(progressPromises);
    const totalProgressPercentage = progressResults.reduce(
      (sum, result) => sum + result.progress_percentage,
      0
    );
    const averageCompletionPercentage = Math.round(
      totalProgressPercentage / totalEnrollments
    );

    return {
      assignment_id: assignmentId,
      total_enrollments: totalEnrollments,
      completed_enrollments: completedEnrollments,
      in_progress_enrollments: inProgressEnrollments,
      overdue_enrollments: overdueEnrollments,
      not_started_enrollments: notStartedEnrollments,
      average_completion_percentage: averageCompletionPercentage,
      completion_rate: Math.round(
        (completedEnrollments / totalEnrollments) * 100
      ),
      on_time_completion_rate: Math.round(
        (onTimeCompletions / totalEnrollments) * 100
      ),
    };
  } catch (error) {
    // If individual progress calculation fails, return basic stats
    console.warn(
      "Could not calculate detailed progress, returning basic stats:",
      error
    );

    return {
      assignment_id: assignmentId,
      total_enrollments: totalEnrollments,
      completed_enrollments: completedEnrollments,
      in_progress_enrollments: inProgressEnrollments,
      overdue_enrollments: overdueEnrollments,
      not_started_enrollments: notStartedEnrollments,
      average_completion_percentage: 0,
      completion_rate: Math.round(
        (completedEnrollments / totalEnrollments) * 100
      ),
      on_time_completion_rate: Math.round(
        (onTimeCompletions / totalEnrollments) * 100
      ),
    };
  }
};

/**
 * Gets detailed progress for a specific student on a specific assignment
 */
export const getStudentAssignmentProgress = async (
  assignmentId: string,
  studentId?: string
): Promise<{
  enrollment: AssignmentEnrollment;
  progress: {
    total_nodes: number;
    completed_nodes: number;
    progress_percentage: number;
    current_status: AssignmentStatus;
  };
  node_progress: Array<{
    node_id: string;
    node_title: string;
    map_title: string;
    sequence_order: number;
    is_required: boolean;
    status: string | null;
    completed_at: string | null;
  }>;
}> => {
  const supabase = createClient();

  // Get current user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new ClassroomError("AUTH_ERROR", "User must be authenticated");
  }

  const targetStudentId = studentId || user.id;

  // Get enrollment for this student and assignment
  const { data: enrollment, error: enrollmentError } = await supabase
    .from("assignment_enrollments")
    .select(
      `
      *,
      classroom_assignments!inner(
        id,
        classroom_id,
        assignment_nodes(
          id,
          node_id,
          sequence_order,
          is_required,
          map_nodes!inner(
            id,
            title,
            learning_maps!inner(
              id,
              title
            )
          )
        )
      )
    `
    )
    .eq("assignment_id", assignmentId)
    .eq("user_id", targetStudentId)
    .single();

  if (enrollmentError) {
    throw new ClassroomError(
      "ENROLLMENT_NOT_FOUND",
      "Student is not enrolled in this assignment"
    );
  }

  // Check permission if viewing another student's progress
  if (targetStudentId !== user.id) {
    const { data: membership, error: membershipError } = await supabase
      .from("classroom_memberships")
      .select("role")
      .eq("classroom_id", enrollment.classroom_assignments.classroom_id)
      .eq("user_id", user.id)
      .in("role", ["instructor", "ta"])
      .single();

    if (membershipError || !membership) {
      throw new ClassroomError(
        "INSUFFICIENT_PERMISSIONS",
        "Cannot view progress for this student"
      );
    }
  }

  // Calculate overall progress
  const progressResult = await calculateAssignmentProgress(enrollment.id);

  // Get detailed node progress
  const assignmentNodes = enrollment.classroom_assignments.assignment_nodes;
  const nodeIds = assignmentNodes.map((node: any) => node.node_id);

  const { data: nodeProgressData, error: progressError } = await supabase
    .from("student_node_progress")
    .select("node_id, status, completed_at")
    .eq("user_id", targetStudentId)
    .in("node_id", nodeIds);

  if (progressError) {
    throw new ClassroomError("PROGRESS_FETCH_FAILED", progressError.message);
  }

  // Combine assignment nodes with progress data
  const nodeProgress = assignmentNodes.map((assignmentNode: any) => {
    const progress = nodeProgressData?.find(
      (p) => p.node_id === assignmentNode.node_id
    );

    return {
      node_id: assignmentNode.node_id,
      node_title: assignmentNode.map_nodes.title,
      map_title: assignmentNode.map_nodes.learning_maps.title,
      sequence_order: assignmentNode.sequence_order,
      is_required: assignmentNode.is_required,
      status: progress?.status || null,
      completed_at: progress?.completed_at || null,
    };
  });

  return {
    enrollment,
    progress: {
      total_nodes: progressResult.total_nodes,
      completed_nodes: progressResult.completed_nodes,
      progress_percentage: progressResult.progress_percentage,
      current_status: progressResult.current_status,
    },
    node_progress: nodeProgress.sort(
      (a: any, b: any) => a.sequence_order - b.sequence_order
    ),
  };
};

/**
 * Auto-updates assignment status based on node completion
 * This should be called via database trigger when student_node_progress changes
 */
export const autoUpdateAssignmentStatus = async (
  userId: string,
  nodeId: string
): Promise<void> => {
  const supabase = createClient();

  try {
    // Find all assignments that include this node for this user
    const { data: enrollments, error: enrollmentsError } = await supabase
      .from("assignment_enrollments")
      .select(
        `
        id,
        status,
        classroom_assignments!inner(
          id,
          assignment_nodes!inner(node_id)
        )
      `
      )
      .eq("user_id", userId)
      .eq("classroom_assignments.assignment_nodes.node_id", nodeId)
      .in("status", ["assigned", "in_progress"]);

    if (enrollmentsError || !enrollments || enrollments.length === 0) {
      return; // No active assignments affected
    }

    // Update each affected assignment
    for (const enrollment of enrollments) {
      const progressResult = await calculateAssignmentProgress(enrollment.id);

      // Only update if status actually changed
      if (progressResult.current_status !== enrollment.status) {
        await updateAssignmentStatus(
          enrollment.id,
          progressResult.current_status,
          progressResult.current_status === "completed"
            ? new Date().toISOString()
            : undefined
        );
      }
    }
  } catch (error) {
    console.error("Auto-update assignment status failed:", error);
    // Don't throw error to avoid breaking the main node completion flow
  }
};
