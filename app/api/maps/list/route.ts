import { NextRequest, NextResponse } from "next/server";
import { getMapsWithStats } from "@/lib/supabase/maps";

// OPTIMIZATION: Dedicated API endpoint for paginated map data
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '0', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    // Validate pagination parameters
    if (page < 0 || limit < 1 || limit > 100) {
      return NextResponse.json(
        { error: 'Invalid pagination parameters' },
        { status: 400 }
      );
    }

    const result = await getMapsWithStats(page, limit);

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300'
      }
    });
  } catch (error) {
    console.error("Error in maps list API:", error);
    return NextResponse.json(
      { error: 'Failed to fetch maps' },
      { status: 500 }
    );
  }
}