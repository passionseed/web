import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: req.headers.get("Authorization")! } },
    });

    const { url, method } = req;
    const path = new URL(url).pathname;

    // Route: Ingest Reflection
    if (path === "/score-engine/ingest" && method === "POST") {
      const { reflectionData, simulationId } = await req.json();

      // MOCK: In real life, call Claude to parse reflection and score it
      const extractedPassion = Math.floor(Math.random() * 40) + 60; // Mock AI sentiment

      // Insert score event
      const { error: eventError } = await supabase.from("score_events").insert({
        simulation_id: simulationId,
        student_id: (await supabase.auth.getUser()).data.user?.id,
        event_type: "reflection_submitted",
        factor: "passion",
        delta: extractedPassion > 75 ? 5 : -2,
        new_value: extractedPassion,
        reason_string:
          extractedPassion > 75
            ? "High energy in reflection"
            : "Low energy in reflection",
      });
      if (eventError) console.error("Error inserting score event:", eventError);

      // Update simulation passion score
      const { error: simError } = await supabase
        .from("journey_simulations")
        .update({ passion_score: extractedPassion })
        .eq("id", simulationId);

      if (simError) console.error("Error updating simulation:", simError);

      return new Response(
        JSON.stringify({
          success: true,
          message: "Reflection ingested",
          simulated_passion_delta: extractedPassion,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        },
      );
    }

    // Route: Recalculate Scores
    if (path === "/score-engine/recalculate" && method === "POST") {
      const { simulationId } = await req.json();

      // MOCK: Update journey_simulations with new calculated averages

      return new Response(
        JSON.stringify({
          success: true,
          message: "Scores recalculated",
          new_scores: { passion: 75, aptitude: 82, viability: 88 },
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        },
      );
    }

    // Route: Explainability Timeline
    if (path.startsWith("/score-engine/timeline") && method === "GET") {
      const urlObj = new URL(url);
      const simId = urlObj.searchParams.get("simulationId");

      if (!simId) {
        return new Response(
          JSON.stringify({ error: "Missing simulationId parameter" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      const { data: events, error: fetchError } = await supabase
        .from("score_events")
        .select("*")
        .eq("simulation_id", simId)
        .order("created_at", { ascending: false });

      if (fetchError) {
        console.error("Error fetching score events:", fetchError);
        return new Response(
          JSON.stringify({ error: "Internal server error" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      return new Response(
        JSON.stringify({ success: true, events: events || [] }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        },
      );
    }

    return new Response(JSON.stringify({ error: "Not found" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 404,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
