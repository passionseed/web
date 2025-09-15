import { NextRequest, NextResponse } from "next/server";
import { getUserDashboardMaps } from "@/lib/supabase/maps";
import { createServerClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";

// 🚀 ULTRA FAST: Dashboard maps - minimal data for widgets
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "6");

    // Validate limit
    if (limit < 1 || limit > 20) {
      return NextResponse.json(
        { error: "Invalid limit parameter" },
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

    const result = await getUserDashboardMaps(limit);

    // Format for dashboard consumption
    const formattedResponse = {
      enrolled: result.enrolled.map((map: any) => ({
        id: map.id,
        title: map.title,
        description: map.description || "",
        coverImage: map.metadata?.coverImage,
      })),
      recent: result.recent.map((map: any) => ({
        id: map.id,
        title: map.title,
        description: map.description || "",
        created_at: map.created_at,
        coverImage: map.metadata?.coverImage,
      })),
    };

    return NextResponse.json(formattedResponse);
  } catch (error) {
    console.error("Error fetching dashboard maps:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard maps" },
      { status: 500 }
    );
  }
}