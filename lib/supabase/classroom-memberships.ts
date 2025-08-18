import { createClient } from "@/utils/supabase/client";
import { createClient as createServerClient } from "@/utils/supabase/server";
import type { ClassroomMembership, ClassroomError } from "@/types/classroom";

/**
 * Get all members for a classroom
 */
export const getClassroomMembers = async (
  classroomId: string
): Promise<(ClassroomMembership & { profiles: any })[]> => {
  const supabase = createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error("User must be authenticated");
  }

  // Check if user has access to this classroom (instructor or member)
  const { data: accessCheck, error: accessError } = await supabase
    .from("classrooms")
    .select("instructor_id")
    .eq("id", classroomId)
    .single();

  if (accessError) {
    throw new Error("Classroom not found");
  }

  const isInstructor = accessCheck.instructor_id === user.id;

  // If not instructor, check if user is a member
  if (!isInstructor) {
    const { data: memberCheck, error: memberError } = await supabase
      .from("classroom_memberships")
      .select("id")
      .eq("classroom_id", classroomId)
      .eq("user_id", user.id)
      .single();

    if (memberError || !memberCheck) {
      throw new Error("Access denied to this classroom");
    }
  }

  const { data: members, error } = await supabase
    .from("classroom_memberships")
    .select(
      `
      *,
      profiles (
        id,
        username,
        full_name,
        avatar_url,
        email
      )
    `
    )
    .eq("classroom_id", classroomId)
    .order("joined_at", { ascending: true });

  if (error) {
    console.error("Error fetching classroom members:", error);
    throw new Error(`Failed to fetch members: ${error.message}`);
  }

  return members || [];
};

/**
 * Add a user to a classroom (instructor only)
 */
export const addUserToClassroom = async (
  classroomId: string,
  userId: string,
  role: "student" | "ta" = "student"
): Promise<ClassroomMembership> => {
  const supabase = createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error("User must be authenticated");
  }

  // Check if current user is instructor
  const { data: classroom, error: classroomError } = await supabase
    .from("classrooms")
    .select("instructor_id, max_students")
    .eq("id", classroomId)
    .single();

  if (classroomError || !classroom) {
    throw new Error("Classroom not found");
  }

  if (classroom.instructor_id !== user.id) {
    throw new Error("Only instructors can add users to classrooms");
  }

  // Check if user is already a member
  const { data: existingMembership, error: membershipCheckError } =
    await supabase
      .from("classroom_memberships")
      .select("id")
      .eq("classroom_id", classroomId)
      .eq("user_id", userId)
      .single();

  if (existingMembership) {
    throw new Error("User is already a member of this classroom");
  }

  // Check classroom capacity for students
  if (role === "student") {
    const { count: memberCount, error: countError } = await supabase
      .from("classroom_memberships")
      .select("*", { count: "exact", head: true })
      .eq("classroom_id", classroomId)
      .eq("role", "student");

    if (countError) {
      throw new Error("Failed to check classroom capacity");
    }

    if (memberCount && memberCount >= classroom.max_students) {
      throw new Error("Classroom has reached maximum capacity");
    }
  }

  // Add the user
  const { data: membership, error: addError } = await supabase
    .from("classroom_memberships")
    .insert({
      classroom_id: classroomId,
      user_id: userId,
      role,
    })
    .select()
    .single();

  if (addError) {
    console.error("Error adding user to classroom:", addError);
    throw new Error(`Failed to add user: ${addError.message}`);
  }

  return membership;
};

/**
 * Remove a user from a classroom (instructor only, or user can remove themselves)
 */
export const removeUserFromClassroom = async (
  classroomId: string,
  userId: string
): Promise<void> => {
  const supabase = createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error("User must be authenticated");
  }

  // Check if current user is instructor or the user being removed
  const { data: classroom, error: classroomError } = await supabase
    .from("classrooms")
    .select("instructor_id")
    .eq("id", classroomId)
    .single();

  if (classroomError || !classroom) {
    throw new Error("Classroom not found");
  }

  const isInstructor = classroom.instructor_id === user.id;
  const isSelfRemoval = userId === user.id;

  if (!isInstructor && !isSelfRemoval) {
    throw new Error("Access denied - only instructors can remove other users");
  }

  // Prevent instructor from removing themselves
  if (isInstructor && isSelfRemoval) {
    throw new Error(
      "Instructors cannot remove themselves from their own classroom"
    );
  }

  const { error } = await supabase
    .from("classroom_memberships")
    .delete()
    .eq("classroom_id", classroomId)
    .eq("user_id", userId);

  if (error) {
    console.error("Error removing user from classroom:", error);
    throw new Error(`Failed to remove user: ${error.message}`);
  }
};

/**
 * Update user role in classroom (instructor only)
 */
export const updateUserRoleInClassroom = async (
  classroomId: string,
  userId: string,
  newRole: "student" | "ta"
): Promise<ClassroomMembership> => {
  const supabase = createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error("User must be authenticated");
  }

  // Check if current user is instructor
  const { data: classroom, error: classroomError } = await supabase
    .from("classrooms")
    .select("instructor_id")
    .eq("id", classroomId)
    .single();

  if (classroomError || !classroom) {
    throw new Error("Classroom not found");
  }

  if (classroom.instructor_id !== user.id) {
    throw new Error("Only instructors can update user roles");
  }

  // Cannot change instructor role
  if (userId === user.id) {
    throw new Error("Cannot change your own role");
  }

  const { data: membership, error } = await supabase
    .from("classroom_memberships")
    .update({ role: newRole })
    .eq("classroom_id", classroomId)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) {
    console.error("Error updating user role:", error);
    throw new Error(`Failed to update role: ${error.message}`);
  }

  if (!membership) {
    throw new Error("User is not a member of this classroom");
  }

  return membership;
};

/**
 * Get user's role in a classroom
 */
export const getUserRoleInClassroom = async (
  classroomId: string,
  userId?: string
): Promise<"student" | "ta" | "instructor" | null> => {
  const supabase = createClient();

  let targetUserId = userId;
  if (!targetUserId) {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return null;
    }
    targetUserId = user.id;
  }

  // Check if user is the instructor
  const { data: classroom, error: classroomError } = await supabase
    .from("classrooms")
    .select("instructor_id")
    .eq("id", classroomId)
    .single();

  if (
    !classroomError &&
    classroom &&
    classroom.instructor_id === targetUserId
  ) {
    return "instructor";
  }

  // Check membership table
  const { data: membership, error: membershipError } = await supabase
    .from("classroom_memberships")
    .select("role")
    .eq("classroom_id", classroomId)
    .eq("user_id", targetUserId)
    .single();

  if (membershipError || !membership) {
    return null;
  }

  return membership.role as "student" | "ta" | "instructor";
};

/**
 * Check if user is a member of a classroom
 */
export const isClassroomMember = async (
  classroomId: string,
  userId?: string
): Promise<boolean> => {
  const role = await getUserRoleInClassroom(classroomId, userId);
  return role !== null;
};

/**
 * Get all classrooms a user is a member of (with role info)
 */
export const getUserClassrooms = async (
  userId?: string
): Promise<(ClassroomMembership & { classrooms: any })[]> => {
  const supabase = createClient();

  let targetUserId = userId;
  if (!targetUserId) {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error("User must be authenticated");
    }
    targetUserId = user.id;
  }

  // Get memberships
  const { data: memberships, error: membershipError } = await supabase
    .from("classroom_memberships")
    .select(
      `
      *,
      classrooms (
        *
      )
    `
    )
    .eq("user_id", targetUserId)
    .order("joined_at", { ascending: false });

  if (membershipError) {
    console.error("Error fetching user classrooms:", membershipError);
    throw new Error(`Failed to fetch classrooms: ${membershipError.message}`);
  }

  // Also get classrooms where user is instructor
  const { data: instructorClassrooms, error: instructorError } = await supabase
    .from("classrooms")
    .select("*")
    .eq("instructor_id", targetUserId);

  if (instructorError) {
    console.error("Error fetching instructor classrooms:", instructorError);
    throw new Error(
      `Failed to fetch instructor classrooms: ${instructorError.message}`
    );
  }

  // Convert instructor classrooms to membership format
  const instructorMemberships =
    instructorClassrooms?.map((classroom) => ({
      id: `instructor_${classroom.id}`,
      classroom_id: classroom.id,
      user_id: targetUserId!,
      role: "instructor" as const,
      joined_at: classroom.created_at,
      classrooms: classroom,
    })) || [];

  // Combine and deduplicate
  const allMemberships = [...(memberships || []), ...instructorMemberships];
  const uniqueMemberships = allMemberships.filter(
    (membership, index, array) =>
      array.findIndex((m) => m.classroom_id === membership.classroom_id) ===
      index
  );

  return uniqueMemberships;
};

/**
 * Server-side versions for API routes
 */

/**
 * Server-side version of getClassroomMembers
 */
export const getClassroomMembersServer = async (
  classroomId: string
): Promise<(ClassroomMembership & { profiles: any })[]> => {
  const supabase = await createServerClient();

  const { data: members, error } = await supabase
    .from("classroom_memberships")
    .select(
      `
      *,
      profiles (
        id,
        username,
        full_name,
        avatar_url,
        email
      )
    `
    )
    .eq("classroom_id", classroomId)
    .order("joined_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch members: ${error.message}`);
  }

  return members || [];
};
