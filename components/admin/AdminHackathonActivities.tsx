"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { diffWords } from "diff";
import { ImageLightbox } from "@/components/admin/ImageLightbox";
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
import { ProfileHoverCard } from "@/components/admin/ProfileHoverCard";
import { TeamHoverCard } from "@/components/admin/TeamHoverCard";

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
  submission_pending: number;
  submission_passed: number;
  submission_revision: number;
  submission_loading: boolean;
  submission_loaded: boolean;
  submission_has_more: boolean;
  submission_cursor_submitted_at: string | null;
  submission_cursor_id: string | null;
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
  phone?: string | null;
  line_id?: string | null;
  track?: string | null;
  grade_level?: string | null;
}

interface Team {
  id: string;
  name: string | null;
  lobby_code: string | null;
}

interface AiDraft {
  status: ReviewStatus;
  score_awarded: number | null;
  points_possible: number | null;
  feedback: string;
  reasoning: string | null;
  raw_output?: string;
  error?: string | null;
}

interface Review {
  id: string;
  review_status: ReviewStatus;
  score_awarded: number | null;
  feedback: string | null;
  reviewed_at: string | null;
  reviewed_by_user_id: string | null;
  ai_draft?: AiDraft | null;
  ai_draft_generated_at?: string | null;
  ai_draft_model?: string | null;
  ai_draft_source?: "manual" | "bulk" | "auto_on_submit" | null;
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
  revisions?: Revision[];
  participant: Person | null;
  team: Team | null;
  team_members: Person[];
  submitted_by: Person | null;
  review: Review | null;
  admin_comments: AdminComment[];
}

interface SubmissionGroup {
  ownerId: string;
  ownerName: string;
  scope: SubmissionScope;
  submissions: Submission[];
  attemptCount: number;
  latestStatus: ReviewStatus;
  team: Team | null;
  participant: Person | null;
  team_members: Person[];
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
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);
  const [selectedSubmissionDetail, setSelectedSubmissionDetail] = useState<Submission | null>(null);
  const [selectedSubmissionLoading, setSelectedSubmissionLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ReviewStatus | "all" | "improvements">("all");
  const [scopeFilter, setScopeFilter] = useState<SubmissionScope | "all">("all");
  const [commentText, setCommentText] = useState("");
  const graderNoteRef = useRef("");
  const graderNoteInputRef = useRef<HTMLInputElement>(null);
  const [savingComment, setSavingComment] = useState(false);
  const [message, setMessage] = useState("");
  const [gradeStatus, setGradeStatus] = useState<ReviewStatus>("pending_review");
  const [gradeScore, setGradeScore] = useState<string>("");
  const [gradeFeedback, setGradeFeedback] = useState<string>("");
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [relatedModalOpen, setRelatedModalOpen] = useState(false);

  // Per-submission "saving" state so admin can kick off multiple saves in
  // parallel without the button being globally disabled.
  const [savingGradeIds, setSavingGradeIds] = useState<Set<string>>(new Set());
  function markSaving(id: string, saving: boolean) {
    setSavingGradeIds((prev) => {
      const next = new Set(prev);
      if (saving) next.add(id);
      else next.delete(id);
      return next;
    });
  }
  // Per-submission AI grading state so multiple submissions can be graded
  // in parallel without clobbering each other. Keyed by submission id.
  type AiJobState = {
    status: "running" | "done" | "error";
    thinking: string;
    reasoning: string;
    rationale: string;
    message: string;
    startedAt: number;
  };
  const [aiJobs, setAiJobs] = useState<Record<string, AiJobState>>({});
  // Supergrader: runs AI grading across all pending submissions, batch_size at
  // a time. Each grade uses the same per-submission pipeline (persists draft,
  // auto-approves full-score graded items). Admins review + approve the rest.
  const [supergraderRunning, setSupergraderRunning] = useState(false);
  const [supergraderCancel, setSupergraderCancel] = useState(false);
  const SUPERGRADER_BATCH = 10;

  function updateAiJob(id: string, patch: Partial<AiJobState>) {
    setAiJobs((prev) => {
      const base: AiJobState = prev[id] ?? {
        status: "running",
        thinking: "",
        reasoning: "",
        rationale: "",
        message: "",
        startedAt: Date.now(),
      };
      return { ...prev, [id]: { ...base, ...patch } };
    });
  }
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
  const activityRequestControllers = useRef(new Map<string, AbortController>());
  const detailRequestId = useRef(0);

  useEffect(() => {
    void fetchData();
  }, []);

  async function fetchData(options: { silent?: boolean } = {}) {
    const { silent = false } = options;
    if (!silent) {
      setLoading(true);
      setMessage("");
    }

    try {
      const response = await fetch("/api/admin/hackathon/activities");
      const data = await response.json();

      if (!response.ok) {
        if (!silent) setMessage(data.error ?? "Failed to fetch activities");
        return;
      }

      // Build a map of existing (already-loaded) submissions keyed by activity id,
      // so silent refreshes don't wipe out data the user is looking at.
      const existingSubsByActivity = new Map<string, Submission[]>();
      const existingCursors = new Map<string, { cursor_submitted_at: string | null; cursor_id: string | null }>();
      if (silent) {
        for (const phase of phases) {
          for (const act of phase.hackathon_phase_activities) {
            if (act.submissions.length > 0) {
              existingSubsByActivity.set(act.id, act.submissions);
              existingCursors.set(act.id, {
                cursor_submitted_at: act.submission_cursor_submitted_at ?? null,
                cursor_id: act.submission_cursor_id ?? null,
              });
            }
          }
        }
      }

      const phasesWithLoadState = (data.phases ?? []).map((phase: Phase) => ({
        ...phase,
        hackathon_phase_activities: (phase.hackathon_phase_activities ?? []).map((act: Activity) => {
          const existingSubs = existingSubsByActivity.get(act.id);
          // Deduplicate by id to prevent duplicate key React warnings.
          const seen = new Set<string>();
          const deduped: Submission[] = existingSubs
            ? existingSubs.filter((s) => {
                const key = `${s.scope}-${s.id}`;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
              })
            : [];
          const existingCursor = existingCursors.get(act.id);
          return {
            ...act,
            // Preserve already-loaded submissions during silent refresh;
            // start fresh on full page loads.
            submissions: deduped,
            submission_loading: false,
            submission_loaded: existingSubsByActivity.has(act.id),
            submission_has_more: (act.submission_count ?? 0) > deduped.length,
            submission_cursor_submitted_at: existingCursor?.cursor_submitted_at ?? null,
            submission_cursor_id: existingCursor?.cursor_id ?? null,
          };
        }),
      }));

      setPhases(phasesWithLoadState);
      setStats(data.stats ?? { total_submissions: 0, pending_review: 0, passed: 0, revision_required: 0 });

      // Only expand phases on the initial (non-silent) load, so background
      // refreshes after AI grading don't clobber the user's collapse state
      // (which otherwise feels like a full page reload).
      if (!silent) {
        const allPhaseIds = (data.phases ?? []).map((p: Phase) => p.id);
        setExpandedPhases(new Set(allPhaseIds));
        // Don't auto-expand activities — fetch lazily on demand
        setExpandedActivities(new Set());
      }
    } catch {
      if (!silent) setMessage("Failed to fetch activities");
    } finally {
      if (!silent) setLoading(false);
    }
  }

  // Small helpers used by the navigator's sticky headers.
  function computeSubStats(subs: Submission[]) {
    let total = 0, pending = 0, passed = 0, revision = 0, aiDrafts = 0;
    for (const s of subs) {
      total++;
      if (s.review_status === "pending_review") pending++;
      else if (s.review_status === "passed") passed++;
      else if (s.review_status === "revision_required") revision++;
      if (s.review?.ai_draft) aiDrafts++;
    }
    return { total, pending, passed, revision, aiDrafts };
  }

  function matchesFilter(sub: Submission): boolean {
    if (statusFilter === "improvements") {
      if (!((sub.revisions?.length ?? 0) > 0 && sub.review_status === "pending_review")) return false;
    } else if (statusFilter !== "all" && sub.review_status !== statusFilter) return false;
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
  }

  function phaseSubs(phase: Phase): Submission[] {
    return phase.hackathon_phase_activities.flatMap((a) => a.submissions).filter(matchesFilter);
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
    return allSubmissions.filter((sub) => matchesFilter(sub));
  }, [allSubmissions, statusFilter, scopeFilter, search, submissionActivityMap]);

  // Cmd+ArrowDown = next submission, Cmd+ArrowUp = prev submission
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!e.metaKey && !e.ctrlKey) return;
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      e.preventDefault();
      const list = filteredSubmissions;
      if (list.length === 0) return;
      const currentIdx = list.findIndex((s) => s.id === selectedSubmissionId);
      const nextIdx = e.key === "ArrowDown"
        ? Math.min(currentIdx + 1, list.length - 1)
        : Math.max(currentIdx - 1, 0);
      if (nextIdx !== currentIdx || currentIdx === -1) {
        selectSubmission(list[nextIdx === -1 ? 0 : nextIdx].id);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [filteredSubmissions, selectedSubmissionId]);

  // Auto-focus grader note input when switching submissions
  useEffect(() => {
    if (selectedSubmissionId) {
      setTimeout(() => graderNoteInputRef.current?.focus(), 50);
    }
  }, [selectedSubmissionId]);

  const selectedSubmission = useMemo(() => {
    if (!selectedSubmissionId) return null;
    const base = allSubmissions.find((sub) => sub.id === selectedSubmissionId) ?? null;
    if (!base) return null;
    if (selectedSubmissionDetail?.id === base.id) return { ...base, ...selectedSubmissionDetail };
    return base;
  }, [selectedSubmissionId, allSubmissions, selectedSubmissionDetail]);

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

  // Related submissions = everything in the hackathon by the same owner
  // (participant or team). Also includes cross-links: if selected is a team
  // submission, we surface participant submissions from any of its members;
  // if selected is a participant submission, we surface team submissions the
  // participant belongs to.
  const relatedSubmissions = useMemo(() => {
    if (!selectedSubmission) return [];
    const targetId = selectedSubmission.id;
    const targetParticipantId =
      selectedSubmission.participant?.id ?? selectedSubmission.submitted_by?.id ?? null;
    const targetTeamId = selectedSubmission.team?.id ?? null;
    const targetTeamMemberIds = new Set(
      selectedSubmission.team_members.map((m) => m.id)
    );

    type Enriched = {
      submission: Submission;
      phaseNumber: number;
      phaseTitle: string;
      activityOrder: number;
      activityTitle: string;
      matchReason: string;
    };

    const out: Enriched[] = [];
    for (const phase of phases) {
      for (const activity of phase.hackathon_phase_activities) {
        for (const sub of activity.submissions) {
          if (sub.id === targetId && sub.scope === selectedSubmission.scope) continue;

          let reason: string | null = null;
          const subParticipantId = sub.participant?.id ?? sub.submitted_by?.id ?? null;

          if (targetParticipantId && subParticipantId === targetParticipantId) {
            reason = "same person";
          } else if (targetTeamId && sub.team?.id === targetTeamId) {
            reason = "same team";
          } else if (
            targetTeamId &&
            subParticipantId &&
            targetTeamMemberIds.has(subParticipantId)
          ) {
            reason = "team member";
          } else if (
            targetParticipantId &&
            sub.team_members.some((m) => m.id === targetParticipantId)
          ) {
            reason = `team of ${selectedSubmission.participant?.name ?? "participant"}`;
          }

          if (!reason) continue;
          out.push({
            submission: sub,
            phaseNumber: phase.phase_number,
            phaseTitle: phase.title,
            activityOrder: activity.display_order,
            activityTitle: activity.title,
            matchReason: reason,
          });
        }
      }
    }
    out.sort(
      (a, b) =>
        a.phaseNumber - b.phaseNumber || a.activityOrder - b.activityOrder
    );
    return out;
  }, [selectedSubmission, phases]);

  // Per-submission AI grading job view for the currently selected submission.
  // Keeping aliases matches the old local var names so the JSX stays tidy.
  const currentJob = selectedSubmission ? aiJobs[selectedSubmission.id] : undefined;
  const aiSuggesting = currentJob?.status === "running";
  const aiLiveText = currentJob?.thinking ?? "";
  const aiReasoning = currentJob?.rationale ?? "";
  const savingGrade = selectedSubmission ? savingGradeIds.has(selectedSubmission.id) : false;

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

    // Lazy-load submissions when expanding an activity
    const isExpanding = !expandedActivities.has(activityId);
    if (isExpanding) {
      const alreadyLoaded = phases.some((phase) =>
        phase.hackathon_phase_activities.some((act) => act.id === activityId && act.submission_loaded)
      );
      if (!alreadyLoaded) {
        void fetchActivitySubmissions(activityId, true);
      }
    }
  }

  async function fetchActivitySubmissions(activityId: string, reset = false) {
    let activityState: Activity | null = null;
    for (const phase of phases) {
      const match = phase.hackathon_phase_activities.find((act) => act.id === activityId);
      if (match) {
        activityState = match;
        break;
      }
    }
    if (!activityState) return;

    if (!reset && (activityState.submission_loading || !activityState.submission_has_more)) {
      return;
    }

    const existingController = activityRequestControllers.current.get(activityId);
    if (existingController) {
      existingController.abort();
    }
    const controller = new AbortController();
    activityRequestControllers.current.set(activityId, controller);

    // Set loading state
    setPhases((prevPhases) =>
      prevPhases.map((phase) => ({
        ...phase,
        hackathon_phase_activities: phase.hackathon_phase_activities.map((act) =>
          act.id === activityId ? { ...act, submission_loading: true } : act
        ),
      }))
    );

    try {
      const params = new URLSearchParams({ activity_id: activityId, limit: "50" });
      if (!reset && activityState.submission_cursor_submitted_at && activityState.submission_cursor_id) {
        params.set("cursor_submitted_at", activityState.submission_cursor_submitted_at);
        params.set("cursor_id", activityState.submission_cursor_id);
      }
      const response = await fetch(`/api/admin/hackathon/activities/${activityId}/submissions?${params.toString()}`, {
        signal: controller.signal,
      });
      const data = await response.json();

      if (!response.ok) {
        console.error("Failed to fetch submissions:", data.error);
        setPhases((prevPhases) =>
          prevPhases.map((phase) => ({
            ...phase,
            hackathon_phase_activities: phase.hackathon_phase_activities.map((act) =>
              act.id === activityId ? { ...act, submission_loading: false } : act
            ),
          }))
        );
        return;
      }

      setPhases((prevPhases) =>
        prevPhases.map((phase) => ({
          ...phase,
          hackathon_phase_activities: phase.hackathon_phase_activities.map((act) => {
            if (act.id !== activityId) return act;
            const fetchedSubs = data.submissions ?? [];
            // Deduplicate by id to prevent duplicate key React warnings.
            const seen = new Set<string>();
            const existingKeys = new Set(
              act.submissions.map((s) => `${s.scope}-${s.id}`)
            );
            const deduped: Submission[] = reset
              ? fetchedSubs.filter((s) => {
                  const key = `${s.scope}-${s.id}`;
                  if (seen.has(key)) return false;
                  seen.add(key);
                  return true;
                })
              : [
                  ...act.submissions,
                  ...fetchedSubs.filter((s) => {
                    const key = `${s.scope}-${s.id}`;
                    if (seen.has(key) || existingKeys.has(key)) return false;
                    seen.add(key);
                    return true;
                  }),
                ];
            return {
              ...act,
              submissions: deduped,
              submission_loading: false,
              submission_loaded: true,
              submission_has_more: Boolean(data.has_more),
              submission_cursor_submitted_at: data.next_cursor?.submitted_at ?? null,
              submission_cursor_id: data.next_cursor?.id ?? null,
            };
          }),
        }))
      );
    } catch (error) {
      if ((error as Error).name === "AbortError") return;
      setPhases((prevPhases) =>
        prevPhases.map((phase) => ({
          ...phase,
          hackathon_phase_activities: phase.hackathon_phase_activities.map((act) =>
            act.id === activityId ? { ...act, submission_loading: false } : act
          ),
        }))
      );
    } finally {
      if (activityRequestControllers.current.get(activityId) === controller) {
        activityRequestControllers.current.delete(activityId);
      }
    }
  }

  function toggleGroup(groupKey: string) {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupKey)) {
        next.delete(groupKey);
      } else {
        next.add(groupKey);
      }
      return next;
    });
  }

  function getOwnerKey(sub: Submission): string {
    return sub.scope === "team"
      ? `team:${sub.team?.id ?? sub.id}`
      : `individual:${sub.participant?.id ?? sub.submitted_by?.id ?? sub.id}`;
  }

  function groupSubmissionsByOwner(subs: Submission[]): SubmissionGroup[] {
    const map = new Map<string, SubmissionGroup>();
    for (const sub of subs) {
      const key = getOwnerKey(sub);
      const existing = map.get(key);
      if (existing) {
        existing.submissions.push(sub);
        existing.attemptCount = Math.max(
          existing.attemptCount,
          1 + (sub.revisions?.length ?? 0)
        );
      } else {
        map.set(key, {
          ownerId: key,
          ownerName: getOwnerLabel(sub),
          scope: sub.scope,
          submissions: [sub],
          attemptCount: 1 + (sub.revisions?.length ?? 0),
          latestStatus: sub.review_status,
          team: sub.team,
          participant: sub.participant,
          team_members: sub.team_members,
        });
      }
    }
    return Array.from(map.values());
  }

  function selectSubmission(submissionId: string) {
    let activityIdForSubmission: string | null = null;
    for (const phase of phases) {
      for (const activity of phase.hackathon_phase_activities) {
        if (activity.submissions.some((sub) => sub.id === submissionId)) {
          activityIdForSubmission = activity.id;
          break;
        }
      }
      if (activityIdForSubmission) break;
    }

    setSelectedSubmissionId(submissionId);
    setSelectedSubmissionDetail(null);
    setSelectedSubmissionLoading(true);
    setCommentText("");
    setMessage("");

    const submission = allSubmissions.find((sub) => sub.id === submissionId) ?? null;
    const review = submission?.review ?? null;
    const draft = review?.ai_draft ?? null;

    // If an AI draft is pending approval, prefill the grade form from the
    // draft (not the stale committed review) so the admin can edit and approve.
    if (draft) {
      setGradeStatus(draft.status);
      setGradeScore(draft.score_awarded != null ? String(draft.score_awarded) : "");
      setGradeFeedback(draft.feedback ?? "");
      // Seed the AI job rationale so the "Admin-only rationale" panel shows
      // draft reasoning even when no live job is running for this submission.
      if (draft.reasoning) {
        updateAiJob(submissionId, { status: "done", rationale: draft.reasoning });
      }
    } else {
      setGradeStatus((review?.review_status ?? submission?.review_status ?? "pending_review") as ReviewStatus);
      setGradeScore(review?.score_awarded != null ? String(review.score_awarded) : "");
      setGradeFeedback(review?.feedback ?? "");
    }

    if (!submission || !activityIdForSubmission) {
      setSelectedSubmissionLoading(false);
      return;
    }

    const requestId = ++detailRequestId.current;
    const params = new URLSearchParams({
      activity_id: activityIdForSubmission,
      scope: submission.scope,
      submission_id: submission.id,
    });
    void fetch(`/api/admin/hackathon/activities/${activityIdForSubmission}/submissions?${params.toString()}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) return null;
        return data.submission as Submission;
      })
      .then((detail) => {
        if (requestId !== detailRequestId.current) return;
        if (detail) {
          setSelectedSubmissionDetail(detail);
        }
      })
      .finally(() => {
        if (requestId === detailRequestId.current) {
          setSelectedSubmissionLoading(false);
        }
      });
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

  function getSupergraderCandidates(activitySubmissions: Submission[]): Submission[] {
    return activitySubmissions.filter((sub) => {
      if (sub.review_status !== "pending_review") return false;
      if (sub.review?.ai_draft) return false;
      const job = aiJobs[sub.id];
      if (job?.status === "running") return false;
      return true;
    });
  }

  // Track which activity's supergrader is currently running. Only one activity
  // at a time so the progress message + cancel button stay unambiguous.
  const [supergraderActivityId, setSupergraderActivityId] = useState<string | null>(null);

  async function runSupergrader(activityId: string, activitySubmissions: Submission[], activityTitle: string) {
    if (supergraderRunning) return;
    const queue = getSupergraderCandidates(activitySubmissions);
    if (queue.length === 0) {
      setMessage(`${activityTitle}: nothing to super-grade (no pending without a draft).`);
      return;
    }

    setSupergraderRunning(true);
    setSupergraderActivityId(activityId);
    setSupergraderCancel(false);
    setMessage(`${activityTitle}: super-grader started (${queue.length} pending, batches of ${SUPERGRADER_BATCH}).`);

    let processed = 0;
    for (let i = 0; i < queue.length; i += SUPERGRADER_BATCH) {
      if (supergraderCancel) break;
      const batch = queue.slice(i, i + SUPERGRADER_BATCH);
      await Promise.allSettled(
        batch.map((sub) => requestAiSuggestion({ id: sub.id, scope: sub.scope }))
      );
      processed += batch.length;
      setMessage(`${activityTitle}: ${processed}/${queue.length} graded…`);
    }

    setMessage(
      supergraderCancel
        ? `${activityTitle}: super-grader cancelled at ${processed}/${queue.length}.`
        : `${activityTitle}: super-grader done. ${processed} graded.`
    );
    setSupergraderRunning(false);
    setSupergraderActivityId(null);
    setSupergraderCancel(false);
  }

  async function requestAiSuggestion(submissionOverride?: { id: string; scope: "individual" | "team" }, opts?: { regrade?: boolean; graderComment?: string }) {
    const target =
      submissionOverride ??
      (selectedSubmission
        ? { id: selectedSubmission.id, scope: selectedSubmission.scope }
        : null);
    if (!target) return;

    const jobId = target.id;

    updateAiJob(jobId, {
      status: "running",
      thinking: "",
      reasoning: "",
      rationale: "",
      message: "",
      startedAt: Date.now(),
    });

    try {
      const response = await fetch(
        `/api/admin/hackathon/submissions/${target.scope}/${target.id}/ai-grade`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ regrade: opts?.regrade ?? false, grader_comment: opts?.graderComment ?? null }) }
      );

      if (!response.ok || !response.body) {
        const data = await response.json().catch(() => ({}));
        updateAiJob(jobId, {
          status: "error",
          message: data.error ?? "AI grading failed",
        });
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let thinking = "";
      let reasoning = "";

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
              thinking += event.delta ?? "";
              updateAiJob(jobId, { thinking });
            } else if (event.type === "reasoning") {
              reasoning += event.delta ?? "";
              updateAiJob(jobId, { reasoning });
            } else if (event.type === "done") {
              const s = event.suggestion;
              updateAiJob(jobId, {
                status: "done",
                rationale: s.reasoning ?? "",
                message: event.auto_approved
                  ? "AI auto-approved (full score). Refreshing…"
                  : event.has_phase_spec
                    ? "AI draft saved. Review and approve."
                    : "AI draft saved (no phase spec). Review and approve.",
              });
              // If this job's submission is currently open, update the form.
              if (selectedSubmissionId === jobId) {
                setGradeStatus(s.review_status as ReviewStatus);
                setGradeScore(s.score_awarded != null ? String(s.score_awarded) : "");
                setGradeFeedback(s.feedback ?? "");
              }
              // Silent refresh so the page doesn't appear to reload when the
              // AI finishes streaming feedback into the form.
              void fetchData({ silent: true });
            } else if (event.type === "error") {
              updateAiJob(jobId, {
                status: "error",
                message: event.message ?? "AI grading failed",
              });
            }
          } catch {
            // ignore malformed line
          }
        }
      }
    } catch {
      updateAiJob(jobId, {
        status: "error",
        message: "AI grading failed",
      });
    }
  }

  async function discardAiDraft() {
    if (!selectedSubmission) return;
    setMessage("");
    try {
      const response = await fetch(
        `/api/admin/hackathon/submissions/${selectedSubmission.scope}/${selectedSubmission.id}/ai-draft/discard`,
        { method: "POST" }
      );
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setMessage(data.error ?? "Failed to discard AI draft");
        return;
      }
      setMessage("AI draft discarded.");
      // Reset form to the real committed review (if any), not the discarded draft.
      const review = selectedSubmission.review ?? null;
      setGradeStatus((review?.review_status ?? selectedSubmission.review_status ?? "pending_review") as ReviewStatus);
      setGradeScore(review?.score_awarded != null ? String(review.score_awarded) : "");
      setGradeFeedback(review?.feedback ?? "");
      setAiJobs((prev) => {
        const next = { ...prev };
        delete next[selectedSubmission.id];
        return next;
      });
      await fetchData({ silent: true });
    } catch {
      setMessage("Failed to discard AI draft");
    }
  }

  async function submitGrade() {
    if (!selectedSubmission) return;

    // Snapshot all inputs at call time. The admin can switch submissions or
    // edit the form while this save is in flight; the request must still
    // apply to the submission it was kicked off for.
    const targetId = selectedSubmission.id;
    const targetScope = selectedSubmission.scope;
    const statusAtCall = gradeStatus;
    const feedbackAtCall = gradeFeedback.trim();
    const scoreRaw = gradeScore.trim();
    const parsedScore = scoreRaw === "" ? null : Number(scoreRaw);

    if (parsedScore !== null && Number.isNaN(parsedScore)) {
      setMessage("Score must be a number");
      return;
    }

    if (savingGradeIds.has(targetId)) return; // already saving this one

    markSaving(targetId, true);
    setMessage("");

    try {
      const response = await fetch(
        `/api/admin/hackathon/submissions/${targetScope}/${targetId}/review`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            review_status: statusAtCall,
            score_awarded: parsedScore,
            feedback: feedbackAtCall,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error ?? "Failed to save grade");
        return;
      }

      setMessage(`Grade saved. Notified ${data.inbox_count} participant(s).`);

      // Optimistic local update targeting the CAPTURED id, not the currently
      // selected submission. This way parallel saves don't clobber each other
      // when the admin switches submissions mid-flight.
      const newReview = data.review;
      const newSubmissionStatus =
        statusAtCall === "pending_review" ? "pending_review" : "submitted";
      let statsDelta: Partial<Stats> | null = null;

      setPhases((prevPhases) =>
        prevPhases.map((phase) => ({
          ...phase,
          hackathon_phase_activities: phase.hackathon_phase_activities.map((activity) => ({
            ...activity,
            submissions: activity.submissions.map((sub) => {
              if (sub.id !== targetId) return sub;
              const prevStatus = sub.review_status;
              if (prevStatus !== statusAtCall) {
                statsDelta = {
                  [prevStatus]: -1,
                  [statusAtCall]: 1,
                } as Partial<Stats>;
              }
              return {
                ...sub,
                status: newSubmissionStatus,
                review_status: statusAtCall,
                review: {
                  ...(sub.review ?? {}),
                  ...newReview,
                  ai_draft: null,
                  ai_draft_generated_at: null,
                  ai_draft_model: null,
                  ai_draft_source: null,
                },
              };
            }),
          })),
        }))
      );

      if (statsDelta) {
        setStats((prev) => {
          const next = { ...prev } as Stats;
          for (const [key, delta] of Object.entries(statsDelta!)) {
            (next as any)[key] = Math.max(0, ((next as any)[key] ?? 0) + (delta as number));
          }
          return next;
        });
      }
    } catch {
      setMessage("Failed to save grade");
    } finally {
      markSaving(targetId, false);
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
      await fetchData({ silent: true });
    } catch {
      setMessage("Failed to send comment");
    } finally {
      setSavingComment(false);
    }
  }

  return (
    <div className="space-y-4 font-[family-name:var(--font-mitr)]">
      <div className="grid gap-4 md:grid-cols-5">
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
        <Card
          className={`border-cyan-500/30 bg-cyan-500/10 cursor-pointer hover:border-cyan-400/50 transition-colors ${statusFilter === "improvements" ? "ring-1 ring-cyan-400" : ""}`}
          onClick={() => setStatusFilter(statusFilter === "improvements" ? "all" : "improvements")}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Improvements</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-cyan-200">
            {allSubmissions.filter((s) => (s.revisions?.length ?? 0) > 0 && s.review_status === "pending_review").length}
          </CardContent>
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
            <Button variant="outline" size="sm" onClick={() => { void fetchData(); }} disabled={loading}>
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
              onChange={(e) => setStatusFilter(e.target.value as ReviewStatus | "all" | "improvements")}
              className="h-10 rounded-md border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100"
            >
              <option value="all">All statuses</option>
              <option value="pending_review">Pending</option>
              <option value="improvements">🔄 Improvements only</option>
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
            <div className="grid gap-4 items-start xl:grid-cols-[3fr_7fr]">
              <aside className="xl:sticky xl:top-4 xl:max-h-[calc(100vh-2rem)] overflow-y-auto rounded-lg border border-slate-800 bg-slate-950/40">
                {phases.map((phase, phaseIdx) => {
                  const phaseOpen = expandedPhases.has(phase.id);
                  const pStats = computeSubStats(phaseSubs(phase));
                  return (
                    <section key={phase.id} className={phaseIdx > 0 ? "border-t border-slate-800" : ""}>
                      {/* Phase header — sticks to top of scroll container. */}
                      <button
                        onClick={() => togglePhase(phase.id)}
                        className="sticky top-0 z-30 flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left bg-slate-950/95 backdrop-blur border-b border-slate-800 hover:bg-slate-900/80"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {phaseOpen ? (
                            <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
                          )}
                          <span className="font-semibold text-sm text-slate-100 truncate">
                            P{phase.phase_number}. {phase.title}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0 text-[11px] font-light">
                          {pStats.pending > 0 && (
                            <span className="rounded px-1.5 py-0.5 bg-amber-500/15 text-amber-200">
                              {pStats.pending} pending
                            </span>
                          )}
                          {pStats.revision > 0 && (
                            <span className="rounded px-1.5 py-0.5 bg-orange-500/15 text-orange-200">
                              {pStats.revision} rev
                            </span>
                          )}
                          {pStats.aiDrafts > 0 && (
                            <span className="rounded px-1.5 py-0.5 bg-violet-500/15 text-violet-200 flex items-center gap-0.5">
                              <Sparkles className="h-2.5 w-2.5" />
                              {pStats.aiDrafts}
                            </span>
                          )}
                          <span className="text-slate-500 px-1">{pStats.total}</span>
                        </div>
                      </button>

                      {phaseOpen && (
                        <div>
                          {phase.hackathon_phase_activities.length === 0 ? (
                            <p className="px-3 py-3 text-xs text-slate-600 italic">No activities.</p>
                          ) : (
                            phase.hackathon_phase_activities.map((activity) => {
                              const actOpen = expandedActivities.has(activity.id);
                              const isThisActivityRunning =
                                supergraderRunning && supergraderActivityId === activity.id;

                              const filteredSubs = activity.submissions.filter(matchesFilter);

                              const aStats = computeSubStats(filteredSubs);
                              const candidates = getSupergraderCandidates(filteredSubs);
                              const runningHere = filteredSubs.filter(
                                (s) => aiJobs[s.id]?.status === "running"
                              ).length;

                              return (
                                <div key={activity.id}>
                                  {/* Activity sub-header — sticks below phase header. */}
                                  <div className="sticky top-[41px] z-20 flex items-center justify-between gap-2 px-3 py-1.5 bg-slate-900/95 backdrop-blur border-b border-slate-800/70">
                                    <button
                                      onClick={() => toggleActivity(activity.id)}
                                      className="flex items-center gap-2 min-w-0 text-left hover:text-slate-100"
                                    >
                                      {actOpen ? (
                                        <ChevronDown className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                                      ) : (
                                        <ChevronRight className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                                      )}
                                      <span className="text-xs font-medium text-slate-300 truncate">
                                        {activity.display_order}. {activity.title}
                                      </span>
                                      {activity.is_draft && (
                                        <Badge variant="outline" className="border-slate-600 text-slate-400 text-[9px] h-4 px-1 shrink-0">
                                          Draft
                                        </Badge>
                                      )}
                                    </button>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                      {aStats.pending > 0 && (
                                        <span className="rounded px-1.5 py-0.5 text-[10px] bg-amber-500/15 text-amber-200 font-light">
                                          {aStats.pending}
                                        </span>
                                      )}
                                      {candidates.length > 0 && (
                                        <Button
                                          type="button"
                                          size="sm"
                                          onClick={() =>
                                            runSupergrader(activity.id, activity.submissions, activity.title)
                                          }
                                          disabled={supergraderRunning}
                                          className="h-6 px-1.5 text-[10px] font-medium bg-violet-500/90 text-violet-950 hover:bg-violet-400 disabled:bg-slate-800 disabled:text-slate-500"
                                          title={
                                            isThisActivityRunning
                                              ? `Grading ${runningHere}…`
                                              : `Super-grade ${candidates.length} pending`
                                          }
                                        >
                                          {isThisActivityRunning ? (
                                            <Loader2 className="h-3 w-3 animate-spin" />
                                          ) : (
                                            <Sparkles className="h-3 w-3" />
                                          )}
                                          <span className="ml-1">{candidates.length}</span>
                                        </Button>
                                      )}
                                      {isThisActivityRunning && (
                                        <button
                                          type="button"
                                          onClick={() => setSupergraderCancel(true)}
                                          className="text-[10px] text-slate-400 hover:text-slate-200 underline"
                                          title="Cancel after current batch"
                                        >
                                          cancel
                                        </button>
                                      )}
                                    </div>
                                  </div>

                                  {actOpen && (
                                    <div className="divide-y divide-slate-800/60">
                                      {filteredSubs.length === 0 ? (
                                        <p className="px-3 py-2 text-[11px] text-slate-600 italic">
                                          {activity.submissions.length === 0
                                            ? "No submissions yet."
                                            : "No matches for current filter."}
                                        </p>
                                      ) : (
                                        groupSubmissionsByOwner(filteredSubs).map((group) => {
                                          const groupKey = `${activity.id}-${group.ownerId}`;
                                          const groupOpen = expandedGroups.has(groupKey);
                                          const hasRevisions = group.attemptCount > 1;

                                          // Single submission with no revisions: render as a flat row (no group wrapper)
                                          if (group.submissions.length === 1 && !hasRevisions) {
                                            const submission = group.submissions[0];
                                            return (
                                              <button
                                                key={`${submission.scope}-${submission.id}`}
                                                onClick={() => selectSubmission(submission.id)}
                                                className={`w-full px-3 py-2 text-left transition-colors ${
                                                  selectedSubmission?.id === submission.id
                                                    ? "bg-blue-500/15 border-l-2 border-blue-400"
                                                    : "border-l-2 border-transparent hover:bg-slate-900/60"
                                                }`}
                                              >
                                                <div className="flex items-start justify-between gap-2">
                                                  <div className="min-w-0 flex-1">
                                                    <div className="text-xs font-medium text-slate-100 truncate">
                                                      {submission.scope === "team" ? (
                                                        <TeamHoverCard
                                                          teamName={submission.team?.name ?? null}
                                                          lobbyCode={submission.team?.lobby_code}
                                                          members={submission.team_members}
                                                        >
                                                          <span className="cursor-default underline decoration-dotted decoration-slate-600 underline-offset-2">
                                                            {getOwnerLabel(submission)}
                                                          </span>
                                                        </TeamHoverCard>
                                                      ) : (
                                                        <ProfileHoverCard
                                                          name={submission.participant?.name ?? null}
                                                          email={submission.participant?.email}
                                                          university={submission.participant?.university}
                                                          phone={submission.participant?.phone}
                                                          lineId={submission.participant?.line_id}
                                                          track={submission.participant?.track}
                                                          gradeLevel={submission.participant?.grade_level}
                                                          teamName={submission.team?.name}
                                                          teamLobbyCode={submission.team?.lobby_code}
                                                        >
                                                          <span className="cursor-default underline decoration-dotted decoration-slate-600 underline-offset-2">
                                                            {getOwnerLabel(submission)}
                                                          </span>
                                                        </ProfileHoverCard>
                                                      )}
                                                    </div>
                                                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10px] text-slate-500">
                                                      <span className="uppercase tracking-wide">{submission.scope}</span>
                                                      {submission.scope === "team" && submission.team?.lobby_code && (
                                                        <span>· {submission.team.lobby_code}</span>
                                                      )}
                                                      {submission.submitted_at && (
                                                        <span>· {format(new Date(submission.submitted_at), "MMM d")}</span>
                                                      )}
                                                      {submission.file_urls.length > 0 && (
                                                        <Paperclip className="h-2.5 w-2.5" />
                                                      )}
                                                      {submission.image_url && <ImageIcon className="h-2.5 w-2.5" />}
                                                    </div>
                                                  </div>
                                                  <div className="flex items-center gap-1 shrink-0">
                                                    {savingGradeIds.has(submission.id) && (
                                                      <Loader2 className="h-3 w-3 animate-spin text-blue-300" />
                                                    )}
                                                    {aiJobs[submission.id]?.status === "running" && (
                                                      <Loader2 className="h-3 w-3 animate-spin text-violet-300" />
                                                    )}
                                                    {submission.review?.ai_draft &&
                                                      aiJobs[submission.id]?.status !== "running" && (
                                                        <Sparkles className="h-3 w-3 text-violet-300" />
                                                      )}
                                                    <StatusBadge status={submission.review_status} />
                                                  </div>
                                                </div>
                                              </button>
                                            );
                                          }

                                          // Multiple submissions or has revisions: render as a collapsible group
                                          return (
                                            <div key={groupKey}>
                                              {/* Group header */}
                                              <button
                                                onClick={() => toggleGroup(groupKey)}
                                                className={`w-full px-3 py-2 text-left transition-colors ${
                                                  group.submissions.some((s) => s.id === selectedSubmission?.id)
                                                    ? "bg-blue-500/10"
                                                    : "hover:bg-slate-900/60"
                                                }`}
                                              >
                                                <div className="flex items-start justify-between gap-2">
                                                  <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-1.5">
                                                      {groupOpen ? (
                                                        <ChevronDown className="h-3 w-3 text-slate-500 shrink-0" />
                                                      ) : (
                                                        <ChevronRight className="h-3 w-3 text-slate-500 shrink-0" />
                                                      )}
                                                      <div className="text-xs font-medium text-slate-100 truncate">
                                                        {group.scope === "team" ? (
                                                          <TeamHoverCard
                                                            teamName={group.team?.name ?? null}
                                                            lobbyCode={group.team?.lobby_code}
                                                            members={group.team_members}
                                                          >
                                                            <span className="cursor-default underline decoration-dotted decoration-slate-600 underline-offset-2">
                                                              {group.ownerName}
                                                            </span>
                                                          </TeamHoverCard>
                                                        ) : (
                                                          <ProfileHoverCard
                                                            name={group.participant?.name ?? null}
                                                            email={group.participant?.email}
                                                            university={group.participant?.university}
                                                            phone={group.participant?.phone}
                                                            lineId={group.participant?.line_id}
                                                            track={group.participant?.track}
                                                            gradeLevel={group.participant?.grade_level}
                                                            teamName={group.team?.name}
                                                            teamLobbyCode={group.team?.lobby_code}
                                                          >
                                                            <span className="cursor-default underline decoration-dotted decoration-slate-600 underline-offset-2">
                                                              {group.ownerName}
                                                            </span>
                                                          </ProfileHoverCard>
                                                        )}
                                                      </div>
                                                      {hasRevisions && (
                                                        <span className="rounded px-1 py-0.5 text-[9px] bg-slate-700 text-slate-300 font-light shrink-0">
                                                          {group.attemptCount} attempts
                                                        </span>
                                                      )}
                                                    </div>
                                                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10px] text-slate-500 pl-[18px]">
                                                      <span className="uppercase tracking-wide">{group.scope}</span>
                                                      {group.scope === "team" && group.team?.lobby_code && (
                                                        <span>· {group.team.lobby_code}</span>
                                                      )}
                                                    </div>
                                                  </div>
                                                  <div className="flex items-center gap-1 shrink-0">
                                                    {group.submissions.some((s) => savingGradeIds.has(s.id)) && (
                                                      <Loader2 className="h-3 w-3 animate-spin text-blue-300" />
                                                    )}
                                                    {group.submissions.some((s) => aiJobs[s.id]?.status === "running") && (
                                                      <Loader2 className="h-3 w-3 animate-spin text-violet-300" />
                                                    )}
                                                    {group.submissions.some((s) => s.review?.ai_draft && aiJobs[s.id]?.status !== "running") && (
                                                      <Sparkles className="h-3 w-3 text-violet-300" />
                                                    )}
                                                    <StatusBadge status={group.latestStatus} />
                                                  </div>
                                                </div>
                                              </button>

                                              {/* Submissions under group */}
                                              {groupOpen && (
                                                <div className="border-t border-slate-800/40">
                                                  {group.submissions.map((submission) => (
                                                    <button
                                                      key={`${submission.scope}-${submission.id}`}
                                                      onClick={() => selectSubmission(submission.id)}
                                                      className={`w-full px-3 py-2 text-left transition-colors ${
                                                        selectedSubmission?.id === submission.id
                                                          ? "bg-blue-500/15 border-l-2 border-blue-400"
                                                          : "border-l-2 border-transparent hover:bg-slate-900/60"
                                                      }`}
                                                    >
                                                      <div className="flex items-start justify-between gap-2 pl-[18px]">
                                                        <div className="min-w-0 flex-1">
                                                          <div className="text-[11px] font-medium text-slate-200 truncate">
                                                            R{1 + (submission.revisions?.length ?? 0)}
                                                            {submission.submitted_at && (
                                                              <span className="text-slate-500 font-light">
                                                                {" "}· {format(new Date(submission.submitted_at), "MMM d, HH:mm")}
                                                              </span>
                                                            )}
                                                          </div>
                                                          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10px] text-slate-500">
                                                            {submission.file_urls.length > 0 && (
                                                              <Paperclip className="h-2.5 w-2.5" />
                                                            )}
                                                            {submission.image_url && <ImageIcon className="h-2.5 w-2.5" />}
                                                            {(submission.revisions?.length ?? 0) > 0 && (
                                                              <span className="text-slate-600">
                                                                {submission.revisions?.length} prior revision
                                                                {(submission.revisions?.length ?? 0) === 1 ? "" : "s"}
                                                              </span>
                                                            )}
                                                          </div>
                                                        </div>
                                                        <div className="flex items-center gap-1 shrink-0">
                                                          {savingGradeIds.has(submission.id) && (
                                                            <Loader2 className="h-3 w-3 animate-spin text-blue-300" />
                                                          )}
                                                          {aiJobs[submission.id]?.status === "running" && (
                                                            <Loader2 className="h-3 w-3 animate-spin text-violet-300" />
                                                          )}
                                                          {submission.review?.ai_draft &&
                                                            aiJobs[submission.id]?.status !== "running" && (
                                                              <Sparkles className="h-3 w-3 text-violet-300" />
                                                            )}
                                                          <StatusBadge status={submission.review_status} />
                                                        </div>
                                                      </div>
                                                    </button>
                                                  ))}
                                                </div>
                                              )}
                                            </div>
                                          );
                                        })
                                      )}
                                      {activity.submission_has_more && !activity.submission_loading && (
                                        <div className="w-full px-3 py-2 flex items-center justify-center">
                                          <Button
                                            type="button"
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => { void fetchActivitySubmissions(activity.id); }}
                                            className="h-7 px-2 text-[11px] font-light text-slate-400 hover:bg-slate-800"
                                          >
                                            Load more submissions
                                          </Button>
                                        </div>
                                      )}
                                      {activity.submission_loading && activity.submissions.length > 0 && (
                                        <div className="w-full px-3 py-2 flex items-center justify-center gap-2 text-[11px] text-slate-500">
                                          <Loader2 className="h-3 w-3 animate-spin" />
                                          Loading more…
                                        </div>
                                      )}
                                      {/* Loading skeleton */}
                                      {activity.submission_loading && activity.submissions.length === 0 && (
                                        <div className="space-y-2 px-3 py-4">
                                          {[...Array(3)].map((_, i) => (
                                            <div key={i} className="h-10 w-full animate-pulse rounded bg-slate-800/60" />
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })
                          )}
                        </div>
                      )}
                    </section>
                  );
                })}
              </aside>

              {selectedSubmission ? (
                <div className="min-w-0 space-y-6 break-words">
                  {selectedSubmissionLoading && (
                    <div className="rounded-md border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-slate-300">
                      Loading submission details…
                    </div>
                  )}
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2 min-w-0">
                      <h3 className="text-base font-medium text-slate-100 break-words min-w-0">
                        {selectedActivity?.title}
                      </h3>
                      <StatusBadge status={selectedSubmission.review_status} />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-xs font-light text-slate-400 break-words">
                        {selectedSubmission.scope === "team" ? (
                          <TeamHoverCard
                            teamName={selectedSubmission.team?.name ?? null}
                            lobbyCode={selectedSubmission.team?.lobby_code}
                            members={selectedSubmission.team_members}
                          >
                            <span className="cursor-default underline decoration-dotted decoration-slate-600 underline-offset-2">
                              {getOwnerLabel(selectedSubmission)}
                              {selectedSubmission.team?.lobby_code
                                ? ` (${selectedSubmission.team.lobby_code})`
                                : ""}
                            </span>
                          </TeamHoverCard>
                        ) : (
                          <ProfileHoverCard
                            name={selectedSubmission.participant?.name ?? null}
                            email={selectedSubmission.participant?.email}
                            university={selectedSubmission.participant?.university}
                            phone={selectedSubmission.participant?.phone}
                            lineId={selectedSubmission.participant?.line_id}
                            track={selectedSubmission.participant?.track}
                            gradeLevel={selectedSubmission.participant?.grade_level}
                            teamName={selectedSubmission.team?.name}
                            teamLobbyCode={selectedSubmission.team?.lobby_code}
                          >
                            <span className="cursor-default underline decoration-dotted decoration-slate-600 underline-offset-2">
                              {getOwnerLabel(selectedSubmission)}
                            </span>
                          </ProfileHoverCard>
                        )}
                      </div>
                      {relatedSubmissions.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setRelatedModalOpen(true)}
                          className="rounded-md border border-slate-700 bg-slate-900/60 px-2 py-0.5 text-[11px] font-light text-slate-300 hover:bg-slate-800 hover:text-slate-100 transition"
                        >
                          View {relatedSubmissions.length} other submission
                          {relatedSubmissions.length === 1 ? "" : "s"}
                        </button>
                      )}
                    </div>
                  </div>

                  {selectedSubmission.scope === "team" && selectedSubmission.team_members.length > 0 && (
                    <div>
                      <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-slate-500">
                        <Users className="h-3 w-3" /> Team members
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedSubmission.team_members.map((member) => (
                          <ProfileHoverCard
                            key={member.id}
                            name={member.name}
                            email={member.email}
                            university={member.university}
                          >
                            <Badge variant="outline" className="border-slate-700 text-slate-300 font-light cursor-default">
                              {member.name ?? member.email ?? member.id}
                            </Badge>
                          </ProfileHoverCard>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedSubmission.text_answer && (
                    <section className="min-w-0">
                      <p className="mb-2 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-slate-500">
                        <FileText className="h-3 w-3" />
                        {(selectedSubmission.revisions?.length ?? 0) > 0
                          ? `Current attempt (R${(selectedSubmission.revisions?.length ?? 0) + 1})`
                          : "Text answer"}
                      </p>
                      <p className="whitespace-pre-wrap text-[15px] font-light leading-7 text-slate-100 break-words">
                        {selectedSubmission.text_answer}
                      </p>
                    </section>
                  )}

                  {(selectedSubmission.revisions?.length ?? 0) > 0 && (
                    <RevisionThread
                      revisions={selectedSubmission.revisions ?? []}
                      currentText={selectedSubmission.text_answer}
                    />
                  )}

                  {selectedSubmission.image_url && (
                    <section>
                      <p className="mb-2 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-slate-500">
                        <ImageIcon className="h-3 w-3" /> Image
                        <span className="text-slate-600 normal-case font-light">(click to zoom)</span>
                      </p>
                      <button
                        type="button"
                        onClick={() => setLightboxSrc(selectedSubmission.image_url)}
                        className="block max-w-full rounded-md border border-slate-800 overflow-hidden hover:border-slate-600 focus:outline-none focus:border-slate-500 transition cursor-zoom-in"
                        aria-label="View image full screen"
                      >
                        <img
                          src={selectedSubmission.image_url}
                          alt="Submission"
                          className="max-h-72 w-auto object-contain"
                        />
                      </button>
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

                    {selectedSubmission.review?.ai_draft && !aiSuggesting && (
                      <div className="min-w-0 space-y-1.5">
                        <div className="flex items-center justify-between gap-2 text-[11px] font-light">
                          <span className="flex items-center gap-1.5 text-violet-200">
                            <Sparkles className="h-3 w-3 shrink-0" />
                            AI draft ready — review & approve
                            {selectedSubmission.review.ai_draft_source &&
                              selectedSubmission.review.ai_draft_source !== "manual" && (
                                <span className="text-violet-400/60">
                                  ({selectedSubmission.review.ai_draft_source.replace(/_/g, " ")})
                                </span>
                              )}
                          </span>
                          {selectedSubmission.review.ai_draft_generated_at && (
                            <span className="text-slate-600 shrink-0">
                              {format(new Date(selectedSubmission.review.ai_draft_generated_at), "MMM d, HH:mm")}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={discardAiDraft}
                            className="h-7 px-2 text-[11px] font-light text-slate-400 hover:bg-slate-800"
                          >
                            <XCircle className="mr-1 h-3 w-3" />
                            Discard draft
                          </Button>
                          <span className="text-[10px] font-light text-slate-600">
                            or edit below and click Save to approve.
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="space-y-1.5">
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
                          onClick={() => {
                            const isRegrade = selectedSubmission.review_status === "passed";
                            const comment = graderNoteRef.current.trim() || undefined;
                            requestAiSuggestion(undefined, { regrade: isRegrade, graderComment: comment });
                            graderNoteRef.current = "";
                          }}
                          disabled={aiSuggesting}
                          className="h-7 px-2 text-[11px] font-light text-violet-200 hover:bg-violet-500/10"
                        >
                          {aiSuggesting ? (
                            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                          ) : (
                            <Sparkles className="mr-1 h-3 w-3" />
                          )}
                          {aiSuggesting
                            ? "Thinking…"
                            : selectedSubmission.review?.ai_draft
                              ? "Regenerate AI draft"
                              : selectedSubmission.review_status === "passed"
                                ? "AI Regrade"
                                : "Suggest with AI"}
                        </Button>
                      </div>
                      <GraderNoteInput
                        ref={graderNoteInputRef}
                        disabled={aiSuggesting}
                        onChange={(v) => { graderNoteRef.current = v; }}
                        onSubmit={(comment) => {
                          const isRegrade = selectedSubmission.review_status === "passed";
                          requestAiSuggestion(undefined, { regrade: isRegrade, graderComment: comment || undefined });
                          graderNoteRef.current = "";
                        }}
                      />
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

      <Dialog open={relatedModalOpen} onOpenChange={setRelatedModalOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col border-slate-700 bg-slate-950">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-sm font-medium tracking-wide uppercase text-slate-200">
              Other submissions
            </DialogTitle>
            {selectedSubmission && (
              <DialogDescription className="text-xs text-slate-400 font-light">
                By {getOwnerLabel(selectedSubmission)}
                {selectedSubmission.scope === "team" && selectedSubmission.team?.lobby_code
                  ? ` (${selectedSubmission.team.lobby_code})`
                  : ""}
                {selectedSubmission.scope === "team" &&
                  selectedSubmission.team_members.length > 0 && (
                    <>
                      {" · "}
                      Members:{" "}
                      {selectedSubmission.team_members
                        .map((m) => m.name ?? m.email ?? m.id)
                        .join(", ")}
                    </>
                  )}
              </DialogDescription>
            )}
          </DialogHeader>
          <div className="flex-1 overflow-y-auto -mx-6 px-6">
            {relatedSubmissions.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500">
                No other submissions found.
              </p>
            ) : (
              <ul className="divide-y divide-slate-800">
                {relatedSubmissions.map(
                  ({
                    submission,
                    phaseNumber,
                    phaseTitle,
                    activityOrder,
                    activityTitle,
                    matchReason,
                  }) => (
                    <li key={`${submission.scope}-${submission.id}`}>
                      <button
                        type="button"
                        onClick={() => {
                          selectSubmission(submission.id);
                          setRelatedModalOpen(false);
                        }}
                        className="w-full py-2.5 text-left hover:bg-slate-900/50 px-2 rounded-md transition-colors"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="text-[11px] text-slate-500 uppercase tracking-wide">
                              P{phaseNumber}. {phaseTitle} · {activityOrder}. {activityTitle}
                            </div>
                            <div className="mt-0.5 text-sm font-medium text-slate-100">
                              {getOwnerLabel(submission)}
                            </div>
                            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[10px] text-slate-500">
                              <span className="uppercase">{submission.scope}</span>
                              <span className="text-violet-300">· {matchReason}</span>
                              {submission.submitted_at && (
                                <span>
                                  · {format(new Date(submission.submitted_at), "MMM d, HH:mm")}
                                </span>
                              )}
                              {submission.scope === "team" && submission.team?.lobby_code && (
                                <span>· {submission.team.lobby_code}</span>
                              )}
                              {submission.file_urls.length > 0 && (
                                <Paperclip className="h-2.5 w-2.5" />
                              )}
                              {submission.image_url && <ImageIcon className="h-2.5 w-2.5" />}
                              {submission.review?.ai_draft && (
                                <Sparkles className="h-2.5 w-2.5 text-violet-300" />
                              )}
                            </div>
                          </div>
                          <StatusBadge status={submission.review_status} />
                        </div>
                      </button>
                    </li>
                  )
                )}
              </ul>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
    </div>
  );
}

const GraderNoteInput = React.forwardRef<HTMLInputElement, { onSubmit: (comment: string) => void; onChange: (value: string) => void; disabled: boolean }>(
  function GraderNoteInput({ onSubmit, onChange, disabled }, ref) {
    const [value, setValue] = useState("");
    const innerRef = useRef<HTMLInputElement>(null);
    React.useImperativeHandle(ref, () => innerRef.current!);
    return (
      <input
        ref={innerRef}
        type="text"
        value={value}
        onChange={(e) => { setValue(e.target.value); onChange(e.target.value); }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !disabled) {
            onSubmit(value.trim());
            setValue("");
          }
        }}
        placeholder="Grader note for AI (optional)…"
        className="h-7 w-full rounded border border-violet-500/20 bg-slate-950 px-2 text-[11px] text-slate-200 placeholder:text-slate-600 focus:border-violet-400/50 focus:outline-none"
      />
    );
  }
);

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
