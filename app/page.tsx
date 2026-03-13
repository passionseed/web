import { LandingPageWrapper } from "@/components/landing-page-wrapper";
import { DashboardHome } from "@/components/dashboard-home";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Robust check for anonymous users
  const isAnonymous =
    user?.is_anonymous === true ||
    user?.app_metadata?.provider === "anonymous" ||
    user?.aud === "anonymous" ||
    false;

  // Check if logged-in user has completed their profile
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
      // Profile incomplete, redirect to finish profile
      redirect("/auth/finish-profile");
    }

    // Profile complete, redirect to /me
    redirect("/me");
  }

  return (
    <>
      {user && !isAnonymous ? (
        <DashboardHome user={user} />
      ) : (
        <LandingPageWrapper />
      )}
    </>
  );
}