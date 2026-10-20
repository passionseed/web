import { NextRequest, NextResponse, after } from "next/server";
import { recordBrainEvent } from "@/lib/brain/events";
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
  const was = await isInviteEnabled();
  await setInviteEnabled(Boolean(enabled));
  // Company brain: only real changes, so a repeated click adds no log line.
  if (was !== Boolean(enabled)) {
    after(() =>
      recordBrainEvent(
        { type: enabled ? "hackathon_team_invites_opened" : "hackathon_team_invites_closed", payload: {} },
        "admin/hackathon/invite-toggle",
      ),
    );
  }
  return NextResponse.json({ enabled: Boolean(enabled) });
}
