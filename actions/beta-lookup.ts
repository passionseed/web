"use server";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

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

  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const { data, error } = await supabase.rpc("get_beta_submission_by_code", {
    p_code: normalised,
  });

  if (error) {
    return { found: false, debug: { error: JSON.stringify(error), code: normalised } } as BetaLookupResult & { debug?: unknown };
  }

  if (!data || data.length === 0) {
    return { found: false, debug: { error: null, code: normalised, rowCount: 0 } } as BetaLookupResult & { debug?: unknown };
  }

  return {
    found: true,
    fields: (data as { field_label: string; answer_text: string }[]).map((row) => ({
      label: row.field_label,
      answer: row.answer_text,
    })),
    debug: { error: null, code: normalised, rowCount: data.length },
  } as BetaLookupResult & { debug?: unknown };
}
