import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { z } from "zod";
import { recalculateAndUpsertTeamScore } from "@/lib/hackathon/team-score";
import { buildReviewInboxItems } from "@/lib/hackathon/admin-submissions";
import { sendInboxPushNotification } from "@/lib/hackathon/push-notify";

const reviewSchema = z.object({
  confidence_score: z.number().min(1).max(10).optional(),
  feedback: z.string().max(5000).optional(),
  notes: z.string().max(2000).optional(),
});

function getHackathonServiceClient() {
  return createServiceClient(
    process.env.HACKATHON_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.HACKATHON_SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin");
  return roles?.length ? user : null;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  const { id } = await params;
  const parsed = reviewSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });

  const serviceClient = getHackathonServiceClient();
  const { data: row } = await serviceClient.from("hackathon_phase3_midphase_synthesis").select("team_id").eq("id", id).single();
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data = parsed.data;
  const now = new Date().toISOString();

  const updateResult = await serviceClient
    .from("hackathon_phase3_midphase_synthesis")
    .update({
      confidence_score: data.confidence_score ?? null,
      mentor_notes: data.notes ?? null,
      updated_at: now,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (updateResult.error) return NextResponse.json({ error: "Failed to save review" }, { status: 500 });

  recalculateAndUpsertTeamScore(serviceClient, (row as any).team_id).catch(() => {});

  // Notify team participants in app
  const { data: members } = await serviceClient
    .from("hackathon_team_members")
    .select("participant_id")
    .eq("team_id", (row as any).team_id);
  const participantIds = ((members ?? []) as Array<{ participant_id: string }>).map((m) => m.participant_id).filter(Boolean);

  if (participantIds.length > 0) {
    const inboxItems = buildReviewInboxItems({
      submissionScope: "team",
      recipientParticipantIds: participantIds,
      activityTitle: "Phase 3 Mid-phase Synthesis",
      reviewStatus: (data.confidence_score ?? 0) >= 6 ? "passed" : "revision_required",
      scoreAwarded: data.confidence_score ?? null,
      pointsPossible: 10,
      feedback: data.feedback ?? "",
      submissionId: id,
    });
    const { error: inboxError } = await serviceClient.from("hackathon_participant_inbox_items").insert(inboxItems);
    if (inboxError) {
      console.error("[phase3/midphase/review] inbox insert error", inboxError);
    }

    sendInboxPushNotification({
      serviceClient,
      participantIds,
      title: inboxItems[0]?.title ?? "Phase 3 Review",
      body: inboxItems[0]?.body ?? "Your submission has been reviewed.",
      url: "/hackathon/dashboard",
    }).catch((err) => {
      console.error("[phase3/midphase/review] push notify error", err);
    });
  }

  return NextResponse.json({ review: updateResult.data });
}
