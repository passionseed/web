import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log("🔍 [DEBUG USER] Diagnostic endpoint called");
  
  try {
    const supabase = await createClient();
    const { id: userId } = await params;

    console.log("🎯 [DEBUG USER] Looking up user:", userId);

    // Check profiles table
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    console.log("📊 [DEBUG USER] Profile data:", profile);
    console.log("❌ [DEBUG USER] Profile error:", profileError);

    // Check if ANY profiles exist in the table
    const { data: allProfiles, error: allProfilesError } = await supabase
      .from("profiles")
      .select("id, username, email, full_name")
      .limit(5);
    
    console.log("🔍 [DEBUG USER] Sample profiles in table:", allProfiles);
    console.log("📊 [DEBUG USER] Total profiles count:", allProfiles?.length || 0);

    // Check auth.users table - try to get specific user
    let authUser = null;
    let authError = null;
    
    try {
      // Try to get user by ID directly (more efficient than listing all)
      const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);
      authUser = userData?.user || null;
      authError = userError;
    } catch (error) {
      console.log("🔒 [DEBUG] Auth admin access failed, trying alternative method:", error);
      // Fallback: try to get from auth metadata if available
      authError = { message: "Auth admin access denied", originalError: error };
    }

    console.log("👤 [DEBUG USER] Auth user data:", authUser);
    console.log("❌ [DEBUG USER] Auth error:", authError);

    return NextResponse.json({
      userId,
      profile: {
        data: profile,
        error: profileError
      },
      authUser: {
        data: authUser || null,
        error: authError
      }
    });

  } catch (error) {
    console.error("💥 [DEBUG USER] Error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error },
      { status: 500 }
    );
  }
}