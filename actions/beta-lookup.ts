"use server";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/server";

export type BetaLookupField = {
  label: string;
  answer: string;
};

export type BetaLookupResult =
  | { found: true; fields: BetaLookupField[] }
  | { found: false; reason?: "unauthorized" };

const BETA_FORM_TOKEN = "2d1a7a73-e3dd-4c5a-b0d5-1b7f5a5c2e11";
const STAFF_ROLES = ["admin", "passion-seed-team"];

// A 4-character code is only 65,536 guesses, so this lookup returns minors'
// contact details to staff only.
async function isStaff(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: roles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .in("role", STAFF_ROLES);
  return (roles?.length ?? 0) > 0;
}

export async function lookupBetaSubmission(code: string): Promise<BetaLookupResult> {
  if (!(await isStaff())) return { found: false, reason: "unauthorized" };

  const normalised = code.trim().toUpperCase();
  if (normalised.length !== 4) return { found: false };

  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // Step 1: get the beta form ID
  const { data: form, error: formError } = await supabase
    .from("ps_feedback_forms")
    .select("id")
    .eq("token", BETA_FORM_TOKEN)
    .single();

  if (formError || !form) {
    return { found: false };
  }

  // Step 2: get all submissions for this form, find one whose UUID ends with the code
  const { data: submissions, error: subError } = await supabase
    .from("ps_submissions")
    .select("id")
    .eq("form_id", form.id);

  if (subError || !submissions) {
    return { found: false };
  }

  const matched = submissions.find(
    (s) => s.id.replace(/-/g, "").slice(-4).toUpperCase() === normalised
  );

  if (!matched) {
    return { found: false };
  }

  // Step 3: get answers with field labels
  const { data: answers, error: ansError } = await supabase
    .from("ps_submission_answers")
    .select("answer_text, ps_form_fields(label, order_index)")
    .eq("submission_id", matched.id)
    .not("answer_text", "is", null)
    .neq("answer_text", "");

  if (ansError || !answers) {
    return { found: false };
  }

  type AnswerRow = { answer_text: string; ps_form_fields: { label: string; order_index: number } | null };

  const fields = (answers as AnswerRow[])
    .filter((r) => r.ps_form_fields)
    .sort((a, b) => (a.ps_form_fields!.order_index ?? 0) - (b.ps_form_fields!.order_index ?? 0))
    .map((r) => ({
      label: r.ps_form_fields!.label,
      answer: r.answer_text,
    }));

  return { found: true, fields };
}
