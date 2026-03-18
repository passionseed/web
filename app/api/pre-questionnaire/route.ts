import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();

    const {
      name,
      uni_strategy,
      confidence_level,
      parent_support_level,
      ideal_success_scenario,
      self_learn_enjoyment,
      ai_proficiency,
      learning_style,
      ikigai_items,
    } = body;

    // Validate required fields
    if (
      !name ||
      !uni_strategy ||
      !confidence_level ||
      !parent_support_level ||
      !ideal_success_scenario ||
      !self_learn_enjoyment ||
      !ai_proficiency ||
      !learning_style ||
      !ikigai_items ||
      !Array.isArray(ikigai_items)
    ) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    // Check if user already has a questionnaire
    const { data: existing } = await supabase
      .from("pre_questionnaires")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (existing) {
      // Update existing questionnaire
      const { data, error } = await supabase
        .from("pre_questionnaires")
        .update({
          name,
          uni_strategy,
          confidence_level,
          parent_support_level,
          ideal_success_scenario,
          self_learn_enjoyment,
          ai_proficiency,
          learning_style,
          ikigai_items,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) {
        console.error("Error updating questionnaire:", error);
        return NextResponse.json(
          { error: "Failed to update questionnaire", details: error },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true, data });
    } else {
      // Insert new questionnaire
      const { data, error } = await supabase
        .from("pre_questionnaires")
        .insert({
          user_id: user.id,
          name,
          uni_strategy,
          confidence_level,
          parent_support_level,
          ideal_success_scenario,
          self_learn_enjoyment,
          ai_proficiency,
          learning_style,
          ikigai_items,
        })
        .select()
        .single();

      if (error) {
        console.error("Error inserting questionnaire:", error);
        return NextResponse.json(
          { error: "Failed to save questionnaire", details: error },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true, data });
    }
  } catch (error) {
    console.error("Error in pre-questionnaire API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch user's questionnaire
    const { data, error } = await supabase
      .from("pre_questionnaires")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // No questionnaire found
        return NextResponse.json({ data: null });
      }
      console.error("Error fetching questionnaire:", error);
      return NextResponse.json(
        { error: "Failed to fetch questionnaire", details: error },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Error in pre-questionnaire API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
