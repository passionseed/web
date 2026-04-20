"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { diffWords } from "diff";
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Copy,
  FileText,
  HelpCircle,
  History,
  Image as ImageIcon,
  Loader2,
  MessageSquare,
  Paperclip,
  RefreshCw,
  Save,
  Search,
  Send,
  Sparkles,
  Users,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

interface Revision {
  n: number;
  text_answer: string | null;
  image_url: string | null;
  file_urls: string[] | null;
  submitted_at: string | null;
  review: {
    status?: ReviewStatus | null;
    score_awarded?: number | null;
    points_possible?: number | null;
    feedback?: string | null;
    reviewed_by?: string | null;
    reviewed_at?: string | null;
  } | null;
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
  revisions: Revision[];
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
  const [gradeStatus, setGradeStatus] = useState<ReviewStatus>("pending_review");
  const [gradeScore, setGradeScore] = useState<string>("");
  const [gradeFeedback, setGradeFeedback] = useState<string>("");
  const [savingGrade, setSavingGrade] = useState(false);
  const [aiSuggesting, setAiSuggesting] = useState(false);
  const [aiReasoning, setAiReasoning] = useState<string>("");
  const [aiLiveText, setAiLiveText] = useState<string>("");
  const [aiLiveReasoning, setAiLiveReasoning] = useState<string>("");
  const [promptPreviewOpen, setPromptPreviewOpen] = useState(false);
  const [promptPreviewLoading, setPromptPreviewLoading] = useState(false);
  const [promptPreview, setPromptPreview] = useState<{
    prompt: string;
    model: string;
    phase_number: number | null;
    phase_title: string | null;
    activity_title: string | null;
    points_possible: number | null;
    has_phase_spec: boolean;
  } | null>(null);
  const [promptCopied, setPromptCopied] = useState(false);

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

    const submission = allSubmissions.find((sub) => sub.id === submissionId) ?? null;
    const review = submission?.review ?? null;
    setGradeStatus((review?.review_status ?? submission?.review_status ?? "pending_review") as ReviewStatus);
    setGradeScore(review?.score_awarded != null ? String(review.score_awarded) : "");
    setGradeFeedback(review?.feedback ?? "");
    setAiReasoning("");
  }

  async function openPromptPreview() {
    if (!selectedSubmission) return;
    setPromptPreviewOpen(true);
    setPromptPreview(null);
    setPromptCopied(false);
    setPromptPreviewLoading(true);

    try {
      const response = await fetch(
        `/api/admin/hackathon/submissions/${selectedSubmission.scope}/${selectedSubmission.id}/ai-grade`,
        { method: "GET" }
      );
      const data = await response.json();
      if (!response.ok) {
        setPromptPreview({
          prompt: `Failed to load prompt: ${data.error ?? response.statusText}`,
          model: "",
          phase_number: null,
          phase_title: null,
          activity_title: null,
          points_possible: null,
          has_phase_spec: false,
        });
      } else {
        setPromptPreview(data);
      }
    } catch {
      setPromptPreview({
        prompt: "Failed to load prompt.",
        model: "",
        phase_number: null,
        phase_title: null,
        activity_title: null,
        points_possible: null,
        has_phase_spec: false,
      });
    } finally {
      setPromptPreviewLoading(false);
    }
  }

  async function copyPromptToClipboard() {
    if (!promptPreview?.prompt) return;
    try {
      await navigator.clipboard.writeText(promptPreview.prompt);
      setPromptCopied(true);
      setTimeout(() => setPromptCopied(false), 2000);
    } catch {
      setPromptCopied(false);
    }
  }

  async function requestAiSuggestion() {
    if (!selectedSubmission) return;

    setAiSuggesting(true);
    setMessage("");
    setAiReasoning("");
    setAiLiveText("");
    setAiLiveReasoning("");

    try {
      const response = await fetch(
        `/api/admin/hackathon/submissions/${selectedSubmission.scope}/${selectedSubmission.id}/ai-grade`,
        { method: "POST", headers: { "Content-Type": "application/json" } }
      );

      if (!response.ok || !response.body) {
        const data = await response.json().catch(() => ({}));
        setMessage(data.error ?? "AI grading failed");
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let accumulated = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIndex;
        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          const line = buffer.slice(0, newlineIndex).trim();
          buffer = buffer.slice(newlineIndex + 1);
          if (!line) continue;

          try {
            const event = JSON.parse(line);
            if (event.type === "thinking") {
              accumulated += event.delta ?? "";
              setAiLiveText(accumulated);
            } else if (event.type === "reasoning") {
              setAiLiveReasoning((prev) => prev + (event.delta ?? ""));
            } else if (event.type === "done") {
              const s = event.suggestion;
              setGradeStatus(s.review_status as ReviewStatus);
              setGradeScore(s.score_awarded != null ? String(s.score_awarded) : "");
              setGradeFeedback(s.feedback ?? "");
              setAiReasoning(s.reasoning ?? "");
              setMessage(
                event.has_phase_spec
                  ? "AI suggestion loaded (with phase spec). Review before saving."
                  : "AI suggestion loaded (no phase spec). Review before saving."
              );
            } else if (event.type === "error") {
              setMessage(event.message ?? "AI grading failed");
            }
          } catch {
            // ignore malformed line
          }
        }
      }
    } catch {
      setMessage("AI grading failed");
    } finally {
      setAiSuggesting(false);
    }
  }

  async function submitGrade() {
    if (!selectedSubmission) return;

    setSavingGrade(true);
    setMessage("");

    try {
      const parsedScore = gradeScore.trim() === "" ? null : Number(gradeScore);
      if (parsedScore !== null && Number.isNaN(parsedScore)) {
        setMessage("Score must be a number");
        setSavingGrade(false);
        return;
      }

      const response = await fetch(
        `/api/admin/hackathon/submissions/${selectedSubmission.scope}/${selectedSubmission.id}/review`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            review_status: gradeStatus,
            score_awarded: parsedScore,
            feedback: gradeFeedback.trim(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error ?? "Failed to save grade");
        return;
      }

      setMessage(
        `Grade saved. Notified ${data.inbox_count} participant(s)${
          data.push_target_count ? ` (${data.push_target_count} push target(s))` : ""
        }.`
      );
      await fetchData();
    } catch {
      setMessage("Failed to save grade");
    } finally {
      setSavingGrade(false);
    }
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
            <div className="grid gap-4 xl:grid-cols-[3fr_7fr]">
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
                <div className="min-w-0 space-y-6 break-words">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2 min-w-0">
                      <h3 className="text-base font-medium text-slate-100 break-words min-w-0">
                        {selectedActivity?.title}
                      </h3>
                      <StatusBadge status={selectedSubmission.review_status} />
                    </div>
                    <p className="text-xs font-light text-slate-400 break-words">
                      {getOwnerLabel(selectedSubmission)}
                      {selectedSubmission.scope === "team" && selectedSubmission.team?.lobby_code
                        ? ` (${selectedSubmission.team.lobby_code})`
                        : ""}
                    </p>
                  </div>

                  {selectedSubmission.scope === "team" && selectedSubmission.team_members.length > 0 && (
                    <div>
                      <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-slate-500">
                        <Users className="h-3 w-3" /> Team members
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedSubmission.team_members.map((member) => (
                          <Badge key={member.id} variant="outline" className="border-slate-700 text-slate-300 font-light">
                            {member.name ?? member.email ?? member.id}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedSubmission.text_answer && (
                    <section className="min-w-0">
                      <p className="mb-2 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-slate-500">
                        <FileText className="h-3 w-3" />
                        {selectedSubmission.revisions.length > 0
                          ? `Current attempt (R${selectedSubmission.revisions.length + 1})`
                          : "Text answer"}
                      </p>
                      <p className="whitespace-pre-wrap text-[15px] font-light leading-7 text-slate-100 break-words">
                        {selectedSubmission.text_answer}
                      </p>
                    </section>
                  )}

                  {selectedSubmission.revisions.length > 0 && (
                    <RevisionThread
                      revisions={selectedSubmission.revisions}
                      currentText={selectedSubmission.text_answer}
                    />
                  )}

                  {selectedSubmission.image_url && (
                    <section>
                      <p className="mb-2 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-slate-500">
                        <ImageIcon className="h-3 w-3" /> Image
                      </p>
                      <img
                        src={selectedSubmission.image_url}
                        alt="Submission"
                        className="max-h-72 rounded-md border border-slate-800 object-contain"
                      />
                    </section>
                  )}

                  {selectedSubmission.file_urls.length > 0 && (
                    <section>
                      <p className="mb-2 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-slate-500">
                        <Paperclip className="h-3 w-3" /> Files
                      </p>
                      <div className="space-y-1.5">
                        {selectedSubmission.file_urls.map((url, index) => (
                          <a
                            key={url}
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            className="block text-xs font-light text-blue-300 hover:text-blue-200 truncate"
                          >
                            ↗ file {index + 1} — {url}
                          </a>
                        ))}
                      </div>
                    </section>
                  )}

                  {selectedSubmission.review?.feedback && (
                    <section className="min-w-0">
                      <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-slate-500">
                        Previous review
                      </p>
                      <p className="text-xs font-light text-slate-400 break-words whitespace-pre-wrap leading-relaxed">
                        {selectedSubmission.review.feedback}
                      </p>
                      {selectedSubmission.review.reviewed_at && (
                        <p className="text-[10px] font-light text-slate-600 mt-1">
                          {format(new Date(selectedSubmission.review.reviewed_at), "MMM d, HH:mm")}
                        </p>
                      )}
                    </section>
                  )}

                  {selectedSubmission.admin_comments && selectedSubmission.admin_comments.length > 0 && (
                    <section className="min-w-0">
                      <p className="mb-2 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-slate-500">
                        <MessageSquare className="h-3 w-3" />
                        Comments ({selectedSubmission.admin_comments.length})
                      </p>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {selectedSubmission.admin_comments.map((comment) => (
                          <div key={comment.id} className="min-w-0">
                            <p className="text-xs font-light text-slate-300 break-words whitespace-pre-wrap leading-relaxed">
                              {comment.content}
                            </p>
                            <p className="text-[10px] font-light text-slate-600 mt-0.5">
                              {format(new Date(comment.created_at), "MMM d, HH:mm")}
                            </p>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  <div className="h-px bg-slate-800" />

                  <section className="space-y-3 min-w-0">
                    <div className="flex items-center justify-between gap-2 min-w-0">
                      <h4 className="flex items-center gap-2 text-sm font-medium text-slate-100">
                        <CheckCircle2 className="h-4 w-4 text-blue-300 shrink-0" />
                        Grade & feedback
                        <span className="text-[10px] font-light text-slate-500 normal-case">
                          (saves status + score, notifies student)
                        </span>
                      </h4>
                    </div>

                    <div className="flex items-center justify-between gap-2 min-w-0 text-[11px] font-light text-violet-300/80">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Sparkles className="h-3 w-3 shrink-0" />
                        <span className="truncate">AI mentor (MiniMax M2.7)</span>
                        <button
                          type="button"
                          onClick={openPromptPreview}
                          className="text-violet-300/60 hover:text-violet-100 shrink-0"
                          title="Show the exact prompt sent to the model"
                        >
                          <HelpCircle className="h-3 w-3" />
                        </button>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={requestAiSuggestion}
                        disabled={aiSuggesting}
                        className="h-7 px-2 text-[11px] font-light text-violet-200 hover:bg-violet-500/10"
                      >
                        {aiSuggesting ? (
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        ) : (
                          <Sparkles className="mr-1 h-3 w-3" />
                        )}
                        {aiSuggesting ? "Thinking…" : "Suggest with AI"}
                      </Button>
                    </div>

                    {(aiLiveText || aiSuggesting) && (
                      <div className="min-w-0">
                        <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-violet-300/80">
                          Live thinking & output{aiSuggesting && !aiLiveText ? "…" : ""}
                        </p>
                        <p className="whitespace-pre-wrap text-xs font-light leading-relaxed text-violet-100/90 break-words">
                          {aiLiveText || (aiSuggesting ? "Connecting to MiniMax…" : "")}
                          {aiSuggesting && aiLiveText && <span className="animate-pulse">▌</span>}
                        </p>
                      </div>
                    )}

                    {aiReasoning && (
                      <div className="min-w-0">
                        <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-violet-300/80">
                          Admin-only rationale
                        </p>
                        <p className="whitespace-pre-wrap text-xs font-light leading-relaxed text-violet-100/80 break-words">
                          {aiReasoning}
                        </p>
                      </div>
                    )}

                    <div className="grid gap-1.5 grid-cols-3">
                      <Button
                        type="button"
                        size="sm"
                        variant={gradeStatus === "passed" ? "default" : "outline"}
                        onClick={() => setGradeStatus("passed")}
                        className={
                          "h-8 px-2 text-xs font-light truncate " +
                          (gradeStatus === "passed"
                            ? "bg-emerald-500 text-emerald-950 hover:bg-emerald-400"
                            : "border-emerald-500/40 text-emerald-200 hover:bg-emerald-500/10")
                        }
                      >
                        <CheckCircle2 className="mr-1 h-3.5 w-3.5 shrink-0" />
                        Pass
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={gradeStatus === "revision_required" ? "default" : "outline"}
                        onClick={() => setGradeStatus("revision_required")}
                        className={
                          "h-8 px-2 text-xs font-light truncate " +
                          (gradeStatus === "revision_required"
                            ? "bg-rose-500 text-rose-950 hover:bg-rose-400"
                            : "border-rose-500/40 text-rose-200 hover:bg-rose-500/10")
                        }
                      >
                        <XCircle className="mr-1 h-3.5 w-3.5 shrink-0" />
                        Revise
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={gradeStatus === "pending_review" ? "default" : "outline"}
                        onClick={() => setGradeStatus("pending_review")}
                        className={
                          "h-8 px-2 text-xs font-light truncate " +
                          (gradeStatus === "pending_review"
                            ? "bg-amber-500 text-amber-950 hover:bg-amber-400"
                            : "border-amber-500/40 text-amber-200 hover:bg-amber-500/10")
                        }
                      >
                        <Clock className="mr-1 h-3.5 w-3.5 shrink-0" />
                        Pending
                      </Button>
                    </div>

                    {selectedActivity?.assessments?.some((a) => a.is_graded) && (
                      <div className="space-y-1">
                        <Label htmlFor="grade-score" className="text-[11px] font-light text-slate-500">
                          Score
                          {(() => {
                            const pts = selectedActivity?.assessments?.find((a) => a.is_graded)?.points_possible;
                            return pts ? ` (out of ${pts})` : "";
                          })()}
                        </Label>
                        <Input
                          id="grade-score"
                          type="number"
                          value={gradeScore}
                          onChange={(e) => setGradeScore(e.target.value)}
                          placeholder="—"
                          className="h-8 text-sm font-light"
                        />
                      </div>
                    )}

                    <div className="space-y-1">
                      <Label htmlFor="grade-feedback" className="text-[11px] font-light text-slate-500">
                        Feedback (part of the grade, visible in student's inbox)
                      </Label>
                      <Textarea
                        id="grade-feedback"
                        value={gradeFeedback}
                        onChange={(e) => setGradeFeedback(e.target.value)}
                        rows={6}
                        placeholder="Mentor feedback tied to this grade..."
                        className="text-sm font-light leading-relaxed break-words"
                      />
                    </div>

                    <Button
                      onClick={submitGrade}
                      disabled={savingGrade}
                      className="w-full h-9 text-xs font-medium bg-blue-500 text-blue-950 hover:bg-blue-400"
                    >
                      {savingGrade ? (
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin shrink-0" />
                      ) : (
                        <Save className="mr-1.5 h-3.5 w-3.5 shrink-0" />
                      )}
                      Save grade & notify
                    </Button>
                  </section>

                  <div className="h-px bg-slate-800" />

                  <section className="space-y-2 min-w-0">
                    <h4 className="flex items-center gap-2 text-sm font-medium text-slate-100">
                      <MessageSquare className="h-4 w-4 text-slate-400 shrink-0" />
                      Quick comment
                      <span className="text-[10px] font-light text-slate-500 normal-case">
                        (chat-style message, doesn't change status)
                      </span>
                    </h4>
                    <Textarea
                      id="comment"
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      rows={3}
                      placeholder="Send a quick note to the student..."
                      className="text-sm font-light leading-relaxed break-words"
                    />
                    <Button
                      onClick={submitComment}
                      disabled={savingComment || !commentText.trim()}
                      variant="outline"
                      className="w-full h-8 text-xs font-light"
                    >
                      {savingComment ? (
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin shrink-0" />
                      ) : (
                        <Send className="mr-1.5 h-3.5 w-3.5 shrink-0" />
                      )}
                      Send comment
                    </Button>
                  </section>
                </div>
              ) : (
                <div className="rounded-md border border-slate-800 bg-slate-950/50 p-8 text-center">
                  <p className="text-sm font-light text-slate-500">
                    Select a submission to view details and add comments
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={promptPreviewOpen} onOpenChange={setPromptPreviewOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col border-violet-500/30 bg-slate-950">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-sm font-medium tracking-wide uppercase text-violet-200 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-violet-300" />
              AI grading prompt
            </DialogTitle>
            <DialogDescription className="text-xs font-light text-slate-400 leading-relaxed">
              This is the exact text sent to the model. It includes the phase spec (from{" "}
              <code className="font-mono text-[11px] text-violet-300">lib/hackathon/phase-specs/</code>),
              the activity, and the participant&apos;s submission.
            </DialogDescription>
          </DialogHeader>

          {promptPreviewLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-violet-300" />
            </div>
          ) : promptPreview ? (
            <div className="flex flex-col gap-3 min-h-0 flex-1">
              <div className="grid grid-cols-2 gap-2 text-[11px] font-light">
                <div className="rounded border border-slate-800 bg-slate-900/60 px-2 py-1.5">
                  <span className="text-slate-500">Model:</span>{" "}
                  <span className="font-mono text-violet-200">{promptPreview.model || "-"}</span>
                </div>
                <div className="rounded border border-slate-800 bg-slate-900/60 px-2 py-1.5">
                  <span className="text-slate-500">Phase spec loaded:</span>{" "}
                  <span className={promptPreview.has_phase_spec ? "text-emerald-300" : "text-amber-300"}>
                    {promptPreview.has_phase_spec ? "yes" : "no"}
                  </span>
                </div>
                <div className="rounded border border-slate-800 bg-slate-900/60 px-2 py-1.5 truncate">
                  <span className="text-slate-500">Phase:</span>{" "}
                  <span className="text-slate-200">
                    {promptPreview.phase_number != null ? `${promptPreview.phase_number} — ` : ""}
                    {promptPreview.phase_title ?? "(unknown)"}
                  </span>
                </div>
                <div className="rounded border border-slate-800 bg-slate-900/60 px-2 py-1.5 truncate">
                  <span className="text-slate-500">Activity:</span>{" "}
                  <span className="text-slate-200">{promptPreview.activity_title ?? "(untitled)"}</span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-medium tracking-wide uppercase text-slate-400">
                  Full prompt
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={copyPromptToClipboard}
                  className="h-7 px-2 text-xs font-light border-slate-700"
                >
                  <Copy className="mr-1.5 h-3 w-3 shrink-0" />
                  {promptCopied ? "Copied" : "Copy"}
                </Button>
              </div>

              <pre className="flex-1 overflow-auto rounded-md border border-slate-800 bg-slate-950 p-3 text-[11px] font-mono font-light leading-relaxed text-slate-300 whitespace-pre-wrap break-words">
                {promptPreview.prompt}
              </pre>
            </div>
          ) : (
            <div className="py-8 text-center text-sm font-light text-slate-500">
              No prompt loaded.
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function statusLabel(status?: string | null): string {
  if (!status) return "ungraded";
  return status.replace(/_/g, " ");
}

function statusTone(status?: string | null): string {
  switch (status) {
    case "passed":
      return "text-emerald-400";
    case "revision_required":
      return "text-amber-400";
    case "pending_review":
      return "text-sky-400";
    default:
      return "text-slate-500";
  }
}

function DiffText({ from, to }: { from: string; to: string }) {
  const parts = diffWords(from ?? "", to ?? "");
  return (
    <p className="whitespace-pre-wrap text-[13px] font-light leading-6 text-slate-300 break-words">
      {parts.map((p, i) => {
        if (p.added) {
          return (
            <span key={i} className="bg-emerald-500/15 text-emerald-300">
              {p.value}
            </span>
          );
        }
        if (p.removed) {
          return (
            <span key={i} className="bg-rose-500/15 text-rose-300 line-through">
              {p.value}
            </span>
          );
        }
        return <span key={i}>{p.value}</span>;
      })}
    </p>
  );
}

function RevisionThread({
  revisions,
  currentText,
}: {
  revisions: Revision[];
  currentText: string | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const [openIds, setOpenIds] = useState<Set<number>>(new Set());

  const sorted = useMemo(
    () => [...revisions].sort((a, b) => b.n - a.n),
    [revisions]
  );

  function toggle(n: number) {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(n)) next.delete(n);
      else next.add(n);
      return next;
    });
  }

  return (
    <section className="min-w-0">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="mb-2 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-slate-500 hover:text-slate-300"
      >
        <History className="h-3 w-3" />
        Revision history ({revisions.length})
        {expanded ? (
          <ChevronDown className="h-3 w-3" />
        ) : (
          <ChevronRight className="h-3 w-3" />
        )}
      </button>

      {expanded && (
        <div className="space-y-4">
          {sorted.map((rev, idx) => {
            // Next attempt AFTER this one (more recent).
            // sorted is newest→oldest, so the next revision (in time) is at idx-1,
            // or the current submission text if idx === 0.
            const nextText =
              idx === 0 ? currentText ?? "" : sorted[idx - 1]?.text_answer ?? "";
            const isOpen = openIds.has(rev.n);
            const dateLabel = rev.submitted_at
              ? format(new Date(rev.submitted_at), "MMM d, HH:mm")
              : "—";
            const status = rev.review?.status ?? null;
            return (
              <div key={rev.n} className="min-w-0">
                <button
                  type="button"
                  onClick={() => toggle(rev.n)}
                  className="flex w-full items-center gap-2 text-left"
                >
                  {isOpen ? (
                    <ChevronDown className="h-3 w-3 text-slate-500" />
                  ) : (
                    <ChevronRight className="h-3 w-3 text-slate-500" />
                  )}
                  <span className="text-[12px] font-medium text-slate-300">
                    R{rev.n}
                  </span>
                  <span className="text-[11px] font-light text-slate-500">
                    {dateLabel}
                  </span>
                  <span className={`text-[11px] font-light ${statusTone(status)}`}>
                    · {statusLabel(status)}
                  </span>
                </button>

                {isOpen && (
                  <div className="mt-2 pl-5 space-y-3">
                    {rev.text_answer && (
                      <div>
                        <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-slate-600">
                          Answer
                        </p>
                        <p className="whitespace-pre-wrap text-[13px] font-light leading-6 text-slate-300 break-words">
                          {rev.text_answer}
                        </p>
                      </div>
                    )}

                    {rev.text_answer && nextText && rev.text_answer !== nextText && (
                      <div>
                        <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-slate-600">
                          Diff → next attempt
                        </p>
                        <DiffText from={rev.text_answer} to={nextText} />
                      </div>
                    )}

                    {rev.review?.feedback && (
                      <div>
                        <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-slate-600">
                          Feedback given
                        </p>
                        <p className="whitespace-pre-wrap text-[12px] font-light leading-6 text-slate-400 break-words">
                          {rev.review.feedback}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
