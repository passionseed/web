import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

/**
 * Claim an expert profile from the link in the submission email.
 *
 * The email is a Supabase magic link whose redirect lands here, so by the time
 * a real expert arrives they are already signed in as the address the email
 * went to. This route only marks the profile claimed when the signed-in email
 * matches. It never mints a login link itself: doing that let anyone who could
 * get a token row in front of it sign in as any email address.
 */
export async function GET(request: NextRequest) {
  const appUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://passionseed.org";
  const token = request.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email || user.is_anonymous) {
    const next = `/api/expert-interview/claim?token=${encodeURIComponent(token)}`;
    return NextResponse.redirect(
      `${appUrl}/login?next=${encodeURIComponent(next)}`
    );
  }

  const admin = createAdminClient();
  const { data: profile, error } = await admin
    .from("expert_profiles")
    .select("id, email")
    .eq("claim_token", token)
    .gt("claim_token_expires_at", new Date().toISOString())
    .single();

  const signedInEmail = user.email.trim().toLowerCase();
  if (error || !profile || profile.email.trim().toLowerCase() !== signedInEmail) {
    return NextResponse.redirect(
      `${appUrl}/expert-interview/claimed?error=invalid_token`
    );
  }

  // Single use: clear the token as the profile is claimed.
  await admin
    .from("expert_profiles")
    .update({
      status: "claimed",
      claim_token: null,
      claim_token_expires_at: null,
    })
    .eq("id", profile.id);

  return NextResponse.redirect(
    `${appUrl}/expert-interview/claimed?profileId=${profile.id}`
  );
}
