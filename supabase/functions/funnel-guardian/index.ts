import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const THRESHOLDS = {
  STUCK_USERS: 20,
  STUCK_HOURS: 48,
  FUNNEL_DROP: 10,
  RETENTION_DROP: 5,
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const startTime = Date.now();
  const alerts: string[] = [];

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const slackWebhook = Deno.env.get("SLACK_WEBHOOK_URL");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Funnel Guardian: Starting scan...");

    const stuckHoursAgo = new Date();
    stuckHoursAgo.setHours(stuckHoursAgo.getHours() - THRESHOLDS.STUCK_HOURS);

    const { data: stuckUsers, error: stuckError } = await supabase
      .from("funnel_events")
      .select("user_id, event_timestamp, event_name")
      .eq("event_name", "portfolio_start")
      .lt("event_timestamp", stuckHoursAgo.toISOString())
      .not("user_id", "in", (
        supabase
          .from("funnel_events")
          .select("user_id")
          .eq("event_name", "portfolio_complete")
      ));

    if (stuckError) {
      console.error("Error fetching stuck users:", stuckError);
    }

    const uniqueStuckUsers = new Set(stuckUsers?.map(u => u.user_id) || []);

    if (uniqueStuckUsers.size >= THRESHOLDS.STUCK_USERS) {
      const alert = {
        alert_type: "users_stuck",
        severity: "warning",
        message: `${uniqueStuckUsers.size} users stuck at portfolio upload for >${THRESHOLDS.STUCK_HOURS}hrs`,
        affected_users: uniqueStuckUsers.size,
        metric_threshold: THRESHOLDS.STUCK_USERS,
      };

      await supabase.from("dashboard_alerts").insert(alert);
      alerts.push(alert.message);
      console.log("Alert: Users stuck at portfolio upload", uniqueStuckUsers.size);
    }

    const lastWeekStart = new Date();
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    const prevWeekStart = new Date();
    prevWeekStart.setDate(prevWeekStart.getDate() - 14);

    const { data: recentEvents, error: recentError } = await supabase
      .from("funnel_events")
      .select("event_name, event_timestamp")
      .gte("event_timestamp", lastWeekStart.toISOString());

    const { data: prevEvents, error: prevError } = await supabase
      .from("funnel_events")
      .select("event_name, event_timestamp")
      .gte("event_timestamp", prevWeekStart.toISOString())
      .lt("event_timestamp", lastWeekStart.toISOString());

    if (!recentError && !prevError && recentEvents && prevEvents) {
      const recentSignups = new Set(recentEvents.filter(e => e.event_name === "app_register").map(e => e.user_id)).size;
      const prevSignups = new Set(prevEvents.filter(e => e.event_name === "app_register").map(e => e.user_id)).size;

      if (prevSignups > 0 && recentSignups > 0) {
        const dropPercent = ((prevSignups - recentSignups) / prevSignups) * 100;
        
        if (dropPercent >= THRESHOLDS.FUNNEL_DROP) {
          const alert = {
            alert_type: "funnel_drop",
            severity: "critical",
            message: `App registration dropped ${dropPercent.toFixed(1)}% vs last week (${prevSignups} → ${recentSignups})`,
            metric_value: recentSignups,
            metric_threshold: prevSignups,
          };

          await supabase.from("dashboard_alerts").insert(alert);
          alerts.push(alert.message);
          console.log("Alert: Funnel drop detected", dropPercent);
        }
      }
    }

    const { data: cohorts, error: cohortError } = await supabase
      .from("cohort_assignments")
      .select("cohort_date, user_id")
      .order("cohort_date", { ascending: false })
      .limit(20);

    if (!cohortError && cohorts && cohorts.length >= 2) {
      const currentCohort = cohorts[0].cohort_date;
      const prevCohort = cohorts.find(c => c.cohort_date !== currentCohort)?.cohort_date;

      if (prevCohort) {
        const { data: currentRetention } = await supabase
          .from("funnel_events")
          .select("user_id")
          .in("user_id", cohorts.filter(c => c.cohort_date === currentCohort).map(c => c.user_id))
          .eq("event_name", "weekly_active")
          .gte("event_timestamp", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

        const { data: prevRetention } = await supabase
          .from("funnel_events")
          .select("user_id")
          .in("user_id", cohorts.filter(c => c.cohort_date === prevCohort).map(c => c.user_id))
          .eq("event_name", "weekly_active")
          .gte("event_timestamp", new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString())
          .lt("event_timestamp", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

        const currentActive = new Set(currentRetention?.map(r => r.user_id) || []).size;
        const prevActive = new Set(prevRetention?.map(r => r.user_id) || []).size;
        
        const currentTotal = cohorts.filter(c => c.cohort_date === currentCohort).length;
        const prevTotal = cohorts.filter(c => c.cohort_date === prevCohort).length;

        if (currentTotal > 0 && prevTotal > 0) {
          const currentRate = (currentActive / currentTotal) * 100;
          const prevRate = (prevActive / prevTotal) * 100;
          const drop = prevRate - currentRate;

          if (drop >= THRESHOLDS.RETENTION_DROP) {
            const alert = {
              alert_type: "retention_drop",
              severity: "warning",
              message: `Week-1 retention dropped ${drop.toFixed(1)}% vs previous cohort (${prevRate.toFixed(1)}% → ${currentRate.toFixed(1)}%)`,
              metric_value: currentRate,
              metric_threshold: prevRate,
            };

            await supabase.from("dashboard_alerts").insert(alert);
            alerts.push(alert.message);
            console.log("Alert: Retention drop detected", drop);
          }
        }
      }
    }

    const executionTime = Date.now() - startTime;
    await supabase.from("ai_agent_runs").insert({
      agent_name: "funnel_guardian",
      status: alerts.length > 0 ? "alert_triggered" : "completed",
      alerts_generated: alerts.length,
      execution_time_ms: executionTime,
      output: { checks_run: 3, alerts_generated: alerts.length },
    });

    if (slackWebhook && alerts.length > 0) {
      await fetch(slackWebhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: `🚨 Funnel Guardian Alerts:\n${alerts.map(a => `• ${a}`).join("\n")}`,
        }),
      });
    }

    console.log(`Funnel Guardian: Scan complete. ${alerts.length} alerts generated.`);

    return new Response(
      JSON.stringify({
        success: true,
        alerts_generated: alerts.length,
        execution_time_ms: executionTime,
        checks: {
          stuck_users: uniqueStuckUsers.size,
          funnel_conversions: recentSignups || 0,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    console.error("Funnel Guardian Error:", error);
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    await supabase.from("ai_agent_runs").insert({
      agent_name: "funnel_guardian",
      status: "failed",
      error_message: error.message,
      execution_time_ms: Date.now() - startTime,
    });

    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
