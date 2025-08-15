import { createClient } from "@/utils/supabase/client";
import { createClient as createServerClient } from "@/utils/supabase/server";
import { ClassroomError, CLASSROOM_CONSTANTS } from "@/types/classroom";
import type {
  ClassroomAssignment,
  AssignmentNode,
  AssignmentEnrollment,
  CreateAssignmentRequest,
  CreateAssignmentResponse,
} from "@/types/classroom";

/**
 * Creates a new assignment for a classroom (server-side version)
 */
export const createAssignmentServer = async (
  data: CreateAssignmentRequest
): Promise<CreateAssignmentResponse> => {
  const supabase = await createServerClient();

  // Get current user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new ClassroomError("AUTH_ERROR", "User must be authenticated");
  }

  // Verify user has permission to create assignments in this classroom
  const { data: classroom, error: classroomError } = await supabase
    .from("classrooms")
    .select("instructor_id")
    .eq("id", data.classroom_id)
    .single();

  if (classroomError) {
    throw new ClassroomError("CLASSROOM_NOT_FOUND", "Classroom not found");
  }

  // Check if user is instructor or has TA role in this classroom
  const { data: membership, error: membershipError } = await supabase
    .from("classroom_memberships")
    .select("role")
    .eq("classroom_id", data.classroom_id)
    .eq("user_id", user.id)
    .in("role", ["instructor", "ta"])
    .single();

  if (membershipError || !membership) {
    throw new ClassroomError(
      "ACCESS_DENIED",
      "You don't have permission to create assignments in this classroom"
    );
  }

  // Create the assignment
  const { data: assignment, error: createError } = await supabase
    .from("classroom_assignments")
    .insert({
      classroom_id: data.classroom_id,
      title: data.title,
      description: data.description,
      instructions: data.instructions,
      default_due_date: data.default_due_date,
      auto_assign: data.auto_assign || false,
      created_by: user.id,
      is_active: true,
      is_published: true,
    })
    .select()
    .single();

  if (createError || !assignment) {
    console.error("Create assignment error:", createError);
    throw new ClassroomError("CREATE_FAILED", "Failed to create assignment");
  }

  return {
    assignment,
    nodes_added: 0,
    students_enrolled: 0,
  };
};

/**
 * Creates a new assignment for a classroom
 */
export const createAssignment = async (
  data: CreateAssignmentRequest
): Promise<CreateAssignmentResponse> => {
  // Use server client when available, fallback to regular client
  const isServer = typeof window === "undefined";

  if (isServer) {
    return createAssignmentServer(data);
  }

  const supabase = createClient();

  // Get current user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new ClassroomError("AUTH_ERROR", "User must be authenticated");
  }

  // Verify user has permission to create assignments in this classroom
  const { data: classroom, error: classroomError } = await supabase
    .from("classrooms")
    .select("instructor_id")
    .eq("id", data.classroom_id)
    .single();

  if (classroomError) {
    throw new ClassroomError("CLASSROOM_NOT_FOUND", "Classroom not found");
  }

  // Check if user is instructor or has TA role in this classroom
  const { data: membership, error: membershipError } = await supabase
    .from("classroom_memberships")
    .select("role")
    .eq("classroom_id", data.classroom_id)
    .eq("user_id", user.id)
    .in("role", ["instructor", "ta"])
    .single();

  if (membershipError || !membership) {
    throw new ClassroomError(
      "INSUFFICIENT_PERMISSIONS",
      "User must be an instructor or TA to create assignments"
    );
  }

  // Create the assignment
  const { data: assignment, error: createError } = await supabase
    .from("classroom_assignments")
    .insert({
      classroom_id: data.classroom_id,
      title: data.title,
      description: data.description || null,
      instructions: data.instructions || null,
      created_by: user.id,
      default_due_date: data.default_due_date || null,
      auto_assign: data.auto_assign || false,
      is_active: true,
    })
    .select()
    .single();

  if (createError) {
    throw new ClassroomError("CREATE_FAILED", createError.message);
  }

  console.log("✅ Assignment created:", assignment.id);
  return {
    assignment,
    nodes_added: 0,
    students_enrolled: 0,
  };
};

/**
 * Adds nodes to an existing assignment with sequence ordering
 */
export const addNodesToAssignment = async (
  assignmentId: string,
  nodeIds: string[],
  sequenceOrder?: number[]
): Promise<AssignmentNode[]> => {
  const supabase = createClient();

  // Get current user for permission check
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new ClassroomError("AUTH_ERROR", "User must be authenticated");
  }

  // Verify assignment exists and user has permission
  const { data: assignment, error: assignmentError } = await supabase
    .from("classroom_assignments")
    .select(
      `
      id,
      classroom_id,
      classrooms!inner(instructor_id)
    `
    )
    .eq("id", assignmentId)
    .single();

  if (assignmentError) {
    throw new ClassroomError("ASSIGNMENT_NOT_FOUND", "Assignment not found");
  }

  // Check instructor/TA permission
  const { data: membership, error: membershipError } = await supabase
    .from("classroom_memberships")
    .select("role")
    .eq("classroom_id", assignment.classroom_id)
    .eq("user_id", user.id)
    .in("role", ["instructor", "ta"])
    .single();

  if (membershipError || !membership) {
    throw new ClassroomError(
      "INSUFFICIENT_PERMISSIONS",
      "User must be an instructor or TA to modify assignments"
    );
  }

  // Prepare assignment nodes data
  const assignmentNodes = nodeIds.map((nodeId, index) => ({
    assignment_id: assignmentId,
    node_id: nodeId,
    sequence_order: sequenceOrder?.[index] ?? index + 1,
    is_required: true, // Default to required, can be updated later
  }));

  // Insert assignment nodes
  const { data: createdNodes, error: insertError } = await supabase
    .from("assignment_nodes")
    .insert(assignmentNodes)
    .select();

  if (insertError) {
    throw new ClassroomError("NODE_ASSIGNMENT_FAILED", insertError.message);
  }

  console.log(
    `✅ Added ${createdNodes.length} nodes to assignment ${assignmentId}`
  );
  return createdNodes;
};

/**
 * Assigns an assignment to specific students with optional custom due dates
 */
export const assignToStudents = async (
  assignmentId: string,
  studentIds?: string[],
  customDueDates?: Record<string, string>
): Promise<AssignmentEnrollment[]> => {
  const supabase = createClient();

  // Get current user for permission check
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new ClassroomError("AUTH_ERROR", "User must be authenticated");
  }

  // Get assignment and classroom info
  const { data: assignment, error: assignmentError } = await supabase
    .from("classroom_assignments")
    .select(
      `
      id,
      classroom_id,
      default_due_date,
      classrooms!inner(instructor_id)
    `
    )
    .eq("id", assignmentId)
    .single();

  if (assignmentError) {
    throw new ClassroomError("ASSIGNMENT_NOT_FOUND", "Assignment not found");
  }

  // Check instructor/TA permission
  const { data: membership, error: membershipError } = await supabase
    .from("classroom_memberships")
    .select("role")
    .eq("classroom_id", assignment.classroom_id)
    .eq("user_id", user.id)
    .in("role", ["instructor", "ta"])
    .single();

  if (membershipError || !membership) {
    throw new ClassroomError(
      "INSUFFICIENT_PERMISSIONS",
      "User must be an instructor or TA to assign to students"
    );
  }

  // If no student IDs provided, assign to all students in the classroom
  let targetStudentIds = studentIds;
  if (!targetStudentIds || targetStudentIds.length === 0) {
    const { data: classroomMembers, error: membersError } = await supabase
      .from("classroom_memberships")
      .select("user_id")
      .eq("classroom_id", assignment.classroom_id)
      .eq("role", "student");

    if (membersError) {
      throw new ClassroomError("MEMBERS_FETCH_FAILED", membersError.message);
    }

    targetStudentIds = classroomMembers.map((member) => member.user_id);
  }

  // Create enrollment records
  const enrollments = targetStudentIds.map((studentId) => ({
    assignment_id: assignmentId,
    user_id: studentId,
    due_date: customDueDates?.[studentId] || assignment.default_due_date,
    status: "assigned" as const,
  }));

  const { data: createdEnrollments, error: enrollmentError } = await supabase
    .from("assignment_enrollments")
    .insert(enrollments)
    .select();

  if (enrollmentError) {
    throw new ClassroomError("ENROLLMENT_FAILED", enrollmentError.message);
  }

  console.log(`✅ Assigned to ${createdEnrollments.length} students`);
  return createdEnrollments;
};

/**
 * Server-side version of assignToStudents for API routes
 */
export const assignToStudentsServer = async (
  assignmentId: string,
  studentIds?: string[],
  customDueDates?: Record<string, string>
): Promise<AssignmentEnrollment[]> => {
  const supabase = await createServerClient();

  // Get current user for permission check
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new ClassroomError("AUTH_ERROR", "User must be authenticated");
  }

  // Get assignment and classroom info
  const { data: assignment, error: assignmentError } = await supabase
    .from("classroom_assignments")
    .select(
      `
      id,
      classroom_id,
      default_due_date,
      classrooms!inner(instructor_id)
    `
    )
    .eq("id", assignmentId)
    .single();

  if (assignmentError) {
    console.error("Assignment lookup error:", assignmentError);
    throw new ClassroomError(
      "ASSIGNMENT_NOT_FOUND",
      `Assignment not found: ${assignmentError.message}`
    );
  }

  // Check instructor/TA permission
  const { data: membership, error: membershipError } = await supabase
    .from("classroom_memberships")
    .select("role")
    .eq("classroom_id", assignment.classroom_id)
    .eq("user_id", user.id)
    .in("role", ["instructor", "ta"])
    .single();

  if (membershipError || !membership) {
    console.error("Permission check error:", membershipError);
    throw new ClassroomError(
      "INSUFFICIENT_PERMISSIONS",
      "User must be an instructor or TA to assign to students"
    );
  }

  // If no student IDs provided, assign to all students in the classroom
  let targetStudentIds = studentIds;
  if (!targetStudentIds || targetStudentIds.length === 0) {
    const { data: classroomMembers, error: membersError } = await supabase
      .from("classroom_memberships")
      .select("user_id")
      .eq("classroom_id", assignment.classroom_id)
      .eq("role", "student");

    if (membersError) {
      console.error("Classroom members fetch error:", membersError);
      throw new ClassroomError(
        "MEMBERS_FETCH_FAILED",
        `Failed to fetch classroom members: ${membersError.message}`
      );
    }

    if (!classroomMembers || classroomMembers.length === 0) {
      console.warn("No students found in classroom:", assignment.classroom_id);
      return []; // Return empty array if no students to assign to
    }

    targetStudentIds = classroomMembers.map((member: any) => member.user_id);
  }

  if (!targetStudentIds || targetStudentIds.length === 0) {
    console.warn("No target students to assign to");
    return [];
  }

  console.log(
    `📝 Attempting to assign to ${targetStudentIds.length} students:`,
    targetStudentIds
  );

  // Check for existing enrollments to avoid duplicates
  const { data: existingEnrollments, error: existingError } = await supabase
    .from("assignment_enrollments")
    .select("user_id")
    .eq("assignment_id", assignmentId)
    .in("user_id", targetStudentIds);

  if (existingError) {
    console.error("Existing enrollments check error:", existingError);
    throw new ClassroomError(
      "ENROLLMENT_CHECK_FAILED",
      `Failed to check existing enrollments: ${existingError.message}`
    );
  }

  // Filter out students who are already enrolled
  const existingUserIds = new Set(
    existingEnrollments?.map((e: any) => e.user_id) || []
  );
  const newStudentIds = targetStudentIds.filter(
    (id) => !existingUserIds.has(id)
  );

  if (newStudentIds.length === 0) {
    console.log("All target students are already enrolled");
    return (existingEnrollments as AssignmentEnrollment[]) || [];
  }

  // Create enrollment records
  const enrollments = newStudentIds.map((studentId) => ({
    assignment_id: assignmentId,
    user_id: studentId,
    due_date: customDueDates?.[studentId] || assignment.default_due_date,
    status: "assigned" as const,
  }));

  console.log(`📝 Creating ${enrollments.length} new enrollments`);

  const { data: createdEnrollments, error: enrollmentError } = await supabase
    .from("assignment_enrollments")
    .insert(enrollments)
    .select();

  if (enrollmentError) {
    console.error("Enrollment creation error:", enrollmentError);
    throw new ClassroomError(
      "ENROLLMENT_FAILED",
      `Failed to create enrollments: ${enrollmentError.message}`
    );
  }

  console.log(
    `✅ Successfully assigned to ${createdEnrollments.length} students`
  );
  return createdEnrollments;
};

/**
 * Gets all assignments for a classroom with their nodes and enrollment stats
 */
export const getClassroomAssignments = async (
  classroomId: string
): Promise<
  (ClassroomAssignment & {
    assignment_nodes: AssignmentNode[];
    enrollment_count: number;
    completed_count: number;
  })[]
> => {
  const supabase = createClient();

  // Get current user for permission check
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new ClassroomError("AUTH_ERROR", "User must be authenticated");
  }

  // Check if user has access to this classroom
  const { data: membership, error: membershipError } = await supabase
    .from("classroom_memberships")
    .select("role")
    .eq("classroom_id", classroomId)
    .eq("user_id", user.id);

  if (membershipError || !membership || membership.length === 0) {
    throw new ClassroomError(
      "INSUFFICIENT_PERMISSIONS",
      "User must be a member of this classroom"
    );
  }

  // Get assignments with related data
  const { data: assignments, error: assignmentsError } = await supabase
    .from("classroom_assignments")
    .select(
      `
      *,
      assignment_nodes(*),
      assignment_enrollments(
        id,
        status,
        user_id
      )
    `
    )
    .eq("classroom_id", classroomId)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (assignmentsError) {
    throw new ClassroomError("FETCH_FAILED", assignmentsError.message);
  }

  // Process assignments to add statistics
  const processedAssignments = assignments.map((assignment: any) => {
    const enrollmentCount = assignment.assignment_enrollments?.length || 0;
    const completedCount =
      assignment.assignment_enrollments?.filter(
        (enrollment: any) => enrollment.status === "completed"
      ).length || 0;

    return {
      ...assignment,
      enrollment_count: enrollmentCount,
      completed_count: completedCount,
    };
  });

  return processedAssignments;
};

/**
 * Gets all assignments for a specific student
 */
export const getStudentAssignments = async (
  studentId?: string
): Promise<
  (AssignmentEnrollment & {
    assignment: ClassroomAssignment & { assignment_nodes: AssignmentNode[] };
    classroom: { name: string; instructor_id: string };
  })[]
> => {
  const supabase = createClient();

  // Get current user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new ClassroomError("AUTH_ERROR", "User must be authenticated");
  }

  // Use provided studentId or current user's ID
  const targetStudentId = studentId || user.id;

  // If querying for another user, verify permission
  if (studentId && studentId !== user.id) {
    // Check if current user is an instructor/TA who can view this student's assignments
    const { data: instructorClassrooms, error: instructorError } =
      await supabase
        .from("classroom_memberships")
        .select("classroom_id")
        .eq("user_id", user.id)
        .in("role", ["instructor", "ta"]);

    if (instructorError) {
      throw new ClassroomError(
        "PERMISSION_CHECK_FAILED",
        instructorError.message
      );
    }

    const instructorClassroomIds = instructorClassrooms.map(
      (m) => m.classroom_id
    );

    // Check if the target student is in any of the instructor's classrooms
    const { data: studentClassrooms, error: studentError } = await supabase
      .from("classroom_memberships")
      .select("classroom_id")
      .eq("user_id", targetStudentId)
      .in("classroom_id", instructorClassroomIds);

    if (studentError || !studentClassrooms || studentClassrooms.length === 0) {
      throw new ClassroomError(
        "INSUFFICIENT_PERMISSIONS",
        "Cannot view assignments for this student"
      );
    }
  }

  // Get student's assignment enrollments with full assignment details
  const { data: enrollments, error: enrollmentsError } = await supabase
    .from("assignment_enrollments")
    .select(
      `
      *,
      classroom_assignments!inner(
        *,
        assignment_nodes(*),
        classrooms!inner(name, instructor_id)
      )
    `
    )
    .eq("user_id", targetStudentId)
    .eq("classroom_assignments.is_active", true)
    .order("due_date", { ascending: true, nullsFirst: false });

  if (enrollmentsError) {
    throw new ClassroomError("FETCH_FAILED", enrollmentsError.message);
  }

  // Reshape the data for easier consumption
  const processedEnrollments = enrollments.map((enrollment: any) => ({
    ...enrollment,
    assignment: enrollment.classroom_assignments,
    classroom: enrollment.classroom_assignments.classrooms,
  }));

  return processedEnrollments;
};

/**
 * Updates an existing assignment
 */
export const updateAssignment = async (
  assignmentId: string,
  data: Partial<CreateAssignmentRequest>
): Promise<ClassroomAssignment> => {
  const supabase = createClient();

  // Get current user for permission check
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new ClassroomError("AUTH_ERROR", "User must be authenticated");
  }

  // Verify assignment exists and user has permission
  const { data: assignment, error: assignmentError } = await supabase
    .from("classroom_assignments")
    .select(
      `
      id,
      classroom_id,
      classrooms!inner(instructor_id)
    `
    )
    .eq("id", assignmentId)
    .single();

  if (assignmentError) {
    throw new ClassroomError("ASSIGNMENT_NOT_FOUND", "Assignment not found");
  }

  // Check instructor/TA permission
  const { data: membership, error: membershipError } = await supabase
    .from("classroom_memberships")
    .select("role")
    .eq("classroom_id", assignment.classroom_id)
    .eq("user_id", user.id)
    .in("role", ["instructor", "ta"])
    .single();

  if (membershipError || !membership) {
    throw new ClassroomError(
      "INSUFFICIENT_PERMISSIONS",
      "User must be an instructor or TA to update assignments"
    );
  }

  // Update the assignment
  const updateData: any = {
    updated_at: new Date().toISOString(),
  };

  if (data.title !== undefined) updateData.title = data.title;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.instructions !== undefined)
    updateData.instructions = data.instructions;
  if (data.default_due_date !== undefined)
    updateData.default_due_date = data.default_due_date;

  const { data: updatedAssignment, error: updateError } = await supabase
    .from("classroom_assignments")
    .update(updateData)
    .eq("id", assignmentId)
    .select()
    .single();

  if (updateError) {
    throw new ClassroomError("UPDATE_FAILED", updateError.message);
  }

  console.log("✅ Assignment updated:", assignmentId);
  return updatedAssignment;
};

/**
 * Deletes an assignment (server-side version)
 */
export const deleteAssignmentServer = async (
  assignmentId: string
): Promise<void> => {
  const supabase = await createServerClient();

  // Get current user for permission check
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new ClassroomError("AUTH_ERROR", "User must be authenticated");
  }

  // Verify assignment exists and user has permission
  const { data: assignment, error: assignmentError } = await supabase
    .from("classroom_assignments")
    .select("id, created_by, classroom_id")
    .eq("id", assignmentId)
    .single();

  if (assignmentError || !assignment) {
    throw new ClassroomError("ASSIGNMENT_NOT_FOUND", "Assignment not found");
  }

  // Check if user is creator OR has instructor/TA role in the classroom
  if (assignment.created_by !== user.id) {
    const { data: membership, error: membershipError } = await supabase
      .from("classroom_memberships")
      .select("role")
      .eq("classroom_id", assignment.classroom_id)
      .eq("user_id", user.id)
      .in("role", ["instructor", "ta"])
      .single();

    if (membershipError || !membership) {
      throw new ClassroomError(
        "INSUFFICIENT_PERMISSIONS",
        "User must be assignment creator or classroom instructor/TA to delete assignments"
      );
    }
  }

  // Soft delete: set is_active to false instead of hard delete
  const { error: deleteError } = await supabase
    .from("classroom_assignments")
    .update({
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", assignmentId);

  if (deleteError) {
    throw new ClassroomError("DELETE_FAILED", deleteError.message);
  }

  console.log("✅ Assignment deleted (soft delete):", assignmentId);
};

/**
 * Deletes an assignment (soft delete by setting is_active to false)
 */
export const deleteAssignment = async (assignmentId: string): Promise<void> => {
  // Use server client when available, fallback to regular client
  const isServer = typeof window === "undefined";

  if (isServer) {
    return deleteAssignmentServer(assignmentId);
  }

  const supabase = createClient();

  // Get current user for permission check
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new ClassroomError("AUTH_ERROR", "User must be authenticated");
  }

  // Verify assignment exists and user has permission
  const { data: assignment, error: assignmentError } = await supabase
    .from("classroom_assignments")
    .select(
      `
      id,
      classroom_id,
      classrooms!inner(instructor_id)
    `
    )
    .eq("id", assignmentId)
    .single();

  if (assignmentError) {
    throw new ClassroomError("ASSIGNMENT_NOT_FOUND", "Assignment not found");
  }

  // Check instructor/TA permission
  const { data: membership, error: membershipError } = await supabase
    .from("classroom_memberships")
    .select("role")
    .eq("classroom_id", assignment.classroom_id)
    .eq("user_id", user.id)
    .in("role", ["instructor", "ta"])
    .single();

  if (membershipError || !membership) {
    throw new ClassroomError(
      "INSUFFICIENT_PERMISSIONS",
      "User must be an instructor or TA to delete assignments"
    );
  }

  // Soft delete the assignment
  const { error: deleteError } = await supabase
    .from("classroom_assignments")
    .update({
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", assignmentId);

  if (deleteError) {
    throw new ClassroomError("DELETE_FAILED", deleteError.message);
  }

  console.log("✅ Assignment deleted (soft):", assignmentId);
};

/**
 * Gets assignment nodes with map and node details for display
 */
export const getAssignmentNodesWithDetails = async (
  assignmentId: string
): Promise<
  (AssignmentNode & {
    map_nodes: {
      id: string;
      title: string;
      learning_maps: {
        id: string;
        title: string;
      };
    };
  })[]
> => {
  const supabase = createClient();

  const { data: assignmentNodes, error } = await supabase
    .from("assignment_nodes")
    .select(
      `
      *,
      map_nodes!inner(
        id,
        title,
        learning_maps!inner(
          id,
          title
        )
      )
    `
    )
    .eq("assignment_id", assignmentId)
    .order("sequence_order", { ascending: true });

  if (error) {
    throw new ClassroomError("FETCH_FAILED", error.message);
  }

  return assignmentNodes;
};
