import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

const BETA_FORM_TOKEN = "2d1a7a73-e3dd-4c5a-b0d5-1b7f5a5c2e11";

export async function GET() {
  try {
    // Use regular client only for auth check
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: roles, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin");

    if (roleError || !roles || roles.length === 0) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Use admin client to bypass RLS for reading submissions
    const supabaseAdmin = createAdminClient();

    // Get the beta form
    const { data: form, error: formError } = await supabaseAdmin
      .from("ps_feedback_forms")
      .select("id")
      .eq("token", BETA_FORM_TOKEN)
      .single();

    if (formError || !form) {
      return NextResponse.json(
        { error: "Beta form not found" },
        { status: 404 }
      );
    }

    // Get all submissions for this form using admin client
    const { data: submissions, error: submissionsError } = await supabaseAdmin
      .from("ps_submissions")
      .select(
        `
        id,
        created_at,
        user_id,
        ps_submission_answers (
          field_id,
          answer_text,
          ps_form_fields (
            label
          )
        )
      `
      )
      .eq("form_id", form.id)
      .order("created_at", { ascending: false });

    if (submissionsError) {
      console.error("Error fetching submissions:", submissionsError);
      return NextResponse.json(
        { error: "Failed to fetch submissions" },
        { status: 500 }
      );
    }

    // Transform the data into a more usable format
    const registrations = (submissions || []).map((submission: any) => {
      const answers: Record<string, string> = {};

      if (submission.ps_submission_answers) {
        submission.ps_submission_answers.forEach((answer: any) => {
          const label = answer.ps_form_fields?.label;
          if (label) {
            answers[label] = answer.answer_text || "";
          }
        });
      }

      return {
        id: submission.id,
        created_at: submission.created_at,
        user_id: submission.user_id,
        full_name: answers["Full name"] || "",
        nickname: answers["Nickname"] || "",
        email: answers["Email address"] || "",
        phone: answers["Phone number"] || "",
        school: answers["School"] || "",
        grade: answers["Grade"] || "",
        platform: answers["Platform"] || "",
        motivation: answers["What interests you about testing?"] || "",
        faculty_interest: answers["Faculty of Interest"] || "",
        major_interest: answers["Major Interest"] || "",
        university: answers["University"] || "",
      };
    });

    return NextResponse.json({ registrations });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
