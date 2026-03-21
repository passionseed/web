import { LandingPageWrapper } from "@/components/landing-page-wrapper";
import { isAnonymousUser } from "@/lib/supabase/auth";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function Home() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const isAnonymous = isAnonymousUser(user);

    if (user && isAnonymous) {
      const { data: anonProfile } = await supabase
        .from("profiles")
        .select("is_onboarded")
        .eq("id", user.id)
        .maybeSingle();

      if (anonProfile?.is_onboarded) {
        redirect("/me");
      }

      redirect("/onboard");
    }

    if (user && !isAnonymous) {
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("full_name, username, date_of_birth, is_onboarded")
        .eq("id", user.id)
        .single();

      if (!profileData?.is_onboarded) {
        redirect("/onboard");
      }

      if (
        profileError ||
        !profileData?.full_name ||
        !profileData?.username ||
        !profileData?.date_of_birth
      ) {
        redirect("/auth/finish-profile");
      }

      redirect("/me");
    }
  } catch {
    // Supabase unreachable or auth error — show landing page
  }

  return <LandingPageWrapper />;
}
