"use server";

import { createClient } from "@/utils/supabase/server";

export type BetaLookupField = {
  label: string;
  answer: string;
};

export type BetaLookupResult =
  | { found: true; fields: BetaLookupField[] }
  | { found: false };

export async function lookupBetaSubmission(code: string): Promise<BetaLookupResult> {
  const normalised = code.trim().toUpperCase();
  if (normalised.length !== 4) return { found: false };

  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_beta_submission_by_code", {
    p_code: normalised,
  });

  if (error || !data || data.length === 0) return { found: false };

  return {
    found: true,
    fields: (data as { field_label: string; answer_text: string }[]).map((row) => ({
      label: row.field_label,
      answer: row.answer_text,
    })),
  };
}
