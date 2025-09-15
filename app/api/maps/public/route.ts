import { NextRequest, NextResponse } from "next/server";
import { getPublicMapsPaginated } from "@/lib/supabase/maps";

// 🚀 ULTRA FAST: Public maps only - no auth required
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

    const result = await getPublicMapsPaginated(page, limit);

    // Minimal format for public consumption
    const formattedMaps = result.maps.map((map) => ({
      id: map.id,
      title: map.title,
      description: map.description || "",
      node_count: map.node_count,
      avg_difficulty: map.avg_difficulty,
      total_assessments: map.total_assessments,
      created_at: map.created_at,
      coverImage: map.metadata?.coverImage,
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
    console.error("Error fetching public maps:", error);
    return NextResponse.json(
      { error: "Failed to fetch public maps" },
      { status: 500 }
    );
  }
}