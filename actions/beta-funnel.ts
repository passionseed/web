"use server";

import { createAdminClient } from "@/utils/supabase/admin";

export async function trackBetaRegistrationStarted(data: {
  email: string;
  fullName: string;
}) {
  const supabaseAdmin = createAdminClient();

  try {
    // Upsert to handle case where user might refresh and try again
    const { error } = await supabaseAdmin
      .from("beta_registration_funnel")
      .upsert(
        {
          email: data.email,
          full_name: data.fullName,
          status: "started",
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "email",
          ignoreDuplicates: false, // Update existing
        }
      );

    if (error) {
      console.error("Failed to track beta registration start:", error);
    }
  } catch (error) {
    console.error("Error tracking beta registration start:", error);
  }
}

export async function trackBetaRegistrationCompleted(email: string) {
  const supabaseAdmin = createAdminClient();

  try {
    const { error } = await supabaseAdmin
      .from("beta_registration_funnel")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("email", email);

    if (error) {
      console.error("Failed to track beta registration completion:", error);
    }
  } catch (error) {
    console.error("Error tracking beta registration completion:", error);
  }
}

export async function getBetaFunnelStats() {
  const supabaseAdmin = createAdminClient();

  try {
    const { data, error } = await supabaseAdmin
      .from("beta_registration_funnel")
      .select("status, created_at, completed_at")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to get beta funnel stats:", error);
      return null;
    }

    const total = data?.length || 0;
    const completed = data?.filter((r) => r.status === "completed").length || 0;
    const abandoned = total - completed;
    const completionRate = total > 0 ? ((completed / total) * 100).toFixed(1) : "0";

    // Calculate recent abandonments (started > 1 hour ago but not completed)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentAbandoned =
      data?.filter(
        (r) =>
          r.status === "started" && new Date(r.created_at) < oneHourAgo
      ).length || 0;

    return {
      total,
      completed,
      abandoned,
      completionRate,
      recentAbandoned,
    };
  } catch (error) {
    console.error("Error getting beta funnel stats:", error);
    return null;
  }
}
