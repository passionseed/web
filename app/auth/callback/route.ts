import { NextResponse } from "next/server";
// The client you created from the Server-Side Auth instructions
import { createClient } from "@/utils/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // if "next" is in param, use it as the redirect URL
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.session && data.user) {
      const userId = data.user.id;
      // Attempt to create a profile entry.
      // This assumes a 'profiles' table with an 'id' column linked to auth.users.id.
      // Using upsert to avoid errors if the profile already exists or to create it.

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("full_name, username, date_of_birth")
        .eq("id", userId)
        .single();

      if (profileError && profileError.code !== "PGRST116") {
        // PGRST116 is 'No rows found'
        console.error("Error fetching profile:", profileError);
      }

      let redirectTo = next;

      // Check if profile data is incomplete
      if (profileData) {
        const profile = profileData;
        if (!profile.full_name || !profile.username || !profile.date_of_birth) {
          redirectTo = `/auth/finish-profile?next=${encodeURIComponent(next)}`;
        }
        console.log(profile, "profile");
      } else {
        // If no profile data is returned, assume it needs to be finished
        redirectTo = `/auth/finish-profile?next=${encodeURIComponent(next)}`;
      }

      console.log(redirectTo, "redirectTo");
      const forwardedHost = request.headers.get("x-forwarded-host"); // original origin before load balancer
      const isLocalEnv = process.env.NODE_ENV === "development";
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

      return NextResponse.redirect(`${siteUrl}${redirectTo}`);
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}
