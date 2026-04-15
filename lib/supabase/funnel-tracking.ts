"use server";

import { createClient } from "@/utils/supabase/server";
import { createClient as createClientClient } from "@/utils/supabase/client";

// Server-side tracking (use in Server Components/Actions)
export async function trackFunnelEventServer(
  userId: string,
  eventName: string,
  metadata?: Record<string, any>
) {
  try {
    const supabase = await createClient();
    
    await supabase.from("funnel_events").insert({
      user_id: userId,
      event_name: eventName,
      metadata: metadata || {},
    });
    
    console.log(`[Funnel] Tracked: ${eventName} for user ${userId}`);
  } catch (error) {
    console.error("[Funnel] Failed to track event:", error);
  }
}

// Client-side tracking (use in Client Components)
export async function trackFunnelEventClient(
  userId: string,
  eventName: string,
  metadata?: Record<string, any>
) {
  try {
    const supabase = createClientClient();
    
    await supabase.from("funnel_events").insert({
      user_id: userId,
      event_name: eventName,
      metadata: metadata || {},
    });
    
    console.log(`[Funnel] Tracked: ${eventName} for user ${userId}`);
  } catch (error) {
    console.error("[Funnel] Failed to track event:", error);
  }
}

// Assign user to cohort on signup
export async function assignUserToCohort(
  userId: string,
  acquisitionChannel: string,
  signupSource?: string,
  utmCampaign?: string
) {
  try {
    const supabase = await createClient();
    
    // Get the start of current week (Monday)
    const today = new Date();
    const dayOfWeek = today.getDay();
    const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const cohortDate = new Date(today.setDate(diff));
    
    await supabase.from("cohort_assignments").insert({
      user_id: userId,
      cohort_date: cohortDate.toISOString().split('T')[0],
      acquisition_channel: acquisitionChannel,
      signup_source: signupSource,
      utm_campaign: utmCampaign,
    });
    
    console.log(`[Cohort] Assigned user ${userId} to ${cohortDate.toISOString().split('T')[0]} cohort`);
  } catch (error) {
    console.error("[Cohort] Failed to assign cohort:", error);
  }
}

// Track weekly activity for retention metrics
export async function trackWeeklyActivityServer(userId: string) {
  try {
    const supabase = await createClient();
    
    // Check if already tracked this week
    const thisWeek = new Date();
    thisWeek.setHours(0, 0, 0, 0);
    thisWeek.setDate(thisWeek.getDate() - thisWeek.getDay() + 1); // Monday
    
    const { data: existing } = await supabase
      .from("funnel_events")
      .select("id")
      .eq("user_id", userId)
      .eq("event_name", "weekly_active")
      .gte("event_timestamp", thisWeek.toISOString())
      .limit(1);
    
    if (!existing || existing.length === 0) {
      await supabase.from("funnel_events").insert({
        user_id: userId,
        event_name: "weekly_active",
      });
      console.log(`[Retention] Tracked weekly activity for user ${userId}`);
    }
  } catch (error) {
    console.error("[Retention] Failed to track weekly activity:", error);
  }
}

// Track weekly activity from client
export async function trackWeeklyActivityClient(userId: string) {
  try {
    const supabase = createClientClient();
    
    const thisWeek = new Date();
    thisWeek.setHours(0, 0, 0, 0);
    thisWeek.setDate(thisWeek.getDate() - thisWeek.getDay() + 1);
    
    const { data: existing } = await supabase
      .from("funnel_events")
      .select("id")
      .eq("user_id", userId)
      .eq("event_name", "weekly_active")
      .gte("event_timestamp", thisWeek.toISOString())
      .limit(1);
    
    if (!existing || existing.length === 0) {
      await supabase.from("funnel_events").insert({
        user_id: userId,
        event_name: "weekly_active",
      });
    }
  } catch (error) {
    console.error("[Retention] Failed to track weekly activity:", error);
  }
}

// Predefined event helpers
export async function trackAppRegister(
  userId: string,
  source?: string,
  hackathonId?: string
) {
  await trackFunnelEventServer(userId, "app_register", {
    source: source || "organic",
    hackathon_id: hackathonId,
  });
}

export async function trackPortfolioStart(userId: string) {
  await trackFunnelEventServer(userId, "portfolio_start");
}

export async function trackPortfolioUpload(userId: string) {
  await trackFunnelEventServer(userId, "portfolio_upload");
}

export async function trackPortfolioComplete(userId: string) {
  await trackFunnelEventServer(userId, "portfolio_complete");
}

export async function trackGradingRequest(userId: string, portfolioId?: string) {
  await trackFunnelEventServer(userId, "grading_request", {
    portfolio_id: portfolioId,
  });
}

export async function trackPaymentConvert(
  userId: string,
  amount: number,
  productId?: string
) {
  await trackFunnelEventServer(userId, "payment_convert", {
    amount,
    product_id: productId,
  });
}
