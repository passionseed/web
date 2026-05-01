import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import webpush from "web-push";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  const { data: roles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin");
  return roles?.length ? user : null;
}

/** POST — send a test push to the admin's own browser subscription */
export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) {
    return NextResponse.json({ error: "VAPID keys not configured" }, { status: 500 });
  }
  webpush.setVapidDetails("mailto:hi@passionseed.org", publicKey, privateKey);

  const { subscription, title, body, url } = await req.json();
  if (!subscription?.endpoint || !title || !body) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  try {
    await webpush.sendNotification(subscription, JSON.stringify({ title, body, url: url || "/" }));
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("Test push failed:", err);
    return NextResponse.json({ error: err?.message || "Push failed" }, { status: 500 });
  }
}
