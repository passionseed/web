import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { isAnonymousUser } from "@/lib/supabase/auth";
import { OnboardClient } from "./onboard-client";
import type { OnboardingState } from "@/types/onboarding";

export const dynamic = "force-dynamic";

export default async function OnboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: state } = await supabase
    .from("onboarding_state")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_onboarded")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.is_onboarded) {
    redirect("/me");
  }

  const oauthName =
    typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : typeof user.user_metadata?.name === "string"
      ? user.user_metadata.name
      : null;

  return (
    <OnboardClient
      userId={user.id}
      isAnonymous={isAnonymousUser(user)}
      oauthName={oauthName}
      initialState={state as OnboardingState | null}
    />
  );
}
