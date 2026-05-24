import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { z } from "zod";
import { recalculateAndUpsertTeamScore } from "@/lib/hackathon/team-score";
import { buildReviewInboxItems } from "@/lib/hackathon/admin-submissions";
import { sendInboxPushNotification } from "@/lib/hackathon/push-notify";

const reviewSchema = z.object({
  judge_scores: z.record(z.number().min(0).max(100)).optional(),
  total_score: z.number().min(0).max(100).optional(),
  notes: z.string().max(10000).optional(),
  human_review_status: z.enum(["pending", "flagged", "cleared", "reviewed"]).optional(),
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
  const { data: row } = await serviceClient.from("hackathon_phase3_video_submissions").select("team_id").eq("id", id).single();
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data = parsed.data;
  const now = new Date().toISOString();

  const judgeScores = data.judge_scores
    ? { ...data.judge_scores, total: data.total_score ?? Object.values(data.judge_scores).reduce((a, b) => a + b, 0) }
    : null;

  const updateResult = await serviceClient
    .from("hackathon_phase3_video_submissions")
    .update({
      judge_scores: judgeScores,
      human_reviewer_notes: data.notes ?? null,
      human_review_status: data.human_review_status ?? "reviewed",
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
      activityTitle: "Phase 3 Video Submission",
      reviewStatus: (data.total_score ?? 0) >= 60 ? "passed" : "revision_required",
      scoreAwarded: data.total_score ?? null,
      pointsPossible: 100,
      feedback: data.notes ?? "",
      submissionId: id,
    });
    const { error: inboxError } = await serviceClient.from("hackathon_participant_inbox_items").insert(inboxItems);
    if (inboxError) {
      console.error("[phase3/video/review] inbox insert error", inboxError);
    }

    sendInboxPushNotification({
      serviceClient,
      participantIds,
      title: inboxItems[0]?.title ?? "Phase 3 Review",
      body: inboxItems[0]?.body ?? "Your submission has been reviewed.",
      url: "/hackathon/dashboard",
    }).catch((err) => {
      console.error("[phase3/video/review] push notify error", err);
    });
  }

  return NextResponse.json({ review: updateResult.data });
}
