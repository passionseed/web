import { NextRequest, NextResponse } from "next/server";
import { getUserPersonalMaps } from "@/lib/supabase/maps";
import { createServerClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";

// 🚀 FAST: User's personal maps (created by them)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "12");

    // Validate pagination parameters
    if (page < 1 || limit < 1 || limit > 50) {
      return NextResponse.json(
        { error: "Invalid pagination parameters" },
        { status: 400 }
      );
    }

    // Check authentication
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch (error) {
              // Ignore errors from setting cookies during API response
            }
          },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const result = await getUserPersonalMaps(page, limit);

    // Format for API consumption
    const formattedMaps = result.maps.map((map) => ({
      id: map.id,
      title: map.title,
      description: map.description || "",
      node_count: map.node_count,
      avg_difficulty: map.avg_difficulty,
      total_assessments: map.total_assessments,
      map_type: map.map_type,
      created_at: map.created_at,
      updated_at: map.updated_at,
      metadata: {
        coverImage: map.metadata?.coverImage,
        coverColors: map.metadata?.coverColors,
        forked_from: map.metadata?.forked_from,
      },
      source_info: map.source_info,
    }));

    return NextResponse.json({
      maps: formattedMaps,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        hasMore: result.hasMore,
      },
    });
  } catch (error) {
    console.error("Error fetching personal maps:", error);
    return NextResponse.json(
      { error: "Failed to fetch personal maps" },
      { status: 500 }
    );
  }
}