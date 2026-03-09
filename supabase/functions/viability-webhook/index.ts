import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    // Need service role key to bypass RLS and insert into viability_cache / jobs securely
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload = await req.json();

    if (!payload.job_title || !payload.job_id) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        },
      );
    }

    console.log(`Processing viability data for: ${payload.job_title}`);

    // Update Jobs Table
    const { error: jobsError } = await supabase
      .from("jobs")
      .update({
        viability_score: payload.viability_score,
        demand_trend: payload.demand_trend,
        automation_risk: payload.automation_risk,
        median_salary: payload.median_salary,
        top_hiring_regions: payload.top_hiring_regions,
        required_skills: payload.required_skills,
        required_degrees: payload.prerequisite_degrees,
        viability_updated_at: new Date().toISOString(),
      })
      .eq("id", payload.job_id);

    if (jobsError) {
      throw new Error(`Failed to update jobs table: ${jobsError.message}`);
    }

    // Insert or Update Viability Cache
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // Cache valid for 30 days

    const { error: cacheError } = await supabase
      .from("viability_cache")
      .upsert({
        job_id: payload.job_id,
        raw_data: payload,
        score: payload.viability_score,
        fetched_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
      });

    if (cacheError) {
      throw new Error(`Failed to update cache: ${cacheError.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Viability data synced successfully",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    console.error("Webhook Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
