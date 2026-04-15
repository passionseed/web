import { NextRequest, NextResponse } from "next/server";
import { b2 } from "@/lib/backblaze";
import { getSessionParticipant } from "@/lib/hackathon/db";
import { createClient } from "@supabase/supabase-js";
import { createClient as createMainClient } from "@/utils/supabase/server";

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"];
const ALLOWED_FILE_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

function getHackathonAuthClient() {
  const url = process.env.HACKATHON_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.HACKATHON_SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key);
}

function extractToken(req: NextRequest): string | null {
  const auth = req.headers.get("authorization") ?? "";
  if (auth.startsWith("Bearer ")) return auth.slice(7);
  return null;
}

function fileExtension(filename: string): string {
  return filename.split(".").pop()?.toLowerCase() ?? "bin";
}

export async function POST(req: NextRequest) {
  const token = extractToken(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getHackathonAuthClient();
  const participant = await getSessionParticipant(token, supabase);
  if (!participant) return NextResponse.json({ error: "Invalid or expired session" }, { status: 401 });

  const contentType = req.headers.get("content-type") ?? "";

  let activityId: string;
  let assessmentId: string;
  let textAnswer: string | null = null;
  let uploadedUrl: string | null = null;
  let uploadedFileUrls: string[] | null = null;

  if (contentType.includes("application/json")) {
    const body = await req.json();
    activityId = body.activityId;
    assessmentId = body.assessmentId;
    textAnswer = body.textAnswer ?? null;
    if (!activityId || !assessmentId) {
      return NextResponse.json({ error: "activityId and assessmentId are required" }, { status: 400 });
    }
  } else {
    const formData = await req.formData();
    activityId = formData.get("activityId") as string;
    assessmentId = formData.get("assessmentId") as string;
    const file = formData.get("file") as File | null;

    if (!activityId || !assessmentId || !file) {
      return NextResponse.json({ error: "activityId, assessmentId and file are required" }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });
    }
    const isImage = ALLOWED_IMAGE_TYPES.includes(file.type);
    const isDoc = ALLOWED_FILE_TYPES.includes(file.type);
    if (!isImage && !isDoc) {
      return NextResponse.json({ error: "File type not allowed" }, { status: 400 });
    }

    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const ext = fileExtension(file.name);
    const path = `hackathon/${participant.id}/${activityId}/${timestamp}_${random}.${ext}`;
    const result = await b2.uploadFile(file, participant.id, activityId, path);

    if (isImage) {
      uploadedUrl = result.fileUrl;
    } else {
      uploadedFileUrls = [result.fileUrl];
    }
  }

  // Look up the activity's submission_scope
  const { data: activity } = await supabase
    .from("hackathon_phase_activities")
    .select("submission_scope")
    .eq("id", activityId)
    .single();

  const scope = (activity as any)?.submission_scope ?? "individual";
  const now = new Date().toISOString();

  if (scope === "team") {
    // Find participant's team
    const { data: membership } = await supabase
      .from("hackathon_team_members")
      .select("team_id")
      .eq("participant_id", participant.id)
      .maybeSingle();

    if (!membership) {
      return NextResponse.json({ error: "You must be in a team to submit a team activity" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("hackathon_phase_activity_team_submissions")
      .upsert(
        {
          team_id: membership.team_id,
          activity_id: activityId,
          assessment_id: assessmentId,
          submitted_by: participant.id,
          text_answer: textAnswer,
          image_url: uploadedUrl,
          file_urls: uploadedFileUrls,
          status: "submitted",
          submitted_at: now,
          updated_at: now,
        },
        { onConflict: "team_id,activity_id" }
      )
      .select("id")
      .single();

    if (error) {
      console.error("[hackathon/submit] team DB error:", error.message);
      return NextResponse.json({ error: "Failed to save submission", detail: error.message }, { status: 500 });
    }

    return NextResponse.json({ submissionId: data.id, url: uploadedUrl ?? uploadedFileUrls?.[0] ?? null });
  }

  // Individual submission
  const { data, error } = await supabase
    .from("hackathon_phase_activity_submissions")
    .upsert(
      {
        participant_id: participant.id,
        activity_id: activityId,
        assessment_id: assessmentId,
        text_answer: textAnswer,
        image_url: uploadedUrl,
        file_urls: uploadedFileUrls,
        status: "submitted",
        submitted_at: now,
        updated_at: now,
      },
      { onConflict: "participant_id,activity_id" }
    )
    .select("id")
    .single();

  if (error) {
    console.error("[hackathon/submit] individual DB error:", error.message);
    return NextResponse.json({ error: "Failed to save submission", detail: error.message }, { status: 500 });
  }

  const mainSupabase = createMainClient();
  await mainSupabase.from("funnel_events").insert({
    user_id: participant.id,
    event_name: "hackathon_activity_complete",
    metadata: {
      activity_id: activityId,
      assessment_id: assessmentId,
      submission_type: uploadedUrl ? "image" : uploadedFileUrls ? "file" : "text",
    },
  });

  return NextResponse.json({ submissionId: data.id, url: uploadedUrl ?? uploadedFileUrls?.[0] ?? null });
}
