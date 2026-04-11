"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2, FileText, Paperclip, Image as ImageIcon, ChevronLeft, Users, Plus, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";

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
        prompt: is.prompt,
        status: is.status,
        submitted_at: is.submitted_at,
        team_submission: null,
        participant_submissions: [is],
      });
    }
  }

  for (const ag of activityMap.values()) {
    ag.status = deriveActivityStatus(ag.team_submission, ag.participant_submissions);
    const dates = [
      ag.team_submission?.submitted_at,
      ...ag.participant_submissions.map((s) => s.submitted_at),
    ].filter(Boolean) as string[];
    ag.submitted_at = dates.sort().at(-1) ?? null;
  }

  return {
    id: team.id,
    name: team.name,
    lobby_code: team.lobby_code,
    owner_id: team.owner_id,
    member_count: team.member_count,
    members: team.members,
    is_assigned: team.is_assigned,
    activities: Array.from(activityMap.values()),
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

// ─── Team Picker Modal ────────────────────────────────────────────────────────

function TeamPickerModal({
  allTeams,
  onPick,
  onClose,
}: {
  allTeams: AssembledTeam[];
  onPick: (teamId: string) => void;
  onClose: () => void;
}) {
  const unassigned = allTeams.filter((t) => !t.is_assigned);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(1,1,8,0.85)", backdropFilter: "blur(6px)" }}
    >
      <div
        className="w-full max-w-md rounded-2xl p-5 space-y-4"
        style={{
          background: "linear-gradient(135deg, rgba(13,18,25,0.97), rgba(18,28,41,0.95))",
          border: "1px solid rgba(74,107,130,0.3)",
        }}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-white font-[family-name:var(--font-bai-jamjuree)]">
            Pick a Team
          </h2>
          <button
            onClick={onClose}
            className="text-[#5a7a94] hover:text-white transition-colors p-1"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {unassigned.length === 0 ? (
          <p
            className="text-sm text-center py-6 font-[family-name:var(--font-mitr)]"
            style={{ color: "#5a7a94" }}
          >
            All teams are already assigned.
          </p>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {unassigned.map((team) => (
              <button
                key={team.id}
                onClick={() => onPick(team.id)}
                className="w-full text-left px-4 py-3 rounded-xl transition-all"
                style={{
                  background: "rgba(165,148,186,0.06)",
                  border: "1px solid rgba(165,148,186,0.15)",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "rgba(165,148,186,0.14)";
                  (e.currentTarget as HTMLElement).style.borderColor = "rgba(165,148,186,0.35)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "rgba(165,148,186,0.06)";
                  (e.currentTarget as HTMLElement).style.borderColor = "rgba(165,148,186,0.15)";
                }}
              >
                <p className="text-sm font-medium text-white font-[family-name:var(--font-bai-jamjuree)]">
                  {team.name}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span
                    className="text-[10px] font-[family-name:var(--font-space-mono)]"
                    style={{ color: "#5a7a94" }}
                  >
                    {team.lobby_code}
                  </span>
                  <span
                    className="text-[10px] font-[family-name:var(--font-mitr)]"
                    style={{ color: "#7a9ab2" }}
                  >
                    · {team.member_count} members
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Activity List ─────────────────────────────────────────────────────────────

function ActivityList({
  team,
  selectedActivityId,
  onSelectActivity,
}: {
  team: AssembledTeam;
  selectedActivityId: string | null;
  onSelectActivity: (id: string) => void;
}) {
  return (
    <div className="w-[34%] flex flex-col gap-2 overflow-y-auto max-h-[480px] pr-1">
      <div
        className="text-[9px] font-semibold tracking-widest uppercase mb-1 px-1 font-[family-name:var(--font-mitr)]"
        style={{ color: "#3d5a6e" }}
      >
        Activities · {team.activities.length}
      </div>
      {team.activities.length === 0 && (
        <p
          className="text-sm text-center py-8 font-[family-name:var(--font-mitr)]"
          style={{ color: "#5a7a94" }}
        >
          No submissions yet.
        </p>
      )}
      {team.activities.map((activity) => {
        const isSelected = selectedActivityId === activity.activity_id;
        return (
          <button
            key={activity.activity_id}
            onClick={() => onSelectActivity(activity.activity_id)}
            className="w-full text-left p-3 rounded-xl border transition-all"
            style={{
              background: isSelected ? "rgba(145,196,227,0.08)" : "rgba(13,18,25,0.6)",
              borderColor: isSelected ? "rgba(145,196,227,0.4)" : "rgba(74,107,130,0.2)",
            }}
          >
            <div className="flex items-center justify-between gap-2 mb-1">
              <span
                className="text-xs font-semibold truncate font-[family-name:var(--font-bai-jamjuree)]"
                style={{ color: isSelected ? "#91C4E3" : "#c8d8e4" }}
              >
                {activity.activity_title ?? activity.activity_id}
              </span>
              <span
                className={`w-2 h-2 rounded-full flex-shrink-0 ${statusDot(activity.status)}`}
              />
            </div>
            {activity.submitted_at && (
              <p
                className="text-[10px] font-[family-name:var(--font-mitr)]"
                style={{ color: "#3d5a6e" }}
              >
                {formatDistanceToNow(new Date(activity.submitted_at), { addSuffix: true })}
              </p>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─── Submission Detail ─────────────────────────────────────────────────────────

function SubmissionDetail({
  team,
  activity,
  activeMemberId,
  onMemberSwitch,
}: {
  team: AssembledTeam;
  activity: ActivityGroup | null;
  activeMemberId: string | null;
  onMemberSwitch: (id: string) => void;
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
          className="text-[9px] font-semibold tracking-widest uppercase mb-2 font-[family-name:var(--font-mitr)]"
          style={{ color: "#3d5a6e" }}
        >
          View submission by
        </div>
        <div className="flex gap-2 flex-wrap">
          {activity.team_submission && (
            <button
              onClick={() => onMemberSwitch("")}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs transition-all"
              style={{
                background: isTeamView ? "rgba(145,196,227,0.1)" : "transparent",
                borderColor: isTeamView ? "rgba(145,196,227,0.4)" : "rgba(74,107,130,0.25)",
                color: isTeamView ? "#91C4E3" : "#7a9ab2",
              }}
            >
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[9px] font-bold text-white bg-slate-600">
                T
              </span>
              <span className="font-[family-name:var(--font-mitr)]">Team</span>
              <span className={`w-1.5 h-1.5 rounded-full ${statusDot(activity.team_submission.status)}`} />
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
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs transition-all"
                style={{
                  opacity: hasSubmission ? 1 : 0.35,
                  cursor: hasSubmission ? "pointer" : "not-allowed",
                  background: isActive ? "rgba(145,196,227,0.1)" : "transparent",
                  borderColor: isActive ? "rgba(145,196,227,0.4)" : "rgba(74,107,130,0.25)",
                  color: isActive ? "#91C4E3" : "#7a9ab2",
                }}
              >
                <span
                  className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[9px] font-bold text-white ${avatarColor(idx)}`}
                >
                  {member.name.charAt(0).toUpperCase()}
                </span>
                <span className="font-[family-name:var(--font-mitr)]">{member.name.split(" ")[0]}</span>
                {member.is_owner && <span className="text-[9px]">👑</span>}
                {hasSubmission && memberSub && (
                  <span className={`w-1.5 h-1.5 rounded-full ${statusDot(memberSub.status)}`} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Viewing label */}
      <div
        className="px-4 py-2 border-b"
        style={{ borderColor: "rgba(74,107,130,0.15)" }}
      >
        <span
          className="text-[10px] font-[family-name:var(--font-mitr)]"
          style={{ color: "#5a7a94" }}
        >
          {isTeamView
            ? "Viewing team submission"
            : `Viewing ${team.members.find((m) => m.participant_id === activeMemberId)?.name ?? ""}'s submission`}
        </span>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span
            className="text-[9px] px-2 py-0.5 rounded-full font-[family-name:var(--font-mitr)]"
            style={{
              background: "rgba(145,196,227,0.08)",
              border: "1px solid rgba(145,196,227,0.2)",
              color: "#91C4E3",
            }}
          >
            {isTeamView ? "Team" : "Individual"}
          </span>
          <span
            className="text-xs font-semibold font-[family-name:var(--font-bai-jamjuree)]"
            style={{ color: "#c8d8e4" }}
          >
            {activity.activity_title ?? activity.activity_id}
          </span>
        </div>
      </div>

      {viewingContent ? (
        <>
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
            <div>
              <div
                className="text-[9px] font-semibold tracking-widest uppercase mb-1 font-[family-name:var(--font-mitr)]"
                style={{ color: "#3d5a6e" }}
              >
                Assessment Prompt
              </div>
              <p
                className="text-xs italic font-[family-name:var(--font-mitr)]"
                style={{ color: "#7a9ab2" }}
              >
                {activity.prompt ?? "No prompt available"}
              </p>
            </div>

            <div>
              <div
                className="text-[9px] font-semibold tracking-widest uppercase mb-1 font-[family-name:var(--font-mitr)]"
                style={{ color: "#3d5a6e" }}
              >
                Submitted Answer
              </div>
              {viewingContent.text_answer ? (
                <div
                  className="rounded-lg p-3 max-h-[200px] overflow-y-auto"
                  style={{
                    background: "rgba(1,1,8,0.6)",
                    border: "1px solid rgba(74,107,130,0.2)",
                  }}
                >
                  <p
                    className="text-xs leading-relaxed whitespace-pre-wrap font-[family-name:var(--font-mitr)]"
                    style={{ color: "#c8d8e4" }}
                  >
                    {viewingContent.text_answer}
                  </p>
                </div>
              ) : (
                <p
                  className="text-xs italic font-[family-name:var(--font-mitr)]"
                  style={{ color: "#3d5a6e" }}
                >
                  No text answer submitted
                </p>
              )}
            </div>

            {viewingContent.image_url && (
              <div
                className="rounded-lg p-3"
                style={{
                  background: "rgba(1,1,8,0.4)",
                  border: "1px solid rgba(74,107,130,0.2)",
                }}
              >
                <div
                  className="text-[9px] font-semibold tracking-widest uppercase mb-2 flex items-center gap-1 font-[family-name:var(--font-mitr)]"
                  style={{ color: "#3d5a6e" }}
                >
                  <ImageIcon className="h-3 w-3" /> Image
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
                  className="text-[9px] font-semibold tracking-widest uppercase mb-1 flex items-center gap-1 font-[family-name:var(--font-mitr)]"
                  style={{ color: "#3d5a6e" }}
                >
                  <Paperclip className="h-3 w-3" /> Files
                </div>
                <div className="flex flex-wrap gap-2">
                  {viewingContent.file_urls.map((url, i) => (
                    <a
                      key={url}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-[10px] rounded px-2 py-1 transition-colors font-[family-name:var(--font-mitr)]"
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
            className="px-4 py-2.5 border-t flex items-center justify-between"
            style={{ borderColor: "rgba(74,107,130,0.15)" }}
          >
            <span
              className="text-[9px] px-2 py-0.5 rounded-full font-[family-name:var(--font-mitr)]"
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
                className="text-[10px] font-[family-name:var(--font-mitr)]"
                style={{ color: "#3d5a6e" }}
              >
                {formatDistanceToNow(new Date(viewingContent.submitted_at), { addSuffix: true })}
              </span>
            )}
          </div>
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
  const [assigning, setAssigning] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  // Submission view state
  const [selectedTeam, setSelectedTeam] = useState<AssembledTeam | null>(null);
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

  async function handlePick(teamId: string) {
    setAssigning(true);
    try {
      const res = await fetch("/api/hackathon/mentor/teams/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ team_id: teamId }),
      });
      if (res.ok) {
        // Reload teams so is_assigned is updated
        const reloaded = await fetch("/api/hackathon/mentor/teams").then((r) => r.json());
        if (reloaded.teams) {
          const assembled = reloaded.teams.map(assembleTeam);
          setAllTeams(assembled);
          setShowPicker(false);
          // Open the team's submission view
          const team = assembled.find((t: AssembledTeam) => t.id === teamId);
          if (team) {
            setSelectedTeam(team);
            setSelectedActivityId(null);
            setActiveMemberId(null);
          }
        }
      }
    } finally {
      setAssigning(false);
    }
  }

  function handleSelectTeam(team: AssembledTeam) {
    setSelectedTeam(team);
    setSelectedActivityId(null);
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
          className="flex items-center gap-1.5 text-xs transition-colors w-fit font-[family-name:var(--font-mitr)]"
          style={{ color: "#5a7a94" }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#91C4E3")}
          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "#5a7a94")}
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          My Teams
        </button>

        <div className="flex items-center gap-3">
          <span
            className="text-base font-semibold font-[family-name:var(--font-bai-jamjuree)]"
            style={{ color: "#c8d8e4" }}
          >
            {selectedTeam.name}
          </span>
          <span
            className="text-[10px] font-[family-name:var(--font-space-mono)]"
            style={{ color: "#3d5a6e" }}
          >
            {selectedTeam.lobby_code}
          </span>
          <div className="flex items-center gap-1" style={{ color: "#5a7a94" }}>
            <Users className="h-3 w-3" />
            <span className="text-[10px] font-[family-name:var(--font-mitr)]">
              {selectedTeam.member_count} members
            </span>
          </div>
        </div>

        <div className="flex gap-4" style={{ minHeight: "480px" }}>
          <ActivityList
            team={selectedTeam}
            selectedActivityId={selectedActivityId}
            onSelectActivity={handleSelectActivity}
          />
          <SubmissionDetail
            team={selectedTeam}
            activity={selectedActivity}
            activeMemberId={activeMemberId}
            onMemberSwitch={setActiveMemberId}
          />
        </div>
      </div>
    );
  }

  // ─── Team Grid View ─────────────────────────────────────────────────────────
  return (
    <>
      {showPicker && (
        <TeamPickerModal
          allTeams={allTeams}
          onPick={handlePick}
          onClose={() => setShowPicker(false)}
        />
      )}

      <div className="grid grid-cols-2 gap-3">
        {/* Assigned team cards */}
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
                className="font-semibold text-sm mb-0.5 font-[family-name:var(--font-bai-jamjuree)]"
                style={{ color: "#c8d8e4" }}
              >
                {team.name}
              </div>
              <div
                className="text-[10px] mb-3 font-[family-name:var(--font-space-mono)]"
                style={{ color: "#3d5a6e" }}
              >
                {team.lobby_code}
              </div>
              <div className="flex items-center gap-1 mb-2">
                <Users className="h-3 w-3" style={{ color: "#3d5a6e" }} />
                <span
                  className="text-[10px] font-[family-name:var(--font-mitr)]"
                  style={{ color: "#5a7a94" }}
                >
                  {team.member_count} members
                </span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span
                  className="text-[10px] font-[family-name:var(--font-mitr)]"
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

        {/* "+" add team card */}
        <button
          onClick={() => setShowPicker(true)}
          disabled={assigning}
          className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl transition-all min-h-[100px]"
          style={{
            background: "transparent",
            border: "1px dashed rgba(74,107,130,0.3)",
            color: "#3d5a6e",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = "rgba(145,196,227,0.35)";
            (e.currentTarget as HTMLElement).style.color = "#91C4E3";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = "rgba(74,107,130,0.3)";
            (e.currentTarget as HTMLElement).style.color = "#3d5a6e";
          }}
        >
          {assigning ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Plus className="h-5 w-5" />
          )}
          <span className="text-xs font-[family-name:var(--font-mitr)]">
            {assigning ? "Assigning..." : "Add Team"}
          </span>
        </button>
      </div>

      {assignedTeams.length === 0 && (
        <p
          className="text-center text-sm mt-4 font-[family-name:var(--font-mitr)]"
          style={{ color: "#3d5a6e" }}
        >
          Click &ldquo;Add Team&rdquo; to self-assign a team and view their submissions.
        </p>
      )}
    </>
  );
}
