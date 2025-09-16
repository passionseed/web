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
  UserMapEnrollment,
} from "@/types/map";
import {
  dedupeRequest,
  createCacheKey,
} from "@/lib/utils/request-deduplication";

// Helper: classroom_teams may be returned as an object or an array depending on select syntax
export const extractClassroomTeamName = (
  classroomTeams: any
): string | null => {
  if (!classroomTeams) return null;
  if (Array.isArray(classroomTeams) && classroomTeams.length > 0) {
    return classroomTeams[0]?.name || null;
  }
  if (typeof classroomTeams === "object") {
    return classroomTeams.name || null;
  }
  return null;
};

export const extractClassroomTeamId = (classroomTeams: any): string | null => {
  if (!classroomTeams) return null;
  if (Array.isArray(classroomTeams) && classroomTeams.length > 0) {
    return classroomTeams[0]?.classroom_id || null;
  }
  if (typeof classroomTeams === "object") {
    return classroomTeams.classroom_id || null;
  }
  return null;
};

// A type for a map that includes its nodes and paths
export type FullLearningMap = LearningMap & {
  map_nodes: (MapNode & {
    node_paths_source: NodePath[];
    node_paths_destination: NodePath[];
    node_content: NodeContent[];
    node_assessments: (NodeAssessment & {
      quiz_questions: QuizQuestion[];
    })[];
  })[];
};

export const getMaps = async (): Promise<LearningMap[]> => {
  const supabase = createClient();

  // Check if user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let query = supabase.from("learning_maps").select("*");

  // Apply visibility filters based on authentication status
  if (!user) {
    // Unauthenticated users can only see public maps
    query = query.eq("visibility", "public");
  } else {
    // Authenticated users can see public maps and their own private/team maps
    query = query.or(`visibility.eq.public,creator_id.eq.${user.id}`);
  }

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching maps:", error);
    throw new Error("Could not fetch learning maps.");
  }

  return data || [];
};

// Enhanced function to get maps with detailed statistics and categorization
export const getMapsWithStats = async (): Promise<
  (LearningMap & {
    node_count: number;
    avg_difficulty: number;
    total_assessments: number;
    map_type: "personal" | "classroom" | "team" | "forked" | "public";
    isEnrolled: boolean;
    hasStarted: boolean;
    source_info?: {
      classroom_name?: string;
      team_name?: string;
      original_title?: string;
    };
  })[]
> => {
  const supabase = createClient();

  // Check if user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let baseQuery = `
      *,
      map_nodes (
        id,
        difficulty,
        node_assessments (id)
      )`;

  // Add enrollment data only for authenticated users
  if (user) {
    baseQuery += `,
      user_map_enrollments!left (
        enrolled_at,
        progress_percentage,
        completed_at,
        status
      )`;
  }

  let query = supabase.from("learning_maps").select(baseQuery);

  // Apply visibility filters based on authentication status
  if (!user) {
    // Unauthenticated users can only see public maps
    query = query.eq("visibility", "public");
  } else {
    // Authenticated users can see:
    // 1. Public maps
    // 2. Their own private maps
    // 3. Team maps if they're in the team (handled later in categorization)
    // 4. Classroom maps if they're enrolled (handled later in categorization)
    query = query
      .or(`visibility.eq.public,creator_id.eq.${user.id}`)
      .eq("user_map_enrollments.user_id", user.id);
  }

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching maps with stats:", error);
    throw new Error("Could not fetch learning maps.");
  }

  // Get additional data for authenticated users - OPTIMIZED with concurrent fetching
  let userClassrooms: any[] = [];
  let userTeams: any[] = [];
  let teamMaps: any[] = [];
  let additionalMaps: any[] = [];

  if (user) {
    console.log(
      `getMapsWithStats: Fetching data for authenticated user ${user.id}`
    );

    // OPTIMIZATION: Execute all initial queries concurrently
    const [
      userRolesResult,
      classroomMembershipsResult,
      teamMembershipsResult
    ] = await Promise.all([
      // Get user's roles for debugging
      supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id),
      
      // Get user's classrooms (as student or instructor)
      supabase
        .from("classroom_memberships")
        .select(
          `
          classroom_id,
          classrooms!inner (
            id,
            name,
            classroom_maps (
              map_id,
              learning_maps!inner (id, title)
            )
          )
        `
        )
        .eq("user_id", user.id),
      
      // Get user's teams
      supabase
        .from("team_memberships")
        .select(
          `
          team_id,
          left_at,
          is_leader,
          classroom_teams!inner (
            id,
            name,
            classroom_id
          )
        `
        )
        .eq("user_id", user.id)
    ]);

    const { data: userRoles } = userRolesResult;
    const { data: classroomMemberships } = classroomMembershipsResult;
    const { data: teamMemberships, error: teamMembershipError } = teamMembershipsResult;

    console.log(
      `User ${user.id} has roles:`,
      userRoles?.map((r) => r.role) || ["no explicit roles"]
    );

    if (classroomMemberships) {
      userClassrooms = classroomMemberships.flatMap(
        (m: any) =>
          m.classrooms.classroom_maps?.map((cm: any) => ({
            map_id: cm.map_id,
            classroom_name: m.classrooms.name,
          })) || []
      );
    }

    if (teamMembershipError) {
      console.error(
        `Error fetching team memberships for user ${user.id}:`,
        teamMembershipError
      );
    }

    if (teamMemberships) {
      userTeams = teamMemberships.map((tm) => ({
        team_id: tm.team_id,
        team_name: extractClassroomTeamName(tm.classroom_teams as any) || null,
        left_at: tm.left_at,
        is_leader: tm.is_leader,
      }));

      const activeTeams = userTeams.filter((t) => !t.left_at);
      console.log(
        `User ${user.id} has ${userTeams.length} team memberships (${activeTeams.length} active):`,
        activeTeams.map((t) => `${t.team_name} (${t.team_id})`)
      );
    } else {
      console.log(`User ${user.id} has no team memberships`);
    }

    // OPTIMIZATION: Prepare all remaining queries for concurrent execution
    const userTeamIds = userTeams.map((t) => t.team_id).filter(Boolean);
    const classroomMapIds = userClassrooms.map((cm) => cm.map_id);
    
    const pendingQueries = [];

    // Get team maps (only query if user has teams)
    if (userTeamIds.length > 0) {
      console.log(
        `Fetching team maps for user ${user.id}, team IDs: ${userTeamIds.join(", ")}`
      );

      pendingQueries.push(
        supabase
          .from("classroom_team_maps")
          .select(
            `
            map_id,
            original_map_id,
            team_id,
            classroom_teams!inner (name),
            learning_maps!map_id!inner (title),
            original_maps:learning_maps!original_map_id (title)
          `
          )
          .in("team_id", userTeamIds)
          .then(({ data: teamMapData, error: teamMapError }) => {
            if (teamMapError) {
              console.error("Error fetching classroom_team_maps:", {
                error: teamMapError,
                message: teamMapError.message,
                code: teamMapError.code,
                details: teamMapError.details,
                hint: teamMapError.hint,
                userId: user.id,
                userTeamIds: userTeamIds,
              });

              // Try a fallback query with left joins to get partial data
              console.log("Attempting fallback query for team maps...");
              return supabase
                .from("classroom_team_maps")
                .select(
                  `
                  map_id,
                  original_map_id,
                  team_id,
                  classroom_teams (name),
                  learning_maps!map_id_fkey (title),
                  original_maps:learning_maps!original_map_id_fkey (title)
                `
                )
                .in("team_id", userTeamIds)
                .then(({ data: fallbackTeamMapData, error: fallbackError }) => {
                  if (fallbackError) {
                    console.error("Fallback query also failed:", fallbackError);
                    return []; // Set empty array as final fallback
                  } else {
                    console.log(
                      `Fallback query succeeded, found ${fallbackTeamMapData?.length || 0} team maps`
                    );
                    return fallbackTeamMapData || [];
                  }
                });
            } else if (teamMapData) {
              console.log(`Successfully fetched ${teamMapData.length} team maps`);
              return teamMapData;
            }
            return [];
          })
      );
    } else {
      // No teams for user - nothing to fetch
      console.log(`User ${user.id} has no teams, skipping team map fetch`);
      pendingQueries.push(Promise.resolve([]));
    }

    // Execute team maps query and wait for result to get team map IDs for additional queries
    const [teamMapResult] = await Promise.all(pendingQueries);
    teamMaps = teamMapResult;

    // OPTIMIZATION: Now execute remaining queries concurrently
    const teamMapIds = teamMaps.map((tm) => tm.map_id);
    const additionalQueries = [];

    // Fetch additional team maps that user has access to
    if (teamMapIds.length > 0) {
      additionalQueries.push(
        supabase
          .from("learning_maps")
          .select(
            `
            *,
            map_nodes (
              id,
              difficulty,
              node_assessments (id)
            ),
            user_map_enrollments!left (
              enrolled_at,
              progress_percentage,
              completed_at
            )
          `
          )
          .in("id", teamMapIds)
          .not("creator_id", "eq", user.id) // Exclude maps the user already owns
          .eq("user_map_enrollments.user_id", user.id)
          .then(({ data }) => ({ type: 'team', data: data || [] }))
      );
    } else {
      additionalQueries.push(Promise.resolve({ type: 'team', data: [] }));
    }

    // Fetch classroom maps that user has access to
    if (classroomMapIds.length > 0) {
      additionalQueries.push(
        supabase
          .from("learning_maps")
          .select(
            `
            *,
            map_nodes (
              id,
              difficulty,
              node_assessments (id)
            ),
            user_map_enrollments!left (
              enrolled_at,
              progress_percentage,
              completed_at
            )
          `
          )
          .in("id", classroomMapIds)
          .not("creator_id", "eq", user.id) // Exclude maps the user already owns
          .eq("user_map_enrollments.user_id", user.id)
          .then(({ data }) => ({ type: 'classroom', data: data || [] }))
      );
    } else {
      additionalQueries.push(Promise.resolve({ type: 'classroom', data: [] }));
    }

    // Execute additional map queries concurrently
    const additionalResults = await Promise.all(additionalQueries);
    
    // Combine results
    additionalResults.forEach(result => {
      if (result.data && result.data.length > 0) {
        additionalMaps = additionalMaps.concat(result.data);
      }
    });
  }

  // Combine all maps and remove duplicates
  const allMaps = [...(data || []), ...additionalMaps];
  const uniqueMaps = allMaps.filter(
    (map, index, self) => index === self.findIndex((m) => m.id === map.id)
  );

  // Transform data to include calculated statistics and categorization
  const mapsWithStats = uniqueMaps
    .filter((map: any) => map && map.id && map.title) // Filter out null/invalid maps
    .map((map: any) => {
      const nodes = map.map_nodes || [];
      const nodeCount = nodes.length;
      const avgDifficulty =
        nodeCount > 0
          ? Math.round(
              nodes.reduce(
                (sum: number, node: any) => sum + (node.difficulty || 1),
                0
              ) / nodeCount
            )
          : 1;
      const totalAssessments = nodes.reduce(
        (sum: number, node: any) => sum + (node.node_assessments?.length || 0),
        0
      );

      // Determine map type and source info
      let mapType: "personal" | "classroom" | "team" | "forked" | "public" =
        "public";
      const sourceInfo: any = {};

      if (user) {
        // Check if it's the user's own map
        if (map.creator_id === user.id) {
          if (map.metadata?.forked_from) {
            mapType = "forked";
            sourceInfo.original_title = "Original Map"; // You might want to fetch this
          } else {
            mapType = "personal";
          }
        } else {
          // Check if it's a classroom map
          const classroomInfo = userClassrooms.find((c) => c.map_id === map.id);
          if (classroomInfo) {
            mapType = "classroom";
            sourceInfo.classroom_name = classroomInfo.classroom_name;
          } else {
            // Check if it's a team map
            const teamInfo = teamMaps.find((tm) => tm.map_id === map.id);
            if (teamInfo) {
              mapType = "team";
              sourceInfo.team_name = teamInfo.classroom_teams.name;
              sourceInfo.original_title = teamInfo.original_maps?.title;
            }
          }
        }
      }

      // Extract enrollment information (only available for authenticated users)
      const enrollment =
        user && Array.isArray(map.user_map_enrollments)
          ? map.user_map_enrollments[0]
          : user && map.user_map_enrollments;

      const isEnrolled = !!enrollment?.enrolled_at;
      const hasStarted =
        !!enrollment &&
        ((enrollment.progress_percentage &&
          enrollment.progress_percentage > 0) ||
          enrollment.status === "completed");

      return {
        id: map.id,
        title: map.title,
        description: map.description,
        creator_id: map.creator_id,
        difficulty: map.difficulty,
        category: map.category,
        total_students: map.total_students,
        finished_students: map.finished_students,
        metadata: map.metadata,
        visibility: map.visibility,
        created_at: map.created_at,
        updated_at: map.updated_at,
        node_count: nodeCount,
        avg_difficulty: avgDifficulty,
        total_assessments: totalAssessments,
        map_type: mapType,
        source_info: sourceInfo,
        isEnrolled,
        hasStarted,
      };
    });

  return mapsWithStats;
};

// ==========================================
// 🔥 RADICAL NEW PAGINATED FUNCTIONS
// ==========================================

export interface PaginatedMapsResult {
  maps: (LearningMap & {
    node_count: number;
    avg_difficulty: number;
    total_assessments: number;
    map_type: "personal" | "classroom" | "team" | "forked" | "public";
    isEnrolled: boolean;
    hasStarted: boolean;
    source_info?: {
      classroom_name?: string;
      team_name?: string;
      original_title?: string;
    };
  })[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

/**
 * 🚀 FAST: Get paginated public maps only
 * Single optimized query, no complex joins
 */
export const getPublicMapsPaginated = async (
  page: number = 1,
  limit: number = 12
): Promise<PaginatedMapsResult> => {
  const supabase = createClient();
  const offset = (page - 1) * limit;

  // Get total count
  const { count: total } = await supabase
    .from("learning_maps")
    .select("*", { count: "exact", head: true })
    .eq("visibility", "public");

  // Get paginated maps with basic stats
  const { data: maps, error } = await supabase
    .from("learning_maps")
    .select(`
      *,
      map_nodes (
        id,
        difficulty,
        node_assessments (id)
      )
    `)
    .eq("visibility", "public")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error("Error fetching public maps:", error);
    throw new Error("Could not fetch public maps.");
  }

  const processedMaps = (maps || []).map((map: any) => {
    const nodes = map.map_nodes || [];
    const nodeCount = nodes.length;
    const avgDifficulty = nodeCount > 0
      ? Math.round(nodes.reduce((sum: number, node: any) => sum + (node.difficulty || 1), 0) / nodeCount)
      : 1;
    const totalAssessments = nodes.reduce((sum: number, node: any) => sum + (node.node_assessments?.length || 0), 0);

    return {
      ...map,
      node_count: nodeCount,
      avg_difficulty: avgDifficulty,
      total_assessments: totalAssessments,
      map_type: "public" as const,
      isEnrolled: false,
      hasStarted: false,
    };
  });

  return {
    maps: processedMaps,
    total: total || 0,
    page,
    limit,
    hasMore: offset + limit < (total || 0),
  };
};

/**
 * 🚀 FAST: Get user's personal maps only
 * No complex permission queries, just creator_id filter
 */
export const getUserPersonalMaps = async (
  page: number = 1,
  limit: number = 12
): Promise<PaginatedMapsResult> => {
  const supabase = createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { maps: [], total: 0, page, limit, hasMore: false };
  }

  const offset = (page - 1) * limit;

  // Get total count
  const { count: total } = await supabase
    .from("learning_maps")
    .select("*", { count: "exact", head: true })
    .eq("creator_id", user.id);

  // Get paginated personal maps
  const { data: maps, error } = await supabase
    .from("learning_maps")
    .select(`
      *,
      map_nodes (
        id,
        difficulty,
        node_assessments (id)
      )
    `)
    .eq("creator_id", user.id)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error("Error fetching personal maps:", error);
    throw new Error("Could not fetch personal maps.");
  }

  const processedMaps = (maps || []).map((map: any) => {
    const nodes = map.map_nodes || [];
    const nodeCount = nodes.length;
    const avgDifficulty = nodeCount > 0
      ? Math.round(nodes.reduce((sum: number, node: any) => sum + (node.difficulty || 1), 0) / nodeCount)
      : 1;
    const totalAssessments = nodes.reduce((sum: number, node: any) => sum + (node.node_assessments?.length || 0), 0);

    const mapType = map.metadata?.forked_from ? "forked" : "personal";

    return {
      ...map,
      node_count: nodeCount,
      avg_difficulty: avgDifficulty,
      total_assessments: totalAssessments,
      map_type: mapType as "personal" | "forked",
      isEnrolled: true, // User owns their maps
      hasStarted: false,
      source_info: mapType === "forked" ? { original_title: "Original Map" } : undefined,
    };
  });

  return {
    maps: processedMaps,
    total: total || 0,
    page,
    limit,
    hasMore: offset + limit < (total || 0),
  };
};

/**
 * 🚀 FAST: Get all maps paginated with lightweight permission check
 * Replaces the monster getMapsWithStats for /map page
 */
// Add type for paginated results
export interface PaginatedMapsResult {
  maps: MapWithStats[];
  total: number;
  hasMore: boolean;
  page: number;
}

// 🚀 CACHE: Simple in-memory cache for 5 minutes
const mapsCache = new Map<string, { data: PaginatedMapsResult; timestamp: number; }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export const getMapsPaginated = async (
  page: number = 1,
  limit: number = 12
): Promise<PaginatedMapsResult> => {
  const supabase = createClient();
  
  // Handle auth errors gracefully - treat as anonymous user if auth fails
  let user = null;
  try {
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    if (!authError) {
      user = authUser;
    }
  } catch (error) {
    console.warn("Auth check failed in getMapsPaginated, proceeding as anonymous:", error);
    user = null;
  }
  
  const offset = (page - 1) * limit;
  
  // 🚀 CACHE: Create cache key based on page, limit, and user status
  const cacheKey = `maps_${page}_${limit}_${user?.id || 'anonymous'}`;
  const cached = mapsCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log(`🚀 Cache hit for ${cacheKey}`);
    return cached.data;
  }

  // 🚀 OPTIMIZED: Select only essential fields, reduce data transfer by 90%
  let query = supabase
    .from("learning_maps")
    .select(`
      id,
      title,
      description,
      creator_id,
      difficulty,
      category,
      visibility,
      created_at,
      updated_at,
      cover_image_url,
      map_nodes!inner (
        id,
        difficulty
      )
    `);

  // Basic visibility filter
  if (!user) {
    query = query.eq("visibility", "public");
  } else {
    query = query.or(`visibility.eq.public,creator_id.eq.${user.id}`);
  }

  // 🚀 OPTIMIZED: Use count query with specific columns only
  let countQuery = supabase
    .from("learning_maps")
    .select("id", { count: "exact", head: true });

  if (!user) {
    countQuery = countQuery.eq("visibility", "public");
  } else {
    countQuery = countQuery.or(`visibility.eq.public,creator_id.eq.${user.id}`);
  }

  const [{ count: total }, { data: maps, error }] = await Promise.all([
    countQuery,
    query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)
  ]);

  if (error) {
    console.error("Error fetching paginated maps:", error);
    throw new Error("Could not fetch maps.");
  }

  // 🚀 FAST: Lightweight processing - no complex team/classroom queries
  const processedMaps = (maps || []).map((map: any) => {
    const nodes = map.map_nodes || [];
    const nodeCount = nodes.length;
    const avgDifficulty = nodeCount > 0
      ? Math.round(nodes.reduce((sum: number, node: any) => sum + (node.difficulty || 1), 0) / nodeCount)
      : 1;

    // Simple type determination
    let mapType: "personal" | "classroom" | "team" | "forked" | "public" = "public";
    if (user && map.creator_id === user.id) {
      mapType = map.metadata?.forked_from ? "forked" : "personal";
    }

    return {
      ...map,
      node_count: nodeCount,
      avg_difficulty: avgDifficulty,
      total_assessments: 0, // Skip assessment counting for performance
      map_type: mapType,
      isEnrolled: user ? map.creator_id === user.id : false,
      hasStarted: false,
      source_info: mapType === "forked" ? { original_title: "Original Map" } : undefined,
    };
  });

  const result = {
    maps: processedMaps,
    total: total || 0,
    page,
    hasMore: offset + limit < (total || 0),
  };
  
  // 🚀 CACHE: Store result for future requests
  mapsCache.set(cacheKey, { data: result, timestamp: Date.now() });
  console.log(`🚀 Cache miss, stored ${cacheKey}`);
  
  return result;
};

/**
 * 🚀 ULTRA FAST: Get user dashboard maps (enrolled + recent)
 * Optimized for dashboard widget - minimal data
 */
export const getUserDashboardMaps = async (limit: number = 6): Promise<{
  enrolled: any[];
  recent: any[];
}> => {
  const supabase = createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { enrolled: [], recent: [] };
  }

  // Get user's enrolled maps (fast query)
  const { data: enrolledMaps } = await supabase
    .from("user_map_enrollments")
    .select(`
      enrolled_at,
      progress_percentage,
      status,
      learning_maps (
        id,
        title,
        description,
        metadata
      )
    `)
    .eq("user_id", user.id)
    .order("enrolled_at", { ascending: false })
    .limit(limit);

  // Get recent public maps (super fast)
  const { data: recentMaps } = await supabase
    .from("learning_maps")
    .select("id, title, description, created_at, metadata")
    .eq("visibility", "public")
    .order("created_at", { ascending: false })
    .limit(limit);

  return {
    enrolled: enrolledMaps?.map(e => e.learning_maps).filter(Boolean) || [],
    recent: recentMaps || [],
  };
};

export const getMapWithNodes = async (
  id: string
): Promise<FullLearningMap | null> => {
  const cacheKey = createCacheKey("map-with-nodes", id);

  return dedupeRequest(cacheKey, async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("learning_maps")
      .select(
        `
            *,
            map_nodes (
                *,
                node_paths_source:node_paths!source_node_id(*),
                node_paths_destination:node_paths!destination_node_id(*),
                node_content (*),
                node_assessments (
                    *,
                    quiz_questions (*)
                )
            )
        `
      )
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error fetching map with nodes:", error);
      if (error.code === "PGRST116") return null;
      throw new Error("Could not fetch the learning map.");
    }

    return data as FullLearningMap;
  });
};

export const createMap = async (
  mapData: Pick<LearningMap, "title" | "description"> & { metadata?: any }
): Promise<LearningMap> => {
  const supabase = createClient();

  console.log("🔄 Starting map creation process...");
  console.log("📝 Map data:", JSON.stringify(mapData, null, 2));

  // Step 1: Get the current authenticated user with detailed logging
  console.log("🔐 Step 1: Checking authentication...");
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    console.error("❌ Authentication error details:");
    console.error("  Message:", authError.message);
    console.error("  Name:", authError.name);
    console.error("  Stack:", authError.stack);
    console.error("  Full error object:", authError);
    console.error(
      "  Error as JSON:",
      JSON.stringify(authError, Object.getOwnPropertyNames(authError))
    );
    throw new Error(`Authentication failed: ${authError.message}`);
  }

  if (!user) {
    console.error("❌ No authenticated user found");
    throw new Error("User must be authenticated to create a map");
  }

  console.log("✅ User authenticated successfully:", {
    id: user.id,
    email: user.email,
    email_confirmed_at: user.email_confirmed_at,
    created_at: user.created_at,
  });

  // Step 2: Verify user profile exists in profiles table
  console.log("👤 Step 2: Verifying user profile...");
  console.log(
    "🔍 DEBUG: Selecting correct columns: id, email, full_name, username"
  );
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, email, full_name, username")
    .eq("id", user.id)
    .single();

  if (profileError) {
    console.error("❌ Profile verification error details:");
    console.error("  Message:", profileError.message || "No message");
    console.error("  Code:", profileError.code || "No code");
    console.error("  Details:", profileError.details || "No details");
    console.error("  Hint:", profileError.hint || "No hint");
    console.error("  Full error object:", profileError);
    console.error(
      "  Error as JSON:",
      JSON.stringify(profileError, Object.getOwnPropertyNames(profileError))
    );
    throw new Error(
      `Profile verification failed: ${profileError.message} (Code: ${profileError.code}). User may not have completed profile setup.`
    );
  }

  if (!profile) {
    console.error("❌ No profile found for user:", user.id);
    throw new Error(
      "User profile not found. Please complete your profile setup first."
    );
  }

  console.log("✅ Profile verified successfully:", {
    id: profile.id,
    email: profile.email,
    full_name: profile.full_name,
    username: profile.username,
  });

  // Step 3: Attempt to create the map with detailed error reporting
  console.log("🗺️ Step 3: Creating map in database...");
  const mapPayload = { ...mapData, creator_id: user.id };
  console.log("📦 Map payload:", JSON.stringify(mapPayload, null, 2));

  const { data, error } = await supabase
    .from("learning_maps")
    .insert([mapPayload])
    .select()
    .single();

  if (error) {
    console.error("❌ Map creation error - FULL ERROR DETAILS:");
    console.error("  Message:", error.message || "No message");
    console.error("  Code:", error.code || "No code");
    console.error("  Details:", error.details || "No details");
    console.error("  Hint:", error.hint || "No hint");
    console.error("  Full error object:", error);
    console.error(
      "  Error as JSON:",
      JSON.stringify(error, Object.getOwnPropertyNames(error))
    );

    // Provide specific error messages based on error code
    let specificMessage = "Could not create the new map.";

    if (error.code === "23505") {
      specificMessage =
        "A map with this title already exists. Please choose a different title.";
    } else if (error.code === "23503") {
      specificMessage =
        "Foreign key constraint violation. User profile may be incomplete.";
    } else if (error.code === "42501") {
      specificMessage =
        "Permission denied. You may not have the required privileges to create maps.";
    } else if (error.code === "P0001") {
      specificMessage =
        "Database policy violation. Please check your permissions.";
    } else if (error.message.includes("RLS")) {
      specificMessage =
        "Row Level Security policy blocked this operation. Please contact support.";
    } else if (error.message.includes("permission")) {
      specificMessage =
        "Permission denied. You may not have the required role to create maps.";
    }

    throw new Error(`${specificMessage} (${error.code}: ${error.message})`);
  }

  if (!data) {
    console.error("❌ Map creation returned no data");
    throw new Error("Map creation failed: No data returned from database");
  }

  console.log("✅ Map created successfully:", {
    id: data.id,
    title: data.title,
    creator_id: data.creator_id,
    created_at: data.created_at,
  });

  return data;
};

export const updateMap = async (
  id: string,
  mapData: Partial<LearningMap>
): Promise<LearningMap> => {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("learning_maps")
    .update(mapData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating map:", error);
    throw new Error("Could not update the map.");
  }

  return data;
};

export const deleteMap = async (
  id: string,
  supabaseClient?: any
): Promise<void> => {
  const supabase = supabaseClient || createClient();

  console.log(
    `🔍 Using ${supabaseClient ? "server-side" : "client-side"} Supabase client for deletion`
  );

  try {
    console.log(`🗑️ Starting deletion of map ${id}`);

    // Get all node IDs for this map
    const { data: nodes, error: nodesError } = await supabase
      .from("map_nodes")
      .select("id")
      .eq("map_id", id);

    if (nodesError) {
      console.error("Error fetching map nodes:", nodesError);
      throw new Error(`Failed to fetch map nodes: ${nodesError.message}`);
    }

    if (!nodes || nodes.length === 0) {
      console.log("No nodes found for map, proceeding with map deletion only");
      const { error: mapError } = await supabase
        .from("learning_maps")
        .delete()
        .eq("id", id);

      if (mapError) {
        console.error("Error deleting map:", mapError);
        throw new Error(`Could not delete the map: ${mapError.message}`);
      }
      console.log("✅ Map deleted successfully (no nodes)");
      return;
    }

    const nodeIds = nodes.map((n) => n.id);
    console.log(`🔍 Found ${nodeIds.length} nodes to clean up`);

    // Step 1: Delete assessment submissions and grades
    console.log("🧹 Deleting assessment submissions and grades...");

    // First get all assessment IDs for these nodes
    const { data: assessments } = await supabase
      .from("node_assessments")
      .select("id")
      .in("node_id", nodeIds);

    if (assessments && assessments.length > 0) {
      const assessmentIds = assessments.map((a) => a.id);
      console.log(`Found ${assessmentIds.length} assessments to clean up`);

      // First get all submission IDs that need to be deleted
      const { data: submissionsToDelete, error: submissionFetchError } = await supabase
        .from("assessment_submissions")
        .select("id")
        .in("assessment_id", assessmentIds);

      if (submissionFetchError) {
        console.error("Error fetching submissions to delete:", submissionFetchError);
        // Continue anyway as this might not exist
      }

      const submissionIds = submissionsToDelete?.map(s => s.id) || [];
      
      // Delete submission grades first (has FK to assessment_submissions)
      if (submissionIds.length > 0) {
        const { error: gradesError } = await supabase
          .from("submission_grades")
          .delete()
          .in("submission_id", submissionIds);

        if (gradesError) {
          console.error("Error deleting submission grades:", gradesError);
          // Continue anyway as this might not exist
        }
      }

      // Delete assessment submissions using the submission IDs we already fetched
      if (submissionIds.length > 0) {
        const { error: submissionsError } = await supabase
          .from("assessment_submissions")
          .delete()
          .in("id", submissionIds);

        if (submissionsError) {
          console.error(
            "Error deleting assessment submissions:",
            submissionsError
          );
          // Continue anyway
        } else {
          console.log("✅ Assessment submissions deleted");
        }
      }

      console.log("✅ Assessment submissions and grades deleted");
    }

    // Step 2: Delete student progress data
    console.log("🧹 Deleting student progress data...");
    const { error: progressError } = await supabase
      .from("student_node_progress")
      .delete()
      .in("node_id", nodeIds);

    if (progressError) {
      console.error("Error deleting student progress:", progressError);
      // Continue anyway as this might not exist
    } else {
      console.log("✅ Student progress data deleted");
    }

    // Step 3: Delete node assessments
    console.log("🧹 Deleting node assessments...");
    const { error: assessmentsError } = await supabase
      .from("node_assessments")
      .delete()
      .in("node_id", nodeIds);

    if (assessmentsError) {
      console.error("Error deleting node assessments:", assessmentsError);
      // Continue anyway
    } else {
      console.log("✅ Node assessments deleted");
    }

    // Step 4: Delete node content
    console.log("🧹 Deleting node content...");
    const { error: contentError } = await supabase
      .from("node_content")
      .delete()
      .in("node_id", nodeIds);

    if (contentError) {
      console.error("Error deleting node content:", contentError);
      // Continue anyway
    } else {
      console.log("✅ Node content deleted");
    }

    // Step 5: Delete node paths (existing logic)
    console.log("🧹 Deleting node paths...");
    await supabase.from("node_paths").delete().in("source_node_id", nodeIds);
    await supabase
      .from("node_paths")
      .delete()
      .in("destination_node_id", nodeIds);
    console.log("✅ Node paths deleted");

    // Step 6: Delete map nodes
    console.log("🧹 Deleting map nodes...");
    const { error: nodesDeleteError } = await supabase
      .from("map_nodes")
      .delete()
      .in("id", nodeIds);

    if (nodesDeleteError) {
      console.error("Error deleting map nodes:", nodesDeleteError);
      throw new Error(
        `Failed to delete map nodes: ${nodesDeleteError.message}`
      );
    }
    console.log("✅ Map nodes deleted");

    // Step 7: Clean up additional references that might prevent map deletion
    console.log("🧹 Cleaning up additional references...");
    
    const additionalTables = [
      { table: 'user_map_enrollments', column: 'map_id' },
      { table: 'classroom_maps', column: 'map_id' },
      { table: 'classroom_team_maps', column: 'map_id' },
      { table: 'map_likes', column: 'map_id' },
      { table: 'map_comments', column: 'map_id' },
      { table: 'map_views', column: 'map_id' },
      { table: 'user_favorites', column: 'map_id' }
    ];

    for (const { table, column } of additionalTables) {
      try {
        const { error: cleanupError } = await supabase
          .from(table)
          .delete()
          .eq(column, id);

        if (cleanupError && cleanupError.code !== '42P01') { // Ignore "table doesn't exist" errors
          console.warn(`⚠️ Error cleaning up ${table}:`, cleanupError.message);
        } else if (!cleanupError) {
          console.log(`✅ Cleaned up references from ${table}`);
        }
      } catch (error) {
        console.warn(`⚠️ Could not clean up ${table} (table may not exist):`, error);
      }
    }

    // Step 8: Delete the learning map itself
    console.log("🧹 Deleting learning map...");
    const { error: mapError } = await supabase
      .from("learning_maps")
      .delete()
      .eq("id", id);

    if (mapError) {
      console.error("❌ Error deleting map:", {
        message: mapError.message,
        code: mapError.code,
        details: mapError.details,
        hint: mapError.hint
      });
      throw new Error(`Could not delete the map: ${mapError.message} (Code: ${mapError.code})`);
    }

    console.log("✅ Map deletion command completed");

    // Verify the map was actually deleted
    console.log("🔍 Verifying map deletion...");
    const { data: verificationData, error: verificationError } = await supabase
      .from("learning_maps")
      .select("id")
      .eq("id", id);

    if (verificationError) {
      console.warn(
        "⚠️ Could not verify deletion (query failed), but deletion commands completed:",
        verificationError
      );
    } else if (verificationData && verificationData.length > 0) {
      console.error("❌ CRITICAL: Map still exists after deletion commands!");
      console.error("❌ This suggests RLS policies or foreign key constraints are preventing deletion");
      
      // Let's check what might be referencing this map
      console.log("🔍 Checking for remaining references to this map...");
      
      // Check for any remaining foreign key references
      const tablesToCheck = [
        'user_map_enrollments',
        'classroom_maps', 
        'classroom_team_maps',
        'map_likes',
        'map_comments'
      ];
      
      for (const table of tablesToCheck) {
        try {
          const { data: refs, error: refError } = await supabase
            .from(table)
            .select("id")
            .eq("map_id", id)
            .limit(5);
          
          if (!refError && refs && refs.length > 0) {
            console.error(`❌ Found ${refs.length} references in ${table}:`, refs);
          }
        } catch (e) {
          console.log(`ℹ️ Could not check ${table} (table may not exist)`);
        }
      }
      
      throw new Error(
        "Map deletion failed - map still exists in database after deletion commands. Check foreign key constraints and RLS policies."
      );
    } else {
      console.log("✅ Deletion verified - map no longer exists in database");
    }

    console.log(`✅ Map ${id} and all related data deleted successfully`);
  } catch (error) {
    console.error(`❌ Error in deleteMap for ${id}:`, error);
    throw error instanceof Error
      ? error
      : new Error("Unknown error during map deletion");
  }
};

// --- Fork Map for Team Helper ---
export const forkMapForTeam = async (
  originalMapId: string,
  teamId: string,
  createdBy: string,
  adminClient?: any,
  teamData?: { id: string; classroom_id: string; name: string }
): Promise<{ team_map: any; map: LearningMap }> => {
  const supabase = adminClient || createClient();

  console.log("🔀 forkMapForTeam START", { originalMapId, teamId, createdBy });

  // 1) Verify original exists
  const original = await getMapWithNodes(originalMapId);
  if (!original) {
    throw new Error("ORIGINAL_NOT_FOUND");
  }

  // 2) Use provided team data or verify team exists and belongs to a classroom
  let team = teamData;
  if (!team) {
    const { data: teamFromDb, error: teamError } = await supabase
      .from("classroom_teams")
      .select("id, classroom_id, name")
      .eq("id", teamId)
      .single();

    if (teamError || !teamFromDb) {
      console.error("Team lookup failed", teamError);
      throw new Error("TEAM_NOT_FOUND_OR_NOT_IN_CLASSROOM");
    }
    team = teamFromDb;
  } else {
  }

  // 3) Prevent duplicate fork for same original map and team
  const { data: existing, error: existingErr } = await supabase
    .from("classroom_team_maps")
    .select("*")
    .eq("team_id", teamId)
    .eq("original_map_id", originalMapId)
    .single();

  if (existingErr == null && existing) {
    console.log("🔁 Existing fork found, returning it");
    // fetch the forked map as well
    const { data: forkedMap } = await supabase
      .from("learning_maps")
      .select("*")
      .eq("id", existing.map_id)
      .single();
    return { team_map: existing, map: forkedMap } as any;
  }

  // 4) Begin copy in a transaction-like sequence (Supabase doesn't expose transactions here, so perform carefully)
  try {
    // Create new map row with adjusted title
    const newTitle = `${original.title} (Team: ${team!.name})`;
    const { data: newMap, error: createMapErr } = await supabase
      .from("learning_maps")
      .insert([
        {
          title: newTitle,
          description: original.description,
          creator_id: createdBy,
          difficulty: original.difficulty,
          category: original.category,
          metadata: {
            ...original.metadata,
            forked_from: original.id,
          },
        },
      ])
      .select("*")
      .single();

    if (createMapErr || !newMap) {
      console.error("Failed to create forked map", createMapErr);
      throw new Error("COPY_FAILED");
    }

    const newMapId = newMap.id;
    console.log("🆕 Created forked map:", newMapId);

    // Copy nodes
    const oldNodes = original.map_nodes || [];
    const nodeIdMap = new Map<string, string>(); // oldId -> newId

    // Insert all nodes at once for better performance
    const nodesToInsert = oldNodes.map((node) => ({
      map_id: newMapId,
      title: node.title,
      instructions: node.instructions,
      difficulty: node.difficulty,
      sprite_url: node.sprite_url,
      metadata: node.metadata,
      node_type: node.node_type || "learning",
      version: node.version || 1,
      last_modified_by: createdBy,
    }));

    if (nodesToInsert.length > 0) {
      const { data: createdNodes, error: nodeErr } = await supabase
        .from("map_nodes")
        .insert(nodesToInsert)
        .select("*");

      if (nodeErr || !createdNodes) {
        console.error("Failed to create nodes", nodeErr);
        throw new Error("COPY_FAILED_NODE");
      }

      // Map old node IDs to new node IDs
      oldNodes.forEach((node, index) => {
        if (createdNodes[index]) {
          nodeIdMap.set(node.id, createdNodes[index].id);
        }
      });
    }

    console.log("✅ Nodes copied", nodeIdMap.size);

    // Copy paths (remap node ids)
    const allPaths: any[] = [];
    for (const node of oldNodes) {
      const srcPaths = node.node_paths_source || [];
      for (const p of srcPaths) {
        const newSource = nodeIdMap.get(p.source_node_id) || p.source_node_id;
        const newDest =
          nodeIdMap.get(p.destination_node_id) || p.destination_node_id;
        allPaths.push({
          source_node_id: newSource,
          destination_node_id: newDest,
        });
      }
    }

    if (allPaths.length > 0) {
      const { error: pathsErr } = await supabase
        .from("node_paths")
        .insert(allPaths);
      if (pathsErr) {
        console.error("Failed to insert paths", pathsErr);
        throw new Error("COPY_FAILED_PATHS");
      }
    }

    // Copy content and assessments
    for (const node of oldNodes) {
      const newNodeId = nodeIdMap.get(node.id);
      // content
      const contents = node.node_content || [];
      if (contents.length > 0) {
        const contentToInsert = contents.map((c) => ({
          node_id: newNodeId,
          content_type: c.content_type,
          content_url: c.content_url,
          content_body: c.content_body,
        }));
        const { error: contentErr } = await supabase
          .from("node_content")
          .insert(contentToInsert);
        if (contentErr) {
          console.error("Failed to copy node content", contentErr);
          throw new Error("COPY_FAILED_CONTENT");
        }
      }

      // assessments + quiz questions
      const assessments = node.node_assessments || [];
      const assessmentIdMap = new Map<string, string>(); // old assessment id -> new assessment id

      // Insert all assessments for this node
      const assessmentsToInsert = assessments.map((a) => ({
        node_id: newNodeId,
        assessment_type: a.assessment_type,
      }));

      if (assessmentsToInsert.length > 0) {
        const { data: createdAssessments, error: aErr } = await supabase
          .from("node_assessments")
          .insert(assessmentsToInsert)
          .select("*");

        if (aErr || !createdAssessments) {
          console.error("Failed to copy assessments", aErr);
          throw new Error("COPY_FAILED_ASSESSMENT");
        }

        // Map old assessment IDs to new ones
        assessments.forEach((a, index) => {
          if (createdAssessments[index]) {
            assessmentIdMap.set(a.id, createdAssessments[index].id);
          }
        });

        // Copy quiz questions for all assessments
        const allQuestionsToInsert: any[] = [];

        for (const a of assessments) {
          const questions = a.quiz_questions || [];
          const newAssessmentId = assessmentIdMap.get(a.id);

          if (newAssessmentId && questions.length > 0) {
            const questionsForThisAssessment = questions.map((q) => ({
              assessment_id: newAssessmentId,
              question_text: q.question_text,
              options: q.options,
              correct_option: q.correct_option,
            }));
            allQuestionsToInsert.push(...questionsForThisAssessment);
          }
        }

        if (allQuestionsToInsert.length > 0) {
          const { error: qErr } = await supabase
            .from("quiz_questions")
            .insert(allQuestionsToInsert);
          if (qErr) {
            console.error("Failed to copy quiz questions", qErr);
            throw new Error("COPY_FAILED_QUIZQUESTIONS");
          }
        }
      }
    }

    // 5) Insert classroom_team_maps row
    const { data: teamMapRow, error: tmErr } = await supabase
      .from("classroom_team_maps")
      .insert([
        {
          team_id: teamId,
          map_id: newMapId,
          original_map_id: original.id,
          created_by: createdBy,
          metadata: { forked_at: new Date().toISOString() },
        },
      ])
      .select("*")
      .single();

    if (tmErr || !teamMapRow) {
      console.error("Failed to insert classroom_team_maps row", tmErr);
      throw new Error("COPY_FAILED_TEAMMAP_INSERT");
    }

    console.log("🎉 Fork complete", { teamMapRow, newMap });
    return { team_map: teamMapRow, map: newMap } as any;
  } catch (err) {
    console.error("❌ forkMapForTeam failed", err);
    throw err;
  }
};

// --- Batch Save Functions ---

export interface BatchMapUpdate {
  map: Partial<LearningMap>;
  nodes: {
    create: Partial<MapNode>[];
    update: (Partial<MapNode> & { id: string })[];
    delete: string[];
  };
  paths: {
    create: { source_node_id: string; destination_node_id: string }[];
    delete: string[];
  };
  content: {
    create: Partial<NodeContent>[];
    update: (Partial<NodeContent> & { id: string })[];
    delete: string[];
  };
  assessments: {
    create: Partial<NodeAssessment>[];
    update: (Partial<NodeAssessment> & { id: string })[];
    delete: string[];
  };
  quizQuestions: {
    create: Partial<QuizQuestion>[];
    update: (Partial<QuizQuestion> & { id: string })[];
    delete: string[];
  };
}

export const batchUpdateMap = async (
  mapId: string,
  updates: BatchMapUpdate
): Promise<void> => {
  console.log("🔄 Starting batch update for map:", mapId);
  console.log("📦 Updates to apply:", JSON.stringify(updates, null, 2));

  const supabase = createClient();

  try {
    // Validate inputs
    if (!mapId) {
      throw new Error("Map ID is required");
    }

    if (!updates) {
      throw new Error("Updates object is required");
    }

    console.log("✅ Input validation passed");

    // 1. Update map metadata
    console.log("📝 Step 1: Updating map metadata...");
    if (Object.keys(updates.map).length > 0) {
      console.log("📝 Map changes to apply:", updates.map);
      const { error: mapError } = await supabase
        .from("learning_maps")
        .update(updates.map)
        .eq("id", mapId);

      if (mapError) {
        console.error("❌ Map update failed:", mapError);
        throw new Error(`Map update failed: ${mapError.message}`);
      }
      console.log("✅ Map metadata updated successfully");
    } else {
      console.log("ℹ️ No map metadata changes to apply");
    }

    // 2. Handle node deletions first (with proper cascade deletion)
    if (updates.nodes.delete.length > 0) {
      console.log("🗑️ Step 2: Handling node deletions with cascade...");

      for (const nodeId of updates.nodes.delete) {
        console.log(`🗑️ Deleting node ${nodeId} and all related data...`);

        // Get all assessments for this node first
        const { data: nodeAssessments, error: assessmentFetchError } =
          await supabase
            .from("node_assessments")
            .select("id")
            .eq("node_id", nodeId);

        if (assessmentFetchError) {
          console.error(
            "❌ Failed to fetch assessments for node:",
            assessmentFetchError
          );
          throw new Error(
            `Failed to fetch assessments for node ${nodeId}: ${assessmentFetchError.message}`
          );
        }

        const assessmentIds = nodeAssessments?.map((a) => a.id) || [];
        console.log(
          `📊 Found ${assessmentIds.length} assessments to delete for node ${nodeId}`
        );

        // Delete quiz questions for all assessments of this node
        if (assessmentIds.length > 0) {
          console.log("🗑️ Deleting quiz questions for node assessments...");
          const { error: quizDeleteError } = await supabase
            .from("quiz_questions")
            .delete()
            .in("assessment_id", assessmentIds);

          if (quizDeleteError) {
            console.error("❌ Quiz question deletion failed:", quizDeleteError);
            throw new Error(
              `Quiz question deletion failed: ${quizDeleteError.message}`
            );
          }
          console.log("✅ Quiz questions deleted");
        }

        // Get all submissions for assessments of this node
        const { data: submissions, error: submissionFetchError } =
          await supabase
            .from("assessment_submissions")
            .select("id")
            .in("assessment_id", assessmentIds);

        if (submissionFetchError) {
          console.error(
            "❌ Failed to fetch submissions:",
            submissionFetchError
          );
          // Don't throw here, continue with deletion
        }

        const submissionIds = submissions?.map((s) => s.id) || [];
        console.log(
          `📊 Found ${submissionIds.length} submissions to delete for node ${nodeId}`
        );

        // Delete submission grades
        if (submissionIds.length > 0) {
          console.log("🗑️ Deleting submission grades...");
          const { error: gradeDeleteError } = await supabase
            .from("submission_grades")
            .delete()
            .in("submission_id", submissionIds);

          if (gradeDeleteError) {
            console.error(
              "❌ Submission grade deletion failed:",
              gradeDeleteError
            );
            // Don't throw here, continue with deletion
          } else {
            console.log("✅ Submission grades deleted");
          }

          // Delete assessment submissions
          console.log("🗑️ Deleting assessment submissions...");
          const { error: submissionDeleteError } = await supabase
            .from("assessment_submissions")
            .delete()
            .in("id", submissionIds);

          if (submissionDeleteError) {
            console.error(
              "❌ Assessment submission deletion failed:",
              submissionDeleteError
            );
            // Don't throw here, continue with deletion
          } else {
            console.log("✅ Assessment submissions deleted");
          }
        }

        // Delete node assessments
        if (assessmentIds.length > 0) {
          console.log("🗑️ Deleting node assessments...");
          const { error: assessmentDeleteError } = await supabase
            .from("node_assessments")
            .delete()
            .in("id", assessmentIds);

          if (assessmentDeleteError) {
            console.error(
              "❌ Node assessment deletion failed:",
              assessmentDeleteError
            );
            throw new Error(
              `Node assessment deletion failed: ${assessmentDeleteError.message}`
            );
          }
          console.log("✅ Node assessments deleted");
        }

        // Delete node content
        console.log("🗑️ Deleting node content...");
        const { error: contentDeleteError } = await supabase
          .from("node_content")
          .delete()
          .eq("node_id", nodeId);

        if (contentDeleteError) {
          console.error("❌ Node content deletion failed:", contentDeleteError);
          // Don't throw here, continue with deletion
        } else {
          console.log("✅ Node content deleted");
        }

        // Delete student progress for this node
        console.log("🗑️ Deleting student progress...");
        const { error: progressDeleteError } = await supabase
          .from("student_node_progress")
          .delete()
          .eq("node_id", nodeId);

        if (progressDeleteError) {
          console.error(
            "❌ Student progress deletion failed:",
            progressDeleteError
          );
          // Don't throw here, continue with deletion
        } else {
          console.log("✅ Student progress deleted");
        }

        // Delete node leaderboard entries
        console.log("🗑️ Deleting leaderboard entries...");
        const { error: leaderboardDeleteError } = await supabase
          .from("node_leaderboard")
          .delete()
          .eq("node_id", nodeId);

        if (leaderboardDeleteError) {
          console.error(
            "❌ Leaderboard deletion failed:",
            leaderboardDeleteError
          );
          // Don't throw here, continue with deletion
        } else {
          console.log("✅ Leaderboard entries deleted");
        }

        // Delete paths connected to this node
        console.log("🗑️ Deleting paths connected to node...");
        const { error: pathDeleteError1 } = await supabase
          .from("node_paths")
          .delete()
          .eq("source_node_id", nodeId);

        const { error: pathDeleteError2 } = await supabase
          .from("node_paths")
          .delete()
          .eq("destination_node_id", nodeId);

        if (pathDeleteError1 || pathDeleteError2) {
          console.error(
            "❌ Path deletion failed:",
            pathDeleteError1 || pathDeleteError2
          );
          // Don't throw here, continue with deletion
        } else {
          console.log("✅ Paths deleted");
        }

        // Finally delete the node itself
        console.log("🗑️ Deleting the node itself...");
        const { error: nodeDeleteError } = await supabase
          .from("map_nodes")
          .delete()
          .eq("id", nodeId);

        if (nodeDeleteError) {
          console.error("❌ Node deletion failed:", nodeDeleteError);
          throw new Error(
            `Node deletion failed for ${nodeId}: ${nodeDeleteError.message}`
          );
        }
        console.log(`✅ Node ${nodeId} deleted successfully`);
      }
    }

    // 3. Delete operations for other entities (excluding nodes which are handled above)
    console.log("🗑️ Step 3: Performing other delete operations...");

    if (updates.quizQuestions.delete.length > 0) {
      console.log("🗑️ Deleting quiz questions:", updates.quizQuestions.delete);
      const { error } = await supabase
        .from("quiz_questions")
        .delete()
        .in("id", updates.quizQuestions.delete);
      if (error) {
        console.error("❌ Quiz question deletion failed:", error);
        throw new Error(`Quiz question deletion failed: ${error.message}`);
      }
      console.log("✅ Quiz questions deleted");
    }

    if (updates.assessments.delete.length > 0) {
      console.log("🗑️ Deleting assessments:", updates.assessments.delete);

      // First delete quiz questions for these assessments
      const { error: quizError } = await supabase
        .from("quiz_questions")
        .delete()
        .in("assessment_id", updates.assessments.delete);

      if (quizError) {
        console.error(
          "❌ Quiz question deletion for assessments failed:",
          quizError
        );
        // Continue anyway
      }

      // Then delete the assessments
      const { error } = await supabase
        .from("node_assessments")
        .delete()
        .in("id", updates.assessments.delete);
      if (error) {
        console.error("❌ Assessment deletion failed:", error);
        throw new Error(`Assessment deletion failed: ${error.message}`);
      }
      console.log("✅ Assessments deleted");
    }

    if (updates.content.delete.length > 0) {
      console.log("🗑️ Deleting content:", updates.content.delete);
      const { error } = await supabase
        .from("node_content")
        .delete()
        .in("id", updates.content.delete);
      if (error) {
        console.error("❌ Content deletion failed:", error);
        throw new Error(`Content deletion failed: ${error.message}`);
      }
      console.log("✅ Content deleted");
    }

    if (updates.paths.delete.length > 0) {
      console.log("🗑️ Deleting paths:", updates.paths.delete);
      const { error } = await supabase
        .from("node_paths")
        .delete()
        .in("id", updates.paths.delete);
      if (error) {
        console.error("❌ Path deletion failed:", error);
        throw new Error(`Path deletion failed: ${error.message}`);
      }
      console.log("✅ Paths deleted");
    }

    // 4. Create operations
    console.log("➕ Step 4: Performing create operations...");
    const createdNodeMap = new Map<string, string>(); // temp_id -> real_id
    const createdAssessmentMap = new Map<string, string>(); // temp_assessment_id -> real_id

    if (updates.nodes.create.length > 0) {
      console.log("➕ Creating nodes:", updates.nodes.create);
      const { data: createdNodes, error } = await supabase
        .from("map_nodes")
        .insert(updates.nodes.create)
        .select("*");

      if (error) {
        console.error("❌ Node creation failed:", error);
        throw new Error(`Node creation failed: ${error.message}`);
      }

      if (!createdNodes || createdNodes.length === 0) {
        console.error("❌ No nodes were created");
        throw new Error("Node creation returned no data");
      }

      console.log("✅ Nodes created:", createdNodes.length);
      console.log(
        "📊 Created nodes:",
        createdNodes.map((n) => ({ id: n.id, title: n.title }))
      );

      // FIXED: Map temp IDs to real IDs by matching properties in order
      createdNodes.forEach((createdNode, index) => {
        const originalNodeToCreate = updates.nodes.create[index];
        if (originalNodeToCreate) {
          // Find the original temp node from the client state by matching properties
          // This is a more robust approach than relying on titles alone
          const potentialTempIds = [
            `temp_node_${originalNodeToCreate.title}_${index}`,
            `temp_node_${index}`,
            // Try to extract from any metadata if available
            ...(originalNodeToCreate.metadata &&
            typeof originalNodeToCreate.metadata === "object" &&
            "temp_id" in originalNodeToCreate.metadata
              ? [originalNodeToCreate.metadata.temp_id]
              : []),
          ];

          // Also check all paths to find references to temp nodes
          const allPaths = [...updates.paths.create];
          const tempIdFromPaths = allPaths.find(
            (path) =>
              path.source_node_id?.startsWith("temp_node_") ||
              path.destination_node_id?.startsWith("temp_node_")
          );

          if (tempIdFromPaths) {
            // Extract temp IDs from path references
            const tempIds = [
              tempIdFromPaths.source_node_id,
              tempIdFromPaths.destination_node_id,
            ].filter((id) => id?.startsWith("temp_node_"));

            tempIds.forEach((tempId) => {
              if (tempId && !createdNodeMap.has(tempId)) {
                // Match by index if we can determine it
                const tempIndex = parseInt(tempId.split("_")[2]) || index;
                if (tempIndex === index) {
                  createdNodeMap.set(tempId, createdNode.id);
                  console.log(
                    `🔗 Mapped temp node ${tempId} to real node ${createdNode.id} (via path reference)`
                  );
                }
              }
            });
          }

          // Fallback: create a mapping based on creation order
          const fallbackTempId =
            `temp_node_${Date.now()}_${Math.random()}`.substring(0, 50); // Ensure reasonable length

          // Check if we already have a mapping for this node
          let tempIdFound = false;
          for (const [tempId, realId] of createdNodeMap.entries()) {
            if (realId === createdNode.id) {
              tempIdFound = true;
              break;
            }
          }

          if (!tempIdFound) {
            // Use a predictable temp ID pattern that the frontend can generate
            const predictableTempId = `temp_node_${originalNodeToCreate.title?.replace(/\s+/g, "_")}_${index}`;
            createdNodeMap.set(predictableTempId, createdNode.id);
            console.log(
              `🔗 Mapped predictable temp node ${predictableTempId} to real node ${createdNode.id}`
            );

            // Also map any title-based patterns
            potentialTempIds.forEach((potentialId) => {
              if (potentialId && !createdNodeMap.has(potentialId)) {
                createdNodeMap.set(potentialId, createdNode.id);
                console.log(
                  `🔗 Alternative mapping: ${potentialId} -> ${createdNode.id}`
                );
              }
            });
          }
        }
      });

      console.log("📋 Final node mapping:", Object.fromEntries(createdNodeMap));
    }

    if (updates.paths.create.length > 0) {
      console.log("➕ Creating paths:", updates.paths.create);

      // FIXED: Better temp node ID resolution for paths
      const pathsToCreate = updates.paths.create.map((path, index) => {
        let mappedSourceId = path.source_node_id;
        let mappedTargetId = path.destination_node_id;

        // Try direct mapping first
        if (createdNodeMap.has(path.source_node_id)) {
          mappedSourceId = createdNodeMap.get(path.source_node_id)!;
        } else if (path.source_node_id.startsWith("temp_node_")) {
          // Try to find by different patterns
          for (const [tempId, realId] of createdNodeMap.entries()) {
            if (
              tempId.includes(path.source_node_id.split("_")[2]) ||
              path.source_node_id.includes(tempId.split("_")[2])
            ) {
              mappedSourceId = realId;
              console.log(
                `🔍 Found source mapping via pattern: ${path.source_node_id} -> ${realId}`
              );
              break;
            }
          }

          // If still not found, this might be an existing node ID
          if (
            mappedSourceId === path.source_node_id &&
            path.source_node_id.startsWith("temp_node_")
          ) {
            console.error(
              `❌ Could not resolve temp source node ID: ${path.source_node_id}`
            );
            console.error(
              "Available mappings:",
              Object.fromEntries(createdNodeMap)
            );
            throw new Error(
              `Could not resolve temporary source node ID: ${path.source_node_id}`
            );
          }
        }

        if (createdNodeMap.has(path.destination_node_id)) {
          mappedTargetId = createdNodeMap.get(path.destination_node_id)!;
        } else if (path.destination_node_id.startsWith("temp_node_")) {
          // Try to find by different patterns
          for (const [tempId, realId] of createdNodeMap.entries()) {
            if (
              tempId.includes(path.destination_node_id.split("_")[2]) ||
              path.destination_node_id.includes(tempId.split("_")[2])
            ) {
              mappedTargetId = realId;
              console.log(
                `🔍 Found target mapping via pattern: ${path.destination_node_id} -> ${realId}`
              );
              break;
            }
          }

          // If still not found, this might be an existing node ID
          if (
            mappedTargetId === path.destination_node_id &&
            path.destination_node_id.startsWith("temp_node_")
          ) {
            console.error(
              `❌ Could not resolve temp destination node ID: ${path.destination_node_id}`
            );
            console.error(
              "Available mappings:",
              Object.fromEntries(createdNodeMap)
            );
            throw new Error(
              `Could not resolve temporary destination node ID: ${path.destination_node_id}`
            );
          }
        }

        const mappedPath = {
          source_node_id: mappedSourceId,
          destination_node_id: mappedTargetId,
        };

        console.log(`🔗 Path ${index} mapping:`, {
          original: path,
          mapped: mappedPath,
          sourceResolved: mappedSourceId !== path.source_node_id,
          targetResolved: mappedTargetId !== path.destination_node_id,
        });

        return mappedPath;
      });

      // Validate all paths have valid UUIDs before inserting
      const invalidPaths = pathsToCreate.filter(
        (path) =>
          path.source_node_id.startsWith("temp_") ||
          path.destination_node_id.startsWith("temp_")
      );

      if (invalidPaths.length > 0) {
        console.error("❌ Found paths with unresolved temp IDs:", invalidPaths);
        throw new Error(
          `Cannot create paths with temporary IDs: ${invalidPaths.map((p) => `${p.source_node_id} -> ${p.destination_node_id}`).join(", ")}`
        );
      }

      const { error } = await supabase.from("node_paths").insert(pathsToCreate);
      if (error) {
        console.error("❌ Path creation failed:", error);
        console.error("❌ Attempted to insert paths:", pathsToCreate);
        throw new Error(`Path creation failed: ${error.message}`);
      }
      console.log("✅ Paths created successfully");
    }

    if (updates.content.create.length > 0) {
      console.log("➕ Creating content:", updates.content.create);

      // Map temp node IDs to real IDs in content
      const contentToCreate = updates.content.create.map((content) => {
        const mappedContent = {
          ...content,
          node_id: createdNodeMap.get(content.node_id!) || content.node_id,
        };
        console.log("🔗 Content mapping:", {
          original: content,
          mapped: mappedContent,
        });
        return mappedContent;
      });

      const { error } = await supabase
        .from("node_content")
        .insert(contentToCreate);
      if (error) {
        console.error("❌ Content creation failed:", error);
        throw new Error(`Content creation failed: ${error.message}`);
      }
      console.log("✅ Content created");
    }

    if (updates.assessments.create.length > 0) {
      console.log("➕ Creating assessments:", updates.assessments.create);

      // Map temp node IDs to real IDs in assessments
      const assessmentsToCreate = updates.assessments.create.map(
        (assessment) => {
          const mappedAssessment = {
            ...assessment,
            node_id:
              createdNodeMap.get(assessment.node_id!) || assessment.node_id,
          };
          console.log("🔗 Assessment node mapping:", {
            original: assessment,
            mapped: mappedAssessment,
            nodeIdResolved: mappedAssessment.node_id !== assessment.node_id,
          });
          return mappedAssessment;
        }
      );

      // Validate all assessments have valid node IDs before inserting
      const invalidAssessments = assessmentsToCreate.filter((assessment) =>
        assessment.node_id?.startsWith("temp_")
      );

      if (invalidAssessments.length > 0) {
        console.error(
          "❌ Found assessments with unresolved temp node IDs:",
          invalidAssessments
        );
        console.error(
          "Available node mappings:",
          Object.fromEntries(createdNodeMap)
        );
        throw new Error(
          `Cannot create assessments with temporary node IDs: ${invalidAssessments.map((a) => a.node_id).join(", ")}`
        );
      }

      const { data: createdAssessments, error } = await supabase
        .from("node_assessments")
        .insert(assessmentsToCreate)
        .select("*");

      if (error) {
        console.error(
          "❌ Assessment creation failed:",
          JSON.stringify(error, null, 2)
        );
        throw new Error(`Assessment creation failed: ${error.message}`);
      }

      if (!createdAssessments || createdAssessments.length === 0) {
        console.error("❌ No assessments were created");
        throw new Error("Assessment creation returned no data");
      }

      console.log("✅ Assessments created:", createdAssessments.length);
      console.log(
        "📊 Created assessments:",
        createdAssessments.map((a) => ({
          id: a.id,
          node_id: a.node_id,
          type: a.assessment_type,
        }))
      );

      // Map temporary assessment IDs to real ones
      // First, collect all unique temp assessment IDs from quiz questions
      const tempAssessmentIds = [
        ...new Set(
          updates.quizQuestions.create
            .map((q) => q.assessment_id)
            .filter((id) => id?.startsWith("temp_assessment_"))
        ),
      ].filter(Boolean) as string[];

      console.log(
        "🔍 Found temp assessment IDs in quiz questions:",
        tempAssessmentIds
      );

      createdAssessments.forEach((createdAssessment, index) => {
        // Map each created assessment to its corresponding temp ID
        if (tempAssessmentIds[index]) {
          createdAssessmentMap.set(
            tempAssessmentIds[index],
            createdAssessment.id
          );
          console.log(
            `🔗 Mapped temp assessment ${tempAssessmentIds[index]} to real assessment ${createdAssessment.id}`
          );
        } else {
          // Fallback: create predictable mapping
          const originalAssessmentToCreate = updates.assessments.create[index];
          if (originalAssessmentToCreate) {
            const predictableTempId = `temp_assessment_${originalAssessmentToCreate.node_id}_${index}`;
            createdAssessmentMap.set(predictableTempId, createdAssessment.id);
            console.log(
              `🔗 Mapped predictable temp assessment ${predictableTempId} to real assessment ${createdAssessment.id}`
            );
          }
        }
      });

      console.log(
        "📋 Final assessment mapping:",
        Object.fromEntries(createdAssessmentMap)
      );
    }

    if (updates.quizQuestions.create.length > 0) {
      console.log("➕ Creating quiz questions:", updates.quizQuestions.create);

      // Map temp assessment IDs to real IDs in quiz questions
      const quizQuestionsToCreate = updates.quizQuestions.create.map(
        (question) => {
          const mappedQuestion = {
            ...question,
            assessment_id:
              createdAssessmentMap.get(question.assessment_id!) ||
              question.assessment_id,
          };
          console.log("🔗 Quiz question mapping:", {
            original: question,
            mapped: mappedQuestion,
            assessmentIdResolved:
              mappedQuestion.assessment_id !== question.assessment_id,
          });
          return mappedQuestion;
        }
      );

      // Validate all questions have valid assessment IDs before inserting
      const invalidQuestions = quizQuestionsToCreate.filter((question) =>
        question.assessment_id?.startsWith("temp_")
      );

      if (invalidQuestions.length > 0) {
        console.error(
          "❌ Found quiz questions with unresolved temp assessment IDs:",
          invalidQuestions
        );
        console.error(
          "Available assessment mappings:",
          Object.fromEntries(createdAssessmentMap)
        );
        throw new Error(
          `Cannot create quiz questions with temporary assessment IDs: ${invalidQuestions.map((q) => q.assessment_id).join(", ")}`
        );
      }

      const { error } = await supabase
        .from("quiz_questions")
        .insert(quizQuestionsToCreate);
      if (error) {
        console.error("❌ Quiz question creation failed:", error);
        console.error(
          "❌ Attempted to insert questions:",
          quizQuestionsToCreate
        );
        throw new Error(`Quiz question creation failed: ${error.message}`);
      }
      console.log("✅ Quiz questions created");
    }

    // 4. Update operations
    console.log("📝 Step 4: Performing update operations...");

    for (const node of updates.nodes.update) {
      console.log("📝 Updating node:", node.id);
      const { id, ...nodeData } = node;
      const { error } = await supabase
        .from("map_nodes")
        .update(nodeData)
        .eq("id", id);
      if (error) {
        console.error("❌ Node update failed:", error);
        throw new Error(`Node update failed for ${id}: ${error.message}`);
      }
    }
    if (updates.nodes.update.length > 0) {
      console.log("✅ Nodes updated:", updates.nodes.update.length);
    }

    for (const content of updates.content.update) {
      console.log("📝 Updating content:", content.id);
      const { id, ...contentData } = content;
      const { error } = await supabase
        .from("node_content")
        .update(contentData)
        .eq("id", id);
      if (error) {
        console.error("❌ Content update failed:", error);
        throw new Error(`Content update failed for ${id}: ${error.message}`);
      }
    }
    if (updates.content.update.length > 0) {
      console.log("✅ Content updated:", updates.content.update.length);
    }

    for (const assessment of updates.assessments.update) {
      console.log("📝 Updating assessment:", assessment.id);
      const { id, ...assessmentData } = assessment;
      const { error } = await supabase
        .from("node_assessments")
        .update(assessmentData)
        .eq("id", id);
      if (error) {
        console.error("❌ Assessment update failed:", error);
        throw new Error(`Assessment update failed for ${id}: ${error.message}`);
      }
    }
    if (updates.assessments.update.length > 0) {
      console.log("✅ Assessments updated:", updates.assessments.update.length);
    }

    for (const question of updates.quizQuestions.update) {
      console.log("📝 Updating quiz question:", question.id);
      const { id, ...questionData } = question;
      const { error } = await supabase
        .from("quiz_questions")
        .update(questionData)
        .eq("id", id);
      if (error) {
        console.error("❌ Quiz question update failed:", error);
        throw new Error(
          `Quiz question update failed for ${id}: ${error.message}`
        );
      }
    }
    if (updates.quizQuestions.update.length > 0) {
      console.log(
        "✅ Quiz questions updated:",
        updates.quizQuestions.update.length
      );
    }

    console.log("🎉 Batch update completed successfully!");
  } catch (error) {
    console.error("❌ Batch update failed:", error);
    console.error("❌ Error type:", typeof error);
    console.error("❌ Error details:", {
      name: (error as any)?.name,
      message: (error as any)?.message,
      stack: (error as any)?.stack,
    });

    if (error instanceof Error) {
      throw error;
    } else {
      throw new Error(`Batch update failed: ${String(error)}`);
    }
  }
};

// --- User Map Enrollment Functions moved to enrollment.ts ---

// --- Progress Calculation and Enrollment Functions moved to enrollment.ts ---
// Import from '@/lib/supabase/enrollment' for:
// - enrollUserInMap
// - isUserEnrolledInMap
// - getUserMapEnrollment
// - updateMapEnrollmentProgress
// - getUserEnrolledMapsWithProgress
// - getUserEnrolledMaps
//
//
// Import from '@/lib/supabase/progress' for:
// - loadMapProgress
// - calculateMapProgress

/**
 * Check if a map is a team map and get classroom information
 * Also checks if the current user is a member of a team that has access to this map
 * or if the user is an instructor/TA for the classroom
 */
export const getTeamMapClassroomInfo = async (
  mapId: string
): Promise<{
  isTeamMap: boolean;
  classroomId?: string;
  teamId?: string | null;
}> => {
  const supabase = createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return { isTeamMap: false };
  }

  console.log(
    `🔍 [getTeamMapClassroomInfo] Checking map ${mapId} for user ${user.id}`
  );

  // First check if this map exists in classroom_team_maps at all
  const { data: teamMapsRaw, error: teamMapsError } = await supabase
    .from("classroom_team_maps")
    .select(
      `
      team_id,
      map_id,
      classroom_teams!team_id (
        classroom_id,
        name
      )
    `
    )
    .eq("map_id", mapId);

  // Strongly type and map the returned rows for safer usage below
  type TeamMapRow = {
    team_id: string;
    map_id: string;
    classroom_teams?: {
      classroom_id: string;
      name: string; // team name (e.g. "bro")
    } | null;
  };

  const teamMaps: TeamMapRow[] = (teamMapsRaw || []) as unknown as TeamMapRow[];

  // Helper: classroom_teams may be returned as an object or an array depending on select syntax
  const extractClassroomTeamName = (
    classroomTeams: any
  ): string | undefined => {
    if (!classroomTeams) return undefined;
    // If it's an array, take first element
    if (Array.isArray(classroomTeams) && classroomTeams.length > 0) {
      return classroomTeams[0]?.name;
    }
    // If it's an object with name
    if (typeof classroomTeams === "object") {
      return classroomTeams.name;
    }
    return undefined;
  };

  if (teamMapsError) {
    console.error(
      `❌ [getTeamMapClassroomInfo] Error querying classroom_team_maps:`,
      teamMapsError
    );
    return { isTeamMap: false };
  }

  if (!teamMaps || teamMaps.length === 0) {
    console.log(`ℹ️ [getTeamMapClassroomInfo] Map ${mapId} is not a team map`);
    return { isTeamMap: false };
  }

  console.log(
    `🔍 [getTeamMapClassroomInfo] Found ${teamMaps.length} teams with access to map ${mapId}`
  );
  console.log(teamMaps, "team mapsxxx");

  // Get the classroom ID from the first team map (they should all be the same)
  const classroomId = teamMaps[0]?.classroom_teams?.classroom_id;
  if (!classroomId) {
    console.error(
      `❌ [getTeamMapClassroomInfo] Could not determine classroom ID for team map ${mapId}`
    );
    return { isTeamMap: false };
  }

  // Check if user is an instructor or TA for this classroom
  const { data: classroomRoleData, error: classroomRoleError } = await supabase
    .from("classroom_memberships")
    .select("role")
    .eq("classroom_id", classroomId)
    .eq("user_id", user.id)
    .single();

  const isClassroomInstructorOrTA =
    (!classroomRoleError &&
      classroomRoleData &&
      (classroomRoleData.role === "instructor" ||
        classroomRoleData.role === "ta")) ||
    (await checkIfUserIsClassroomInstructor(classroomId, user.id));

  // If user is an instructor or TA, they have access to all team maps in this classroom
  if (isClassroomInstructorOrTA) {
    console.log(
      `✅ [getTeamMapClassroomInfo] User ${user.id} is an instructor/TA for classroom ${classroomId}`
    );
    return {
      isTeamMap: true,
      classroomId: classroomId,
      teamId: null, // Instructors/TAs don't have a specific team ID
    };
  }

  // Now check if the current user is a member of any of these teams
  const teamIds = teamMaps.map((tm) => tm.team_id);
  const { data: userTeamMembership, error: membershipError } = await supabase
    .from("team_memberships")
    .select(
      `
      team_id,
      is_leader,
      left_at
    `
    )
    .eq("user_id", user.id)
    .in("team_id", teamIds)
    .is("left_at", null) // Only active memberships
    .single();

  if (membershipError || !userTeamMembership) {
    console.log(
      `ℹ️ [getTeamMapClassroomInfo] User ${user.id} is not a member of any team with access to map ${mapId}`
    );
    return { isTeamMap: false };
  }

  // Find the team map info for the user's team
  const userTeamMap = teamMaps.find(
    (tm) => tm.team_id === userTeamMembership.team_id
  );
  if (!userTeamMap) {
    console.error(
      `❌ [getTeamMapClassroomInfo] Could not find team map for user's team ${userTeamMembership.team_id}`
    );
    return { isTeamMap: false };
  }

  console.log(
    `✅ [getTeamMapClassroomInfo] User ${user.id} has access to team map ${mapId} via team ${userTeamMembership.team_id}`
  );

  return {
    isTeamMap: true,
    classroomId:
      extractClassroomTeamId(userTeamMap?.classroom_teams as any) || undefined,
    teamId: userTeamMembership.team_id,
  };
};

/**
 * Helper function to check if a user is the instructor of a classroom
 */
const checkIfUserIsClassroomInstructor = async (
  classroomId: string,
  userId: string
): Promise<boolean> => {
  const supabase = createClient();

  try {
    const { data: classroom, error } = await supabase
      .from("classrooms")
      .select("instructor_id")
      .eq("id", classroomId)
      .single();

    if (error) {
      console.error("Error checking classroom instructor:", error);
      return false;
    }

    return classroom?.instructor_id === userId;
  } catch (error) {
    console.error("Error in checkIfUserIsClassroomInstructor:", error);
    return false;
  }
};

/**
 * Get user's role in a classroom (client-side only version)
 */
export const getUserClassroomRoleClient = async (
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

// Team progress functions have been moved to @/lib/supabase/team-progress
// Import from there for: getTeamProgress, getTeamProgressForInstructor, etc.

// getTeamProgressForInstructor has been moved to @/lib/supabase/team-progress

/**
 * Get team ID for a user in a specific map
 */
export const getUserTeamForMap = async (
  mapId: string,
  userId?: string
): Promise<string | null> => {
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

  // Check if user is in a team for this map
  const { data: teamMap, error } = await supabase
    .from("classroom_team_maps")
    .select(
      `
      team_id,
      team_memberships!team_id (id)
    `
    )
    .eq("map_id", mapId)
    .eq("team_memberships.user_id", targetUserId)
    .is("team_memberships.left_at", null)
    .single();

  if (error || !teamMap) {
    return null;
  }

  return teamMap.team_id;
};

// assignTeamMemberToNode has been moved to @/lib/supabase/team-progress

// requestHelpForTeamNode has been moved to @/lib/supabase/team-progress

/**
 * Schedule a meeting for team help
 */
export const scheduleTeamMeeting = async (
  teamId: string,
  nodeId: string | null,
  scheduledBy: string,
  scheduledFor: string,
  duration: number,
  topic: string,
  description?: string,
  meetingLink?: string
): Promise<any> => {
  const supabase = createClient();

  const { data: meeting, error } = await supabase
    .from("team_meetings")
    .insert({
      team_id: teamId,
      node_id: nodeId,
      scheduled_by: scheduledBy,
      scheduled_for: scheduledFor,
      duration_minutes: duration,
      meeting_topic: topic,
      description: description,
      meeting_link: meetingLink,
    })
    .select()
    .single();

  if (error) {
    console.error("Error scheduling team meeting:", error);
    throw new Error(`Failed to schedule meeting: ${error.message}`);
  }

  // If meeting is for a specific node, link it to the node progress
  if (nodeId) {
    await supabase.from("team_node_progress").upsert(
      {
        team_id: teamId,
        node_id: nodeId,
        scheduled_meeting_id: meeting.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "team_id,node_id" }
    );
  }

  return meeting;
};

/**
 */
export const getTeamMeetings = async (
  teamId: string,
  includePast: boolean = false
): Promise<any[]> => {
  const supabase = createClient();

  let query = supabase
    .from("team_meetings")
    .select(
      `
      *,
      scheduled_by:profiles!scheduled_by(username, full_name),
      map_nodes:node_id(title)
    `
    )
    .eq("team_id", teamId)
    .order("scheduled_for", { ascending: true });

  if (!includePast) {
    query = query.gte("scheduled_for", new Date().toISOString());
  }

  const { data: meetings, error } = await query;

  if (error) {
    console.error("Error fetching team meetings:", error);
    return [];
  }

  return meetings || [];
};

// updateTeamNodeStatus has been moved to @/lib/supabase/team-progress
