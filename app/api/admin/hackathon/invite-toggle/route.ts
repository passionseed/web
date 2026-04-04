import { NextRequest, NextResponse } from "next/server";
import { setInviteEnabled, isInviteEnabled } from "@/lib/hackathon/invites";

export async function GET() {
  const enabled = await isInviteEnabled();
  return NextResponse.json({ enabled });
}

export async function POST(req: NextRequest) {
  const { enabled } = await req.json();
  await setInviteEnabled(Boolean(enabled));
  return NextResponse.json({ enabled: Boolean(enabled) });
}
