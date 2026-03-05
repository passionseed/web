"use server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { redirect } from "next/navigation";

type BetaFormField = {
  id: string;
  form_id: string;
  label: string;
  field_type: "text" | "long_text" | "rating" | "boolean" | "select";
  order_index: number | null;
};

type BetaForm = {
  id: string;
  ps_form_fields: BetaFormField[] | null;
};

const BETA_FORM_TOKEN = "2d1a7a73-e3dd-4c5a-b0d5-1b7f5a5c2e11";
const BETA_FORM_TITLE = "Passion Seed App Beta Registration";

const BETA_FIELDS = [
  {
    label: "Full name",
    field_type: "text" as const,
    is_required: true,
    order_index: 0,
  },
  {
    label: "Email address",
    field_type: "text" as const,
    is_required: true,
    order_index: 1,
  },
  {
    label: "Phone number (optional)",
    field_type: "text" as const,
    is_required: false,
    order_index: 2,
  },
  {
    label: "How did you hear about us?",
    field_type: "text" as const,
    is_required: false,
    order_index: 3,
  },
  {
    label: "Why do you want to join the beta?",
    field_type: "long_text" as const,
    is_required: true,
    order_index: 4,
  },
] as const;

function sanitizeFieldValue(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}

async function getOrCreateBetaForm(supabase: ReturnType<typeof createAdminClient>): Promise<BetaForm> {
  const { data: existingForm, error: fetchError } = await supabase
    .from("ps_feedback_forms")
    .select("id, is_active, ps_form_fields(*)")
    .eq("token", BETA_FORM_TOKEN)
    .single();

  if (!fetchError && existingForm) {
    const existing = existingForm as unknown as BetaForm;

    if (!existing.ps_form_fields || existing.ps_form_fields.length === 0) {
      await supabase.from("ps_form_fields").insert(
        BETA_FIELDS.map((field) => ({
          form_id: existing.id,
          label: field.label,
          field_type: field.field_type,
          is_required: field.is_required,
          order_index: field.order_index,
          options: null,
        }))
      );

      const { data: updatedForm, error: updatedFormError } = await supabase
        .from("ps_feedback_forms")
        .select("id, ps_form_fields(*)")
        .eq("id", existing.id)
        .single();

      if (updatedFormError) {
        throw new Error("Failed to load beta registration form.");
      }

      return updatedForm as unknown as BetaForm;
    }

    return existing;
  }

  if (fetchError && (fetchError as { code?: string }).code !== "PGRST116") {
    throw new Error("Failed to load beta registration form.");
  }

  const { data: insertedForm, error: insertError } = await supabase
    .from("ps_feedback_forms")
    .insert({
      title: BETA_FORM_TITLE,
      description:
        "Register for early access to upcoming Passion Seed mobile and web app features.",
      token: BETA_FORM_TOKEN,
      is_active: true,
      require_auth: false,
    })
    .select("id")
    .single();

  if (insertError) {
    if ((insertError as { code?: string }).code === "23505") {
      const { data: existingAfterRace, error: raceError } = await supabase
        .from("ps_feedback_forms")
        .select("id, ps_form_fields(*)")
        .eq("token", BETA_FORM_TOKEN)
        .single();

      if (raceError || !existingAfterRace) {
        throw new Error("Failed to initialize beta registration form.");
      }

      return existingAfterRace as unknown as BetaForm;
    }

    throw new Error("Failed to initialize beta registration form.");
  }

  if (!insertedForm?.id) {
    throw new Error("Failed to create beta registration form.");
  }

  const { error: fieldError } = await supabase.from("ps_form_fields").insert(
    BETA_FIELDS.map((field) => ({
      form_id: insertedForm.id,
      label: field.label,
      field_type: field.field_type,
      is_required: field.is_required,
      order_index: field.order_index,
      options: null,
    }))
  );

  if (fieldError) {
    throw new Error("Failed to initialize beta registration form.");
  }

  const { data: formWithFields, error: finalFetchError } = await supabase
    .from("ps_feedback_forms")
    .select("id, ps_form_fields(*)")
    .eq("id", insertedForm.id)
    .single();

  if (finalFetchError || !formWithFields) {
    throw new Error("Failed to load beta registration form.");
  }

  return formWithFields as unknown as BetaForm;
}

export async function registerAppBetaUser(formData: FormData) {
  const fullName = sanitizeFieldValue(formData.get("full_name"));
  const email = sanitizeFieldValue(formData.get("email"));
  const phone = sanitizeFieldValue(formData.get("phone"));
  const referralSource = sanitizeFieldValue(formData.get("referral"));
  const motivation = sanitizeFieldValue(formData.get("motivation"));

  if (!fullName || !email || !motivation) {
    throw new Error("Name, email, and motivation are required.");
  }

  if (!email.includes("@")) {
    throw new Error("Please enter a valid email address.");
  }

  const supabaseAdmin = createAdminClient();
  const form = await getOrCreateBetaForm(supabaseAdmin);
  const fields = (form.ps_form_fields || []).sort(
    (a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)
  );

  const fieldByLabel = new Map(fields.map((field) => [field.label, field.id]));

  const missingField = BETA_FIELDS.find((field) => !fieldByLabel.has(field.label));
  if (missingField) {
    throw new Error(`Missing required form field: ${missingField.label}`);
  }

  const { data: userSession } = await createClient().auth.getUser();

  const { data: submission, error: submissionError } = await supabaseAdmin
    .from("ps_submissions")
    .insert({
      form_id: form.id,
      user_id: userSession.user?.id ?? null,
    })
    .select("id")
    .single();

  if (submissionError || !submission) {
    throw new Error("Failed to save your registration.");
  }

  const answerRows = [
    {
      submission_id: submission.id,
      field_id: fieldByLabel.get("Full name")!,
      answer_text: fullName,
    },
    {
      submission_id: submission.id,
      field_id: fieldByLabel.get("Email address")!,
      answer_text: email,
    },
    {
      submission_id: submission.id,
      field_id: fieldByLabel.get("Phone number (optional)")!,
      answer_text: phone || null,
    },
    {
      submission_id: submission.id,
      field_id: fieldByLabel.get("How did you hear about us?")!,
      answer_text: referralSource || null,
    },
    {
      submission_id: submission.id,
      field_id: fieldByLabel.get("Why do you want to join the beta?")!,
      answer_text: motivation,
    },
  ];

  const { error: answerError } = await supabaseAdmin
    .from("ps_submission_answers")
    .insert(answerRows);

  if (answerError) {
    throw new Error("Failed to save your registration details.");
  }

  redirect("/app/beta/success");
}
