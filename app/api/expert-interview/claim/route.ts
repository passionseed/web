import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Look up expert profile by claim token (not expired)
  const { data: profile, error } = await supabase
    .from("expert_profiles")
    .select("id, email, status, claim_token_expires_at")
    .eq("claim_token", token)
    .gt("claim_token_expires_at", new Date().toISOString())
    .single();

  if (error || !profile) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://passionseed.com";
    return NextResponse.redirect(`${appUrl}/expert-interview/claimed?error=invalid_token`);
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://passionseed.com";
  const redirectTo = `${appUrl}/expert-interview/claimed?profileId=${profile.id}`;

  // Generate a magic link for the expert to log in
  const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
    type: "magiclink",
    email: profile.email,
    options: { redirectTo },
  });

  if (linkError || !linkData?.properties?.action_link) {
    console.error("[expert-interview/claim] failed to generate magic link", linkError);
    // Fallback: mark as claimed and redirect directly
    await supabase
      .from("expert_profiles")
      .update({
        status: "claimed",
        claim_token: null,
        claim_token_expires_at: null,
      })
      .eq("id", profile.id);

    return NextResponse.redirect(redirectTo);
  }

  // Clear the claim token now (single-use)
  await supabase
    .from("expert_profiles")
    .update({
      status: "claimed",
      claim_token: null,
      claim_token_expires_at: null,
    })
    .eq("id", profile.id);

  // Redirect expert to Supabase magic link — on auth, Supabase will redirect to redirectTo
  return NextResponse.redirect(linkData.properties.action_link);
}
