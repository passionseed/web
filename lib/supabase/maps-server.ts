import { createClient } from "@/utils/supabase/server";
import { isInstructor } from "./roles";
import { FullLearningMap } from "./maps";
import { createCacheKey, dedupeRequest } from "../utils/request-deduplication";
import { LearningMap } from "@/types/map";

/**
 * Check if a specific user can edit a specific map (SERVER-SIDE ONLY)
 * Returns true if user is the creator OR has instructor role
 * This function should only be called from server components
 */
export const canUserEditMapServer = async (
  userId: string,
  mapId: string
): Promise<boolean> => {
  const supabase = await createClient();

  // Check if user is the creator of the map
  const { data: map, error: mapError } = await supabase
    .from("learning_maps")
    .select("creator_id")
    .eq("id", mapId)
    .single();

  if (mapError) {
    console.error("Error checking map creator:", mapError);
    return false;
  }

  // User is the creator
  if (map.creator_id === userId) {
    return true;
  }

  // Check if user has instructor role (fallback permission)
  try {
    const userIsInstructor = await isInstructor(userId);
    return userIsInstructor;
  } catch (error) {
    console.error("Error checking instructor role:", error);
    return false;
  }
};

export const getMapWithNodesServer = async (
  id: string
): Promise<FullLearningMap | null> => {
  const cacheKey = createCacheKey("map-with-nodes", id);

  return dedupeRequest(cacheKey, async () => {
    const supabase = await createClient();
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

// SERVER-SIDE optimized version of getMapsWithStats
export const getMapsWithStatsServer = async (
  page: number = 0,
  limit: number = 20
): Promise<{
  maps: (LearningMap & {
    node_count: number;
    avg_difficulty: number;
    total_assessments: number;
    map_type: "personal" | "classroom" | "team" | "forked" | "public";
    isEnrolled: boolean;
    hasStarted: boolean;
    // New image storage fields
    cover_image_url?: string;
    cover_image_blurhash?: string;
    cover_image_key?: string;
    cover_image_updated_at?: string;
  })[];
  total_count: number;
  has_more: boolean;
}> => {
  try {
    const supabase = await createClient();

    // Early database connectivity test
    console.log("SERVER: Testing database connectivity...");
    try {
      // Simple connectivity test - try to query the table
      await Promise.race([
        supabase.from('learning_maps').select('id').limit(1),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Database connection timeout')), 5000)
        )
      ]);
      console.log("SERVER: Database connectivity test passed");
    } catch (connectivityError) {
      console.error("SERVER: Database connectivity test failed:", {
        message: connectivityError instanceof Error ? connectivityError.message : String(connectivityError),
        type: typeof connectivityError
      });
      // Return empty result immediately if we can't connect
      return {
        maps: [],
        total_count: 0,
        has_more: false
      };
    }

    // Get authenticated user with error recovery
    let user = null;
    try {
      const authResult = await supabase.auth.getUser();
      user = authResult.data?.user || null;
      console.log("SERVER: getMapsWithStatsServer called with user:", user?.id || "anonymous");
    } catch (authError) {
      console.error("SERVER: Auth error, continuing as anonymous:", {
        message: authError instanceof Error ? authError.message : String(authError)
      });
      // Continue as anonymous user
    }

  // Simple query for server-side rendering - focus on public maps and user's own maps
  const offset = page * limit;

  // Get count first
  let countQuery = supabase
    .from("learning_maps")
    .select("id", { count: 'exact', head: true });

  if (!user) {
    countQuery = countQuery.eq("visibility", "public");
  } else {
    countQuery = countQuery.or(`visibility.eq.public,creator_id.eq.${user.id}`);
  }

  const { count: totalCount, error: countError } = await countQuery;

  if (countError) {
    // Enhanced error logging that captures all properties
    const errorInfo = {
      message: countError?.message || 'Unknown error',
      details: countError?.details || 'No details available', 
      code: countError?.code || 'No error code',
      hint: countError?.hint || 'No hint',
      // Capture all enumerable and non-enumerable properties
      allProperties: {} as Record<string, any>,
      errorType: typeof countError,
      isError: countError instanceof Error,
      stringified: String(countError)
    };
    
    // Try to get all properties including non-enumerable ones
    try {
      const propertyNames = Object.getOwnPropertyNames(countError || {});
      propertyNames.forEach(prop => {
        try {
          errorInfo.allProperties[prop] = (countError as any)?.[prop];
        } catch (e) {
          errorInfo.allProperties[prop] = `[Cannot access: ${e instanceof Error ? e.message : String(e)}]`;
        }
      });
    } catch (e) {
      errorInfo.allProperties = `[Error extracting properties: ${e instanceof Error ? e.message : String(e)}]` as any;
    }
    
    console.error("SERVER: Error getting count:", errorInfo);
    // Return empty result for permission/connection errors
    if (countError.code === '42501' || countError.message?.includes('permission denied')) {
      console.error("SERVER: Database permission issue detected, returning empty result");
      return {
        maps: [],
        total_count: 0,
        has_more: false
      };
    }
  }

  // Get maps data - simplified query without complex joins for better reliability
  console.log("SERVER: Fetching maps with simplified query...");
  let dataQuery = supabase
    .from("learning_maps")
    .select(`
      id,
      title,
      description,
      creator_id,
      difficulty,
      category,
      visibility,
      metadata,
      created_at,
      updated_at,
      total_students,
      finished_students,
      cover_image_url,
      cover_image_blurhash,
      cover_image_key,
      cover_image_updated_at
    `);

  if (!user) {
    dataQuery = dataQuery.eq("visibility", "public");
  } else {
    dataQuery = dataQuery.or(`visibility.eq.public,creator_id.eq.${user.id}`);
  }

  const { data, error } = await dataQuery
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    // Enhanced error logging that captures all properties
    const errorInfo = {
      message: error?.message || 'Unknown error',
      details: error?.details || 'No details available',
      code: error?.code || 'No error code',
      hint: error?.hint || 'No hint',
      // Capture all enumerable and non-enumerable properties
      allProperties: {} as Record<string, any>,
      errorType: typeof error,
      isError: error instanceof Error,
      stringified: String(error)
    };
    
    // Try to get all properties including non-enumerable ones
    try {
      const propertyNames = Object.getOwnPropertyNames(error || {});
      propertyNames.forEach(prop => {
        try {
          errorInfo.allProperties[prop] = (error as any)?.[prop];
        } catch (e) {
          errorInfo.allProperties[prop] = `[Cannot access: ${e instanceof Error ? e.message : String(e)}]`;
        }
      });
    } catch (e) {
      errorInfo.allProperties = `[Error extracting properties: ${e instanceof Error ? e.message : String(e)}]` as any;
    }
    
    console.error("SERVER: Error fetching maps:", errorInfo);
    // Return empty result for permission/connection errors instead of throwing
    if (error.code === '42501' || error.message?.includes('permission denied')) {
      console.error("SERVER: Database permission issue detected, returning empty result");
      return {
        maps: [],
        total_count: 0,
        has_more: false
      };
    }
    throw new Error("Could not fetch learning maps.");
  }

  // Transform data (simplified for server-side - no complex calculations)
  console.log("SERVER: Transforming", data?.length || 0, "maps for server-side rendering");
  const mapsWithStats = (data || []).map((map: any) => {
    try {
    // Use simple fallbacks for server-side rendering - client will load full data
    const nodeCount = 0; // Will be populated client-side
    const avgDifficulty = map.difficulty || 1; // Use map's difficulty as fallback
    const totalAssessments = 0; // Will be populated client-side

    // Determine map type (simplified for server-side)
    let mapType: "personal" | "classroom" | "team" | "forked" | "public" = "public";
    if (user && map.creator_id === user.id) {
      mapType = map.metadata?.forked_from ? "forked" : "personal";
    }

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
      // New image storage fields
      cover_image_url: map.cover_image_url,
      cover_image_blurhash: map.cover_image_blurhash,
      cover_image_key: map.cover_image_key,
      cover_image_updated_at: map.cover_image_updated_at,
      node_count: nodeCount,
      avg_difficulty: avgDifficulty,
      total_assessments: totalAssessments,
      map_type: mapType,
      isEnrolled: false, // Simplified for server-side
      hasStarted: false, // Simplified for server-side
    };
    } catch (transformError) {
      console.error("SERVER: Error transforming map:", map?.id, {
        message: transformError instanceof Error ? transformError.message : String(transformError)
      });
      // Return a minimal safe map object
      return {
        id: map?.id || 'unknown',
        title: map?.title || 'Untitled Map',
        description: map?.description || '',
        creator_id: map?.creator_id || '',
        difficulty: 1,
        category: map?.category || '',
        total_students: 0,
        finished_students: 0,
        metadata: {},
        visibility: map?.visibility || 'public',
        created_at: map?.created_at || new Date().toISOString(),
        updated_at: map?.updated_at || new Date().toISOString(),
        cover_image_url: null,
        cover_image_blurhash: null,
        cover_image_key: null,
        cover_image_updated_at: null,
        node_count: 0,
        avg_difficulty: 1,
        total_assessments: 0,
        map_type: 'public' as const,
        isEnrolled: false,
        hasStarted: false,
      };
    }
  }).filter(map => map !== null); // Filter out any null results

  console.log("SERVER: Successfully processed", mapsWithStats?.length || 0, "maps");
  return {
    maps: mapsWithStats || [],
    total_count: totalCount || 0,
    has_more: (offset + limit) < (totalCount || 0)
  };
  } catch (globalError) {
    // Enhanced global error logging
    const errorInfo = {
      message: globalError instanceof Error ? globalError.message : String(globalError) || 'Unknown error',
      stack: globalError instanceof Error ? globalError.stack : undefined,
      name: globalError instanceof Error ? globalError.name : undefined,
      // Capture all enumerable and non-enumerable properties
      allProperties: {} as Record<string, any>,
      errorType: typeof globalError,
      isError: globalError instanceof Error,
      stringified: String(globalError)
    };
    
    // Try to get all properties including non-enumerable ones
    try {
      const propertyNames = Object.getOwnPropertyNames(globalError || {});
      propertyNames.forEach(prop => {
        try {
          errorInfo.allProperties[prop] = (globalError as any)?.[prop];
        } catch (e) {
          errorInfo.allProperties[prop] = `[Cannot access: ${e instanceof Error ? e.message : String(e)}]`;
        }
      });
    } catch (e) {
      errorInfo.allProperties = `[Error extracting properties: ${e instanceof Error ? e.message : String(e)}]` as any;
    }
    
    console.error("SERVER: Global error in getMapsWithStatsServer:", errorInfo);
    
    // Return empty result instead of throwing for any unexpected errors
    return {
      maps: [],
      total_count: 0,
      has_more: false
    };
  }
};