"use server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { sendBetaSignupNotification } from "./discord-notifications";

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
    label: "Nickname",
    field_type: "text" as const,
    is_required: true,
    order_index: 1,
  },
  {
    label: "Email address",
    field_type: "text" as const,
    is_required: true,
    order_index: 2,
  },
  {
    label: "Phone number",
    field_type: "text" as const,
    is_required: true,
    order_index: 3,
  },
  {
    label: "School",
    field_type: "text" as const,
    is_required: true,
    order_index: 4,
  },
  {
    label: "Grade",
    field_type: "text" as const,
    is_required: true,
    order_index: 5,
  },
  {
    label: "Platform",
    field_type: "text" as const,
    is_required: true,
    order_index: 6,
  },
  {
    label: "What interests you about testing?",
    field_type: "long_text" as const,
    is_required: true,
    order_index: 7,
  },
  {
    label: "Faculty of Interest",
    field_type: "text" as const,
    is_required: true,
    order_index: 8,
  },
  {
    label: "Major Interest",
    field_type: "text" as const,
    is_required: false,
    order_index: 9,
  },
  {
    label: "University",
    field_type: "text" as const,
    is_required: false,
    order_index: 10,
  },
] as const;

function sanitizeFieldValue(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}

async function getOrCreateBetaForm(
  supabase: ReturnType<typeof createAdminClient>,
): Promise<BetaForm> {
  const { data: existingForm, error: fetchError } = await supabase
    .from("ps_feedback_forms")
    .select("id, is_active, ps_form_fields(*)")
    .eq("token", BETA_FORM_TOKEN)
    .single();

  if (!fetchError && existingForm) {
    const existing = existingForm as unknown as BetaForm;
    const existingLabels = new Set(
      (existing.ps_form_fields || []).map((f) => f.label),
    );

    const missingFields = BETA_FIELDS.filter(
      (f) => !existingLabels.has(f.label),
    );

    if (missingFields.length > 0) {
      await supabase.from("ps_form_fields").insert(
        missingFields.map((field) => ({
          form_id: existing.id,
          label: field.label,
          field_type: field.field_type,
          is_required: field.is_required,
          order_index: field.order_index,
          options: null,
        })),
      );
    }

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
    })),
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

export async function registerAppBetaUserNoRedirect(formData: FormData) {
  const fullName = sanitizeFieldValue(formData.get("full_name"));
  const nickname = sanitizeFieldValue(formData.get("nickname"));
  const email = sanitizeFieldValue(formData.get("email"));
  const phone = sanitizeFieldValue(formData.get("phone"));
  const school = sanitizeFieldValue(formData.get("school"));
  const grade = sanitizeFieldValue(formData.get("grade"));
  const platform = sanitizeFieldValue(formData.get("platform"));
  const motivation = sanitizeFieldValue(formData.get("motivation"));
  const facultyInterest = sanitizeFieldValue(formData.get("faculty_interest"));
  const majorInterest = sanitizeFieldValue(formData.get("major_interest"));
  const majorInterestOther = sanitizeFieldValue(formData.get("major_interest_other"));
  const university = sanitizeFieldValue(formData.get("university"));

  if (
    !fullName ||
    !nickname ||
    !email ||
    !phone ||
    !school ||
    !grade ||
    !platform ||
    !motivation ||
    !facultyInterest
  ) {
    return {
      success: false,
      error:
        "Name, nickname, email, phone, school, grade, platform, faculty interest, and motivation are required.",
    };
  }

  if (!email.includes("@")) {
    return {
      success: false,
      error: "Please enter a valid email address.",
    };
  }

  try {
    const supabaseAdmin = createAdminClient();
    const form = await getOrCreateBetaForm(supabaseAdmin);
    const fields = (form.ps_form_fields || []).sort(
      (a, b) => (a.order_index ?? 0) - (b.order_index ?? 0),
    );

    const fieldByLabel = new Map(
      fields.map((field) => [field.label, field.id]),
    );

    const missingField = BETA_FIELDS.find(
      (field) => !fieldByLabel.has(field.label),
    );
    if (missingField) {
      return {
        success: false,
        error: `Missing required form field: ${missingField.label}`,
      };
    }

    const supabase = await createClient();
    const { data: userSession } = await supabase.auth.getUser();

    const { data: submission, error: submissionError } = await supabaseAdmin
      .from("ps_submissions")
      .insert({
        form_id: form.id,
        user_id: userSession.user?.id ?? null,
      })
      .select("id")
      .single();

    if (submissionError || !submission) {
      return {
        success: false,
        error: "Failed to save your registration.",
      };
    }

    const answerRows = [
      {
        submission_id: submission.id,
        field_id: fieldByLabel.get("Full name")!,
        answer_text: fullName,
      },
      {
        submission_id: submission.id,
        field_id: fieldByLabel.get("Nickname")!,
        answer_text: nickname,
      },
      {
        submission_id: submission.id,
        field_id: fieldByLabel.get("Email address")!,
        answer_text: email,
      },
      {
        submission_id: submission.id,
        field_id: fieldByLabel.get("Phone number")!,
        answer_text: phone,
      },
      {
        submission_id: submission.id,
        field_id: fieldByLabel.get("School")!,
        answer_text: school,
      },
      {
        submission_id: submission.id,
        field_id: fieldByLabel.get("Grade")!,
        answer_text: grade,
      },
      {
        submission_id: submission.id,
        field_id: fieldByLabel.get("Platform")!,
        answer_text: platform,
      },
      {
        submission_id: submission.id,
        field_id: fieldByLabel.get("What interests you about testing?")!,
        answer_text: motivation,
      },
      {
        submission_id: submission.id,
        field_id: fieldByLabel.get("Faculty of Interest")!,
        answer_text: facultyInterest,
      },
      ...(fieldByLabel.has("Major Interest") ? [{
        submission_id: submission.id,
        field_id: fieldByLabel.get("Major Interest")!,
        answer_text: majorInterestOther || majorInterest,
      }] : []),
      ...(fieldByLabel.has("University") ? [{
        submission_id: submission.id,
        field_id: fieldByLabel.get("University")!,
        answer_text: university,
      }] : []),
    ];

    const { error: answerError } = await supabaseAdmin
      .from("ps_submission_answers")
      .insert(answerRows);

    if (answerError) {
      return {
        success: false,
        error: "Failed to save your registration details.",
      };
    }

    // Send Discord notification (non-blocking)
    sendBetaSignupNotification({
      fullName,
      nickname,
      email,
      phone,
      school,
      grade,
      platform,
      motivation,
      facultyInterest,
      majorInterest: majorInterestOther || majorInterest,
      university,
    }).catch(console.error);

    return {
      success: true,
    };
  } catch (error) {
    console.error("Registration error:", error);
    return {
      success: false,
      error: "An unexpected error occurred. Please try again.",
    };
  }
}
