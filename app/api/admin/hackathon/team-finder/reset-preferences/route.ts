import { NextResponse } from "next/server";
import { resetAllPreferences } from "@/lib/hackathon/team-finder";
import { requireAdmin, safeServerError } from "@/lib/security/route-guards";

export async function POST() {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;
  try {
    await resetAllPreferences();
    return NextResponse.json({ success: true });
  } catch (err) {
    return safeServerError("Failed to reset preferences", err);
  }
}
