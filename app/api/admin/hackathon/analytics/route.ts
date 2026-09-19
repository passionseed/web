import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { requireAdmin } from "@/lib/security/route-guards";

/**
 * Get hackathon page analytics for admin dashboard
 * GET /api/admin/hackathon/analytics?days=30
 */
export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin.ok) return admin.response;

    const supabase = await createClient();

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const days = parseInt(searchParams.get("days") || "30", 10);

    // Fetch daily unique visitors data
    const { data: dailyStats, error: dailyError } = await supabase
      .from("hackathon_daily_unique_visitors")
      .select("*")
      .order("date", { ascending: true })
      .limit(days);

    if (dailyError) {
      console.error("Error fetching daily stats:", dailyError);
      return NextResponse.json(
        { error: "Failed to fetch analytics" },
        { status: 500 }
      );
    }

    // Fetch top referrers
    const { data: referrers, error: referrerError } = await supabase
      .from("hackathon_top_referrers")
      .select("*")
      .limit(10);

    if (referrerError) {
      console.error("Error fetching referrers:", referrerError);
    }

    // Fetch hourly stats for the last 7 days (for trend analysis)
    const { data: hourlyStats, error: hourlyError } = await supabase
      .from("hackathon_hourly_visitors")
      .select("*")
      .order("hour", { ascending: false })
      .limit(168); // 7 days * 24 hours

    if (hourlyError) {
      console.error("Error fetching hourly stats:", hourlyError);
    }

    // Calculate summary statistics
    const totalUniqueVisitors = dailyStats?.reduce(
      (sum, day) => sum + (day.unique_visitors || 0),
      0
    ) || 0;

    const totalPageViews = dailyStats?.reduce(
      (sum, day) => sum + (day.total_page_views || 0),
      0
    ) || 0;

    const avgDailyVisitors =
      dailyStats && dailyStats.length > 0
        ? Math.round(totalUniqueVisitors / dailyStats.length)
        : 0;

    // Find peak day
    const peakDay = dailyStats?.reduce(
      (max, day) =>
        (day.unique_visitors || 0) > (max.unique_visitors || 0) ? day : max,
      dailyStats[0]
    );

    // Fetch event analytics
    const { data: eventsByType, error: eventsError } = await supabase
      .from("hackathon_events_by_type")
      .select("*")
      .limit(20);

    if (eventsError) {
      console.error("Error fetching events:", eventsError);
    }

    // Calculate event totals
    const totalEvents = eventsByType?.reduce(
      (sum, event) => sum + (event.total_events || 0),
      0
    ) || 0;
    const uniqueEventTypes = eventsByType?.length || 0;

    return NextResponse.json({
      summary: {
        total_unique_visitors: totalUniqueVisitors,
        total_page_views: totalPageViews,
        avg_daily_visitors: avgDailyVisitors,
        peak_day: peakDay
          ? {
              date: peakDay.date,
              visitors: peakDay.unique_visitors,
            }
          : null,
        total_events: totalEvents,
        unique_event_types: uniqueEventTypes,
      },
      daily_stats: dailyStats || [],
      top_referrers: referrers || [],
      hourly_stats: hourlyStats || [],
      events_by_type: eventsByType || [],
    });
  } catch (error) {
    console.error("Error in analytics API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
