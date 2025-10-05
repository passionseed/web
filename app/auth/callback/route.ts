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

      // Enhanced profile creation with retry logic for production
      let profileData = null;
      let profileError = null;
      let retryCount = 0;
      const maxRetries = 3;
      
      // Retry logic to handle timing issues in production
      while (retryCount < maxRetries) {
        // Wait longer for trigger to complete (production needs more time)
        const waitTime = 200 + (retryCount * 300); // 200ms, 500ms, 800ms
        await new Promise(resolve => setTimeout(resolve, waitTime));
        
        const result = await supabase
          .from("profiles")
          .select("full_name, username, date_of_birth, email")
          .eq("id", userId)
          .single();
          
        profileData = result.data;
        profileError = result.error;
        
        if (!profileError) {
          console.log(`Profile found on attempt ${retryCount + 1}:`, profileData);
          break;
        }
        
        if (profileError.code !== "PGRST116") {
          // Not a "not found" error, break and handle
          break;
        }
        
        retryCount++;
        console.log(`Profile not found, retry ${retryCount}/${maxRetries} for user:`, userId);
      }

      let redirectTo = next;

      if (profileError && profileError.code === "PGRST116") {
        // Profile still doesn't exist after retries, try fallback creation
        console.log("Attempting fallback profile creation for user:", userId);
        
        try {
          const fallbackUsername = data.user.email?.split('@')[0] || `user_${userId.slice(0, 8)}`;
          
          const { data: newProfile, error: createError } = await supabase
            .from("profiles")
            .insert({
              id: userId,
              email: data.user.email,
              username: fallbackUsername,
              full_name: data.user.user_metadata?.full_name || data.user.user_metadata?.name || null,
              avatar_url: data.user.user_metadata?.avatar_url || null,
              date_of_birth: null
            })
            .select("full_name, username, date_of_birth, email")
            .single();
            
          if (createError) {
            console.error("Fallback profile creation failed:", createError);
            return NextResponse.redirect(`${origin}/auth/auth-code-error?error=profile_creation_failed&details=${encodeURIComponent(createError.message)}`);
          }
          
          profileData = newProfile;
          console.log("Fallback profile created successfully:", profileData);
          
        } catch (fallbackError) {
          console.error("Exception during fallback profile creation:", fallbackError);
          return NextResponse.redirect(`${origin}/auth/auth-code-error?error=profile_creation_failed&details=fallback_failed`);
        }
      } else if (profileError) {
        console.error("Error fetching profile:", profileError);
        return NextResponse.redirect(`${origin}/auth/auth-code-error?error=profile_fetch_failed&details=${encodeURIComponent(profileError.message)}`);
      }
      
      if (profileData) {
        // Check if profile data is incomplete
        const profile = profileData;
        if (!profile.full_name || !profile.username || !profile.date_of_birth) {
          redirectTo = `/auth/finish-profile?next=${encodeURIComponent(next)}`;
        }
        console.log("Final profile data:", profile);
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
