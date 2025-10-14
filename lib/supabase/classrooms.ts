import { createClient } from "@/utils/supabase/client";
// import { createClient as createServerClient } from "@/utils/supabase/server";
import {
  Classroom,
  ClassroomWithMembers,
  ClassroomWithAssignments,
  ClassroomMembership,
  CreateClassroomRequest,
  CreateClassroomResponse,
  JoinClassroomRequest,
  JoinClassroomResponse,
  ClassroomError,
  JoinCodeError,
  CLASSROOM_CONSTANTS,
  ClassroomMapWithDetails,
  AvailableMap,
  LinkMapToClassroomRequest,
  LinkMapToClassroomResponse,
  CreateAssignmentFromMapRequest,
  ClassroomExclusiveMap,
  CreateClassroomMapRequest,
  UpdateClassroomMapFeatureRequest,
  ClassroomMapFeature,
  ClassroomMapFeatureType,
} from "@/types/classroom";

/**
 * Generates a unique classroom join code
 */
export const generateUniqueJoinCode = async (): Promise<string> => {
  const supabase = createClient();
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    // Generate 6-character alphanumeric code
    const code = Math.random()
      .toString(36)
      .substring(2, 8)
      .toUpperCase()
      .replace(/[0O1IL]/g, () => {
        const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
        return chars[Math.floor(Math.random() * chars.length)];
      });

    console.log("Generated code:", code);
    // Check if code already exists - use count to avoid RLS policy issues
    const { count, error } = await supabase
      .from("classrooms")
      .select("*", { count: "exact", head: true })
      .eq("join_code", code);

    console.log("Join code check:", code, count, error);

    if (!error && count === 0) {
      // Code doesn't exist, we can use it
      return code.padEnd(6, "X").substring(0, 6);
    }

    attempts++;
  }

  throw new Error(
    "Failed to generate unique join code after multiple attempts"
  );
};

/**
 * Creates a new classroom and optionally links learning maps to it
 */
export const createClassroomWithMaps = async (
  data: CreateClassroomRequest & { selectedMapIds?: string[] }
) => {
  const supabase = createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new ClassroomError("AUTH_ERROR", "User must be authenticated");
  }

  // Note: Instructor role check will be handled by RLS policies on the database

  // Generate unique join code
  const joinCode = await generateUniqueJoinCode();

  // Create the classroom
  const { data: classroom, error: createError } = await supabase
    .from("classrooms")
    .insert({
      name: data.name,
      description: data.description || null,
      instructor_id: user.id,
      join_code: joinCode,
      max_students:
        data.max_students || CLASSROOM_CONSTANTS.DEFAULT_MAX_STUDENTS,
    })
    .select()
    .single();

  if (createError) {
    throw new ClassroomError("CREATE_FAILED", createError.message);
  }

  // Add instructor as member
  const { error: membershipError } = await supabase
    .from("classroom_memberships")
    .insert({
      classroom_id: classroom.id,
      user_id: user.id,
      role: "instructor",
    });

  if (membershipError) {
    // Rollback classroom creation if membership fails
    await supabase.from("classrooms").delete().eq("id", classroom.id);
    throw new ClassroomError("MEMBERSHIP_FAILED", membershipError.message);
  }

  // Link selected maps if any
  let linkedMapsCount = 0;
  if (data.selectedMapIds && data.selectedMapIds.length > 0) {
    try {
      const mapLinks = data.selectedMapIds.map((mapId, index) => ({
        classroom_id: classroom.id,
        map_id: mapId,
        added_by: user.id,
        display_order: index + 1,
        notes: `Linked during classroom creation`,
      }));

      const { error: linkError } = await supabase
        .from("classroom_maps")
        .insert(mapLinks);

      if (linkError) {
        console.warn("Failed to link some maps:", linkError.message);
        // Don't fail the whole operation, just log the warning
      } else {
        linkedMapsCount = mapLinks.length;
      }
    } catch (error) {
      console.warn("Failed to link maps during classroom creation:", error);
      // Don't fail the whole operation
    }
  }

  return {
    classroom,
    join_code: joinCode,
    linked_maps_count: linkedMapsCount,
  };
};

/**
 * Creates a new classroom (original function without map linking)
 */
export const createClassroom = async (
  data: CreateClassroomRequest
): Promise<CreateClassroomResponse> => {
  const supabase = createClient();

  // Get current user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new ClassroomError("AUTH_ERROR", "User must be authenticated");
  }

  // Verify user has instructor role
  const { data: userRoles, error: roleError } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .in("role", ["instructor", "TA"]);

  if (roleError || !userRoles || userRoles.length === 0) {
    throw new ClassroomError(
      "INSUFFICIENT_PERMISSIONS",
      "User must have instructor or TA role to create classrooms"
    );
  }

  // Generate unique join code
  const joinCode = await generateUniqueJoinCode();

  // Create classroom
  const { data: classroom, error: createError } = await supabase
    .from("classrooms")
    .insert({
      name: data.name,
      description: data.description || null,
      instructor_id: user.id,
      join_code: joinCode,
      max_students:
        data.max_students || CLASSROOM_CONSTANTS.DEFAULT_MAX_STUDENTS,
    })
    .select()
    .single();

  if (createError) {
    throw new ClassroomError("CREATE_FAILED", createError.message);
  }

  // Add instructor as member
  const { error: membershipError } = await supabase
    .from("classroom_memberships")
    .insert({
      classroom_id: classroom.id,
      user_id: user.id,
      role: "instructor",
    });

  if (membershipError) {
    // Rollback classroom creation if membership fails
    await supabase.from("classrooms").delete().eq("id", classroom.id);
    throw new ClassroomError("MEMBERSHIP_FAILED", membershipError.message);
  }

  return {
    classroom,
    join_code: joinCode,
  };
};

/**
 * Gets all classrooms for the current instructor
 */
export const getInstructorClassrooms = async (): Promise<
  (ClassroomWithAssignments & { member_count: number; student_count: number })[]
> => {
  const supabase = createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new ClassroomError("AUTH_ERROR", "User must be authenticated");
  }

  const { data, error } = await supabase
    .from("classrooms")
    .select(
      `
      *,
      classroom_assignments (
        id,
        title,
        is_active,
        created_at,
        default_due_date
      ),
      classroom_memberships (
        id,
        role
      )
    `
    )
    .eq("instructor_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    throw new ClassroomError("FETCH_FAILED", error.message);
  }

  return data.map((classroom: any) => ({
    ...classroom,
    assignments: classroom.classroom_assignments || [],
    assignment_count: classroom.classroom_assignments?.length || 0,
    active_assignment_count:
      classroom.classroom_assignments?.filter((a: any) => a.is_active).length ||
      0,
    member_count: classroom.classroom_memberships?.length || 0,
    student_count:
      classroom.classroom_memberships?.filter((m: any) => m.role === "student")
        .length || 0,
  }));
};

/**
 * Gets a classroom by ID with members
 */
export const getClassroomById = async (
  id: string
): Promise<ClassroomWithMembers> => {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("classrooms")
    .select(
      `
      *,
      classroom_memberships (
        *,
        profiles (
          id,
          username,
          full_name,
          avatar_url
        )
      )
    `
    )
    .eq("id", id)
    .single();

  if (error) {
    throw new ClassroomError("FETCH_FAILED", error.message);
  }

  const members = data.classroom_memberships || [];

  return {
    ...data,
    members,
    member_count: members.length,
    student_count: members.filter((m: any) => m.role === "student").length,
  };
};

/**
 * Updates a classroom
 */
export const updateClassroom = async (
  id: string,
  updates: Partial<
    Pick<Classroom, "name" | "description" | "max_students" | "is_active">
  >
): Promise<Classroom> => {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("classrooms")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new ClassroomError("UPDATE_FAILED", error.message);
  }

  return data;
};

/**
 * Deletes a classroom
 */
export const deleteClassroom = async (id: string): Promise<void> => {
  const supabase = createClient();

  const { error } = await supabase.from("classrooms").delete().eq("id", id);

  if (error) {
    throw new ClassroomError("DELETE_FAILED", error.message);
  }
};

/**
 * Allows a student to join a classroom using a join code
 */
export const joinClassroomByCode = async (
  joinCode: string
): Promise<JoinClassroomResponse> => {
  const supabase = createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new JoinCodeError("INVALID_CODE", "User must be authenticated");
  }

  // Find classroom by join code
  const { data: classroom, error: classroomError } = await supabase
    .from("classrooms")
    .select("*")
    .eq("join_code", joinCode.toUpperCase())
    .eq("is_active", true)
    .single();

  if (classroomError) {
    throw new JoinCodeError("INVALID_CODE", "Invalid or expired join code");
  }

  // Check if user is already a member
  const { data: existingMembership, error: membershipCheckError } =
    await supabase
      .from("classroom_memberships")
      .select("id")
      .eq("classroom_id", classroom.id)
      .eq("user_id", user.id)
      .single();

  if (!membershipCheckError && existingMembership) {
    throw new JoinCodeError(
      "ALREADY_MEMBER",
      "You are already a member of this classroom"
    );
  }

  // Check if classroom is full
  const { count: memberCount, error: countError } = await supabase
    .from("classroom_memberships")
    .select("*", { count: "exact", head: true })
    .eq("classroom_id", classroom.id);

  if (countError) {
    throw new JoinCodeError(
      "INVALID_CODE",
      "Failed to check classroom capacity"
    );
  }

  if (memberCount && memberCount >= classroom.max_students) {
    throw new JoinCodeError("CLASSROOM_FULL", "This classroom is full");
  }

  // Add user as student member
  const { data: membership, error: joinError } = await supabase
    .from("classroom_memberships")
    .insert({
      classroom_id: classroom.id,
      user_id: user.id,
      role: "student",
    })
    .select()
    .single();

  if (joinError) {
    throw new JoinCodeError("INVALID_CODE", "Failed to join classroom");
  }

  return {
    classroom,
    membership,
  };
};

/**
 * Gets all classrooms the current user is a student in
 */
export const getStudentClassrooms = async (): Promise<Classroom[]> => {
  const supabase = createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new ClassroomError("AUTH_ERROR", "User must be authenticated");
  }

  const { data, error } = await supabase
    .from("classroom_memberships")
    .select(
      `
      classrooms (*)
    `
    )
    .eq("user_id", user.id)
    .eq("role", "student");

  if (error) {
    throw new ClassroomError("FETCH_FAILED", error.message);
  }

  return data
    .map((item: any) => item.classrooms)
    .filter(Boolean) as Classroom[];
};

/**
 * Removes a student from a classroom
 */
export const leaveClassroom = async (classroomId: string): Promise<void> => {
  const supabase = createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new ClassroomError("AUTH_ERROR", "User must be authenticated");
  }

  const { error } = await supabase
    .from("classroom_memberships")
    .delete()
    .eq("classroom_id", classroomId)
    .eq("user_id", user.id);

  if (error) {
    throw new ClassroomError("LEAVE_FAILED", error.message);
  }
};

/**
 * Gets all members of a classroom (instructor only)
 */
export const getClassroomMembers = async (
  classroomId: string
): Promise<(ClassroomMembership & { profiles: any })[]> => {
  const supabase = createClient();

  const { data, error } = await supabase
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
    throw new ClassroomError("FETCH_FAILED", error.message);
  }

  return data;
};

/**
 * Removes a student from a classroom (instructor only)
 */
export const removeClassroomMember = async (
  classroomId: string,
  userId: string
): Promise<void> => {
  const supabase = createClient();

  const { error } = await supabase
    .from("classroom_memberships")
    .delete()
    .eq("classroom_id", classroomId)
    .eq("user_id", userId);

  if (error) {
    throw new ClassroomError("REMOVE_FAILED", error.message);
  }
};

/**
 * Regenerates the join code for a classroom
 */
export const regenerateJoinCode = async (
  classroomId: string
): Promise<string> => {
  const supabase = createClient();

  const newJoinCode = await generateUniqueJoinCode();

  const { error } = await supabase
    .from("classrooms")
    .update({ join_code: newJoinCode })
    .eq("id", classroomId);

  if (error) {
    throw new ClassroomError("UPDATE_FAILED", error.message);
  }

  return newJoinCode;
};

/**
 * Server-side functions for API routes
 */

/**
 * Server-side version of getInstructorClassrooms
 */
// export const getInstructorClassroomsServer = async (): Promise<
//   ClassroomWithAssignments[]
// > => {
//   const supabase = await createServerClient();

//   const {
//     data: { user },
//     error: authError,
//   } = await supabase.auth.getUser();

//   if (authError || !user) {
//     throw new ClassroomError("AUTH_ERROR", "User must be authenticated");
//   }

//   const { data, error } = await supabase
//     .from("classrooms")
//     .select(
//       `
//       *,
//       classroom_assignments (
//         id,
//         title,
//         is_active,
//         created_at,
//         default_due_date
//       )
//     `
//     )
//     .eq("instructor_id", user.id)
//     .order("created_at", { ascending: false });

//   if (error) {
//     throw new ClassroomError("FETCH_FAILED", error.message);
//   }

//   return data.map((classroom: any) => ({
//     ...classroom,
//     assignments: classroom.classroom_assignments || [],
//     assignment_count: classroom.classroom_assignments?.length || 0,
//     active_assignment_count:
//       classroom.classroom_assignments?.filter((a: any) => a.is_active).length ||
//       0,
//   }));
// };

// ========================================
// CLASSROOM-MAP LINKING FUNCTIONS
// ========================================

/**
 * Get all maps linked to a classroom
 */
export const getClassroomMaps = async (classroomId: string) => {
  const supabase = createClient();

  const { data, error } = await supabase.rpc("get_classroom_maps", {
    classroom_uuid: classroomId,
  });

  if (error) {
    throw new ClassroomError(
      "FETCH_FAILED",
      `Failed to fetch classroom maps: ${error.message}`
    );
  }

  return data || [];
};

/**
 * Link a map to a classroom
 */
export const linkMapToClassroom = async (
  classroomId: string,
  mapId: string,
  notes?: string
) => {
  const supabase = createClient();

  const { data, error } = await supabase.rpc("link_map_to_classroom", {
    classroom_uuid: classroomId,
    map_uuid: mapId,
    notes_text: notes || null,
  });

  if (error) {
    throw new ClassroomError(
      "LINK_FAILED",
      `Failed to link map to classroom: ${error.message}`
    );
  }

  return data;
};

/**
 * Unlink a map from a classroom
 */
export const unlinkMapFromClassroom = async (
  classroomId: string,
  mapId: string
) => {
  const supabase = createClient();

  const { data, error } = await supabase.rpc("unlink_map_from_classroom", {
    classroom_uuid: classroomId,
    map_uuid: mapId,
  });

  if (error) {
    throw new ClassroomError(
      "UNLINK_FAILED",
      `Failed to unlink map from classroom: ${error.message}`
    );
  }

  return data;
};

/**
 * Get all available nodes from linked maps for assignment creation
 */
export const getClassroomAvailableNodes = async (classroomId: string) => {
  const supabase = createClient();

  const { data, error } = await supabase.rpc("get_classroom_available_nodes", {
    classroom_uuid: classroomId,
  });

  if (error) {
    throw new ClassroomError(
      "FETCH_FAILED",
      `Failed to fetch available nodes: ${error.message}`
    );
  }

  return data || [];
};

/**
 * Reorder linked maps in a classroom
 */
export const reorderClassroomMaps = async (
  classroomId: string,
  linkOrders: { link_id: string; order: number }[]
) => {
  const supabase = createClient();

  const { data, error } = await supabase.rpc("reorder_classroom_maps", {
    classroom_uuid: classroomId,
    link_orders: linkOrders,
  });

  if (error) {
    throw new ClassroomError(
      "REORDER_FAILED",
      `Failed to reorder classroom maps: ${error.message}`
    );
  }

  return data;
};

/**
 * Create assignment from a linked map
 */
export const createAssignmentFromMap = async (
  classroomId: string,
  mapId: string,
  title: string,
  description?: string,
  selectedNodeIds?: string[],
  autoEnroll: boolean = true
) => {
  const supabase = createClient();

  const { data, error } = await supabase.rpc("create_assignment_from_map", {
    classroom_uuid: classroomId,
    map_uuid: mapId,
    assignment_title: title,
    assignment_description: description || null,
    selected_node_ids: selectedNodeIds || null,
    auto_enroll: autoEnroll,
  });

  if (error) {
    throw new ClassroomError(
      "CREATE_FAILED",
      `Failed to create assignment from map: ${error.message}`
    );
  }

  return data;
};

/**
 * Get available maps that can be linked to a classroom
 * (maps not already linked to the classroom)
 */
/**
 * Gets all available learning maps that can be linked to classrooms
 */
export const getAvailableLearningMaps = async () => {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("learning_maps")
    .select(
      `
      id,
      title,
      description,
      category,
      difficulty,
      created_at,
      map_nodes!inner(id)
    `
    )
    .order("title");

  if (error) {
    throw new ClassroomError(
      "FETCH_FAILED",
      `Failed to fetch learning maps: ${error.message}`
    );
  }

  return (data || []).map((map: any) => ({
    id: map.id,
    title: map.title,
    description: map.description,
    category: map.category,
    difficulty: map.difficulty,
    node_count: map.map_nodes?.length || 0,
    created_at: map.created_at,
  }));
};

export const getAvailableMapsForClassroom = async (classroomId: string) => {
  const supabase = createClient();

  // First get maps already linked to this classroom
  const { data: linkedMaps, error: linkedError } = await supabase
    .from("classroom_maps")
    .select("map_id")
    .eq("classroom_id", classroomId)
    .eq("is_active", true);

  if (linkedError) {
    throw new ClassroomError(
      "FETCH_FAILED",
      `Failed to fetch linked maps: ${linkedError.message}`
    );
  }

  const linkedMapIds = linkedMaps?.map((link) => link.map_id) || [];

  // Get all available maps excluding already linked ones
  const query = supabase
    .from("learning_maps")
    .select(
      `
      id,
      title,
      description,
      creator_id,
      created_at,
      map_nodes!inner(id)
    `
    )
    .order("title");

  // Exclude already linked maps
  if (linkedMapIds.length > 0) {
    query.not("id", "in", `(${linkedMapIds.join(",")})`);
  }

  const { data, error } = await query;

  if (error) {
    throw new ClassroomError(
      "FETCH_FAILED",
      `Failed to fetch available maps: ${error.message}`
    );
  }

  return (
    data?.map((map: any) => ({
      ...map,
      node_count: map.map_nodes?.length || 0,
    })) || []
  );
};

// ========================================
// CLASSROOM-EXCLUSIVE MAPS FUNCTIONS
// ========================================

/**
 * Get all classroom-exclusive maps for a specific classroom
 */
export const getClassroomExclusiveMaps = async (
  classroomId: string
): Promise<ClassroomExclusiveMap[]> => {
  const supabase = createClient();

  try {
    // Try the RPC function first
    const { data, error } = await supabase.rpc("get_classroom_exclusive_maps", {
      classroom_uuid: classroomId,
    });

    if (error) {
      console.warn(
        "RPC function not available, falling back to direct query:",
        error.message
      );
      throw error;
    }

    return data || [];
  } catch (error) {
    // Fallback to direct query if RPC function doesn't exist
    console.log("📋 Using fallback query for classroom-exclusive maps");

    const { data: maps, error: queryError } = await supabase
      .from("learning_maps")
      .select(
        `
        id,
        title,
        description,
        creator_id,
        parent_classroom_id,
        map_type,
        created_at,
        updated_at,
        (SELECT COUNT(*) FROM map_nodes WHERE map_id = learning_maps.id) as node_count
      `
      )
      .eq("map_type", "classroom_exclusive")
      .eq("parent_classroom_id", classroomId)
      .order("created_at", { ascending: false });

    if (queryError) {
      throw new ClassroomError(
        "FETCH_FAILED",
        `Failed to fetch classroom-exclusive maps: ${queryError.message}`
      );
    }

    return (maps || []).map((map) => ({
      ...map,
      features: [], // Will be populated separately if needed
    }));
  }
};

/**
 * Create a new classroom-exclusive map
 */
export const createClassroomExclusiveMap = async (
  classroomId: string,
  mapData: CreateClassroomMapRequest
): Promise<ClassroomExclusiveMap> => {
  const supabase = createClient();

  const { data, error } = await supabase.rpc("create_classroom_exclusive_map", {
    classroom_uuid: classroomId,
    map_title: mapData.title,
    map_description: mapData.description || null,
  });

  if (error) {
    throw new ClassroomError(
      "CREATE_FAILED",
      `Failed to create classroom-exclusive map: ${error.message}`
    );
  }

  const newMap = data as ClassroomExclusiveMap;

  // Add initial features if specified
  if (mapData.initial_features && mapData.initial_features.length > 0) {
    for (const feature of mapData.initial_features) {
      try {
        await updateClassroomMapFeature(
          newMap.id,
          feature.feature_type,
          feature.feature_config,
          true
        );
      } catch (featureError) {
        console.warn(
          `Failed to add initial feature ${feature.feature_type}:`,
          featureError
        );
      }
    }
  }

  return newMap;
};

/**
 * Update or add a feature to a classroom-exclusive map
 */
export const updateClassroomMapFeature = async (
  mapId: string,
  featureType: ClassroomMapFeatureType,
  featureConfig: Record<string, any> = {},
  isEnabled: boolean = true
): Promise<ClassroomMapFeature> => {
  const supabase = createClient();

  const { data, error } = await supabase.rpc("update_classroom_map_feature", {
    map_uuid: mapId,
    feature_type_param: featureType,
    feature_config_param: featureConfig,
    is_enabled_param: isEnabled,
  });

  if (error) {
    throw new ClassroomError(
      "UPDATE_FAILED",
      `Failed to update classroom map feature: ${error.message}`
    );
  }

  return data;
};

/**
 * Get all features for a classroom-exclusive map
 */
export const getClassroomMapFeatures = async (
  mapId: string
): Promise<ClassroomMapFeature[]> => {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("classroom_map_features")
    .select("*")
    .eq("map_id", mapId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new ClassroomError(
      "FETCH_FAILED",
      `Failed to fetch classroom map features: ${error.message}`
    );
  }

  return data || [];
};

/**
 * Delete a classroom-exclusive map
 */
export const deleteClassroomExclusiveMap = async (
  mapId: string
): Promise<void> => {
  const supabase = createClient();

  // First verify this is a classroom-exclusive map that the user can delete
  const { data: map, error: mapError } = await supabase
    .from("learning_maps")
    .select("map_type, parent_classroom_id")
    .eq("id", mapId)
    .single();

  if (mapError) {
    throw new ClassroomError(
      "DELETE_FAILED",
      `Failed to verify map type: ${mapError.message}`
    );
  }

  if (map.map_type !== "classroom_exclusive") {
    throw new ClassroomError(
      "DELETE_FAILED",
      "Can only delete classroom-exclusive maps through this function"
    );
  }

  // Delete the map (features will be deleted via CASCADE)
  const { error: deleteError } = await supabase
    .from("learning_maps")
    .delete()
    .eq("id", mapId);

  if (deleteError) {
    throw new ClassroomError(
      "DELETE_FAILED",
      `Failed to delete classroom-exclusive map: ${deleteError.message}`
    );
  }
};

/**
 * Convert an existing map to classroom-exclusive
 */
export const convertMapToClassroomExclusive = async (
  mapId: string,
  classroomId: string
): Promise<ClassroomExclusiveMap> => {
  const supabase = createClient();

  // Verify user has permission to convert this map
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new ClassroomError("AUTH_ERROR", "User must be authenticated");
  }

  // Verify the map exists and user is the creator
  const { data: map, error: mapError } = await supabase
    .from("learning_maps")
    .select("*")
    .eq("id", mapId)
    .eq("creator_id", user.id)
    .single();

  if (mapError) {
    throw new ClassroomError(
      "CONVERT_FAILED",
      `Map not found or insufficient permissions: ${mapError.message}`
    );
  }

  if (map.map_type === "classroom_exclusive") {
    throw new ClassroomError(
      "CONVERT_FAILED",
      "Map is already classroom-exclusive"
    );
  }

  // Update the map to be classroom-exclusive
  const { data: updatedMap, error: updateError } = await supabase
    .from("learning_maps")
    .update({
      map_type: "classroom_exclusive",
      parent_classroom_id: classroomId,
      visibility: "private", // Classroom-exclusive maps are always private
    })
    .eq("id", mapId)
    .select()
    .single();

  if (updateError) {
    throw new ClassroomError(
      "CONVERT_FAILED",
      `Failed to convert map: ${updateError.message}`
    );
  }

  // Get node count for the response
  const { count: nodeCount } = await supabase
    .from("map_nodes")
    .select("*", { count: "exact", head: true })
    .eq("map_id", mapId);

  return {
    ...updatedMap,
    node_count: nodeCount || 0,
    features: [], // New classroom-exclusive map starts with no features
  };
};
