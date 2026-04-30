import { NextRequest, NextResponse } from "next/server";
import { setInviteEnabled, isInviteEnabled } from "@/lib/hackathon/invites";
import { requireAdmin } from "@/lib/security/route-guards";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;
  const enabled = await isInviteEnabled();
  return NextResponse.json({ enabled });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;
  const { enabled } = await req.json();
  await setInviteEnabled(Boolean(enabled));
  return NextResponse.json({ enabled: Boolean(enabled) });
}
