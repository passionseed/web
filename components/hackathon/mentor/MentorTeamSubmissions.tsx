"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2, FileText, Paperclip, Image as ImageIcon, ChevronLeft, Users, CheckCircle, RotateCcw, MessageSquare, Send } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

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

interface ActivityGroup {
  activity_id: string;
  activity_title: string | null;
  activity_display_order: number | null;
  phase_id: string | null;
  phase_title: string | null;
  phase_number: number | null;
  prompt: string | null;
  status: string;
  submitted_at: string | null;
  team_submission: TeamSubmissionDetail | null;
  participant_submissions: IndividualSubmissionDetail[];
}

interface TeamData {
  id: string;
  name: string;
  lobby_code: string;
  owner_id: string;
  member_count: number;
  members: SubmissionMember[];
  is_assigned: boolean;
  team_submissions: TeamSubmissionDetail[];
  individual_submissions: IndividualSubmissionDetail[];
}

interface AssembledTeam {
  id: string;
  name: string;
  lobby_code: string;
  owner_id: string;
  member_count: number;
  members: SubmissionMember[];
  is_assigned: boolean;
  activities: ActivityGroup[];
}

interface PhaseGroup {
  phase_id: string;
  phase_title: string | null;
  phase_number: number | null;
  activities: ActivityGroup[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function assembleTeam(team: TeamData): AssembledTeam {
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
      });
    }
  }

  for (const ag of activityMap.values()) {
    if (ag.activity_display_order == null) {
      ag.activity_display_order =
        ag.team_submission?.activity_display_order ??
        ag.participant_submissions[0]?.activity_display_order ??
        null;
    }
    if (!ag.phase_id) {
      ag.phase_id = ag.team_submission?.phase_id ?? ag.participant_submissions[0]?.phase_id ?? null;
    }
    if (!ag.phase_title) {
      ag.phase_title =
        ag.team_submission?.phase_title ?? ag.participant_submissions[0]?.phase_title ?? null;
    }
    if (ag.phase_number == null) {
      ag.phase_number =
        ag.team_submission?.phase_number ?? ag.participant_submissions[0]?.phase_number ?? null;
    }
    ag.status = deriveActivityStatus(ag.team_submission, ag.participant_submissions);
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
    is_assigned: team.is_assigned,
    activities,
  };
}

const AVATAR_COLORS = [
  "bg-indigo-500",
  "bg-sky-500",
  "bg-violet-500",
  "bg-emerald-500",
  "bg-rose-500",
];

function avatarColor(i: number) {
  return AVATAR_COLORS[i % AVATAR_COLORS.length];
}

function statusDot(status: string): string {
  if (status === "passed") return "bg-emerald-400";
  if (status === "revision_required") return "bg-red-400";
  return "bg-yellow-400";
}

function buildPhaseGroups(team: AssembledTeam): PhaseGroup[] {
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
    .sort((a, b) => (a.phase_number ?? Number.MAX_SAFE_INTEGER) - (b.phase_number ?? Number.MAX_SAFE_INTEGER));
}

// ─── Activity List ─────────────────────────────────────────────────────────────

function ActivityList({
  team,
  selectedPhaseId,
  onSelectPhase,
  selectedActivityId,
  onSelectActivity,
}: {
  team: AssembledTeam;
  selectedPhaseId: string | null;
  onSelectPhase: (phaseId: string) => void;
  selectedActivityId: string | null;
  onSelectActivity: (id: string) => void;
}) {
  const phases = buildPhaseGroups(team);
  const activePhase = phases.find((phase) => phase.phase_id === selectedPhaseId) ?? null;

  return (
    <div className="w-[34%] flex flex-col gap-2 overflow-y-auto max-h-[480px] pr-1">
      <div
        className="text-xs font-semibold tracking-widest uppercase mb-1 px-1 font-[family-name:var(--font-mitr)]"
        style={{ color: "#3d5a6e" }}
      >
        Phases · {phases.length}
      </div>
      {phases.length === 0 && (
        <p
          className="text-sm text-center py-8 font-[family-name:var(--font-mitr)]"
          style={{ color: "#5a7a94" }}
        >
          No submissions yet.
        </p>
      )}

      <div className="space-y-2">
        {phases.map((phase) => {
          const isSelected = phase.phase_id === activePhase?.phase_id;

          return (
            <div
              key={phase.phase_id}
              className="rounded-xl border overflow-hidden"
              style={{
                background: "rgba(13,18,25,0.6)",
                borderColor: isSelected ? "rgba(145,196,227,0.4)" : "rgba(74,107,130,0.2)",
              }}
            >
              <button
                onClick={() => onSelectPhase(isSelected ? "" : phase.phase_id)}
                className="w-full text-left p-3 transition-all"
                style={{ color: isSelected ? "#91C4E3" : "#c8d8e4" }}
              >
                <div className="flex items-center justify-between gap-2">
                  <div
                    className="text-sm font-semibold font-[family-name:var(--font-bai-jamjuree)]"
                  >
                    Phase {phase.phase_number ?? "?"}: {phase.phase_title ?? "Untitled phase"}
                  </div>
                  <span
                    className="text-xs font-[family-name:var(--font-mitr)]"
                    style={{ color: isSelected ? "#91C4E3" : "#5a7a94" }}
                  >
                    {isSelected ? "Hide" : "Show"}
                  </span>
                </div>
                <div
                  className="mt-1 text-[10px] font-[family-name:var(--font-mitr)]"
                  style={{ color: "#5a7a94" }}
                >
                  {phase.activities.length} activit{phase.activities.length === 1 ? "y" : "ies"}
                </div>
              </button>

              {isSelected && (
                <div
                  className="border-t px-2 pb-2"
                  style={{ borderColor: "rgba(74,107,130,0.15)" }}
                >
                  <div
                    className="text-xs font-semibold tracking-widest uppercase mb-2 mt-2 px-1 font-[family-name:var(--font-mitr)]"
                    style={{ color: "#3d5a6e" }}
                  >
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
                          className="w-full text-left p-3 rounded-xl border transition-all"
                          style={{
                            background: isActivitySelected
                              ? "rgba(145,196,227,0.08)"
                              : "rgba(13,18,25,0.75)",
                            borderColor: isActivitySelected
                              ? "rgba(145,196,227,0.4)"
                              : "rgba(74,107,130,0.2)",
                          }}
                        >
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span
                              className="text-sm font-semibold truncate font-[family-name:var(--font-bai-jamjuree)]"
                              style={{ color: isActivitySelected ? "#91C4E3" : "#c8d8e4" }}
                            >
                              {activity.activity_title ?? activity.activity_id}
                            </span>
                            <span
                              className={`w-2 h-2 rounded-full flex-shrink-0 ${statusDot(activity.status)}`}
                            />
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {hasTeamSub && (
                              <span
                                className="text-[10px] px-1.5 py-0.5 rounded font-[family-name:var(--font-mitr)]"
                                style={{
                                  background: "rgba(145,196,227,0.08)",
                                  border: "1px solid rgba(145,196,227,0.2)",
                                  color: "#91C4E3",
                                }}
                              >
                                Team
                              </span>
                            )}
                            {hasIndividualSub && (
                              <span
                                className="text-[10px] px-1.5 py-0.5 rounded font-[family-name:var(--font-mitr)]"
                                style={{
                                  background: "rgba(165,148,186,0.08)",
                                  border: "1px solid rgba(165,148,186,0.2)",
                                  color: "#A594BA",
                                }}
                              >
                                Individual
                              </span>
                            )}
                            {activity.submitted_at && (
                              <span
                                className="text-[10px] font-[family-name:var(--font-mitr)]"
                                style={{ color: "#3d5a6e" }}
                              >
                                {formatDistanceToNow(new Date(activity.submitted_at), { addSuffix: true })}
                              </span>
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
        <p
          className="text-sm text-center py-6 font-[family-name:var(--font-mitr)]"
          style={{ color: "#5a7a94" }}
        >
          Click a phase to view its submitted activities.
        </p>
      )}
    </div>
  );
}

// ─── Grade Panel ───────────────────────────────────────────────────────────────

function GradePanel({
  scope,
  submissionId,
  currentStatus,
  onGraded,
}: {
  scope: "individual" | "team";
  submissionId: string;
  currentStatus: string;
  onGraded: (newStatus: string) => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [comment, setComment] = useState("");
  const [sendingComment, setSendingComment] = useState(false);
  const [commentSent, setCommentSent] = useState(false);

  async function grade(status: "passed" | "revision_required") {
    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/hackathon/mentor/submissions/${scope}/${submissionId}/grade`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ review_status: status, feedback: feedback.trim() || undefined }),
        }
      );
      if (res.ok) {
        onGraded(status);
        setFeedback("");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function sendComment() {
    if (!comment.trim()) return;
    setSendingComment(true);
    try {
      const res = await fetch(
        `/api/hackathon/mentor/submissions/${scope}/${submissionId}/comment`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: comment.trim() }),
        }
      );
      if (res.ok) {
        setComment("");
        setCommentSent(true);
        setTimeout(() => setCommentSent(false), 2500);
      }
    } finally {
      setSendingComment(false);
    }
  }

  const isReviewable = currentStatus !== "passed";

  return (
    <div
      className="border-t px-4 py-3 space-y-3"
      style={{ borderColor: "rgba(74,107,130,0.15)" }}
    >
      {/* Feedback textarea */}
      <div>
        <div
          className="text-xs font-semibold tracking-widest uppercase mb-1.5 font-[family-name:var(--font-mitr)]"
          style={{ color: "#3d5a6e" }}
        >
          Feedback (optional)
        </div>
        <textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="Write feedback for the participant…"
          rows={2}
          className="w-full rounded-lg px-3 py-2 text-sm resize-none outline-none font-[family-name:var(--font-mitr)]"
          style={{
            background: "rgba(1,1,8,0.6)",
            border: "1px solid rgba(74,107,130,0.25)",
            color: "#c8d8e4",
          }}
        />
      </div>

      {/* Grade buttons */}
      {isReviewable && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => grade("passed")}
            disabled={submitting}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-50 font-[family-name:var(--font-mitr)]"
            style={{
              background: "rgba(52,211,153,0.12)",
              border: "1px solid rgba(52,211,153,0.35)",
              color: "#34d399",
            }}
          >
            {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
            Pass
          </button>
          <button
            onClick={() => grade("revision_required")}
            disabled={submitting}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-50 font-[family-name:var(--font-mitr)]"
            style={{
              background: "rgba(248,113,113,0.1)",
              border: "1px solid rgba(248,113,113,0.3)",
              color: "#f87171",
            }}
          >
            {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
            Needs revision
          </button>
        </div>
      )}

      {/* Comment section */}
      <div>
        <div
          className="text-xs font-semibold tracking-widest uppercase mb-1.5 font-[family-name:var(--font-mitr)]"
          style={{ color: "#3d5a6e" }}
        >
          <MessageSquare className="inline h-3 w-3 mr-1" />
          Comment
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendComment()}
            placeholder="Leave a comment for the participant…"
            className="flex-1 rounded-lg px-3 py-1.5 text-sm outline-none font-[family-name:var(--font-mitr)]"
            style={{
              background: "rgba(1,1,8,0.6)",
              border: "1px solid rgba(74,107,130,0.25)",
              color: "#c8d8e4",
            }}
          />
          <button
            onClick={sendComment}
            disabled={sendingComment || !comment.trim()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all disabled:opacity-40 font-[family-name:var(--font-mitr)]"
            style={{
              background: commentSent ? "rgba(52,211,153,0.12)" : "rgba(145,196,227,0.1)",
              border: commentSent ? "1px solid rgba(52,211,153,0.3)" : "1px solid rgba(145,196,227,0.25)",
              color: commentSent ? "#34d399" : "#91C4E3",
            }}
          >
            {sendingComment ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            {commentSent ? "Sent!" : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Submission Detail ─────────────────────────────────────────────────────────

function SubmissionDetail({
  team,
  activity,
  activeMemberId,
  onMemberSwitch,
  onStatusChanged,
}: {
  team: AssembledTeam;
  activity: ActivityGroup | null;
  activeMemberId: string | null;
  onMemberSwitch: (id: string) => void;
  onStatusChanged: (activityId: string, submissionId: string, scope: "individual" | "team", newStatus: string) => void;
}) {
  if (!activity) {
    return (
      <div
        className="flex-1 flex flex-col items-center justify-center gap-3 rounded-xl border"
        style={{
          background: "rgba(13,18,25,0.6)",
          borderColor: "rgba(74,107,130,0.2)",
          color: "#3d5a6e",
        }}
      >
        <FileText className="h-8 w-8 opacity-40" />
        <span className="text-sm font-[family-name:var(--font-mitr)]">
          Select an activity to view submission
        </span>
      </div>
    );
  }

  const activeIndividualSub = activeMemberId
    ? activity.participant_submissions.find((ps) => ps.participant_id === activeMemberId) ?? null
    : null;

  const viewingContent = activeIndividualSub ?? activity.team_submission;
  const isTeamView = activeIndividualSub === null;

  const gradableScope: "individual" | "team" = activeIndividualSub ? "individual" : "team";
  const gradableId = viewingContent?.id ?? null;
  const hasTextAnswer = Boolean(viewingContent?.text_answer?.trim());

  return (
    <div
      className="flex-1 flex flex-col rounded-xl border overflow-hidden"
      style={{
        background: "rgba(13,18,25,0.6)",
        borderColor: "rgba(74,107,130,0.2)",
      }}
    >
      {/* Participant switcher */}
      <div
        className="px-4 pt-3 pb-2 border-b"
        style={{ borderColor: "rgba(74,107,130,0.15)" }}
      >
        <div
          className="text-xs font-semibold tracking-widest uppercase mb-2 font-[family-name:var(--font-mitr)]"
          style={{ color: "#3d5a6e" }}
        >
          View submission by
        </div>
        <div className="flex gap-2 flex-wrap">
          {activity.team_submission && (
            <button
              onClick={() => onMemberSwitch("")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm transition-all"
              style={{
                background: isTeamView ? "rgba(145,196,227,0.1)" : "transparent",
                borderColor: isTeamView ? "rgba(145,196,227,0.4)" : "rgba(74,107,130,0.25)",
                color: isTeamView ? "#91C4E3" : "#7a9ab2",
              }}
            >
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold text-white bg-slate-600">
                T
              </span>
              <span className="font-[family-name:var(--font-mitr)]">Team</span>
              <span className={`w-2 h-2 rounded-full ${statusDot(activity.team_submission.status)}`} />
            </button>
          )}
          {team.members.map((member, idx) => {
            const memberSub = activity.participant_submissions.find(
              (ps) => ps.participant_id === member.participant_id
            );
            const hasSubmission = !!memberSub;
            const isActive = activeMemberId === member.participant_id;
            return (
              <button
                key={member.participant_id}
                disabled={!hasSubmission}
                onClick={() => hasSubmission && onMemberSwitch(member.participant_id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm transition-all"
                style={{
                  opacity: hasSubmission ? 1 : 0.35,
                  cursor: hasSubmission ? "pointer" : "not-allowed",
                  background: isActive ? "rgba(145,196,227,0.1)" : "transparent",
                  borderColor: isActive ? "rgba(145,196,227,0.4)" : "rgba(74,107,130,0.25)",
                  color: isActive ? "#91C4E3" : "#7a9ab2",
                }}
              >
                <span
                  className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold text-white ${avatarColor(idx)}`}
                >
                  {member.name.charAt(0).toUpperCase()}
                </span>
                <span className="font-[family-name:var(--font-mitr)]">{member.name.split(" ")[0]}</span>
                {member.is_owner && <span className="text-xs">👑</span>}
                {hasSubmission && memberSub && (
                  <span className={`w-2 h-2 rounded-full ${statusDot(memberSub.status)}`} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {viewingContent ? (
        <>
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0">
            <div>
              <div
                className="text-xs font-semibold tracking-widest uppercase mb-2 font-[family-name:var(--font-mitr)]"
                style={{ color: "#3d5a6e" }}
              >
                Assessment Prompt
              </div>
              <p
                className="text-lg leading-relaxed italic font-[family-name:var(--font-mitr)] sm:text-xl"
                style={{ color: "#7a9ab2" }}
              >
                {activity.prompt ?? "No prompt available"}
              </p>
            </div>

            {hasTextAnswer && (
              <div>
                <div
                  className="text-xs font-semibold tracking-widest uppercase mb-2 font-[family-name:var(--font-mitr)]"
                  style={{ color: "#3d5a6e" }}
                >
                  Submitted Answer
                </div>
                <div
                  className="rounded-lg p-4 max-h-[240px] overflow-y-auto"
                  style={{
                    background: "rgba(1,1,8,0.6)",
                    border: "1px solid rgba(74,107,130,0.2)",
                  }}
                >
                  <p
                    className="text-sm leading-relaxed whitespace-pre-wrap font-[family-name:var(--font-mitr)] sm:text-base"
                    style={{ color: "#c8d8e4" }}
                  >
                    {viewingContent.text_answer}
                  </p>
                </div>
              </div>
            )}

            {viewingContent.image_url && (
              <div
                className="rounded-lg p-3"
                style={{
                  background: "rgba(1,1,8,0.4)",
                  border: "1px solid rgba(74,107,130,0.2)",
                }}
              >
                <div
                  className="text-xs font-semibold tracking-widest uppercase mb-2 flex items-center gap-1.5 font-[family-name:var(--font-mitr)]"
                  style={{ color: "#3d5a6e" }}
                >
                  <ImageIcon className="h-4 w-4" /> Image
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={viewingContent.image_url}
                  alt="submission"
                  className="max-h-96 w-full rounded-md object-contain"
                  style={{ border: "1px solid rgba(74,107,130,0.25)" }}
                />
              </div>
            )}

            {viewingContent.file_urls && viewingContent.file_urls.length > 0 && (
              <div>
                <div
                  className="text-xs font-semibold tracking-widest uppercase mb-2 flex items-center gap-1.5 font-[family-name:var(--font-mitr)]"
                  style={{ color: "#3d5a6e" }}
                >
                  <Paperclip className="h-4 w-4" /> Files
                </div>
                <div className="flex flex-wrap gap-2">
                  {viewingContent.file_urls.map((url, i) => (
                    <a
                      key={url}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-sm rounded px-3 py-1.5 transition-colors font-[family-name:var(--font-mitr)]"
                      style={{
                        color: "#91C4E3",
                        border: "1px solid rgba(74,107,130,0.3)",
                      }}
                    >
                      <Paperclip className="h-2.5 w-2.5" />
                      File {i + 1}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div
            className="px-4 py-2 border-t flex items-center justify-between"
            style={{ borderColor: "rgba(74,107,130,0.15)" }}
          >
            <span
              className="text-xs px-2.5 py-1 rounded-full font-[family-name:var(--font-mitr)]"
              style={{
                background:
                  viewingContent.status === "passed"
                    ? "rgba(52,211,153,0.12)"
                    : viewingContent.status === "revision_required"
                    ? "rgba(248,113,113,0.12)"
                    : "rgba(245,158,11,0.12)",
                border:
                  viewingContent.status === "passed"
                    ? "1px solid rgba(52,211,153,0.3)"
                    : viewingContent.status === "revision_required"
                    ? "1px solid rgba(248,113,113,0.3)"
                    : "1px solid rgba(245,158,11,0.3)",
                color:
                  viewingContent.status === "passed"
                    ? "#34d399"
                    : viewingContent.status === "revision_required"
                    ? "#f87171"
                    : "#f59e0b",
              }}
            >
              {viewingContent.status.replace(/_/g, " ")}
            </span>
            {viewingContent.submitted_at && (
              <span
                className="text-xs font-[family-name:var(--font-mitr)]"
                style={{ color: "#3d5a6e" }}
              >
                {formatDistanceToNow(new Date(viewingContent.submitted_at), { addSuffix: true })}
              </span>
            )}
          </div>

          {gradableId && (
            <GradePanel
              scope={gradableScope}
              submissionId={gradableId}
              currentStatus={viewingContent.status}
              onGraded={(newStatus) => onStatusChanged(activity.activity_id, gradableId, gradableScope, newStatus)}
            />
          )}
        </>
      ) : (
        <div
          className="flex-1 flex items-center justify-center text-sm font-[family-name:var(--font-mitr)]"
          style={{ color: "#3d5a6e" }}
        >
          No submission content available
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function MentorTeamSubmissions() {
  const [allTeams, setAllTeams] = useState<AssembledTeam[]>([]);
  const [loading, setLoading] = useState(true);

  // Submission view state
  const [selectedTeam, setSelectedTeam] = useState<AssembledTeam | null>(null);
  const [selectedPhaseId, setSelectedPhaseId] = useState<string | null>(null);
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  const [activeMemberId, setActiveMemberId] = useState<string | null>(null);

  const loadTeams = useCallback(() => {
    fetch("/api/hackathon/mentor/teams")
      .then((r) => r.json())
      .then((data) => {
        if (!data.teams) return;
        setAllTeams(data.teams.map(assembleTeam));
      })
      .catch((err) => console.error("Failed to load mentor teams:", err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadTeams();
  }, [loadTeams]);

  function handleSelectTeam(team: AssembledTeam) {
    setSelectedTeam(team);
    setSelectedPhaseId(null);
    setSelectedActivityId(null);
    setActiveMemberId(null);
  }

  function handleSelectPhase(phaseId: string) {
    if (!selectedTeam) return;
    if (!phaseId) {
      setSelectedPhaseId(null);
      setSelectedActivityId(null);
      setActiveMemberId(null);
      return;
    }

    const phase = buildPhaseGroups(selectedTeam).find((item) => item.phase_id === phaseId) ?? null;
    setSelectedPhaseId(phaseId);
    setSelectedActivityId(phase?.activities[0]?.activity_id ?? null);
    setActiveMemberId(null);
  }

  function handleSelectActivity(activityId: string) {
    setSelectedActivityId(activityId);
    if (!selectedTeam) return;
    const activity = selectedTeam.activities.find((a) => a.activity_id === activityId);
    if (!activity) return;
    const firstSubmitter = selectedTeam.members.find((m) =>
      activity.participant_submissions.some((ps) => ps.participant_id === m.participant_id)
    );
    setActiveMemberId(firstSubmitter?.participant_id ?? null);
  }

  function handleStatusChanged(
    activityId: string,
    submissionId: string,
    scope: "individual" | "team",
    newStatus: string
  ) {
    if (!selectedTeam) return;
    setAllTeams((prev) =>
      prev.map((t) => {
        if (t.id !== selectedTeam.id) return t;
        const updatedActivities = t.activities.map((a) => {
          if (a.activity_id !== activityId) return a;
          if (scope === "team" && a.team_submission?.id === submissionId) {
            return { ...a, team_submission: { ...a.team_submission!, status: newStatus } };
          }
          if (scope === "individual") {
            return {
              ...a,
              participant_submissions: a.participant_submissions.map((ps) =>
                ps.id === submissionId ? { ...ps, status: newStatus } : ps
              ),
            };
          }
          return a;
        });
        return { ...t, activities: updatedActivities };
      })
    );
    setSelectedTeam((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        activities: prev.activities.map((a) => {
          if (a.activity_id !== activityId) return a;
          if (scope === "team" && a.team_submission?.id === submissionId) {
            return { ...a, team_submission: { ...a.team_submission!, status: newStatus } };
          }
          if (scope === "individual") {
            return {
              ...a,
              participant_submissions: a.participant_submissions.map((ps) =>
                ps.id === submissionId ? { ...ps, status: newStatus } : ps
              ),
            };
          }
          return a;
        }),
      };
    });
  }

  const assignedTeams = allTeams.filter((t) => t.is_assigned);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin" style={{ color: "#5a7a94" }} />
      </div>
    );
  }

  // ─── Submission Detail View (after picking a team) ──────────────────────────
  if (selectedTeam) {
    const selectedActivity =
      selectedTeam.activities.find((a) => a.activity_id === selectedActivityId) ?? null;

    return (
      <div className="flex flex-col gap-3">
        <button
          onClick={() => setSelectedTeam(null)}
          className="flex w-fit items-center gap-1.5 text-base transition-colors font-[family-name:var(--font-mitr)]"
          style={{ color: "#5a7a94" }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#91C4E3")}
          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "#5a7a94")}
        >
          <ChevronLeft className="h-4 w-4" />
          My Teams
        </button>

        <div className="flex items-center gap-3">
          <span
            className="text-2xl font-semibold font-[family-name:var(--font-bai-jamjuree)]"
            style={{ color: "#c8d8e4" }}
          >
            {selectedTeam.name}
          </span>
          <div className="flex items-center gap-1" style={{ color: "#5a7a94" }}>
            <Users className="h-4 w-4" />
            <span className="text-lg font-[family-name:var(--font-mitr)]">
              {selectedTeam.member_count} members
            </span>
          </div>
        </div>

        <div className="flex gap-4" style={{ minHeight: "480px" }}>
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
            activeMemberId={activeMemberId}
            onMemberSwitch={setActiveMemberId}
            onStatusChanged={handleStatusChanged}
          />
        </div>
      </div>
    );
  }

  // ─── Team Grid View ─────────────────────────────────────────────────────────
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        {assignedTeams.map((team) => {
          const passedCount = team.activities.filter((a) => a.status === "passed").length;
          const pendingCount = team.activities.filter(
            (a) => a.status === "submitted" || a.status === "pending_review"
          ).length;

          return (
            <button
              key={team.id}
              onClick={() => handleSelectTeam(team)}
              className="text-left p-4 rounded-2xl transition-all"
              style={{
                background: "rgba(13,18,25,0.7)",
                border: "1px solid rgba(74,107,130,0.25)",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = "rgba(18,28,41,0.85)";
                (e.currentTarget as HTMLElement).style.borderColor = "rgba(145,196,227,0.3)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = "rgba(13,18,25,0.7)";
                (e.currentTarget as HTMLElement).style.borderColor = "rgba(74,107,130,0.25)";
              }}
            >
              <div
                className="mb-0.5 text-lg font-semibold font-[family-name:var(--font-bai-jamjuree)]"
                style={{ color: "#c8d8e4" }}
              >
                {team.name}
              </div>
              <div className="flex items-center gap-1 mb-2 mt-3">
                <Users className="h-4 w-4" style={{ color: "#3d5a6e" }} />
                <span
                  className="text-sm font-[family-name:var(--font-mitr)]"
                  style={{ color: "#5a7a94" }}
                >
                  {team.member_count} members
                </span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span
                  className="text-sm font-[family-name:var(--font-mitr)]"
                  style={{ color: "#5a7a94" }}
                >
                  {team.activities.length} activit{team.activities.length === 1 ? "y" : "ies"}
                </span>
                {passedCount > 0 && (
                  <span
                    className="text-[9px] px-1.5 py-0 rounded-full font-[family-name:var(--font-mitr)]"
                    style={{
                      background: "rgba(52,211,153,0.12)",
                      border: "1px solid rgba(52,211,153,0.3)",
                      color: "#34d399",
                    }}
                  >
                    {passedCount} passed
                  </span>
                )}
                {pendingCount > 0 && (
                  <span
                    className="text-[9px] px-1.5 py-0 rounded-full font-[family-name:var(--font-mitr)]"
                    style={{
                      background: "rgba(245,158,11,0.12)",
                      border: "1px solid rgba(245,158,11,0.3)",
                      color: "#f59e0b",
                    }}
                  >
                    {pendingCount} pending
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {assignedTeams.length === 0 && (
        <p
          className="mt-4 text-center text-sm font-[family-name:var(--font-mitr)]"
          style={{ color: "#3d5a6e" }}
        >
          No teams assigned yet. An admin will assign teams to you.
        </p>
      )}
    </>
  );
}
