"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileText, Paperclip, Image as ImageIcon } from "lucide-react";
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
  assessment_id: string | null;
  prompt: string | null;
  status: string;
  text_answer: string | null;
  image_url: string | null;
  file_urls: string[];
  submitted_at: string | null;
}

interface TeamSubmissionItem {
  id: string;
  team_id: string;
  team_name: string;
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
  members: SubmissionMember[];
  participant_submissions: IndividualSubmissionDetail[];
}

type FilterValue = "all" | "pending_review" | "submitted" | "passed" | "revision_required";

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

const AVATAR_COLORS = [
  "bg-indigo-500",
  "bg-sky-500",
  "bg-violet-500",
  "bg-emerald-500",
  "bg-rose-500",
];

function avatarColor(index: number): string {
  return AVATAR_COLORS[index % AVATAR_COLORS.length];
}

// ─── FilterPills ──────────────────────────────────────────────────────────────

function FilterPills({
  filter,
  onFilter,
  allItems,
}: {
  filter: FilterValue;
  onFilter: (f: FilterValue) => void;
  allItems: TeamSubmissionItem[];
}) {
  const counts: Record<FilterValue, number> = {
    all: allItems.length,
    submitted: allItems.filter((s) => s.status === "submitted").length,
    pending_review: allItems.filter((s) => s.status === "pending_review").length,
    passed: allItems.filter((s) => s.status === "passed").length,
    revision_required: allItems.filter((s) => s.status === "revision_required").length,
  };

  const pills: { label: string; value: FilterValue }[] = [
    { label: "All", value: "all" },
    { label: "Submitted", value: "submitted" },
    { label: "Pending Review", value: "pending_review" },
    { label: "Passed", value: "passed" },
    { label: "Needs Revision", value: "revision_required" },
  ];

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {pills.map((p) => (
        <button
          key={p.value}
          onClick={() => onFilter(p.value)}
          className={`text-xs px-3 py-1 rounded-full border transition-colors ${
            filter === p.value
              ? "bg-indigo-500/20 border-indigo-500/60 text-indigo-300"
              : "border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-300 bg-transparent"
          }`}
        >
          {p.label}
          <span className="ml-1.5 opacity-60">{counts[p.value]}</span>
        </button>
      ))}
    </div>
  );
}

// ─── SubmissionList ───────────────────────────────────────────────────────────

function SubmissionList({
  items,
  selectedId,
  onSelect,
}: {
  items: TeamSubmissionItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="w-[34%] flex flex-col gap-2 overflow-y-auto max-h-[600px] pr-1">
      {items.length === 0 && (
        <div className="text-slate-500 text-sm text-center py-12">No submissions found.</div>
      )}
      {items.map((item) => {
        const isSelected = item.id === selectedId;
        return (
          <button
            key={item.id}
            onClick={() => onSelect(item.id)}
            className={`w-full text-left p-3 rounded-lg border transition-all ${
              isSelected
                ? "border-indigo-500 bg-indigo-500/6 shadow-[0_0_0_1px_#6366f1]"
                : "border-slate-700/50 bg-slate-950/20 hover:border-slate-600"
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-sm font-semibold text-slate-200 truncate">{item.team_name}</span>
              <StatusBadge status={item.status} />
            </div>
            <div className="text-xs text-slate-500 truncate mb-1">
              {item.activity_title ?? item.activity_id}
            </div>
            {item.submitted_at && (
              <div className="text-[10px] text-slate-600">
                {formatDistanceToNow(new Date(item.submitted_at), { addSuffix: true })}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─── DetailPanel ─────────────────────────────────────────────────────────────

function DetailPanel({
  selected,
  activeMemberId,
  onMemberSwitch,
}: {
  selected: TeamSubmissionItem | null;
  activeMemberId: string | null;
  onMemberSwitch: (id: string) => void;
}) {
  if (!selected) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 rounded-lg border border-slate-700/50 bg-slate-950/20 text-slate-500">
        <FileText className="h-8 w-8 opacity-40" />
        <span className="text-sm">Select a team submission to view details</span>
      </div>
    );
  }

  const activeIndividualSub = activeMemberId
    ? selected.participant_submissions.find((ps) => ps.participant_id === activeMemberId) ?? null
    : null;

  const viewingContent = activeIndividualSub ?? selected;
  const isTeamView = activeIndividualSub === null;

  return (
    <div className="flex-1 flex flex-col rounded-lg border border-slate-700/50 bg-slate-950/20 overflow-hidden">
      {/* Participant switcher */}
      <div className="px-4 pt-3 pb-2 border-b border-slate-800/60">
        <div className="text-[9px] font-semibold tracking-widest text-slate-600 uppercase mb-2">
          View submission by
        </div>
        <div className="flex gap-2 flex-wrap">
          {selected.members.map((member, idx) => {
            const memberSub = selected.participant_submissions.find(
              (ps) => ps.participant_id === member.participant_id
            );
            const hasSubmission = !!memberSub;
            const isActive = activeMemberId === member.participant_id;

            return (
              <button
                key={member.participant_id}
                disabled={!hasSubmission}
                onClick={() => hasSubmission && onMemberSwitch(member.participant_id)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs transition-all ${
                  !hasSubmission
                    ? "opacity-40 cursor-not-allowed border-slate-700 bg-transparent text-slate-400"
                    : isActive
                    ? "border-indigo-500 bg-indigo-500/10 text-indigo-300"
                    : "border-slate-700 hover:border-slate-500 text-slate-300 bg-transparent"
                }`}
              >
                <span
                  className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[9px] font-bold text-white ${avatarColor(idx)}`}
                >
                  {member.name.charAt(0).toUpperCase()}
                </span>
                <span>{member.name.split(" ")[0]}</span>
                {member.is_owner && <span className="text-[9px]">👑</span>}
                {hasSubmission && memberSub && (
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      memberSub.status === "passed"
                        ? "bg-emerald-400"
                        : memberSub.status === "revision_required"
                        ? "bg-red-400"
                        : "bg-yellow-400"
                    }`}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Viewing label + activity context */}
      <div className="px-4 py-2 border-b border-slate-800/60">
        <span className="text-[10px] text-slate-500">
          {isTeamView
            ? "Viewing team submission"
            : `Viewing ${selected.members.find((m) => m.participant_id === activeMemberId)?.name ?? ""}'s submission`}
        </span>
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <Badge className="text-[9px] bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 px-1.5 py-0">
            {isTeamView ? "Team" : "Individual"}
          </Badge>
          <span className="text-xs font-semibold text-slate-200">
            {viewingContent.activity_title ?? viewingContent.activity_id}
          </span>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
        {/* Assessment prompt */}
        <div>
          <div className="text-[9px] font-semibold tracking-widest text-slate-600 uppercase mb-1">
            Assessment Prompt
          </div>
          <p className="text-xs text-slate-400 italic">
            {viewingContent.prompt ?? "No prompt available"}
          </p>
        </div>

        {/* Answer */}
        <div>
          <div className="text-[9px] font-semibold tracking-widest text-slate-600 uppercase mb-1">
            Submitted Answer
          </div>
          {viewingContent.text_answer ? (
            <div className="bg-slate-900/60 border border-slate-800 rounded-md p-3 max-h-[200px] overflow-y-auto">
              <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
                {viewingContent.text_answer}
              </p>
            </div>
          ) : (
            <p className="text-xs text-slate-600 italic">No text answer submitted</p>
          )}
        </div>

        {/* Image */}
        {viewingContent.image_url && (
          <div>
            <div className="text-[9px] font-semibold tracking-widest text-slate-600 uppercase mb-1 flex items-center gap-1">
              <ImageIcon className="h-3 w-3" /> Image
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={viewingContent.image_url}
              alt="submission"
              className="max-h-[120px] rounded border border-slate-700 object-contain"
            />
          </div>
        )}

        {/* Files */}
        {viewingContent.file_urls && viewingContent.file_urls.length > 0 && (
          <div>
            <div className="text-[9px] font-semibold tracking-widest text-slate-600 uppercase mb-1 flex items-center gap-1">
              <Paperclip className="h-3 w-3" /> Files
            </div>
            <div className="flex flex-wrap gap-2">
              {viewingContent.file_urls.map((url, i) => (
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
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2.5 border-t border-slate-800/60 flex items-center justify-between">
        <StatusBadge status={viewingContent.status} />
        {viewingContent.submitted_at && (
          <span className="text-[10px] text-slate-600">
            Submitted {formatDistanceToNow(new Date(viewingContent.submitted_at), { addSuffix: true })}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AdminHackathonTeamSubmissions() {
  const [allItems, setAllItems] = useState<TeamSubmissionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterValue>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeMemberId, setActiveMemberId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/hackathon/teams/submissions")
      .then((r) => r.json())
      .then((data) => {
        if (!data.teams) return;
        const items: TeamSubmissionItem[] = [];
        for (const team of data.teams) {
          for (const sub of team.team_submissions) {
            items.push({
              ...sub,
              team_id: team.id,
              team_name: team.name,
              members: team.members,
              participant_submissions: team.individual_submissions.filter(
                (is: IndividualSubmissionDetail) => is.activity_id === sub.activity_id
              ),
            });
          }
        }
        setAllItems(items);
      })
      .catch((err) => console.error("Failed to load team submissions:", err))
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter === "all"
    ? allItems
    : allItems.filter((s) => s.status === filter);

  const selected = allItems.find((s) => s.id === selectedId) ?? null;

  function handleSelect(id: string) {
    setSelectedId(id);
    const item = allItems.find((s) => s.id === id);
    if (!item) return;
    const firstSubmitter = item.members.find((m) =>
      item.participant_submissions.some((ps) => ps.participant_id === m.participant_id)
    );
    setActiveMemberId(firstSubmitter?.participant_id ?? null);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <FilterPills filter={filter} onFilter={setFilter} allItems={allItems} />
      <div className="flex gap-4 min-h-[520px]">
        <SubmissionList
          items={filtered}
          selectedId={selectedId}
          onSelect={handleSelect}
        />
        <DetailPanel
          selected={selected}
          activeMemberId={activeMemberId}
          onMemberSwitch={setActiveMemberId}
        />
      </div>
    </div>
  );
}
