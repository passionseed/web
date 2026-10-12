import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { isAnonymousUser } from "@/lib/supabase/auth";
import {
  isProfileComplete,
  PROFILE_COMPLETION_SELECT,
} from "@/lib/profile-completion";
import { OnboardClient } from "./onboard-client";
import type { AccountPrefill } from "./phases/account";
import type { OnboardingState } from "@/types/onboarding";

export const dynamic = "force-dynamic";

function asEducationLevel(
  value: string | null | undefined
): AccountPrefill["education_level"] {
  if (
    value === "high_school" ||
    value === "university" ||
    value === "unaffiliated"
  ) {
    return value;
  }
  return null;
}

export default async function OnboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ next?: string }>;
}) {
  // Where to land once onboarding finishes. Same-origin paths only, so the
  // param cannot be used as an open redirect.
  const params = await searchParams;
  const rawNext = params?.next;
  const nextAfterOnboarding =
    rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//")
      ? rawNext
      : null;

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
    .select(`is_onboarded, ${PROFILE_COMPLETION_SELECT}, education_level`)
    .eq("id", user.id)
    .maybeSingle();

  const { data: guardianConsent } = await supabase
    .from("profile_guardian_consents")
    .select("guardian_phone, guardian_relationship, consent_confirmed_at")
    .eq("user_id", user.id)
    .maybeSingle();

  // Mirrors the proxy's onboard gate. Redirecting on is_onboarded alone would
  // bounce an onboarded learner with a bad profile between here and the app.
  const profileComplete = isProfileComplete(profile, guardianConsent);
  if (profile?.is_onboarded && profileComplete) {
    redirect(nextAfterOnboarding ?? "/me");
  }

  const oauthName =
    typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : typeof user.user_metadata?.name === "string"
      ? user.user_metadata.name
      : null;

  return (
    <OnboardClient
      user={user}
      userId={user.id}
      isAnonymous={isAnonymousUser(user)}
      oauthName={oauthName}
      initialState={state as OnboardingState | null}
      // Onboarded learners only return here to fix their account details.
      initialStep={profile?.is_onboarded ? "account" : undefined}
      nextAfterOnboarding={nextAfterOnboarding}
      accountPrefill={{
        full_name: profile?.full_name ?? oauthName,
        username: profile?.username ?? null,
        date_of_birth: profile?.date_of_birth ?? null,
        education_level: asEducationLevel(profile?.education_level),
      }}
    />
  );
}
