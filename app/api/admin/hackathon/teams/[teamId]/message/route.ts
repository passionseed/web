import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { z } from "zod";

const messageSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(5000),
});

function getServiceClient() {
  return createServiceClient(
    process.env.HACKATHON_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.HACKATHON_SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

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

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const { teamId } = await params;
  const parsed = messageSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const serviceClient = getServiceClient();

  const { data: members, error: membersError } = await serviceClient
    .from("hackathon_team_members")
    .select("participant_id")
    .eq("team_id", teamId);

  if (membersError || !members?.length) {
    return NextResponse.json({ error: "No team members found" }, { status: 404 });
  }

  const inboxItems = members.map((m) => ({
    participant_id: m.participant_id,
    type: "admin_message",
    title: parsed.data.title,
    body: parsed.data.body,
    action_url: "/hackathon/dashboard",
    metadata: { team_id: teamId, sent_by: admin.id },
  }));

  const { error: insertError } = await serviceClient
    .from("hackathon_participant_inbox_items")
    .insert(inboxItems);

  if (insertError) {
    console.error("[admin/hackathon/teams/message] inbox insert error:", insertError);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }

  return NextResponse.json({ sent: inboxItems.length });
}
