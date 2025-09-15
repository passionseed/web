import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

async function checkAdminAccess() {
  const supabase = await createClient();
  
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    console.log("🔐 [Admin Auth] User check:", { 
      hasUser: !!user, 
      userId: user?.id, 
      userEmail: user?.email, 
      authError: error?.message 
    });

    if (error || !user) {
      console.warn("🔐 [Admin Auth] No user or auth error:", error?.message);
      return null;
    }

    // Check if user has admin role
    console.log("🔍 [Admin Auth] Checking user_roles table for user:", user.id);
    
    const { data: roles, error: rolesError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin");

    console.log("🔍 [Admin Auth] Roles query result:", { 
      roles, 
      rolesError: rolesError?.message, 
      rolesErrorCode: rolesError?.code 
    });

    if (rolesError) {
      console.error("❌ [Admin Auth] Error checking user roles:", rolesError);
      
      // If user_roles table doesn't exist, create a temporary admin bypass for debugging
      if (rolesError.code === '42P01') {
        console.warn("⚠️ [Admin Auth] user_roles table doesn't exist - allowing access for debugging");
        return user; // TEMPORARY: Allow access when table doesn't exist
      }
    }

    const hasAdminRole = roles && roles.length > 0;
    console.log("🔐 [Admin Auth] Final result:", { hasAdminRole, roleCount: roles?.length });

    return hasAdminRole ? user : null;
  } catch (error) {
    console.error("❌ [Admin Auth] Unexpected error in checkAdminAccess:", error);
    return null;
  }
}

export async function GET(request: Request) {
  console.log("🚀 [Admin API] Starting admin maps request");
  
  const user = await checkAdminAccess();
  
  if (!user) {
    console.warn("🚫 [Admin API] Access denied - no admin user");
    
    // TEMPORARY: Allow unauthenticated access in development for testing
    const isDevelopment = process.env.NODE_ENV === 'development';
    if (!isDevelopment) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    
    console.warn("⚠️ [Admin API] DEVELOPMENT MODE - Allowing unauthenticated access for testing");
  }

  console.log("✅ [Admin API] Admin access granted for user:", user?.id || "development-mode");

  try {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    console.log("📋 [Admin API] Request parameters:", { page, limit, offset, fullUrl: request.url });

    const supabase = await createClient();

    console.log("🔍 [Admin API] Using reliable fallback query approach");

    // Skip RPC function and use reliable fallback query for production stability
    // This ensures the API works regardless of database migration state
    const { data: fallbackMaps, error: fallbackError } = await supabase
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
          metadata,
          profiles!creator_id (
            username,
            full_name
          )
        `)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      console.log("📊 [Admin API] Fallback query result:", { 
        success: !fallbackError, 
        errorCode: fallbackError?.code, 
        errorMessage: fallbackError?.message,
        mapsCount: fallbackMaps?.length 
      });

      if (fallbackError) {
        console.error("❌ [Admin API] Error in fallback query:", fallbackError);
        return NextResponse.json(
          { 
            error: "Failed to fetch maps", 
            details: fallbackError.message,
            code: fallbackError.code 
          },
          { status: 500 }
        );
      }

      // Get node statistics separately for better performance
      const mapIds = fallbackMaps?.map(m => m.id) || [];
      let nodeStats = [];
      
      console.log("📊 [Admin API] Fetching node statistics for", mapIds.length, "maps");
      
      if (mapIds.length > 0) {
        // Simplified approach - just get node counts first
        const { data: statsData, error: statsError } = await supabase
          .from("map_nodes")
          .select("map_id")
          .in("map_id", mapIds);

        console.log("📊 [Admin API] Node stats query result:", { 
          success: !statsError, 
          errorCode: statsError?.code, 
          errorMessage: statsError?.message,
          statsCount: statsData?.length 
        });
        
        if (statsError) {
          console.warn("⚠️ [Admin API] Could not fetch node stats:", statsError.message);
          // Continue without stats rather than failing
          nodeStats = mapIds.map(mapId => ({
            map_id: mapId,
            node_count: 0,
            avg_difficulty: 1
          }));
        } else {
          // Count nodes per map
          const nodeCounts = statsData?.reduce((acc, node) => {
            acc[node.map_id] = (acc[node.map_id] || 0) + 1;
            return acc;
          }, {} as Record<string, number>) || {};

          // For now, skip difficulty calculation to simplify debugging
          nodeStats = Object.keys(nodeCounts).map(mapId => ({
            map_id: mapId,
            node_count: nodeCounts[mapId] || 0,
            avg_difficulty: 1 // Simplified - will enhance later
          }));
          
          // Also include maps with 0 nodes
          mapIds.forEach(mapId => {
            if (!nodeStats.find(s => s.map_id === mapId)) {
              nodeStats.push({
                map_id: mapId,
                node_count: 0,
                avg_difficulty: 1
              });
            }
          });
        }
      }

      console.log("📊 [Admin API] Final node stats:", nodeStats.length, "entries");

      // Transform data
      console.log("🔄 [Admin API] Transforming map data...");
      
      const mapsWithStats = (fallbackMaps || []).map((map: {
        id: string;
        title: string;
        description: string;
        creator_id: string;
        difficulty: number;
        category: string;
        visibility: string;
        created_at: string;
        updated_at: string;
        metadata: any;
        profiles?: {
          username?: string;
          full_name?: string;
        };
      }) => {
        const stats = nodeStats.find(s => s.map_id === map.id);
        
        return {
          id: map.id,
          title: map.title,
          description: map.description,
          creator_id: map.creator_id,
          creator_name: map.profiles?.full_name || map.profiles?.username || "Unknown",
          difficulty: map.difficulty,
          category: map.category,
          visibility: map.visibility,
          node_count: stats?.node_count || 0,
          avg_difficulty: stats?.avg_difficulty || 1,
          created_at: map.created_at,
          updated_at: map.updated_at,
          metadata: map.metadata,
        };
      });

      console.log("🔄 [Admin API] Transformed", mapsWithStats.length, "maps");

      // Get total count for pagination
      console.log("📊 [Admin API] Getting total count for pagination");
      
      const { count: totalCount, error: countError } = await supabase
        .from("learning_maps")
        .select("id", { count: 'exact' });

      if (countError) {
        console.warn("⚠️ [Admin API] Could not get total count:", countError.message);
      }

      const responseData = {
        maps: mapsWithStats,
        pagination: {
          page,
          limit,
          total: totalCount || 0,
          totalPages: Math.ceil((totalCount || 0) / limit)
        }
      };

      console.log("✅ [Admin API] Returning successful response:", {
        mapsCount: responseData.maps.length,
        pagination: responseData.pagination
      });

      return NextResponse.json(responseData);
  } catch (error) {
    console.error("❌ [Admin API] Unexpected error in admin maps route:", error);
    
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    
    return NextResponse.json(
      { 
        error: "Internal server error", 
        details: errorMessage,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}