import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check admin access
    const {
      data: { user },
    } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Verify admin role
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();
    
    if (!roles) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    
    // Fetch retention summary
    const { data: retentionSummary, error: retentionError } = await supabase
      .from("analytics_retention_summary")
      .select("*")
      .single();
    
    if (retentionError) {
      console.error("Error fetching retention summary:", retentionError);
    }
    
    // Fetch DAU data (last 30 days)
    const { data: dauData, error: dauError } = await supabase
      .from("analytics_daily_active_users")
      .select("*")
      .order("activity_date", { ascending: false })
      .limit(30);
    
    if (dauError) {
      console.error("Error fetching DAU:", dauError);
    }
    
    // Fetch WAU data (last 12 weeks)
    const { data: wauData, error: wauError } = await supabase
      .from("analytics_weekly_active_users")
      .select("*")
      .order("activity_week", { ascending: false })
      .limit(12);
    
    if (wauError) {
      console.error("Error fetching WAU:", wauError);
    }
    
    // Fetch cohort retention (last 8 weeks)
    const { data: cohortRetention, error: cohortError } = await supabase
      .from("analytics_cohort_retention_weekly")
      .select("*")
      .order("cohort_week", { ascending: false })
      .limit(72); // 8 weeks * 9 data points each
    
    if (cohortError) {
      console.error("Error fetching cohort retention:", cohortError);
    }
    
    // Fetch onboarding funnel
    const { data: onboardingFunnel, error: funnelError } = await supabase
      .from("analytics_onboarding_funnel")
      .select("*")
      .single();
    
    if (funnelError) {
      console.error("Error fetching funnel:", funnelError);
    }
    
    // Fetch user journey
    const { data: userJourney, error: journeyError } = await supabase
      .from("analytics_complete_user_journey")
      .select("*")
      .single();
    
    if (journeyError) {
      console.error("Error fetching user journey:", journeyError);
    }
    
    // Fetch session duration (last 30 days)
    const { data: sessionDuration, error: sessionError } = await supabase
      .from("analytics_session_duration")
      .select("*")
      .order("session_date", { ascending: false })
      .limit(30);
    
    if (sessionError) {
      console.error("Error fetching session duration:", sessionError);
    }
    
    // Fetch funnel by cohort (last 4 weeks)
    const { data: funnelByCohort, error: funnelCohortError } = await supabase
      .from("analytics_funnel_by_cohort")
      .select("*")
      .order("cohort_week", { ascending: false })
      .limit(4);
    
    if (funnelCohortError) {
      console.error("Error fetching funnel by cohort:", funnelCohortError);
    }
    
    return NextResponse.json({
      retention: retentionSummary || null,
      dau: dauData || [],
      wau: wauData || [],
      cohortRetention: cohortRetention || [],
      onboardingFunnel: onboardingFunnel || null,
      userJourney: userJourney || null,
      sessionDuration: sessionDuration || [],
      funnelByCohort: funnelByCohort || [],
    });
  } catch (error) {
    console.error("Error in analytics API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
