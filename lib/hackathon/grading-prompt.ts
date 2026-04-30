import { createClient } from "@supabase/supabase-js";

function getClient() {
  return createClient(
    process.env.HACKATHON_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.HACKATHON_SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export type GradingPrompt = {
  id: string;
  prompt_key: string;
  name: string;
  template: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  updated_by_user_id: string | null;
};

export async function getActiveGradingPrompt(
  promptKey = "default"
): Promise<GradingPrompt | null> {
  const { data } = await getClient()
    .from("hackathon_ai_grading_prompts")
    .select("*")
    .eq("prompt_key", promptKey)
    .eq("is_active", true)
    .single();
  return (data as GradingPrompt) ?? null;
}

export async function updateGradingPrompt(
  promptKey: string,
  template: string,
  userId?: string
): Promise<GradingPrompt> {
  const { data, error } = await getClient()
    .from("hackathon_ai_grading_prompts")
    .update({
      template,
      updated_at: new Date().toISOString(),
      updated_by_user_id: userId ?? null,
    })
    .eq("prompt_key", promptKey)
    .select("*")
    .single();
  if (error) throw error;
  return data as GradingPrompt;
}
