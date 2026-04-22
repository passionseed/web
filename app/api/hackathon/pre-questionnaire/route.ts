import { NextRequest, NextResponse } from "next/server";
import { getSessionParticipant } from "@/lib/hackathon/db";
import { createClient } from "@supabase/supabase-js";
import { getCorsHeaders, extractHackathonToken } from "@/lib/hackathon/auth";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(req: NextRequest) {
  const corsHeaders = getCorsHeaders(req);

  try {
    const token = extractHackathonToken(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });
    const participant = await getSessionParticipant(token);
    if (!participant) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });
    }

    const supabase = getAdminClient();
    const { data, error } = await supabase
      .from("hackathon_pre_questionnaires")
      .select("*")
      .eq("participant_id", participant.id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ data: null }, { headers: corsHeaders });
      }
      console.error("Error fetching pre-questionnaire:", error);
      return NextResponse.json({ error: "Failed to fetch" }, { status: 500, headers: corsHeaders });
    }

    return NextResponse.json({ data }, { headers: corsHeaders });
  } catch (error) {
    console.error("Error in GET pre-questionnaire:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500, headers: corsHeaders });
  }
}

export async function POST(req: NextRequest) {
  const corsHeaders = getCorsHeaders(req);

  try {
    const token = extractHackathonToken(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });
    const participant = await getSessionParticipant(token);
    if (!participant) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });
    }

    const body = await req.json();
    const {
      name,
      dream_faculty,
      confidence_level,
      family_support_level,
      ideal_success_scenario,
      why_hackathon,
      team_role_preference,
      ai_proficiency,
      ikigai_items,
      problem_preferences,
      loves,
      good_at,
      school_level,
    } = body;

    if (
      !name ||
      !dream_faculty ||
      !confidence_level ||
      !family_support_level ||
      !why_hackathon ||
      !team_role_preference ||
      !ai_proficiency ||
      !Array.isArray(problem_preferences) ||
      !Array.isArray(loves) ||
      !Array.isArray(good_at) ||
      !school_level
    ) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400, headers: corsHeaders });
    }

    if (problem_preferences.length === 0 || problem_preferences.length > 3) {
      return NextResponse.json({ error: "Select 1–3 problems" }, { status: 400, headers: corsHeaders });
    }

    if (loves.length === 0) {
      return NextResponse.json({ error: "At least one 'loves' item is required" }, { status: 400, headers: corsHeaders });
    }

    if (good_at.length === 0) {
      return NextResponse.json({ error: "At least one 'good_at' item is required" }, { status: 400, headers: corsHeaders });
    }

    if (school_level !== "university" && school_level !== "high_school") {
      return NextResponse.json({ error: "school_level must be 'university' or 'high_school'" }, { status: 400, headers: corsHeaders });
    }

    const supabase = getAdminClient();
    const payload = {
      participant_id: participant.id,
      name,
      dream_faculty,
      confidence_level: Number(confidence_level),
      family_support_level: Number(family_support_level),
      ideal_success_scenario,
      why_hackathon,
      team_role_preference,
      ai_proficiency,
      ikigai_items,
      problem_preferences,
      loves,
      good_at,
      school_level,
      updated_at: new Date().toISOString(),
    };

    // Upsert by participant_id
    const { data, error } = await supabase
      .from("hackathon_pre_questionnaires")
      .upsert(payload, { onConflict: "participant_id" })
      .select()
      .single();

    if (error) {
      console.error("Error upserting pre-questionnaire:", error);
      return NextResponse.json({ error: "Failed to save" }, { status: 500, headers: corsHeaders });
    }

    return NextResponse.json({ success: true, data }, { headers: corsHeaders });
  } catch (error) {
    console.error("Error in POST pre-questionnaire:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500, headers: corsHeaders });
  }
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(req),
  });
}
