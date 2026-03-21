import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/lib/hackathon/auth";
import { getSessionParticipant } from "@/lib/hackathon/db";
import { createClient } from "@supabase/supabase-js";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function getParticipant() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return getSessionParticipant(token);
}

export async function GET() {
  try {
    const participant = await getParticipant();
    if (!participant) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = getAdminClient();
    const { data, error } = await supabase
      .from("hackathon_pre_questionnaires")
      .select("*")
      .eq("participant_id", participant.id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ data: null });
      }
      console.error("Error fetching pre-questionnaire:", error);
      return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error("Error in GET pre-questionnaire:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const participant = await getParticipant();
    if (!participant) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
    } = body;

    if (
      !name ||
      !dream_faculty ||
      !confidence_level ||
      !family_support_level ||
      !ideal_success_scenario ||
      !why_hackathon ||
      !team_role_preference ||
      !ai_proficiency ||
      !ikigai_items ||
      !Array.isArray(ikigai_items) ||
      !Array.isArray(problem_preferences)
    ) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    if (problem_preferences.length === 0 || problem_preferences.length > 3) {
      return NextResponse.json({ error: "Select 1–3 problems" }, { status: 400 });
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
      return NextResponse.json({ error: "Failed to save" }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Error in POST pre-questionnaire:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
