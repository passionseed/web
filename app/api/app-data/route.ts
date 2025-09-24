import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

// OPTIMIZATION: Consolidated endpoint for common app data
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get user data
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      return NextResponse.json(
        { error: 'Failed to get user' },
        { status: 401 }
      );
    }

    // Consolidate all common queries into a single response
    const [
      profileResult,
      classroomsResult,
      teamsResult,
      userRolesResult
    ] = await Promise.all([
      // User profile
      user ? supabase
        .from("profiles")
        .select("id, email, full_name, username, avatar_url")
        .eq("id", user.id)
        .single() : Promise.resolve({ data: null, error: null }),
      
      // User's classrooms
      user ? supabase
        .from("classroom_memberships")
        .select(`
          classroom_id,
          role,
          classrooms!inner (
            id,
            name,
            description
          )
        `)
        .eq("user_id", user.id) : Promise.resolve({ data: [], error: null }),
      
      // User's teams
      user ? supabase
        .from("team_memberships")
        .select(`
          team_id,
          is_leader,
          left_at,
          classroom_teams!inner (
            id,
            name,
            classroom_id
          )
        `)
        .eq("user_id", user.id)
        .is("left_at", null) : Promise.resolve({ data: [], error: null }),
      
      // User roles
      user ? supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id) : Promise.resolve({ data: [], error: null })
    ]);

    const appData = {
      user: user ? {
        id: user.id,
        email: user.email,
        ...profileResult.data
      } : null,
      classrooms: classroomsResult.data || [],
      teams: teamsResult.data || [],
      roles: userRolesResult.data?.map(r => r.role) || []
    };

    return NextResponse.json(appData, {
      headers: {
        'Cache-Control': 'private, s-maxage=30, stale-while-revalidate=60'
      }
    });
  } catch (error) {
    console.error("Error in app-data API:", error);
    return NextResponse.json(
      { error: 'Failed to fetch app data' },
      { status: 500 }
    );
  }
}