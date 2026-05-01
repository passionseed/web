import { NextRequest, NextResponse } from "next/server";
import { getSessionParticipant } from "@/lib/hackathon/db";
import { getCorsHeaders, extractHackathonToken } from "@/lib/hackathon/auth";
import { createClient as createServiceClient } from "@supabase/supabase-js";

function getServiceClient() {
  return createServiceClient(
    process.env.HACKATHON_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.HACKATHON_SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: getCorsHeaders(req) });
}

/** POST — save or update a web push subscription for the current participant */
export async function POST(req: NextRequest) {
  const corsHeaders = getCorsHeaders(req);
  const token = extractHackathonToken(req);
  if (!token) return NextResponse.json({ error: "Not authenticated" }, { status: 401, headers: corsHeaders });

  const participant = await getSessionParticipant(token);
  if (!participant) return NextResponse.json({ error: "Invalid session" }, { status: 401, headers: corsHeaders });

  const { subscription } = (await req.json()) as { subscription: PushSubscriptionJSON };
  if (!subscription?.endpoint) return NextResponse.json({ error: "Invalid subscription" }, { status: 400, headers: corsHeaders });

  const pushToken = JSON.stringify(subscription);
  const serviceClient = getServiceClient();

  // Upsert: if this exact subscription exists, update last_used_at; otherwise insert
  const { error } = await serviceClient
    .from("hackathon_participant_push_tokens")
    .upsert(
      {
        participant_id: participant.id,
        push_token: pushToken,
        platform: "web",
        last_used_at: new Date().toISOString(),
      },
      { onConflict: "push_token" }
    );

  if (error) {
    console.error("Failed to save push subscription:", error);
    return NextResponse.json({ error: "Failed to save" }, { status: 500, headers: corsHeaders });
  }

  return NextResponse.json({ ok: true }, { headers: corsHeaders });
}

/** DELETE — remove push subscription for the current participant */
export async function DELETE(req: NextRequest) {
  const corsHeaders = getCorsHeaders(req);
  const token = extractHackathonToken(req);
  if (!token) return NextResponse.json({ error: "Not authenticated" }, { status: 401, headers: corsHeaders });

  const participant = await getSessionParticipant(token);
  if (!participant) return NextResponse.json({ error: "Invalid session" }, { status: 401, headers: corsHeaders });

  const { endpoint } = (await req.json()) as { endpoint: string };
  if (!endpoint) return NextResponse.json({ error: "Missing endpoint" }, { status: 400, headers: corsHeaders });

  const serviceClient = getServiceClient();
  await serviceClient
    .from("hackathon_participant_push_tokens")
    .delete()
    .eq("participant_id", participant.id)
    .like("push_token", `%${endpoint}%`);

  return NextResponse.json({ ok: true }, { headers: corsHeaders });
}
