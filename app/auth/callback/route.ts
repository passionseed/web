import { NextResponse } from "next/server";
// The client you created from the Server-Side Auth instructions
import { createClient } from "@/utils/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // if "next" is in param, use it as the redirect URL
  const next = searchParams.get("next") ?? "/";

  if (code) {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      
      if (error) {
        console.error("Auth exchange error:", error);
        return NextResponse.redirect(`${origin}/auth/auth-code-error?error=auth_exchange&error_code=${error.message?.replace(/\s+/g, '_')}&error_description=${encodeURIComponent(error.message || 'Authentication exchange failed')}`);
      }

      if (data.session && data.user) {
        const user = data.user;
        const userId = user.id;

        try {
          // First, try to get existing profile
          const { data: profileData, error: profileError } = await supabase
            .from("profiles")
            .select("id, full_name, username, avatar_url")
            .eq("id", userId)
            .single();

          // If profile doesn't exist, create it
          if (profileError && profileError.code === "PGRST116") {
            console.log("Creating new profile for user:", userId);
            
            // Extract user info from auth metadata
            const fullName = user.user_metadata?.full_name || user.user_metadata?.name || null;
            const username = user.user_metadata?.preferred_username || 
                           user.email?.split('@')[0] || 
                           `user_${userId.slice(0, 8)}`;
            const avatarUrl = user.user_metadata?.avatar_url || null;

            const { data: newProfile, error: createError } = await supabase
              .from("profiles")
              .insert({
                id: userId,
                email: user.email,
                full_name: fullName,
                username: username,
                avatar_url: avatarUrl
              })
              .select("id, full_name, username")
              .single();

            if (createError) {
              console.error("Profile creation error:", createError);
              return NextResponse.redirect(`${origin}/auth/auth-code-error?error=profile_creation&error_code=database_error&error_description=${encodeURIComponent('Failed to create user profile: ' + createError.message)}`);
            }

            console.log("Profile created successfully:", newProfile);
          } else if (profileError) {
            console.error("Profile fetch error:", profileError);
            return NextResponse.redirect(`${origin}/auth/auth-code-error?error=profile_fetch&error_code=database_error&error_description=${encodeURIComponent('Failed to fetch user profile: ' + profileError.message)}`);
          }

          // Successfully authenticated and profile handled
          const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || origin;
          return NextResponse.redirect(`${siteUrl}${next}`);
        } catch (profileErr) {
          console.error("Profile handling error:", profileErr);
          return NextResponse.redirect(`${origin}/auth/auth-code-error?error=profile_handling&error_code=unexpected_error&error_description=${encodeURIComponent('Unexpected error during profile handling')}`);
        }
      }
    } catch (err) {
      console.error("Callback error:", err);
      return NextResponse.redirect(`${origin}/auth/auth-code-error?error=callback_error&error_code=unexpected_failure&error_description=${encodeURIComponent('Unexpected error during authentication')}`);
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error?error=missing_code&error_code=invalid_request&error_description=${encodeURIComponent('No authorization code provided')}`);
}
