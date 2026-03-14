import { LandingPageWrapper } from "@/components/landing-page-wrapper";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function Home() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const isAnonymous =
      user?.is_anonymous === true ||
      user?.app_metadata?.provider === "anonymous" ||
      user?.aud === "anonymous" ||
      false;

    if (user && !isAnonymous) {
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("full_name, username, date_of_birth")
        .eq("id", user.id)
        .single();

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