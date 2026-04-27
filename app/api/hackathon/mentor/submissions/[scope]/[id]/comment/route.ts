import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getMentorBySessionToken, MENTOR_SESSION_COOKIE } from "@/lib/hackathon/mentor-db";
import { createClient as createServiceClient } from "@supabase/supabase-js";

const commentSchema = z.object({
  content: z.string().min(1).max(2000),
});

function getClient() {
  return createServiceClient(
    process.env.HACKATHON_SUPABASE_URL!,
    process.env.HACKATHON_SUPABASE_SERVICE_ROLE_KEY!
  );
}

function pickOne<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ scope: string; id: string }> }
) {
  const token = req.cookies.get(MENTOR_SESSION_COOKIE)?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const mentor = await getMentorBySessionToken(token);
  if (!mentor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { scope: rawScope, id } = await params;
  if (rawScope !== "individual" && rawScope !== "team") {
    return NextResponse.json({ error: "Invalid submission scope" }, { status: 400 });
  }

  const parsed = commentSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid comment payload" }, { status: 400 });
  }

  const scope = rawScope;
  const db = getClient();
  const table =
    scope === "individual"
      ? "hackathon_phase_activity_submissions"
      : "hackathon_phase_activity_team_submissions";

  const { data: submission, error: submissionError } = await db
    .from(table)
    .select(`*, hackathon_phase_activities(id, title)`)
    .eq("id", id)
    .single();

  if (submissionError || !submission) {
    return NextResponse.json({ error: "Submission not found" }, { status: 404 });
  }

  // Verify mentor is assigned to this team
  let teamId: string | null = null;
  if (scope === "team") {
    teamId = (submission as any).team_id ?? null;
  } else {
    const { data: mem } = await db
      .from("hackathon_team_members")
      .select("team_id")
      .eq("participant_id", (submission as any).participant_id)
      .maybeSingle();
    teamId = (mem as any)?.team_id ?? null;
  }

  if (!teamId) {
    return NextResponse.json({ error: "Could not determine team for this submission" }, { status: 400 });
  }

  const { data: assignment } = await db
    .from("mentor_team_assignments")
    .select("id")
    .eq("mentor_id", mentor.id)
    .eq("team_id", teamId)
    .maybeSingle();

  if (!assignment) {
    return NextResponse.json({ error: "You are not assigned to this team" }, { status: 403 });
  }

  const activity = pickOne((submission as any).hackathon_phase_activities);
  const content = parsed.data.content.trim();
  const now = new Date().toISOString();

  // Get recipient participant IDs
  let recipientParticipantIds: string[] = [];
  if (scope === "individual") {
    const pid = (submission as any).participant_id;
    if (pid) recipientParticipantIds = [pid];
  } else {
    const { data: members } = await db
      .from("hackathon_team_members")
      .select("participant_id")
      .eq("team_id", teamId);
    recipientParticipantIds = ((members ?? []) as Array<{ participant_id: string }>)
      .map((m) => m.participant_id)
      .filter(Boolean);
  }

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
          commented_by_user_id: null,
        }
      : {
          submission_scope: scope,
          individual_submission_id: null,
          team_submission_id: id,
          content,
          commented_by_user_id: null,
        };

  const { data: savedComment, error: commentError } = await db
    .from("hackathon_submission_admin_comments")
    .insert(commentPayload)
    .select("*")
    .single();

  if (commentError) {
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
      commented_by: "mentor",
      mentor_name: mentor.full_name ?? "Mentor",
    },
  }));

  const { error: inboxError } = await db
    .from("hackathon_participant_inbox_items")
    .insert(inboxItems);

  if (inboxError) {
    return NextResponse.json({ error: "Comment saved but notification failed" }, { status: 500 });
  }

  return NextResponse.json({
    comment: savedComment,
    inbox_count: inboxItems.length,
    commented_at: now,
  });
}
