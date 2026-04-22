"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  FileText,
  Paperclip,
  Image as ImageIcon,
  ChevronLeft,
  MessageSquare,
  Users,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { SubmissionClusterView } from "@/components/admin/SubmissionClusterView";
import { ImageLightbox } from "@/components/admin/ImageLightbox";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SubmissionMember {
  participant_id: string;
  name: string;
  email: string;
  university: string;
  is_owner: boolean;
}

interface IndividualSubmissionDetail {
  id: string;
  participant_id: string;
  participant_name: string | null;
  activity_id: string;
  activity_title: string | null;
  activity_display_order: number | null;
  phase_id: string | null;
  phase_title: string | null;
  phase_number: number | null;
  assessment_id: string | null;
  prompt: string | null;
  status: string;
  text_answer: string | null;
  image_url: string | null;
  file_urls: string[];
  submitted_at: string | null;
}

interface TeamSubmissionDetail {
  id: string;
  activity_id: string;
  activity_title: string | null;
  activity_display_order: number | null;
  phase_id: string | null;
  phase_title: string | null;
  phase_number: number | null;
  assessment_id: string | null;
  prompt: string | null;
  status: string;
  text_answer: string | null;
  image_url: string | null;
  file_urls: string[];
  submitted_at: string | null;
  submitted_by_name: string | null;
}

interface ActivityCommentReply {
  id: string;
  comment_id: string;
  participant_id: string;
  participant_name: string;
  participant_avatar_url: string | null;
  content: string;
  created_at: string;
  updated_at: string;
  is_edited: boolean;
}

interface ActivityComment {
  id: string;
  activity_id: string;
  participant_id: string;
  participant_name: string;
  participant_avatar_url: string | null;
  content: string;
  engagement_score: number;
  created_at: string;
  updated_at: string;
  is_edited: boolean;
  replies: ActivityCommentReply[];
}

interface ActivityGroup {
  activity_id: string;
  activity_title: string | null;
  activity_display_order: number | null;
  phase_id: string | null;
  phase_title: string | null;
  phase_number: number | null;
  prompt: string | null;
  // Representative status across all submissions for this activity
  status: string;
  submitted_at: string | null;
  team_submission: TeamSubmissionDetail | null;
  participant_submissions: IndividualSubmissionDetail[];
  comments: ActivityComment[];
}

interface TeamData {
  id: string;
  name: string;
  lobby_code: string;
  owner_id: string;
  member_count: number;
  members: SubmissionMember[];
  total_score: number;
  activities: ActivityGroup[];
}

interface PhaseGroup {
  phase_id: string;
  phase_title: string | null;
  phase_number: number | null;
  activities: ActivityGroup[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusColor(status: string): string {
  if (status === "passed") return "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
  if (status === "revision_required") return "bg-red-500/15 text-red-300 border-red-500/30";
  if (status === "submitted" || status === "pending_review") return "bg-yellow-500/15 text-yellow-300 border-yellow-500/30";
  return "bg-slate-500/15 text-slate-400 border-slate-500/30";
}

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge className={`text-[10px] border px-2 py-0 ${statusColor(status)}`}>
      {status.replace(/_/g, " ")}
    </Badge>
  );
}


function authorInitial(name: string): string {
  return name.trim().charAt(0).toUpperCase() || "?";
}

function deriveActivityStatus(
  teamSub: TeamSubmissionDetail | null,
  individualSubs: IndividualSubmissionDetail[]
): string {
  const all = [
    ...(teamSub ? [teamSub.status] : []),
    ...individualSubs.map((s) => s.status),
  ];
  if (all.includes("revision_required")) return "revision_required";
  if (all.includes("passed")) return "passed";
  if (all.includes("pending_review")) return "pending_review";
  if (all.includes("submitted")) return "submitted";
  return "draft";
}

function buildPhaseGroups(team: TeamData): PhaseGroup[] {
  const phaseMap = new Map<string, PhaseGroup>();

  for (const activity of team.activities) {
    const key = activity.phase_id ?? `phase-${activity.phase_number ?? "unknown"}`;
    const existing = phaseMap.get(key);

    if (existing) {
      existing.activities.push(activity);
      continue;
    }

    phaseMap.set(key, {
      phase_id: key,
      phase_title: activity.phase_title,
      phase_number: activity.phase_number,
      activities: [activity],
    });
  }

  return Array.from(phaseMap.values())
    .map((phase) => ({
      ...phase,
      activities: [...phase.activities].sort((a, b) => {
        const orderA = a.activity_display_order ?? Number.MAX_SAFE_INTEGER;
        const orderB = b.activity_display_order ?? Number.MAX_SAFE_INTEGER;
        if (orderA !== orderB) return orderA - orderB;
        return (a.activity_title ?? a.activity_id).localeCompare(b.activity_title ?? b.activity_id);
      }),
    }))
    .sort(
      (a, b) =>
        (a.phase_number ?? Number.MAX_SAFE_INTEGER) - (b.phase_number ?? Number.MAX_SAFE_INTEGER)
    );
}

// ─── TeamGrid ─────────────────────────────────────────────────────────────────

function TeamGrid({
  teams,
  onSelectTeam,
}: {
  teams: TeamData[];
  onSelectTeam: (team: TeamData) => void;
}) {
  if (teams.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-500 gap-3">
        <Users className="h-8 w-8 opacity-40" />
        <span className="text-sm">No teams with submissions found.</span>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {teams.map((team, index) => {
        const rank = index + 1;
        const totalActivities = team.activities.length;
        const passedCount = team.activities.filter((a) => a.status === "passed").length;
        const pendingCount = team.activities.filter(
          (a) => a.status === "submitted" || a.status === "pending_review"
        ).length;

        const rankStyle =
          rank === 1
            ? "text-yellow-300 border-yellow-400/40 bg-yellow-400/10"
            : rank === 2
            ? "text-slate-300 border-slate-400/40 bg-slate-400/10"
            : rank === 3
            ? "text-orange-300 border-orange-400/40 bg-orange-400/10"
            : "text-slate-500 border-slate-700 bg-transparent";

        const scoreStyle =
          rank === 1
            ? "text-yellow-300"
            : rank === 2
            ? "text-slate-300"
            : rank === 3
            ? "text-orange-300"
            : "text-slate-400";

        return (
          <button
            key={team.id}
            onClick={() => onSelectTeam(team)}
            className="text-left p-4 rounded-lg border border-slate-700/50 bg-slate-950/20 hover:border-slate-500 hover:bg-slate-900/40 transition-all group"
          >
            <div className="flex items-center justify-between gap-2 mb-1">
              <span
                className={`inline-flex items-center justify-center w-5 h-5 rounded-full border text-[10px] font-bold shrink-0 ${rankStyle}`}
              >
                {rank}
              </span>
              <span className={`text-xs font-bold font-mono ${scoreStyle}`}>
                {team.total_score} pts
              </span>
            </div>
            <div className="font-semibold text-slate-200 text-sm mb-1 group-hover:text-white transition-colors truncate">
              {team.name}
            </div>
            <div className="text-[10px] font-mono text-slate-600 mb-3">{team.lobby_code}</div>
            <div className="flex items-center gap-1 mb-2">
              <Users className="h-3 w-3 text-slate-600" />
              <span className="text-[10px] text-slate-500">{team.member_count} members</span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] text-slate-500">{totalActivities} activit{totalActivities === 1 ? "y" : "ies"}</span>
              {passedCount > 0 && (
                <Badge className="text-[9px] bg-emerald-500/15 text-emerald-300 border-emerald-500/30 px-1.5 py-0">
                  {passedCount} passed
                </Badge>
              )}
              {pendingCount > 0 && (
                <Badge className="text-[9px] bg-yellow-500/15 text-yellow-300 border-yellow-500/30 px-1.5 py-0">
                  {pendingCount} pending
                </Badge>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ─── ActivityList ─────────────────────────────────────────────────────────────

function ActivityList({
  team,
  selectedPhaseId,
  onSelectPhase,
  selectedActivityId,
  onSelectActivity,
}: {
  team: TeamData;
  selectedPhaseId: string | null;
  onSelectPhase: (phaseId: string) => void;
  selectedActivityId: string | null;
  onSelectActivity: (activityId: string) => void;
}) {
  const phases = buildPhaseGroups(team);
  const activePhase = phases.find((phase) => phase.phase_id === selectedPhaseId) ?? null;

  return (
    <div className="w-[34%] flex flex-col gap-2 overflow-y-auto max-h-[560px] pr-1">
      <div className="text-[9px] font-semibold tracking-widest text-slate-600 uppercase mb-1 px-1">
        Phases · {phases.length}
      </div>
      {phases.length === 0 && (
        <div className="text-slate-500 text-sm text-center py-8">No submissions yet.</div>
      )}
      <div className="space-y-2">
        {phases.map((phase) => {
          const isSelected = phase.phase_id === activePhase?.phase_id;

          return (
            <div
              key={phase.phase_id}
              className="rounded-lg border border-slate-700/50 bg-slate-950/20 overflow-hidden"
            >
              <button
                onClick={() => onSelectPhase(isSelected ? "" : phase.phase_id)}
                className="w-full text-left p-3 transition-all"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className={`text-xs font-semibold ${isSelected ? "text-indigo-300" : "text-slate-200"}`}>
                    Phase {phase.phase_number ?? "?"}: {phase.phase_title ?? "Untitled phase"}
                  </div>
                  <span className={`text-[10px] ${isSelected ? "text-indigo-300" : "text-slate-500"}`}>
                    {isSelected ? "Hide" : "Show"}
                  </span>
                </div>
                <div className="mt-1 text-[10px] text-slate-500">
                  {phase.activities.length} activit{phase.activities.length === 1 ? "y" : "ies"}
                </div>
              </button>

              {isSelected && (
                <div className="border-t border-slate-800/60 px-2 pb-2">
                  <div className="text-[9px] font-semibold tracking-widest text-slate-600 uppercase mb-2 mt-2 px-1">
                    Activities · {phase.activities.length}
                  </div>
                  <div className="space-y-2">
                    {phase.activities.map((activity) => {
                      const isActivitySelected = selectedActivityId === activity.activity_id;
                      const hasTeamSub = !!activity.team_submission;
                      const hasIndividualSub = activity.participant_submissions.length > 0;

                      return (
                        <button
                          key={activity.activity_id}
                          onClick={() => onSelectActivity(activity.activity_id)}
                          className={`w-full text-left p-3 rounded-lg border transition-all ${
                            isActivitySelected
                              ? "border-indigo-500 bg-indigo-500/6 shadow-[0_0_0_1px_#6366f1]"
                              : "border-slate-700/50 bg-slate-950/20 hover:border-slate-600"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="text-xs font-semibold text-slate-200 truncate">
                              {activity.activity_title ?? activity.activity_id}
                            </span>
                            <StatusBadge status={activity.status} />
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {hasTeamSub && (
                              <Badge className="text-[9px] bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 px-1.5 py-0">
                                Team
                              </Badge>
                            )}
                            {hasIndividualSub && (
                              <Badge className="text-[9px] bg-violet-500/10 text-violet-300 border border-violet-500/20 px-1.5 py-0">
                                Individual
                              </Badge>
                            )}
                            {activity.submitted_at && (
                              <div className="text-[10px] text-slate-600">
                                {formatDistanceToNow(new Date(activity.submitted_at), { addSuffix: true })}
                              </div>
                            )}
                            {activity.comments.length > 0 && (
                              <Badge className="text-[9px] bg-sky-500/10 text-sky-300 border border-sky-500/20 px-1.5 py-0">
                                <MessageSquare className="mr-1 h-2.5 w-2.5" />
                                {activity.comments.length}
                              </Badge>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {!activePhase && phases.length > 0 && (
        <div className="text-slate-500 text-sm text-center py-6">
          Click a phase to view its submitted activities.
        </div>
      )}
    </div>
  );
}

function ActivityCommentsSection({ comments }: { comments: ActivityComment[] }) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <div className="text-[9px] font-semibold tracking-widest text-slate-600 uppercase">
          Activity Comments
        </div>
        <Badge className="border border-sky-500/20 bg-sky-500/10 px-1.5 py-0 text-[9px] text-sky-300">
          {comments.length}
        </Badge>
      </div>

      {comments.length === 0 ? (
        <div className="rounded-md border border-dashed border-slate-800 bg-slate-900/30 p-3 text-xs text-slate-500">
          No activity comments yet.
        </div>
      ) : (
        <div className="space-y-3">
          {comments.map((comment) => (
            <div
              key={comment.id}
              className="rounded-md border border-slate-800 bg-slate-900/40 p-3"
            >
              <div className="mb-2 flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-sky-500/20 text-[11px] font-semibold text-sky-200">
                    {authorInitial(comment.participant_name)}
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-200">
                      {comment.participant_name}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                      {comment.is_edited ? " · edited" : ""}
                    </div>
                  </div>
                </div>
                {comment.replies.length > 0 && (
                  <span className="text-[10px] text-slate-500">
                    {comment.replies.length} repl{comment.replies.length === 1 ? "y" : "ies"}
                  </span>
                )}
              </div>

              <p className="whitespace-pre-wrap text-xs leading-relaxed text-slate-300">
                {comment.content}
              </p>

              {comment.replies.length > 0 && (
                <div className="mt-3 space-y-2 border-l border-slate-800 pl-3">
                  {comment.replies.map((reply) => (
                    <div
                      key={reply.id}
                      className="rounded-md border border-slate-800/80 bg-slate-950/40 p-2.5"
                    >
                      <div className="mb-1.5 flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-500/20 text-[10px] font-semibold text-violet-200">
                          {authorInitial(reply.participant_name)}
                        </div>
                        <div className="text-[11px] font-semibold text-slate-200">
                          {reply.participant_name}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {formatDistanceToNow(new Date(reply.created_at), { addSuffix: true })}
                          {reply.is_edited ? " · edited" : ""}
                        </div>
                      </div>
                      <p className="whitespace-pre-wrap text-xs leading-relaxed text-slate-300">
                        {reply.content}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── SubmissionDetail ─────────────────────────────────────────────────────────

function SubmissionContent({
  sub,
  onViewImage,
}: {
  sub: TeamSubmissionDetail | IndividualSubmissionDetail;
  onViewImage: (url: string) => void;
}) {
  const hasTextAnswer = Boolean(sub.text_answer?.trim());

  return (
    <div className="space-y-3">
      {hasTextAnswer && (
        <div>
          <div className="text-[9px] font-semibold tracking-widest text-slate-600 uppercase mb-1">
            Submitted Answer
          </div>
          <div className="bg-slate-900/60 border border-slate-800 rounded-md p-3 max-h-[200px] overflow-y-auto">
            <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
              {sub.text_answer}
            </p>
          </div>
        </div>
      )}

      {sub.image_url && (
        <div className="rounded-md border border-slate-800 bg-slate-900/40 p-3">
          <div className="text-[9px] font-semibold tracking-widest text-slate-600 uppercase mb-2 flex items-center gap-1">
            <ImageIcon className="h-3 w-3" /> Image
            <span className="text-[9px] normal-case tracking-normal text-slate-500">(click to enlarge)</span>
          </div>
          <button
            type="button"
            onClick={() => onViewImage(sub.image_url!)}
            className="block w-full cursor-zoom-in"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={sub.image_url}
              alt=""
              className="max-h-96 w-full rounded-md border border-slate-800 object-contain hover:opacity-90 transition-opacity"
              referrerPolicy="no-referrer"
              loading="lazy"
              decoding="async"
            />
          </button>
        </div>
      )}

      {sub.file_urls && sub.file_urls.length > 0 && (
        <div>
          <div className="text-[9px] font-semibold tracking-widest text-slate-600 uppercase mb-1 flex items-center gap-1">
            <Paperclip className="h-3 w-3" /> Files
          </div>
          <div className="flex flex-wrap gap-2">
            {sub.file_urls.map((url, i) => {
              const isImage = /\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(url);
              if (isImage) {
                return (
                  <button
                    key={url}
                    type="button"
                    onClick={() => onViewImage(url)}
                    className="flex items-center gap-1 text-[10px] text-indigo-400 hover:text-indigo-300 border border-slate-700 rounded px-2 py-1 cursor-zoom-in"
                  >
                    <ImageIcon className="h-2.5 w-2.5" />
                    Image {i + 1}
                  </button>
                );
              }
              return (
                <a
                  key={url}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[10px] text-indigo-400 hover:text-indigo-300 border border-slate-700 rounded px-2 py-1"
                >
                  <Paperclip className="h-2.5 w-2.5" />
                  File {i + 1}
                </a>
              );
            })}
          </div>
        </div>
      )}

      {!hasTextAnswer && !sub.image_url && (!sub.file_urls || sub.file_urls.length === 0) && (
        <p className="text-xs text-slate-600 italic">No content submitted.</p>
      )}
    </div>
  );
}

function SubmissionDetail({
  activity,
  onViewImage,
}: {
  team: TeamData;
  activity: ActivityGroup | null;
  activeMemberId: string | null;
  onMemberSwitch: (id: string) => void;
  onViewImage: (url: string) => void;
}) {
  const [showClusters, setShowClusters] = useState(false);

  if (!activity) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 rounded-lg border border-slate-700/50 bg-slate-950/20 text-slate-500">
        <FileText className="h-8 w-8 opacity-40" />
        <span className="text-sm">Select an activity to view submission</span>
      </div>
    );
  }

  const hasTeamSub = !!activity.team_submission;
  const hasIndividualSubs = activity.participant_submissions.length > 0;

  return (
    <div className="flex-1 flex flex-col rounded-lg border border-slate-700/50 bg-slate-950/20 overflow-hidden">
      {/* Prompt */}
      <div className="px-4 py-3 border-b border-slate-800/60">
        <div className="mb-1 flex items-center justify-between">
          <div className="text-[9px] font-semibold tracking-widest text-slate-600 uppercase">
            Assessment Prompt
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowClusters((prev) => !prev)}
              className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 hover:text-slate-200"
            >
              {showClusters ? "Hide clusters" : "Preview clusters"}
            </button>
            <a
              href={`/admin/hackathon/activities/${activity.activity_id}/clusters`}
              target="_blank"
              rel="noreferrer"
              className="text-[10px] font-semibold uppercase tracking-wider text-sky-400 hover:text-sky-300"
            >
              Full view →
            </a>
          </div>
        </div>
        <p className="text-xs text-slate-400 italic">
          {activity.prompt ?? "No prompt available"}
        </p>
        {showClusters && (
          <div className="mt-3">
            <SubmissionClusterView activityId={activity.activity_id} compact />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-5 min-h-0">
        {/* Team submission */}
        {hasTeamSub && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge className="text-[9px] bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 px-1.5 py-0">
                Team
              </Badge>
              <StatusBadge status={activity.team_submission!.status} />
              {activity.team_submission!.submitted_at && (
                <span className="text-[10px] text-slate-600">
                  {formatDistanceToNow(new Date(activity.team_submission!.submitted_at), { addSuffix: true })}
                </span>
              )}
            </div>
            <SubmissionContent sub={activity.team_submission!} onViewImage={onViewImage} />
          </div>
        )}

        {/* Individual submissions */}
        {hasIndividualSubs && (
          <div className="space-y-4">
            {activity.participant_submissions.map((ps) => (
              <div key={ps.id}>
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="text-[9px] bg-violet-500/10 text-violet-300 border border-violet-500/20 px-1.5 py-0">
                    Individual
                  </Badge>
                  <span className="text-xs font-semibold text-slate-300">{ps.participant_name ?? "Unknown"}</span>
                  <StatusBadge status={ps.status} />
                  {ps.submitted_at && (
                    <span className="text-[10px] text-slate-600">
                      {formatDistanceToNow(new Date(ps.submitted_at), { addSuffix: true })}
                    </span>
                  )}
                </div>
                <SubmissionContent sub={ps} onViewImage={onViewImage} />
              </div>
            ))}
          </div>
        )}

        {!hasTeamSub && !hasIndividualSubs && (
          <div className="flex items-center justify-center text-slate-600 text-sm py-8">
            No submission content available
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AdminHackathonTeamSubmissions() {
  const [teams, setTeams] = useState<TeamData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState<TeamData | null>(null);
  const [selectedPhaseId, setSelectedPhaseId] = useState<string | null>(null);
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/hackathon/teams/submissions")
      .then((r) => r.json())
      .then((data) => {
        if (!data.teams) return;

        const assembled: TeamData[] = data.teams.map((team: {
          id: string;
          name: string;
          lobby_code: string;
          owner_id: string;
          member_count: number;
          members: SubmissionMember[];
          total_score: number;
          team_submissions: TeamSubmissionDetail[];
          individual_submissions: IndividualSubmissionDetail[];
        }) => {
          const activityCommentsById = (data.activity_comments_by_id ?? {}) as Record<
            string,
            ActivityComment[]
          >;

          // Group by activity_id
          const activityMap = new Map<string, ActivityGroup>();

          for (const ts of team.team_submissions) {
            activityMap.set(ts.activity_id, {
              activity_id: ts.activity_id,
              activity_title: ts.activity_title,
              activity_display_order: ts.activity_display_order,
              phase_id: ts.phase_id,
              phase_title: ts.phase_title,
              phase_number: ts.phase_number,
              prompt: ts.prompt,
              status: ts.status,
              submitted_at: ts.submitted_at,
              team_submission: ts,
              participant_submissions: [],
              comments: activityCommentsById[ts.activity_id] ?? [],
            });
          }

          for (const is of team.individual_submissions) {
            const existing = activityMap.get(is.activity_id);
            if (existing) {
              existing.participant_submissions.push(is);
            } else {
              activityMap.set(is.activity_id, {
                activity_id: is.activity_id,
                activity_title: is.activity_title,
                activity_display_order: is.activity_display_order,
                phase_id: is.phase_id,
                phase_title: is.phase_title,
                phase_number: is.phase_number,
                prompt: is.prompt,
                status: is.status,
                submitted_at: is.submitted_at,
                team_submission: null,
                participant_submissions: [is],
                comments: activityCommentsById[is.activity_id] ?? [],
              });
            }
          }

          // Recompute status for each activity
          for (const ag of activityMap.values()) {
            if (ag.activity_display_order == null) {
              ag.activity_display_order =
                ag.team_submission?.activity_display_order ??
                ag.participant_submissions[0]?.activity_display_order ??
                null;
            }
            if (!ag.phase_id) {
              ag.phase_id =
                ag.team_submission?.phase_id ?? ag.participant_submissions[0]?.phase_id ?? null;
            }
            if (!ag.phase_title) {
              ag.phase_title =
                ag.team_submission?.phase_title ??
                ag.participant_submissions[0]?.phase_title ??
                null;
            }
            if (ag.phase_number == null) {
              ag.phase_number =
                ag.team_submission?.phase_number ??
                ag.participant_submissions[0]?.phase_number ??
                null;
            }
            ag.status = deriveActivityStatus(ag.team_submission, ag.participant_submissions);
            // Use latest submitted_at
            const dates = [
              ag.team_submission?.submitted_at,
              ...ag.participant_submissions.map((s) => s.submitted_at),
            ].filter(Boolean) as string[];
            ag.submitted_at = dates.sort().at(-1) ?? null;
          }

          const activities = Array.from(activityMap.values()).sort((a, b) => {
            const phaseA = a.phase_number ?? Number.MAX_SAFE_INTEGER;
            const phaseB = b.phase_number ?? Number.MAX_SAFE_INTEGER;
            if (phaseA !== phaseB) return phaseA - phaseB;

            const orderA = a.activity_display_order ?? Number.MAX_SAFE_INTEGER;
            const orderB = b.activity_display_order ?? Number.MAX_SAFE_INTEGER;
            if (orderA !== orderB) return orderA - orderB;

            return (a.activity_title ?? a.activity_id).localeCompare(b.activity_title ?? b.activity_id);
          });

          return {
            id: team.id,
            name: team.name,
            lobby_code: team.lobby_code,
            owner_id: team.owner_id,
            member_count: team.member_count,
            members: team.members,
            total_score: team.total_score,
            activities,
          };
        });

        // Only show teams that have at least one submission
        setTeams(assembled.filter((t) => t.activities.length > 0));
      })
      .catch((err) => console.error("Failed to load team submissions:", err))
      .finally(() => setLoading(false));
  }, []);

  function handleSelectTeam(team: TeamData) {
    setSelectedTeam(team);
    setSelectedPhaseId(null);
    setSelectedActivityId(null);
  }

  function handleSelectPhase(phaseId: string) {
    if (!selectedTeam) return;
    if (!phaseId) {
      setSelectedPhaseId(null);
      setSelectedActivityId(null);
      return;
    }

    const phase = buildPhaseGroups(selectedTeam).find((item) => item.phase_id === phaseId) ?? null;
    setSelectedPhaseId(phaseId);
    setSelectedActivityId(phase?.activities[0]?.activity_id ?? null);
  }

  function handleSelectActivity(activityId: string) {
    setSelectedActivityId(activityId);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Level 1: Team grid
  if (!selectedTeam) {
    return <TeamGrid teams={teams} onSelectTeam={handleSelectTeam} />;
  }

  // Level 2+3: Activity list + submission detail
  const selectedActivity = selectedTeam.activities.find(
    (a) => a.activity_id === selectedActivityId
  ) ?? null;

  return (
    <div className="flex flex-col gap-3">
      {/* Back header */}
      <button
        onClick={() => setSelectedTeam(null)}
        className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors w-fit"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        All Teams
      </button>

      {/* Team name + members summary */}
      <div className="flex items-center gap-3">
        <span className="text-base font-semibold text-slate-100">{selectedTeam.name}</span>
        <span className="text-[10px] font-mono text-slate-600">{selectedTeam.lobby_code}</span>
        <div className="flex items-center gap-1 text-slate-500">
          <Users className="h-3 w-3" />
          <span className="text-[10px]">{selectedTeam.member_count} members</span>
        </div>
      </div>

      {/* Two-panel layout */}
      <div className="flex gap-4 min-h-[520px]">
        <ActivityList
          team={selectedTeam}
          selectedPhaseId={selectedPhaseId}
          onSelectPhase={handleSelectPhase}
          selectedActivityId={selectedActivityId}
          onSelectActivity={handleSelectActivity}
        />
        <SubmissionDetail
          team={selectedTeam}
          activity={selectedActivity}
          activeMemberId={null}
          onMemberSwitch={() => {}}
          onViewImage={setLightboxSrc}
        />

      </div>

      <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
    </div>
  );
}
