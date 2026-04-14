import { NextRequest, NextResponse } from "next/server";
import { getMapsWithStats } from "@/lib/supabase/maps";

export async function GET(request: NextRequest) {
  try {
    const maps = await getMapsWithStats();

    // Transform to the format expected by the modal
    const formattedMaps = maps.map((map) => ({
      id: map.id,
      title: map.title,
      description: map.description || "",
      node_count: map.node_count,
    }));

    return NextResponse.json(formattedMaps, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300'
      }
    });
  } catch (error) {
    console.error("Error fetching maps:", error);
    return NextResponse.json(
      { error: "Failed to fetch maps" },
      { status: 500 }
    );
  }
}
