import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { z } from "zod";

const commentSchema = z.object({
  content: z.string().min(1).max(2000),
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

function pickOne<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

async function getRecipientParticipantIds(params: {
  serviceClient: any;
  scope: string;
  submission: any;
}) {
  if (params.scope === "individual") {
    return [params.submission.participant_id].filter(Boolean);
  }

  const { data, error } = await params.serviceClient
    .from("hackathon_team_members")
    .select("participant_id")
    .eq("team_id", params.submission.team_id);

  if (error) throw error;
  return ((data ?? []) as Array<{ participant_id: string }>).map((member) => member.participant_id).filter(Boolean);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ scope: string; id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const { scope: rawScope, id } = await params;
  if (rawScope !== "individual" && rawScope !== "team") {
    return NextResponse.json({ error: "Invalid submission scope" }, { status: 400 });
  }

  const parsed = commentSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid comment payload" }, { status: 400 });
  }

  const scope = rawScope;
  const serviceClient = getHackathonServiceClient();
  const table =
    scope === "individual"
      ? "hackathon_phase_activity_submissions"
      : "hackathon_phase_activity_team_submissions";

  const { data: submission, error: submissionError } = await serviceClient
    .from(table)
    .select(`
      *,
      hackathon_phase_activities(id, title),
      hackathon_participants(id, name, email)
    `)
    .eq("id", id)
    .single();

  if (submissionError || !submission) {
    return NextResponse.json({ error: "Submission not found" }, { status: 404 });
  }

  const activity = pickOne((submission as any).hackathon_phase_activities);
  const content = parsed.data.content.trim();
  const now = new Date().toISOString();

  const recipientParticipantIds = await getRecipientParticipantIds({
    serviceClient,
    scope,
    submission,
  });

  if (recipientParticipantIds.length === 0) {
    return NextResponse.json({ error: "No participants found for submission" }, { status: 400 });
  }

  const commentPayload =
    scope === "individual"
      ? {
          submission_scope: scope,
          individual_submission_id: id,
          team_submission_id: null,
          content,
          commented_by_user_id: admin.id,
        }
      : {
          submission_scope: scope,
          individual_submission_id: null,
          team_submission_id: id,
          content,
          commented_by_user_id: admin.id,
        };

  const { data: savedComment, error: commentError } = await serviceClient
    .from("hackathon_submission_admin_comments")
    .insert(commentPayload)
    .select("*")
    .single();

  if (commentError) {
    console.error("[admin/hackathon/submissions/comment] comment insert error", commentError);
    return NextResponse.json({ error: "Failed to save comment" }, { status: 500 });
  }

  const inboxItems = recipientParticipantIds.map((participantId) => ({
    participant_id: participantId,
    type: "admin_comment" as const,
    title: `Feedback on ${activity?.title ?? "submission"}`,
    body: content,
    action_url: "/hackathon/dashboard",
    metadata: {
      submission_scope: scope,
      submission_id: id,
      activity_title: activity?.title ?? "",
      comment_id: savedComment.id,
      commented_by: "admin",
    },
  }));

  const { error: inboxError } = await serviceClient
    .from("hackathon_participant_inbox_items")
    .insert(inboxItems);

  if (inboxError) {
    console.error("[admin/hackathon/submissions/comment] inbox insert error", inboxError);
    return NextResponse.json({ error: "Comment saved but notification failed" }, { status: 500 });
  }

  return NextResponse.json({
    comment: savedComment,
    inbox_count: inboxItems.length,
    commented_at: now,
  });
}
