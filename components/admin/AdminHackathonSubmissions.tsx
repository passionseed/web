"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import {
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ClipboardCheck,
  FileText,
  History,
  Image as ImageIcon,
  Loader2,
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
import { ImageLightbox } from "@/components/admin/ImageLightbox";

type ReviewStatus = "pending_review" | "passed" | "revision_required";
type SubmissionScope = "individual" | "team";

interface Person {
  id: string;
  name: string | null;
  email: string | null;
  university?: string | null;
}

interface Activity {
  id: string;
  title: string | null;
  instructions: string | null;
  hackathon_program_phases?: {
    title: string | null;
    phase_number: number | null;
  } | null;
}

interface Assessment {
  id: string;
  assessment_type: string;
  points_possible: number | null;
  is_graded: boolean | null;
  metadata: Record<string, unknown> | null;
}

interface Review {
  id: string;
  review_status: ReviewStatus;
  score_awarded: number | null;
  points_possible: number | null;
  feedback: string;
  reviewed_at: string | null;
}

interface SubmissionRevision {
  n: number;
  text_answer: string | null;
  image_url: string | null;
  file_urls: string[] | null;
  submitted_at: string;
  review: {
    status: ReviewStatus;
    score_awarded: number | null;
    points_possible: number | null;
    feedback: string;
    reviewed_by: string | null;
    reviewed_at: string | null;
  } | null;
}

interface AdminSubmission {
  scope: SubmissionScope;
  id: string;
  status: string;
  review_status: ReviewStatus;
  submitted_at: string | null;
  text_answer: string | null;
  image_url: string | null;
  file_urls: string[];
  revisions: SubmissionRevision[];
  participant: Person | null;
  team: { id: string; name: string | null; lobby_code: string | null } | null;
  team_members: Person[];
  submitted_by: Person | null;
  activity: Activity | null;
  assessment: Assessment | null;
  review: Review | null;
}

interface Pagination {
  page: number;
  page_size: number;
  total_items: number;
  total_pages: number;
}

interface SubmissionCounts {
  total: number;
  pending_review: number;
  passed: number;
  revision_required: number;
}

const STATUS_LABELS: Record<ReviewStatus, string> = {
  pending_review: "Pending",
  passed: "Passed",
  revision_required: "Needs revision",
};

function StatusBadge({ status }: { status: ReviewStatus }) {
  const classes: Record<ReviewStatus, string> = {
    pending_review: "border-amber-400/40 bg-amber-500/15 text-amber-200",
    passed: "border-emerald-400/40 bg-emerald-500/15 text-emerald-200",
    revision_required: "border-rose-400/40 bg-rose-500/15 text-rose-200",
  };

  return (
    <Badge variant="outline" className={classes[status]}>
      {STATUS_LABELS[status]}
    </Badge>
  );
}

function getOwnerLabel(submission: AdminSubmission) {
  if (submission.scope === "team") {
    return submission.team?.name ?? "Unnamed team";
  }

  return submission.participant?.name ?? submission.participant?.email ?? "Unnamed participant";
}

function metadataText(value: unknown) {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value, null, 2);
}

export function AdminHackathonSubmissions() {
  const [submissions, setSubmissions] = useState<AdminSubmission[]>([]);
  const [counts, setCounts] = useState<SubmissionCounts>({
    total: 0,
    pending_review: 0,
    passed: 0,
    revision_required: 0,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<ReviewStatus | "all" | "improvements">("pending_review");
  const [scopeFilter, setScopeFilter] = useState<SubmissionScope | "all">("all");
  const [search, setSearch] = useState("");
  const [reviewStatus, setReviewStatus] = useState<ReviewStatus>("passed");
  const [scoreAwarded, setScoreAwarded] = useState("");
  const [feedback, setFeedback] = useState("");
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [viewingRevisionN, setViewingRevisionN] = useState<number | null>(null);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, page_size: 50, total_items: 0, total_pages: 1 });
  const [detailCache, setDetailCache] = useState<Record<string, { text_answer: string | null; file_urls: string[] }>>({});
  const [loadingDetail, setLoadingDetail] = useState(false);
  const pageRef = useRef(1);

  const selected = useMemo(
    () => submissions.find((submission) => submission.id === selectedId) ?? submissions[0] ?? null,
    [selectedId, submissions]
  );

  const fetchSubmissions = useCallback(async (pg?: number) => {
    const targetPage = pg ?? pageRef.current;
    setLoading(true);
    setMessage("");
    const params = new URLSearchParams();
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (scopeFilter !== "all") params.set("scope", scopeFilter);
    params.set("page", String(targetPage));

    try {
      const response = await fetch(`/api/admin/hackathon/submissions?${params.toString()}`);
      const data = await response.json();
      if (!response.ok) {
        setMessage(data.error ?? "Failed to fetch submissions");
        return;
      }
      setSubmissions(data.submissions ?? []);
      setCounts(data.counts ?? { total: 0, pending_review: 0, passed: 0, revision_required: 0 });
      if (data.pagination) {
        setPagination(data.pagination);
        pageRef.current = data.pagination.page;
      }
      setSelectedId((current) => {
        if (current && data.submissions?.some((s: AdminSubmission) => s.id === current)) return current;
        return data.submissions?.[0]?.id ?? null;
      });
    } catch {
      setMessage("Failed to fetch submissions");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, scopeFilter]);

  useEffect(() => {
    pageRef.current = 1;
    void fetchSubmissions(1);
  }, [fetchSubmissions]);

  useEffect(() => {
    if (!selected) return;
    setReviewStatus(selected.review?.review_status ?? "passed");
    setScoreAwarded(
      typeof selected.review?.score_awarded === "number"
        ? String(selected.review.score_awarded)
        : ""
    );
    setFeedback(selected.review?.feedback ?? "");
  }, [selected?.id, selected?.review]);

  // Lazy-load full detail (text_answer, file_urls) when a submission is selected
  useEffect(() => {
    if (!selected) return;
    // If text_answer already present on the submission (e.g. from detail endpoint), skip
    if (selected.text_answer !== undefined && selected.text_answer !== null) return;
    if (detailCache[selected.id]) return;

    let cancelled = false;
    setLoadingDetail(true);
    fetch(`/api/admin/hackathon/submissions/${selected.scope}/${selected.id}/review`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        const detail = { text_answer: data.text_answer ?? null, file_urls: data.file_urls ?? [] };
        setDetailCache((prev) => ({ ...prev, [selected.id]: detail }));
        setSubmissions((prev) =>
          prev.map((s) =>
            s.id === selected.id
              ? { ...s, text_answer: detail.text_answer, file_urls: detail.file_urls }
              : s
          )
        );
      })
      .catch(() => null)
      .finally(() => { if (!cancelled) setLoadingDetail(false); });

    return () => { cancelled = true; };
  }, [selected?.id, selected?.scope, selected?.text_answer, detailCache]);

  function goToPage(pg: number) {
    if (pg < 1 || pg > pagination.total_pages || pg === pagination.page) return;
    pageRef.current = pg;
    void fetchSubmissions(pg);
  }

  const visibleSubmissions = submissions.filter((submission) => {
    const query = search.trim().toLowerCase();
    if (!query) return true;
    return [
      getOwnerLabel(submission),
      submission.activity?.title,
      submission.participant?.email,
      submission.team?.lobby_code,
      submission.submitted_by?.name,
      ...submission.team_members.map((member) => member.name),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(query);
  });

  async function submitReview() {
    if (!selected) return;
    setSaving(true);
    setMessage("");

    try {
      const response = await fetch(
        `/api/admin/hackathon/submissions/${selected.scope}/${selected.id}/review`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            review_status: reviewStatus,
            score_awarded: scoreAwarded,
            feedback,
          }),
        }
      );
      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error ?? "Failed to save review");
        return;
      }

      setMessage(
        `Review saved. Inbox: ${data.inbox_count ?? 0}. Push targets: ${data.push_target_count ?? 0}.`
      );
      await fetchSubmissions();
    } catch {
      setMessage("Failed to save review");
    } finally {
      setSaving(false);
    }
  }

  const rubric = selected?.assessment?.metadata?.rubric;
  const prompt = selected?.assessment?.metadata?.prompt ?? selected?.assessment?.metadata?.submission_label;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-slate-700/50 bg-slate-900/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total submissions</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{pagination.total_items || counts.total}</CardContent>
        </Card>
        <Card className="border-amber-500/30 bg-amber-500/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Pending</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-amber-200">{counts.pending_review}</CardContent>
        </Card>
        <Card className="border-emerald-500/30 bg-emerald-500/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Passed</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-emerald-200">{counts.passed}</CardContent>
        </Card>
        <Card className="border-rose-500/30 bg-rose-500/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Needs revision</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-rose-200">{counts.revision_required}</CardContent>
        </Card>
      </div>

      <Card className="border-slate-700/50 bg-slate-900/50">
        <CardHeader>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ClipboardCheck className="h-5 w-5 text-amber-300" />
                Assessment submissions
              </CardTitle>
              <CardDescription>Review hackathon work, grade it, and notify participants.</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => fetchSubmissions()} disabled={loading}>
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
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by participant, team, activity, or code"
                className="pl-9"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as ReviewStatus | "all" | "improvements")}
              className="h-10 rounded-md border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100"
            >
              <option value="all">All statuses</option>
              <option value="pending_review">Pending</option>
              <option value="improvements">Improvements only</option>
              <option value="passed">Passed</option>
              <option value="revision_required">Needs revision</option>
            </select>
            <select
              value={scopeFilter}
              onChange={(event) => setScopeFilter(event.target.value as SubmissionScope | "all")}
              className="h-10 rounded-md border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100"
            >
              <option value="all">All scopes</option>
              <option value="individual">Individual</option>
              <option value="team">Team</option>
            </select>
          </div>

          {message && (
            <div className="rounded-md border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-slate-300">
              {message}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          ) : visibleSubmissions.length === 0 ? (
            <div className="py-16 text-center text-sm text-slate-500">No submissions match these filters.</div>
          ) : (
            <div className="grid gap-4 xl:grid-cols-[minmax(320px,420px)_1fr]">
              <div className="max-h-[720px] space-y-2 overflow-y-auto pr-1">
                {visibleSubmissions.map((submission) => (
                  <button
                    key={`${submission.scope}-${submission.id}`}
                    type="button"
                    onClick={() => setSelectedId(submission.id)}
                    className={`w-full rounded-md border p-3 text-left transition-colors ${
                      selected?.id === submission.id
                        ? "border-amber-400/60 bg-amber-500/10"
                        : "border-slate-800 bg-slate-950/50 hover:border-slate-600"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-slate-100">{getOwnerLabel(submission)}</div>
                        <div className="mt-1 text-xs text-slate-400">{submission.activity?.title ?? "Untitled activity"}</div>
                      </div>
                      <StatusBadge status={submission.review_status} />
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <Badge variant="outline" className="border-slate-700 text-slate-400">
                        {submission.scope}
                      </Badge>
                      {submission.submitted_at && (
                        <span>{format(new Date(submission.submitted_at), "MMM d, HH:mm")}</span>
                      )}
                      {submission.file_urls.length > 0 && <Paperclip className="h-3.5 w-3.5" />}
                      {submission.image_url && <ImageIcon className="h-3.5 w-3.5" />}
                    </div>
                  </button>
                ))}
              </div>

              {/* Pagination controls */}
              {pagination.total_pages > 1 && (
                <div className="col-span-full flex items-center justify-between border-t border-slate-800 pt-3">
                  <span className="text-xs text-slate-500">
                    Page {pagination.page} of {pagination.total_pages} · {pagination.total_items} submissions
                  </span>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="sm" disabled={pagination.page <= 1} onClick={() => goToPage(pagination.page - 1)}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    {Array.from({ length: Math.min(5, pagination.total_pages) }, (_, i) => {
                      const start = Math.max(1, Math.min(pagination.page - 2, pagination.total_pages - 4));
                      const pg = start + i;
                      if (pg > pagination.total_pages) return null;
                      return (
                        <Button key={pg} variant={pg === pagination.page ? "default" : "outline"} size="sm" onClick={() => goToPage(pg)} className="min-w-[36px]">
                          {pg}
                        </Button>
                      );
                    })}
                    <Button variant="outline" size="sm" disabled={pagination.page >= pagination.total_pages} onClick={() => goToPage(pagination.page + 1)}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {selected && (
                <div className="rounded-md border border-slate-800 bg-slate-950/50 p-4">
                  <div className="flex flex-col gap-3 border-b border-slate-800 pb-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold text-slate-100">{selected.activity?.title ?? "Submission"}</h3>
                        <StatusBadge status={selected.review_status} />
                      </div>
                      <p className="mt-1 text-sm text-slate-400">
                        {getOwnerLabel(selected)}
                        {selected.scope === "team" && selected.team?.lobby_code ? ` (${selected.team.lobby_code})` : ""}
                      </p>
                    </div>
                    {selected.assessment?.points_possible !== null && selected.assessment?.points_possible !== undefined && (
                      <Badge className="bg-slate-800 text-slate-200">
                        {selected.assessment.points_possible} pts
                      </Badge>
                    )}
                  </div>

                  <div className="grid gap-4 py-4 lg:grid-cols-[1fr_320px]">
                    <div className="space-y-4">
                      {selected.scope === "team" && (
                        <div>
                          <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-300">
                            <Users className="h-4 w-4" />
                            Team members
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {selected.team_members.map((member) => (
                              <Badge key={member.id} variant="outline" className="border-slate-700 text-slate-300">
                                {member.name ?? member.email ?? member.id}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {metadataText(prompt) && (
                        <div className="rounded-md border border-slate-800 bg-slate-900/40 p-3">
                          <h4 className="mb-1 text-sm font-semibold text-slate-300">Prompt</h4>
                          <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-400">{metadataText(prompt)}</p>
                        </div>
                      )}

                      {selected.text_answer && (
                        <div className="rounded-md border border-slate-800 bg-slate-900/40 p-3">
                          <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-300">
                            <FileText className="h-4 w-4" />
                            Text answer
                          </h4>
                          <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-200">{selected.text_answer}</p>
                        </div>
                      )}

                      {selected.image_url && (
                        <div className="rounded-md border border-slate-800 bg-slate-900/40 p-3">
                          <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-300">
                            <ImageIcon className="h-4 w-4" />
                            Image
                            <span className="text-xs font-normal text-slate-500">(click to enlarge)</span>
                          </h4>
                          <button
                            type="button"
                            onClick={() => setLightboxSrc(selected.image_url)}
                            className="block w-full cursor-zoom-in"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={selected.image_url}
                              alt="Submission"
                              className="max-h-96 w-full rounded-md border border-slate-800 object-contain hover:opacity-90 transition-opacity"
                              loading="lazy"
                              decoding="async"
                            />
                          </button>
                        </div>
                      )}

                      {selected.file_urls.length > 0 && (
                        <div className="rounded-md border border-slate-800 bg-slate-900/40 p-3">
                          <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-300">
                            <Paperclip className="h-4 w-4" />
                            Files
                          </h4>
                          <div className="space-y-2">
                            {selected.file_urls.map((url, index) => {
                              const isImage = /\.(jpg|jpeg|png|webp|gif|heic|heif)(\?|$)/i.test(url);
                              if (isImage) {
                                return (
                                  <button
                                    key={url}
                                    type="button"
                                    onClick={() => setLightboxSrc(url)}
                                    className="block w-full cursor-zoom-in rounded-md border border-slate-800 p-2 hover:border-blue-400/50 transition"
                                  >
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                      src={url}
                                      alt={`File ${index + 1}`}
                                      className="max-h-48 w-full rounded object-contain"
                                      loading="lazy"
                                      decoding="async"
                                    />
                                    <div className="mt-1 text-xs text-slate-500">
                                      File {index + 1} (click to enlarge)
                                    </div>
                                  </button>
                                );
                              }
                              return (
                                <a
                                  key={url}
                                  href={url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="block rounded-md border border-slate-800 px-3 py-2 text-sm text-blue-300 hover:border-blue-400/50"
                                >
                                  Open file {index + 1}
                                </a>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Revision history */}
                      {selected.revisions.length > 0 && (
                        <div className="rounded-md border border-slate-800 bg-slate-900/40 p-3">
                          <button
                            type="button"
                            onClick={() => setViewingRevisionN(viewingRevisionN === -1 ? null : -1)}
                            className="flex w-full items-center justify-between text-sm font-semibold text-slate-300"
                          >
                            <span className="flex items-center gap-2">
                              <History className="h-4 w-4" />
                              Prior versions ({selected.revisions.length})
                            </span>
                            {viewingRevisionN === -1 ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </button>

                          {viewingRevisionN === -1 && (
                            <div className="mt-3 space-y-3">
                              {selected.revisions.map((rev) => (
                                <div key={rev.n} className="rounded-md border border-slate-700 bg-slate-950/60 p-3">
                                  <div className="mb-2 flex items-center justify-between">
                                    <span className="text-xs font-semibold text-slate-400">
                                      Version {rev.n}
                                    </span>
                                    <div className="flex items-center gap-2">
                                      {rev.review && (
                                        <Badge
                                          variant="outline"
                                          className={`text-[10px] ${
                                            rev.review.status === "passed"
                                              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                                              : rev.review.status === "revision_required"
                                              ? "border-rose-500/40 bg-rose-500/10 text-rose-300"
                                              : "border-amber-500/40 bg-amber-500/10 text-amber-300"
                                          }`}
                                        >
                                          {rev.review.status === "passed"
                                            ? "Passed"
                                            : rev.review.status === "revision_required"
                                            ? "Needs revision"
                                            : "Pending"}
                                        </Badge>
                                      )}
                                      <span className="text-[10px] text-slate-600">
                                        {format(new Date(rev.submitted_at), "MMM d, HH:mm")}
                                      </span>
                                    </div>
                                  </div>

                                  {rev.text_answer && (
                                    <p className="mb-2 text-xs text-slate-400 line-clamp-2">
                                      {rev.text_answer}
                                    </p>
                                  )}

                                  {rev.review?.feedback && (
                                    <div className="rounded border border-slate-800 bg-slate-900/80 p-2">
                                      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">
                                        Feedback given:
                                      </p>
                                      <p className="text-xs text-slate-400 whitespace-pre-wrap">
                                        {rev.review.feedback}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="space-y-4 rounded-md border border-slate-800 bg-slate-900/40 p-4">
                      {metadataText(rubric) && (
                        <div>
                          <h4 className="mb-2 text-sm font-semibold text-slate-300">Rubric</h4>
                          <pre className="max-h-44 overflow-auto whitespace-pre-wrap rounded-md bg-slate-950 p-3 text-xs text-slate-400">
                            {metadataText(rubric)}
                          </pre>
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label htmlFor="review-status">Decision</Label>
                        <select
                          id="review-status"
                          value={reviewStatus}
                          onChange={(event) => setReviewStatus(event.target.value as ReviewStatus)}
                          className="h-10 w-full rounded-md border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100"
                        >
                          <option value="passed">Passed</option>
                          <option value="revision_required">Needs revision</option>
                          <option value="pending_review">Pending review</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="score-awarded">Score</Label>
                        <Input
                          id="score-awarded"
                          type="number"
                          min="0"
                          max={selected.assessment?.points_possible ?? undefined}
                          value={scoreAwarded}
                          onChange={(event) => setScoreAwarded(event.target.value)}
                          placeholder={
                            selected.assessment?.points_possible
                              ? `0-${selected.assessment.points_possible}`
                              : "Optional"
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="feedback">Feedback</Label>
                        <Textarea
                          id="feedback"
                          value={feedback}
                          onChange={(event) => setFeedback(event.target.value)}
                          rows={8}
                          placeholder="Write clear feedback participants can act on."
                        />
                      </div>

                      <Button onClick={submitReview} disabled={saving} className="w-full">
                        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                        Save review and notify
                      </Button>

                      {selected.review?.reviewed_at && (
                        <p className="flex items-center gap-2 text-xs text-slate-500">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Last reviewed {format(new Date(selected.review.reviewed_at), "MMM d, HH:mm")}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
    </div>
  );
}
