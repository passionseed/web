"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import {
  ChevronDown,
  ChevronRight,
  Clock,
  FileText,
  Image as ImageIcon,
  Loader2,
  MessageSquare,
  Paperclip,
  RefreshCw,
  Search,
  Send,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type ReviewStatus = "pending_review" | "passed" | "revision_required";
type SubmissionScope = "individual" | "team";
type ContentType = "video" | "short_video" | "canva_slide" | "text" | "image" | "pdf" | "ai_chat" | "npc_chat";

interface ContentItem {
  id: string;
  content_type: ContentType;
  content_title: string | null;
  display_order: number;
}

interface Assessment {
  id: string;
  assessment_type: string;
  points_possible: number | null;
  is_graded: boolean | null;
  display_order: number;
  metadata: Record<string, unknown> | null;
}

interface Activity {
  id: string;
  phase_id: string;
  title: string;
  instructions: string | null;
  display_order: number;
  estimated_minutes: number | null;
  is_required: boolean;
  is_draft: boolean;
  submission_scope: SubmissionScope | null;
  content: ContentItem[];
  assessments: Assessment[];
  submissions: Submission[];
  submission_count: number;
}

interface Phase {
  id: string;
  title: string;
  description: string | null;
  phase_number: number;
  starts_at: string | null;
  ends_at: string | null;
  due_at: string | null;
  hackathon_phase_activities: Activity[];
}

interface Person {
  id: string;
  name: string | null;
  email: string | null;
  avatar_url: string | null;
  university?: string | null;
}

interface Team {
  id: string;
  name: string | null;
  lobby_code: string | null;
}

interface Review {
  id: string;
  review_status: ReviewStatus;
  score_awarded: number | null;
  feedback: string | null;
  reviewed_at: string | null;
  reviewed_by_user_id: string | null;
}

interface AdminComment {
  id: string;
  content: string;
  commented_by_user_id: string | null;
  created_at: string;
}

interface Submission {
  scope: SubmissionScope;
  id: string;
  status: string;
  review_status: ReviewStatus;
  submitted_at: string | null;
  text_answer: string | null;
  image_url: string | null;
  file_urls: string[];
  participant: Person | null;
  team: Team | null;
  team_members: Person[];
  submitted_by: Person | null;
  review: Review | null;
  admin_comments: AdminComment[];
}

interface Stats {
  total_submissions: number;
  pending_review: number;
  passed: number;
  revision_required: number;
}

const STATUS_LABELS: Record<ReviewStatus, string> = {
  pending_review: "Pending",
  passed: "Passed",
  revision_required: "Needs revision",
};

const STATUS_COLORS: Record<ReviewStatus, string> = {
  pending_review: "border-amber-400/40 bg-amber-500/15 text-amber-200",
  passed: "border-emerald-400/40 bg-emerald-500/15 text-emerald-200",
  revision_required: "border-rose-400/40 bg-rose-500/15 text-rose-200",
};

function StatusBadge({ status }: { status: ReviewStatus }) {
  return (
    <Badge variant="outline" className={STATUS_COLORS[status]}>
      {STATUS_LABELS[status]}
    </Badge>
  );
}

function ContentTypeIcon({ type }: { type: ContentType }) {
  const icons: Record<ContentType, string> = {
    video: "🎬",
    short_video: "📱",
    canva_slide: "📊",
    text: "📝",
    image: "🖼️",
    pdf: "📄",
    ai_chat: "🤖",
    npc_chat: "💬",
  };
  return <span className="text-sm">{icons[type] || "📄"}</span>;
}

function getOwnerLabel(submission: Submission) {
  if (submission.scope === "team") {
    return submission.team?.name ?? "Unnamed team";
  }
  return submission.participant?.name ?? submission.participant?.email ?? "Unnamed participant";
}

export function AdminHackathonActivities() {
  const [phases, setPhases] = useState<Phase[]>([]);
  const [stats, setStats] = useState<Stats>({
    total_submissions: 0,
    pending_review: 0,
    passed: 0,
    revision_required: 0,
  });
  const [loading, setLoading] = useState(true);
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set());
  const [expandedActivities, setExpandedActivities] = useState<Set<string>>(new Set());
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ReviewStatus | "all">("all");
  const [scopeFilter, setScopeFilter] = useState<SubmissionScope | "all">("all");
  const [commentText, setCommentText] = useState("");
  const [savingComment, setSavingComment] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    void fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/admin/hackathon/activities");
      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error ?? "Failed to fetch activities");
        return;
      }

      setPhases(data.phases ?? []);
      setStats(data.stats ?? { total_submissions: 0, pending_review: 0, passed: 0, revision_required: 0 });

      const allPhaseIds = (data.phases ?? []).map((p: Phase) => p.id);
      setExpandedPhases(new Set(allPhaseIds));
    } catch {
      setMessage("Failed to fetch activities");
    } finally {
      setLoading(false);
    }
  }

  const allSubmissions = useMemo(() => {
    const submissions: Submission[] = [];
    for (const phase of phases) {
      for (const activity of phase.hackathon_phase_activities) {
        submissions.push(...activity.submissions);
      }
    }
    return submissions;
  }, [phases]);

  const submissionActivityMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const phase of phases) {
      for (const activity of phase.hackathon_phase_activities) {
        for (const sub of activity.submissions) {
          map.set(sub.id, activity.title);
        }
      }
    }
    return map;
  }, [phases]);

  const filteredSubmissions = useMemo(() => {
    return allSubmissions.filter((sub) => {
      if (statusFilter !== "all" && sub.review_status !== statusFilter) return false;
      if (scopeFilter !== "all" && sub.scope !== scopeFilter) return false;
      if (search.trim()) {
        const query = search.toLowerCase();
        const haystack = [
          getOwnerLabel(sub),
          sub.participant?.name,
          sub.participant?.email,
          sub.team?.lobby_code,
          sub.submitted_by?.name,
          ...sub.team_members.map((m) => m.name),
          submissionActivityMap.get(sub.id),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(query);
      }
      return true;
    });
  }, [allSubmissions, statusFilter, scopeFilter, search, submissionActivityMap]);

  const selectedSubmission = useMemo(() => {
    if (!selectedSubmissionId) return null;
    return allSubmissions.find((sub) => sub.id === selectedSubmissionId) ?? null;
  }, [selectedSubmissionId, allSubmissions]);

  const selectedActivity = useMemo(() => {
    if (!selectedSubmission) return null;
    for (const phase of phases) {
      for (const activity of phase.hackathon_phase_activities) {
        if (activity.submissions.some((sub) => sub.id === selectedSubmission.id)) {
          return activity;
        }
      }
    }
    return null;
  }, [selectedSubmission, phases]);

  function togglePhase(phaseId: string) {
    setExpandedPhases((prev) => {
      const next = new Set(prev);
      if (next.has(phaseId)) {
        next.delete(phaseId);
      } else {
        next.add(phaseId);
      }
      return next;
    });
  }

  function toggleActivity(activityId: string) {
    setExpandedActivities((prev) => {
      const next = new Set(prev);
      if (next.has(activityId)) {
        next.delete(activityId);
      } else {
        next.add(activityId);
      }
      return next;
    });
  }

  function selectSubmission(submissionId: string) {
    setSelectedSubmissionId(submissionId);
    setCommentText("");
    setMessage("");
  }

  async function submitComment() {
    if (!selectedSubmission || !commentText.trim()) return;

    setSavingComment(true);
    setMessage("");

    try {
      const response = await fetch(
        `/api/admin/hackathon/submissions/${selectedSubmission.scope}/${selectedSubmission.id}/comment`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: commentText.trim() }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error ?? "Failed to send comment");
        return;
      }

      setMessage(`Comment saved and sent to ${data.inbox_count} participant(s)`);
      setCommentText("");
      await fetchData();
    } catch {
      setMessage("Failed to send comment");
    } finally {
      setSavingComment(false);
    }
  }

  return (
    <div className="space-y-4 font-[family-name:var(--font-mitr)]">
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-slate-700/50 bg-slate-900/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total submissions</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{stats.total_submissions}</CardContent>
        </Card>
        <Card className="border-amber-500/30 bg-amber-500/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Pending</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-amber-200">{stats.pending_review}</CardContent>
        </Card>
        <Card className="border-emerald-500/30 bg-emerald-500/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Passed</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-emerald-200">{stats.passed}</CardContent>
        </Card>
        <Card className="border-rose-500/30 bg-rose-500/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Needs revision</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-rose-200">{stats.revision_required}</CardContent>
        </Card>
      </div>

      <Card className="border-slate-700/50 bg-slate-900/50">
        <CardHeader>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-300" />
                Hackathon Activities & Submissions
              </CardTitle>
              <CardDescription>View activities by phase and manage submissions</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by participant, team, or activity"
                className="pl-9"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as ReviewStatus | "all")}
              className="h-10 rounded-md border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100"
            >
              <option value="all">All statuses</option>
              <option value="pending_review">Pending</option>
              <option value="passed">Passed</option>
              <option value="revision_required">Needs revision</option>
            </select>
            <select
              value={scopeFilter}
              onChange={(e) => setScopeFilter(e.target.value as SubmissionScope | "all")}
              className="h-10 rounded-md border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100"
            >
              <option value="all">All scopes</option>
              <option value="individual">Individual</option>
              <option value="team">Team</option>
            </select>
          </div>

          {(statusFilter !== "all" || scopeFilter !== "all" || search.trim()) && (
            <div className="text-sm text-slate-400">
              Showing {filteredSubmissions.length} of {stats.total_submissions} submissions
            </div>
          )}

          {message && (
            <div className="rounded-md border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-slate-300">
              {message}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          ) : phases.length === 0 ? (
            <div className="py-16 text-center text-sm text-slate-500">No phases found.</div>
          ) : (
            <div className="grid gap-4 xl:grid-cols-[1fr_400px]">
              <div className="space-y-3 max-h-[800px] overflow-y-auto pr-1">
                {phases.map((phase) => (
                  <div key={phase.id} className="rounded-lg border border-slate-800 bg-slate-950/50">
                    <button
                      onClick={() => togglePhase(phase.id)}
                      className="flex w-full items-center justify-between p-4 text-left hover:bg-slate-900/50"
                    >
                      <div>
                        <h3 className="font-semibold text-slate-100">
                          Phase {phase.phase_number}: {phase.title}
                        </h3>
                        {phase.description && (
                          <p className="text-sm text-slate-500">{phase.description}</p>
                        )}
                        {phase.due_at && (
                          <p className="text-xs text-slate-600 mt-1">
                            Due: {format(new Date(phase.due_at), "MMM d, yyyy")}
                          </p>
                        )}
                      </div>
                      {expandedPhases.has(phase.id) ? (
                        <ChevronDown className="h-5 w-5 text-slate-500" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-slate-500" />
                      )}
                    </button>

                    {expandedPhases.has(phase.id) && (
                      <div className="border-t border-slate-800 p-3 space-y-2">
                        {phase.hackathon_phase_activities.length === 0 ? (
                          <p className="text-sm text-slate-500 py-2">No activities in this phase.</p>
                        ) : (
                          phase.hackathon_phase_activities.map((activity) => (
                            <div
                              key={activity.id}
                              className="rounded-md border border-slate-800 bg-slate-900/30"
                            >
                              <button
                                onClick={() => toggleActivity(activity.id)}
                                className="flex w-full items-center justify-between p-3 text-left hover:bg-slate-800/50"
                              >
                                <div className="flex items-center gap-3">
                                  <span className="text-sm font-medium text-slate-200">
                                    {activity.display_order}. {activity.title}
                                  </span>
                                  {activity.is_draft && (
                                    <Badge variant="outline" className="border-slate-600 text-slate-400">
                                      Draft
                                    </Badge>
                                  )}
                                  {activity.is_required && (
                                    <Badge variant="outline" className="border-blue-600/40 text-blue-300">
                                      Required
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-3">
                                  <Badge className="bg-slate-800 text-slate-300">
                                    {activity.submission_count} submissions
                                  </Badge>
                                  {expandedActivities.has(activity.id) ? (
                                    <ChevronDown className="h-4 w-4 text-slate-500" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4 text-slate-500" />
                                  )}
                                </div>
                              </button>

                              {expandedActivities.has(activity.id) && (
                                <div className="border-t border-slate-800 p-3">
                                  {activity.instructions && (
                                    <p className="text-sm text-slate-400 mb-3 whitespace-pre-wrap">
                                      {activity.instructions}
                                    </p>
                                  )}

                                  <div className="flex flex-wrap gap-2 mb-3">
                                    {activity.content.map((content) => (
                                      <Badge
                                        key={content.id}
                                        variant="outline"
                                        className="border-slate-700 text-slate-400 flex items-center gap-1"
                                      >
                                        <ContentTypeIcon type={content.content_type} />
                                        {content.content_title || content.content_type}
                                      </Badge>
                                    ))}
                                  </div>

                                  {activity.assessments.length > 0 && (
                                    <div className="mb-3 space-y-1">
                                      {activity.assessments.map((assessment) => (
                                        <div
                                          key={assessment.id}
                                          className="text-xs text-slate-500 flex items-center gap-2"
                                        >
                                          <FileText className="h-3 w-3" />
                                          Assessment: {assessment.assessment_type}
                                          {assessment.points_possible && ` (${assessment.points_possible} pts)`}
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  <div className="space-y-2">
                                    <h4 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                                      <Users className="h-4 w-4" />
                                      Submissions
                                    </h4>

                                    {activity.submissions.length === 0 ? (
                                      <p className="text-sm text-slate-600 py-2">No submissions yet.</p>
                                    ) : (
                                      <div className="space-y-2">
                                        {activity.submissions
                                          .filter((sub) => {
                                            if (statusFilter !== "all" && sub.review_status !== statusFilter)
                                              return false;
                                            if (scopeFilter !== "all" && sub.scope !== scopeFilter) return false;
                                            if (search.trim()) {
                                              const query = search.toLowerCase();
                                              const haystack = [
                                                getOwnerLabel(sub),
                                                sub.participant?.name,
                                                sub.participant?.email,
                                                sub.team?.lobby_code,
                                                sub.submitted_by?.name,
                                                ...sub.team_members.map((m) => m.name),
                                              ]
                                                .filter(Boolean)
                                                .join(" ")
                                                .toLowerCase();
                                              return haystack.includes(query);
                                            }
                                            return true;
                                          })
                                          .map((submission) => (
                                            <button
                                              key={`${submission.scope}-${submission.id}`}
                                              onClick={() => selectSubmission(submission.id)}
                                              className={`w-full rounded-md border p-3 text-left transition-colors ${
                                                selectedSubmission?.id === submission.id
                                                  ? "border-blue-400/60 bg-blue-500/10"
                                                  : "border-slate-800 bg-slate-950/50 hover:border-slate-600"
                                              }`}
                                            >
                                              <div className="flex items-start justify-between gap-3">
                                                <div>
                                                  <div className="text-sm font-semibold text-slate-100">
                                                    {getOwnerLabel(submission)}
                                                  </div>
                                                  {submission.scope === "team" && submission.team?.lobby_code && (
                                                    <div className="text-xs text-slate-500">
                                                      Code: {submission.team.lobby_code}
                                                    </div>
                                                  )}
                                                </div>
                                                <StatusBadge status={submission.review_status} />
                                              </div>
                                              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                                                <Badge variant="outline" className="border-slate-700 text-slate-400">
                                                  {submission.scope}
                                                </Badge>
                                                {submission.submitted_by?.name && (
                                                  <span>by {submission.submitted_by.name}</span>
                                                )}
                                                {submission.submitted_at && (
                                                  <span>{format(new Date(submission.submitted_at), "MMM d, HH:mm")}</span>
                                                )}
                                                {submission.file_urls.length > 0 && (
                                                  <Paperclip className="h-3.5 w-3.5" />
                                                )}
                                                {submission.image_url && <ImageIcon className="h-3.5 w-3.5" />}
                                              </div>
                                            </button>
                                          ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {selectedSubmission ? (
                <div className="rounded-md border border-slate-800 bg-slate-950/50 p-4 space-y-4">
                  <div className="border-b border-slate-800 pb-4">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold text-slate-100">
                        {selectedActivity?.title}
                      </h3>
                      <StatusBadge status={selectedSubmission.review_status} />
                    </div>
                    <p className="text-sm text-slate-400">
                      {getOwnerLabel(selectedSubmission)}
                      {selectedSubmission.scope === "team" && selectedSubmission.team?.lobby_code
                        ? ` (${selectedSubmission.team.lobby_code})`
                        : ""}
                    </p>
                  </div>

                  {selectedSubmission.scope === "team" && selectedSubmission.team_members.length > 0 && (
                    <div>
                      <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-300">
                        <Users className="h-4 w-4" />
                        Team members
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedSubmission.team_members.map((member) => (
                          <Badge key={member.id} variant="outline" className="border-slate-700 text-slate-300">
                            {member.name ?? member.email ?? member.id}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedSubmission.text_answer && (
                    <div className="rounded-md border border-slate-800 bg-slate-900/40 p-3">
                      <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-300">
                        <FileText className="h-4 w-4" />
                        Text answer
                      </h4>
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-200">
                        {selectedSubmission.text_answer}
                      </p>
                    </div>
                  )}

                  {selectedSubmission.image_url && (
                    <div className="rounded-md border border-slate-800 bg-slate-900/40 p-3">
                      <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-300">
                        <ImageIcon className="h-4 w-4" />
                        Image
                      </h4>
                      <img
                        src={selectedSubmission.image_url}
                        alt="Submission"
                        className="max-h-64 rounded-md border border-slate-800 object-contain"
                      />
                    </div>
                  )}

                  {selectedSubmission.file_urls.length > 0 && (
                    <div className="rounded-md border border-slate-800 bg-slate-900/40 p-3">
                      <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-300">
                        <Paperclip className="h-4 w-4" />
                        Files
                      </h4>
                      <div className="space-y-2">
                        {selectedSubmission.file_urls.map((url, index) => (
                          <a
                            key={url}
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            className="block rounded-md border border-slate-800 px-3 py-2 text-sm text-blue-300 hover:border-blue-400/50"
                          >
                            Open file {index + 1}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedSubmission.review?.feedback && (
                    <div className="rounded-md border border-slate-700 bg-slate-900/60 p-3">
                      <h4 className="mb-2 text-sm font-semibold text-slate-300">Previous review feedback</h4>
                      <p className="text-sm text-slate-400">{selectedSubmission.review.feedback}</p>
                      {selectedSubmission.review.reviewed_at && (
                        <p className="text-xs text-slate-600 mt-2">
                          Reviewed {format(new Date(selectedSubmission.review.reviewed_at), "MMM d, yyyy HH:mm")}
                        </p>
                      )}
                    </div>
                  )}

                  {selectedSubmission.admin_comments && selectedSubmission.admin_comments.length > 0 && (
                    <div className="rounded-md border border-slate-700 bg-slate-900/60 p-3 space-y-3">
                      <h4 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" />
                        Admin comment history ({selectedSubmission.admin_comments.length})
                      </h4>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {selectedSubmission.admin_comments.map((comment) => (
                          <div key={comment.id} className="text-sm border-l-2 border-blue-500/50 pl-3 py-1">
                            <p className="text-slate-300">{comment.content}</p>
                            <p className="text-xs text-slate-500 mt-1">
                              {format(new Date(comment.created_at), "MMM d, yyyy HH:mm")}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="rounded-md border border-slate-800 bg-slate-900/40 p-4 space-y-4">
                    <h4 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Add comment
                    </h4>
                    <div className="space-y-2">
                      <Label htmlFor="comment">Comment</Label>
                      <Textarea
                        id="comment"
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        rows={4}
                        placeholder="Write a comment to the participant(s)..."
                      />
                    </div>
                    <Button
                      onClick={submitComment}
                      disabled={savingComment || !commentText.trim()}
                      className="w-full"
                    >
                      {savingComment ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="mr-2 h-4 w-4" />
                      )}
                      Send comment
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="rounded-md border border-slate-800 bg-slate-950/50 p-8 text-center">
                  <p className="text-slate-500">Select a submission to view details and add comments</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
