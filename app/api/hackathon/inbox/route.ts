import { NextRequest, NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { SESSION_COOKIE } from "@/lib/hackathon/auth";
import { getSessionParticipant } from "@/lib/hackathon/db";

function getHackathonServiceClient() {
  return createServiceClient(
    process.env.HACKATHON_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.HACKATHON_SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function extractToken(req: NextRequest): string | null {
  const auth = req.headers.get("authorization") ?? "";
  if (auth.startsWith("Bearer ")) return auth.slice(7);
  return req.cookies.get(SESSION_COOKIE)?.value ?? null;
}

async function requireParticipant(req: NextRequest) {
  const token = extractToken(req);
  if (!token) return { participant: null, serviceClient: getHackathonServiceClient() };

  const serviceClient = getHackathonServiceClient();
  const participant = await getSessionParticipant(token, serviceClient as any);
  return { participant, serviceClient };
}

export async function GET(req: NextRequest) {
  const { participant, serviceClient } = await requireParticipant(req);
  if (!participant) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await serviceClient
    .from("hackathon_participant_inbox_items")
    .select("*")
    .eq("participant_id", participant.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("[hackathon/inbox] fetch error", error);
    return NextResponse.json({ error: "Failed to fetch inbox" }, { status: 500 });
  }

  const unread_count = (data ?? []).filter((item) => !item.read_at).length;
  return NextResponse.json({ items: data ?? [], unread_count });
}

export async function PATCH(req: NextRequest) {
  const { participant, serviceClient } = await requireParticipant(req);
  if (!participant) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const now = new Date().toISOString();
  let query = serviceClient
    .from("hackathon_participant_inbox_items")
    .update({ read_at: now, updated_at: now })
    .eq("participant_id", participant.id)
    .is("read_at", null);

  if (typeof body.id === "string" && body.id) {
    query = query.eq("id", body.id);
  }

  const { error } = await query;
  if (error) {
    console.error("[hackathon/inbox] mark read error", error);
    return NextResponse.json({ error: "Failed to update inbox" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
