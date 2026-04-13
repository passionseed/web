import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import {
  sendBatchEmails,
  type EmailTemplateVars,
} from "@/lib/hackathon/email";

function getServiceClient() {
  return createServiceClient(
    process.env.HACKATHON_SUPABASE_URL ??
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.HACKATHON_SUPABASE_SERVICE_ROLE_KEY ??
      process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;

  const { data: roles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin");

  return roles?.length ? user : null;
}

/** GET /api/admin/hackathon/email-sender
 *  Returns filter options (distinct values for each filter dimension)
 *  and filtered participant list with counts. */
export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin)
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const track = searchParams.get("track")?.split(",").filter(Boolean);
  const teamStatus = searchParams.get("teamStatus")?.split(",").filter(Boolean);
  const activitySubmission = searchParams.get("activitySubmission")?.split(",").filter(Boolean);
  const search = searchParams.get("search")?.trim().toLowerCase();

  const serviceClient = getServiceClient();

  const { data: participants, error: pErr } = await serviceClient
    .from("hackathon_participants")
    .select(
      `id, name, email, track, university, grade_level, experience_level, role,
       hackathon_team_members!hackathon_team_members_participant_id_fkey(
         team_id, hackathon_teams(id, name)
       ),
       hackathon_team_matching_waitlist!hackathon_team_matching_waitlist_participant_id_fkey(
         status
       )`
    )
    .order("name");

  if (pErr) {
    console.error("Error fetching participants:", pErr);
    return NextResponse.json(
      { error: "Failed to fetch participants" },
      { status: 500 }
    );
  }

  const { data: submissions } = await serviceClient
    .from("hackathon_phase_activity_submissions")
    .select("participant_id, activity_id, status, hackathon_phase_activities(id, title)")
    .in("status", ["submitted", "pending_review", "passed", "failed", "not_started"]);

  const submissionMap = new Map<
    string,
    Array<{ activity: string; status: string }>
  >();
  for (const s of submissions ?? []) {
    const activity = (s as any).hackathon_phase_activities?.title ?? "Unknown";
    const list = submissionMap.get(s.participant_id) ?? [];
    list.push({ activity, status: s.status });
    submissionMap.set(s.participant_id, list);
  }

  const tracks = [...new Set(participants.map((p) => p.track).filter(Boolean))];
  const teamStatuses = ["has_team", "no_team", "waitlist"];
  const submissionStatuses = [
    "submitted",
    "pending_review",
    "passed",
    "failed",
    "not_started",
  ];

  const activityTitles = [
    ...new Set(
      (submissions ?? []).map((s: any) => s.hackathon_phase_activities?.title).filter(Boolean)
    ),
  ];

  const transformed = participants.map((p: any) => {
    const teamMember = Array.isArray(p.hackathon_team_members)
      ? p.hackathon_team_members[0]
      : p.hackathon_team_members;
    const teamData = teamMember?.hackathon_teams;
    const waitlistEntries = Array.isArray(p.hackathon_team_matching_waitlist)
      ? p.hackathon_team_matching_waitlist
      : p.hackathon_team_matching_waitlist
      ? [p.hackathon_team_matching_waitlist]
      : [];
    const isInWaitlist = waitlistEntries.some((w: any) => w.status === "waiting");

    const teamStatusValue = teamData
      ? "has_team"
      : isInWaitlist
      ? "waitlist"
      : "no_team";

    const participantSubmissions = submissionMap.get(p.id) ?? [];

    return {
      id: p.id,
      name: p.name,
      email: p.email,
      track: p.track ?? "",
      university: p.university ?? "",
      grade_level: p.grade_level ?? "",
      experience_level: p.experience_level ?? 1,
      role: p.role ?? "",
      team_name: teamData?.name ?? "",
      team_status: teamStatusValue,
      submissions: participantSubmissions,
    };
  });

  const filtered = transformed.filter((p) => {
    if (track?.length && !track.includes(p.track)) return false;
    if (teamStatus?.length && !teamStatus.includes(p.team_status)) return false;
    if (activitySubmission?.length) {
      const hasMatch = activitySubmission.some((filter) => {
        if (["submitted", "pending_review", "passed", "failed", "not_started"].includes(filter)) {
          return p.submissions.some((s) => s.status === filter);
        }
        return p.submissions.some((s) => s.activity === filter);
      });
      if (!hasMatch) return false;
    }
    if (search) {
      const q = search;
      const haystack = [p.name, p.email, p.university, p.team_name]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

  return NextResponse.json({
    filterOptions: { tracks, teamStatuses, submissionStatuses, activityTitles },
    participants: filtered,
    counts: {
      total: participants.length,
      filtered: filtered.length,
    },
  });
}

/** POST /api/admin/hackathon/email-sender
 *  Sends batch personalized emails to selected participants. */
export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin)
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  try {
    const body = await req.json();
    const {
      recipientIds,
      subjectTemplate,
      bodyTemplate,
    }: {
      recipientIds: string[];
      subjectTemplate: string;
      bodyTemplate: string;
    } = body;

    if (!recipientIds?.length) {
      return NextResponse.json(
        { error: "No recipients selected" },
        { status: 400 }
      );
    }
    if (!subjectTemplate?.trim()) {
      return NextResponse.json(
        { error: "Subject is required" },
        { status: 400 }
      );
    }
    if (!bodyTemplate?.trim()) {
      return NextResponse.json(
        { error: "Email body is required" },
        { status: 400 }
      );
    }

    const serviceClient = getServiceClient();

    const { data: participants, error } = await serviceClient
      .from("hackathon_participants")
      .select(
        `id, name, email, track, university, grade_level, experience_level, role,
         hackathon_team_members!hackathon_team_members_participant_id_fkey(
           hackathon_teams(name)
         )`
      )
      .in("id", recipientIds);

    if (error) {
      console.error("Error fetching recipients:", error);
      return NextResponse.json(
        { error: "Failed to fetch recipients" },
        { status: 500 }
      );
    }

    const recipients = (participants ?? []).map((p: any) => {
      const teamMember = Array.isArray(p.hackathon_team_members)
        ? p.hackathon_team_members[0]
        : p.hackathon_team_members;
      const teamName = teamMember?.hackathon_teams?.name ?? "";

      const vars: EmailTemplateVars = {
        name: p.name ?? "",
        email: p.email ?? "",
        track: p.track ?? "",
        university: p.university ?? "",
        grade_level: p.grade_level ?? "",
        experience_level: p.experience_level ?? 1,
        team_name: teamName,
        role: p.role ?? "",
      };

      return { email: p.email, vars };
    });

    const result = await sendBatchEmails({
      recipients,
      subjectTemplate,
      bodyTemplate,
    });

    return NextResponse.json(result);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Internal server error";
    console.error("Error in email sender API:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
