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
      const { error: profileError } = await supabase
        .from("profiles")
        .upsert({ id: userId }, { onConflict: "id" });

      if (profileError) {
        console.error("Error creating/upserting profile:", profileError);
        // Optionally handle this error more gracefully, e.g., redirect to an error page
        // For now, we'll still redirect to finish-profile, which should handle cases where profile data might be incomplete.
      }

      const finishProfileRedirectUrl = `/auth/finish-profile?next=${encodeURIComponent(next)}`;
      const forwardedHost = request.headers.get("x-forwarded-host"); // original origin before load balancer
      const isLocalEnv = process.env.NODE_ENV === "development";

      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${finishProfileRedirectUrl}`);
      } else if (forwardedHost) {
        return NextResponse.redirect(
          `https://${forwardedHost}${finishProfileRedirectUrl}`
        );
      } else {
        return NextResponse.redirect(`${origin}${finishProfileRedirectUrl}`);
      }
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}
