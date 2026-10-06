import { LoginForm } from "@/components/login-form";
import { isAnonymousUser } from "@/lib/supabase/auth";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import {
  isProfileComplete,
  PROFILE_COMPLETION_SELECT,
} from "@/lib/profile-completion";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const next = params?.next?.startsWith("/") ? params.next : "/me";
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (data.user && !isAnonymousUser(data.user)) {
    // Check if profile is complete before redirecting
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select(`${PROFILE_COMPLETION_SELECT}, is_onboarded`)
      .eq("id", data.user.id)
      .single();
    const { data: guardianConsent } = await supabase
      .from("profile_guardian_consents")
      .select("guardian_phone, guardian_relationship, consent_confirmed_at")
      .eq("user_id", data.user.id)
      .maybeSingle();

    if (
      profileError ||
      !isProfileComplete(profileData, guardianConsent) ||
      !profileData.is_onboarded
    ) {
      redirect(
        next === "/me" ? "/onboard" : `/onboard?next=${encodeURIComponent(next)}`
      );
    }

    redirect(next);
  }

  return (
    <div className="flex-1 flex items-center justify-center my-10">
      <LoginForm next={next} />
    </div>
  );
}
