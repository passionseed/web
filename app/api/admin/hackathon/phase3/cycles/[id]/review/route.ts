import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { z } from "zod";
import { recalculateAndUpsertTeamScore } from "@/lib/hackathon/team-score";
import { buildReviewInboxItems } from "@/lib/hackathon/admin-submissions";
import { sendInboxPushNotification } from "@/lib/hackathon/push-notify";

const reviewSchema = z.object({
  hypothesis_quality: z.number().min(0).max(20).optional(),
  variable_isolation: z.number().min(0).max(20).optional(),
  behavioral_evidence: z.number().min(0).max(20).optional(),
  tester_freshness: z.number().min(0).max(20).optional(),
  synthesis_honesty: z.number().min(0).max(20).optional(),
  feedback: z.string().max(10000).optional(),
  notes: z.string().max(10000).optional(),
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

  const { data: roles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin");

  return roles?.length ? user : null;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const { id } = await params;
  const parsed = reviewSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid review payload", details: parsed.error.flatten() }, { status: 400 });
  }

  const serviceClient = getHackathonServiceClient();

  const { data: cycle } = await serviceClient
    .from("hackathon_phase3_cycles")
    .select("team_id")
    .eq("id", id)
    .single();

  if (!cycle) {
    return NextResponse.json({ error: "Cycle not found" }, { status: 404 });
  }

  const data = parsed.data;
  const scores = {
    hypothesis_quality: data.hypothesis_quality ?? 0,
    variable_isolation: data.variable_isolation ?? 0,
    behavioral_evidence: data.behavioral_evidence ?? 0,
    tester_freshness: data.tester_freshness ?? 0,
    synthesis_honesty: data.synthesis_honesty ?? 0,
    total:
      (data.hypothesis_quality ?? 0) +
      (data.variable_isolation ?? 0) +
      (data.behavioral_evidence ?? 0) +
      (data.tester_freshness ?? 0) +
      (data.synthesis_honesty ?? 0),
  };

  const updateResult = await serviceClient
    .from("hackathon_phase3_cycles")
    .update({
      mentor_score: scores,
      mentor_feedback: data.feedback ?? null,
      mentor_notes: data.notes ?? null,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (updateResult.error) {
    console.error("[phase3/cycles/review] update error", updateResult.error);
    return NextResponse.json({ error: "Failed to save review" }, { status: 500 });
  }

  // Recalculate team score (non-blocking)
  recalculateAndUpsertTeamScore(serviceClient, (cycle as any).team_id).catch((err) => {
    console.error("[phase3/cycles/review] score recalc error", err);
  });

  // Notify team participants in app
  const { data: members } = await serviceClient
    .from("hackathon_team_members")
    .select("participant_id")
    .eq("team_id", (cycle as any).team_id);
  const participantIds = ((members ?? []) as Array<{ participant_id: string }>).map((m) => m.participant_id).filter(Boolean);

  if (participantIds.length > 0) {
    const inboxItems = buildReviewInboxItems({
      submissionScope: "team",
      recipientParticipantIds: participantIds,
      activityTitle: `Phase 3 Cycle ${(updateResult.data as any)?.cycle_number ?? ""}`,
      reviewStatus: scores.total >= 60 ? "passed" : "revision_required",
      scoreAwarded: scores.total,
      pointsPossible: 100,
      feedback: data.feedback ?? "",
      submissionId: id,
    });
    const { error: inboxError } = await serviceClient.from("hackathon_participant_inbox_items").insert(inboxItems);
    if (inboxError) {
      console.error("[phase3/cycles/review] inbox insert error", inboxError);
    }

    // Push notification
    sendInboxPushNotification({
      serviceClient,
      participantIds,
      title: inboxItems[0]?.title ?? "Phase 3 Review",
      body: inboxItems[0]?.body ?? "Your submission has been reviewed.",
      url: "/hackathon/dashboard",
    }).catch((err) => {
      console.error("[phase3/cycles/review] push notify error", err);
    });
  }

  return NextResponse.json({
    review: updateResult.data,
    scorecard: scores,
    feedback: data.feedback ?? null,
  });
}
