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
  Image as ImageIcon,
  Loader2,
  Paperclip,
  RefreshCw,
  Search,
  Send,
  Users,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ImageLightbox } from "@/components/admin/ImageLightbox";

type Phase3EntityType = "cycle" | "midphase" | "video";
type Phase3Status = "ungraded" | "graded" | "all";

interface Phase3Item {
  type: Phase3EntityType;
  id: string;
  team_id: string;
  team_name: string | null;
  team_lobby_code: string | null;
  cycle_number?: number;
  status?: string;
  gate_decision?: string | null;
  hypothesis?: string | null;
  synthesis_result?: string | null;
  confidence_score?: number | null;
  what_learned?: string | null;
  what_changed?: string | null;
  what_wrong?: string | null;
  video_url?: string | null;
  score: number | null;
  scored_by: string | null;
  started_at?: string | null;
  submitted_at: string | null;
  completed_at?: string | null;
}

interface Phase3Counts {
  total: number;
  cycles: number;
  midphase: number;
  videos: number;
}

interface Pagination {
  page: number;
  page_size: number;
  total_items: number;
  total_pages: number;
}

interface CycleDetail {
  cycle_number: number;
  hypothesis_who: string | null;
  hypothesis_will_do: string | null;
  hypothesis_because: string | null;
  hypothesis_measured_by: string | null;
  hypothesis_full: string | null;
  variable_changed: string | null;
  prior_variable: string | null;
  pretotype_method: string | null;
  pretotype_description: string | null;
  pretotype_artifact_url: string | null;
  synthesis_result: string | null;
  synthesis_what_changed: string | null;
  synthesis_honest_wrongness: string | null;
  ai_score: Record<string, number> | null;
  mentor_score: Record<string, number> | null;
  mentor_notes: string | null;
  steps?: Array<{
    id: string;
    step_type: string;
    status: string;
    submission_data: Record<string, any>;
  }>;
  test_sessions?: Array<{
    id: string;
    tester_name: string;
    tester_role: string | null;
    tester_channel: string | null;
    fresh_tester: boolean;
    session_result: string | null;
    behavior_log: Record<string, unknown>[];
    painful_detail: string | null;
    unprompted_quotes: string[];
    session_date: string;
    session_duration_min: number | null;
  }>;
}

interface MidphaseDetail {
  what_learned: string | null;
  what_changed: string | null;
  what_wrong: string | null;
  next_hypothesis: string | null;
  confidence_score: number | null;
  ai_score: { total?: number } | null;
  auto_draft: string | null;
}

interface VideoDetail {
  video_url: string | null;
  storyboard: Record<string, unknown>[];
  ai_scrutinizer_output: { total?: number } | null;
  judge_scores: { total?: number } | null;
  human_review_status: string;
  human_reviewer_notes: string | null;
}

const STATUS_LABELS: Record<string, string> = {
  ungraded: "Needs grading",
  graded: "Graded",
  all: "All",
};

function ScoredByBadge({ scoredBy, score }: { scoredBy: string | null; score: number | null }) {
  if (!scoredBy) return <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-amber-200">Ungraded</Badge>;
  const label = scoredBy === "ai" ? "AI" : scoredBy === "mentor" ? "Mentor" : scoredBy === "judge" ? "Judge" : scoredBy;
  const colorClass = scoredBy === "mentor" || scoredBy === "judge"
    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
    : "border-blue-500/40 bg-blue-500/10 text-blue-200";
  return (
    <Badge variant="outline" className={colorClass}>
      {label} {score !== null ? `· ${score}` : ""}
    </Badge>
  );
}

function EntityTypeBadge({ type }: { type: Phase3EntityType }) {
  const labels: Record<Phase3EntityType, string> = { cycle: "Cycle", midphase: "Midphase", video: "Video" };
  return (
    <Badge variant="outline" className="border-slate-600 text-slate-400">
      {labels[type]}
    </Badge>
  );
}

export function AdminHackathonPhase3Grading() {
  const [items, setItems] = useState<Phase3Item[]>([]);
  const [counts, setCounts] = useState<Phase3Counts>({ total: 0, cycles: 0, midphase: 0, videos: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [aiGrading, setAiGrading] = useState(false);
  const [aiStreamMessages, setAiStreamMessages] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<Phase3Status | "all">("ungraded");
  const [typeFilter, setTypeFilter] = useState<Phase3EntityType | "all">("all");
  const [search, setSearch] = useState("");
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, page_size: 50, total_items: 0, total_pages: 1 });
  const [detailCache, setDetailCache] = useState<Record<string, CycleDetail | MidphaseDetail | VideoDetail>>({});
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Review form state
  const [cycleScores, setCycleScores] = useState({ hypothesis_quality: "", variable_isolation: "", behavioral_evidence: "", tester_freshness: "", synthesis_honesty: "" });
  const [midphaseConfidence, setMidphaseConfidence] = useState("");
  const [judgeScore, setJudgeScore] = useState("");
  const [feedback, setFeedback] = useState("");
  const [notes, setNotes] = useState("");
  const pageRef = useRef(1);

  const selected = useMemo(
    () => items.find((item) => item.id === selectedId) ?? items[0] ?? null,
    [selectedId, items]
  );

  const fetchItems = useCallback(async (pg?: number) => {
    const targetPage = pg ?? pageRef.current;
    setLoading(true);
    setMessage("");
    const params = new URLSearchParams();
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (typeFilter !== "all") params.set("type", typeFilter);
    params.set("page", String(targetPage));

    try {
      const response = await fetch(`/api/admin/hackathon/phase3/queue?${params.toString()}`);
      const data = await response.json();
      if (!response.ok) {
        setMessage(data.error ?? "Failed to fetch Phase 3 items");
        return;
      }
      setItems(data.items ?? []);
      setCounts(data.counts ?? { total: 0, cycles: 0, midphase: 0, videos: 0 });
      if (data.pagination) setPagination(data.pagination);
      pageRef.current = data.pagination?.page ?? 1;
      setSelectedId((current) => {
        if (current && data.items?.some((s: Phase3Item) => s.id === current)) return current;
        return data.items?.[0]?.id ?? null;
      });
    } catch {
      setMessage("Failed to fetch Phase 3 items");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, typeFilter]);

  useEffect(() => {
    pageRef.current = 1;
    void fetchItems(1);
  }, [fetchItems]);

  // Reset form when selection changes
  useEffect(() => {
    if (!selected) return;
    setFeedback("");
    setNotes("");
    setCycleScores({ hypothesis_quality: "", variable_isolation: "", behavioral_evidence: "", tester_freshness: "", synthesis_honesty: "" });
    setMidphaseConfidence("");
    setJudgeScore("");
    setAiStreamMessages([]);
  }, [selected?.id]);

  // Load detail when selected
  useEffect(() => {
    if (!selected) return;
    if (detailCache[selected.id]) return;

    let cancelled = false;
    setLoadingDetail(true);

    fetch(`/api/admin/hackathon/phase3/${selected.type === 'cycle' ? 'cycles' : selected.type}/${selected.id}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        setDetailCache((prev) => ({ ...prev, [selected.id]: data }));
      })
      .catch(() => null)
      .finally(() => { if (!cancelled) setLoadingDetail(false); });

    return () => { cancelled = true; };
  }, [selected?.id, selected?.type]);

  function goToPage(pg: number) {
    if (pg < 1 || pg > pagination.total_pages || pg === pagination.page) return;
    pageRef.current = pg;
    void fetchItems(pg);
  }

  const visibleItems = items.filter((item) => {
    const query = search.trim().toLowerCase();
    if (!query) return true;
    return [
      item.team_name,
      item.team_lobby_code,
      item.hypothesis,
      item.what_learned,
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

    let body: Record<string, unknown> = { feedback, notes };
    if (selected.type === "cycle") {
      body = {
        ...body,
        hypothesis_quality: Number(cycleScores.hypothesis_quality) || 0,
        variable_isolation: Number(cycleScores.variable_isolation) || 0,
        behavioral_evidence: Number(cycleScores.behavioral_evidence) || 0,
        tester_freshness: Number(cycleScores.tester_freshness) || 0,
        synthesis_honesty: Number(cycleScores.synthesis_honesty) || 0,
      };
    } else if (selected.type === "midphase") {
      body = { ...body, confidence_score: Number(midphaseConfidence) || null };
    } else if (selected.type === "video") {
      body = { ...body, total_score: Number(judgeScore) || null, human_review_status: "reviewed" };
    }

    try {
      const response = await fetch(
        `/api/admin/hackathon/phase3/${selected.type === 'cycle' ? 'cycles' : selected.type}/${selected.id}/review`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
      );
      const data = await response.json();
      if (!response.ok) {
        setMessage(data.error ?? "Failed to save review");
        return;
      }
      setMessage("Review saved.");
      await fetchItems();
    } catch {
      setMessage("Failed to save review");
    } finally {
      setSaving(false);
    }
  }

  async function runAiGrade() {
    if (!selected || selected.type === "video") return; // video not supported yet
    setAiGrading(true);
    setAiStreamMessages([]);
    setMessage("");

    try {
      const response = await fetch(
        `/api/admin/hackathon/phase3/${selected.type === 'cycle' ? 'cycles' : selected.type}/${selected.id}/ai-grade`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) }
      );
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setMessage(data.error ?? "AI grading failed");
        setAiGrading(false);
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        setMessage("No response stream");
        setAiGrading(false);
        return;
      }

      const decoder = new TextDecoder();
      let buffer = "";
      let finalScorecard: Record<string, unknown> | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const obj = JSON.parse(line);
            if (obj.type === "thinking") {
              setAiStreamMessages((prev) => prev.slice(-10).concat(`[${obj.model}] ${obj.delta?.slice(0, 80) ?? ""}`));
            } else if (obj.type === "done") {
              finalScorecard = obj.scorecard ?? null;
              setAiStreamMessages((prev) => prev.concat("AI grading complete."));
            } else if (obj.type === "error") {
              setAiStreamMessages((prev) => prev.concat(`Error: ${obj.message}`));
            }
          } catch {
            // ignore malformed lines
          }
        }
      }

      if (finalScorecard && selected.type === "cycle") {
        const c = finalScorecard as Record<string, number>;
        setCycleScores({
          hypothesis_quality: String(c.hypothesis_quality ?? ""),
          variable_isolation: String(c.variable_isolation ?? ""),
          behavioral_evidence: String(c.behavioral_evidence ?? ""),
          tester_freshness: String(c.tester_freshness ?? ""),
          synthesis_honesty: String(c.synthesis_honesty ?? ""),
        });
      }

      await fetchItems();
    } catch (err) {
      setMessage(`AI grading error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setAiGrading(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-slate-700/50 bg-slate-900/50">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Total</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">{pagination.total_items || counts.total}</CardContent>
        </Card>
        <Card className="border-amber-500/30 bg-amber-500/10">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Cycles</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold text-amber-200">{counts.cycles}</CardContent>
        </Card>
        <Card className="border-blue-500/30 bg-blue-500/10">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Midphase</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold text-blue-200">{counts.midphase}</CardContent>
        </Card>
        <Card className="border-purple-500/30 bg-purple-500/10">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Videos</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold text-purple-200">{counts.videos}</CardContent>
        </Card>
      </div>

      <Card className="border-slate-700/50 bg-slate-900/50">
        <CardHeader>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ClipboardCheck className="h-5 w-5 text-amber-300" />
                Phase 3 Grading
              </CardTitle>
              <CardDescription>Grade cycles, mid-phase synthesis, and video submissions.</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => fetchItems()} disabled={loading}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by team, lobby code, or hypothesis" className="pl-9" />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as Phase3Status | "all")}
              className="h-10 rounded-md border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100"
            >
              <option value="all">All</option>
              <option value="ungraded">Needs grading</option>
              <option value="graded">Graded</option>
            </select>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as Phase3EntityType | "all")}
              className="h-10 rounded-md border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100"
            >
              <option value="all">All types</option>
              <option value="cycle">Cycles</option>
              <option value="midphase">Midphase</option>
              <option value="video">Videos</option>
            </select>
            <Button variant="outline" size="sm" onClick={runAiGrade} disabled={aiGrading || !selected || selected.type === "video"}>
              {aiGrading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              AI Grade
            </Button>
          </div>

          {message && <div className="rounded-md border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-slate-300">{message}</div>}

          {loading ? (
            <div className="flex items-center justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-slate-400" /></div>
          ) : visibleItems.length === 0 ? (
            <div className="py-16 text-center text-sm text-slate-500">No Phase 3 items match these filters.</div>
          ) : (
            <div className="grid gap-4 xl:grid-cols-[minmax(320px,420px)_1fr]">
              {/* Sidebar list */}
              <div className="max-h-[720px] space-y-2 overflow-y-auto pr-1">
                {visibleItems.map((item) => (
                  <button
                    key={`${item.type}-${item.id}`}
                    type="button"
                    onClick={() => setSelectedId(item.id)}
                    className={`w-full rounded-md border p-3 text-left transition-colors ${
                      selected?.id === item.id ? "border-amber-400/60 bg-amber-500/10" : "border-slate-800 bg-slate-950/50 hover:border-slate-600"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-slate-100">{item.team_name ?? "Unnamed team"}</div>
                        <div className="mt-1 text-xs text-slate-400">
                          {item.type === "cycle" ? `Cycle #${item.cycle_number}` : item.type === "midphase" ? "Mid-phase synthesis" : "Video submission"}
                        </div>
                      </div>
                      <ScoredByBadge scoredBy={item.scored_by} score={item.score} />
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <EntityTypeBadge type={item.type} />
                      {item.team_lobby_code && <Badge variant="outline" className="border-slate-700 text-slate-400">{item.team_lobby_code}</Badge>}
                      {item.submitted_at && <span>{format(new Date(item.submitted_at), "MMM d, HH:mm")}</span>}
                    </div>
                  </button>
                ))}
              </div>

              {/* Pagination */}
              {pagination.total_pages > 1 && (
                <div className="col-span-full flex items-center justify-between border-t border-slate-800 pt-3">
                  <span className="text-xs text-slate-500">Page {pagination.page} of {pagination.total_pages} · {pagination.total_items} items</span>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="sm" disabled={pagination.page <= 1} onClick={() => goToPage(pagination.page - 1)}><ChevronLeft className="h-4 w-4" /></Button>
                    {Array.from({ length: Math.min(5, pagination.total_pages) }, (_, i) => {
                      const start = Math.max(1, Math.min(pagination.page - 2, pagination.total_pages - 4));
                      const pg = start + i;
                      if (pg > pagination.total_pages) return null;
                      return (
                        <Button key={pg} variant={pg === pagination.page ? "default" : "outline"} size="sm" onClick={() => goToPage(pg)} className="min-w-[36px]">{pg}</Button>
                      );
                    })}
                    <Button variant="outline" size="sm" disabled={pagination.page >= pagination.total_pages} onClick={() => goToPage(pagination.page + 1)}><ChevronRight className="h-4 w-4" /></Button>
                  </div>
                </div>
              )}

              {/* Detail panel */}
              {selected && (
                <div className="rounded-md border border-slate-800 bg-slate-950/50 p-4">
                  <div className="flex flex-col gap-3 border-b border-slate-800 pb-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold text-slate-100">
                          {selected.type === "cycle" ? `Cycle #${selected.cycle_number}` : selected.type === "midphase" ? "Mid-phase Synthesis" : "Video Submission"}
                        </h3>
                        <ScoredByBadge scoredBy={selected.scored_by} score={selected.score} />
                      </div>
                      <p className="mt-1 text-sm text-slate-400">
                        {selected.team_name ?? "Unnamed team"} {selected.team_lobby_code ? `(${selected.team_lobby_code})` : ""}
                      </p>
                    </div>
                  </div>

                  {loadingDetail && <div className="py-4 text-sm text-slate-500"><Loader2 className="mr-2 inline h-4 w-4 animate-spin" />Loading details...</div>}

                  {/* AI stream messages */}
                  {aiStreamMessages.length > 0 && (
                    <div className="mt-3 rounded-md border border-blue-800/50 bg-blue-950/20 p-3">
                      <div className="mb-1 text-xs font-semibold text-blue-300">AI Grading</div>
                      <div className="max-h-32 overflow-y-auto space-y-1 text-[10px] text-slate-400 font-mono">
                        {aiStreamMessages.map((m, i) => (<div key={i}>{m}</div>))}
                      </div>
                    </div>
                  )}

                  {/* CYCLE DETAIL */}
                  {selected.type === "cycle" && (
                    <div className="grid gap-4 py-4 lg:grid-cols-[1fr_320px]">
                      <div className="space-y-4">
                        {selected.hypothesis && (
                          <div className="rounded-md border border-slate-800 bg-slate-900/40 p-3">
                            <h4 className="mb-2 text-sm font-semibold text-slate-300">Hypothesis</h4>
                            <p className="whitespace-pre-wrap text-sm text-slate-200">{selected.hypothesis}</p>
                          </div>
                        )}
                        {(() => {
                          const detail = detailCache[selected.id] as CycleDetail | undefined;
                          const pretotypeStep = detail?.steps?.find((s) => s.step_type === "pretotype");
                          const pretotypeData = pretotypeStep?.submission_data;
                          
                          const varChanged = detail?.variable_changed || pretotypeData?.variable_changed;
                          const method = detail?.pretotype_method || pretotypeData?.method;
                          const desc = detail?.pretotype_description || pretotypeData?.description;
                          const artifact = detail?.pretotype_artifact_url || pretotypeData?.artifact_url;

                          if (!method && !desc && !varChanged && !artifact) return null;
                          return (
                            <div className="rounded-md border border-slate-800 bg-slate-900/40 p-3">
                              <h4 className="mb-2 text-sm font-semibold text-slate-300">Pretotype & Setup</h4>
                              <div className="space-y-2 text-sm text-slate-200">
                                {varChanged && (
                                  <div><span className="font-semibold text-slate-400">Variable Changed:</span> {varChanged}</div>
                                )}
                                {method && (
                                  <div><span className="font-semibold text-slate-400">Method:</span> {method}</div>
                                )}
                                {desc && (
                                  <div><span className="font-semibold text-slate-400">Description:</span> <p className="whitespace-pre-wrap mt-1">{desc}</p></div>
                                )}
                                {artifact && (
                                  <div>
                                    <span className="font-semibold text-slate-400">Artifact:</span>{" "}
                                    <a href={artifact} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline break-all">
                                      {artifact}
                                    </a>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })()}
                        {(() => {
                          const detail = detailCache[selected.id] as CycleDetail | undefined;
                          const synthesisStep = detail?.steps?.find((s) => s.step_type === "synthesis");
                          const synthesisData = synthesisStep?.submission_data;
                          
                          const result = selected.synthesis_result || detail?.synthesis_result || synthesisData?.gate_decision;
                          const changed = detail?.synthesis_what_changed || synthesisData?.what_changed;
                          const wrongness = detail?.synthesis_honest_wrongness || synthesisData?.honest_wrongness;
                          const nextVar = synthesisData?.next_variable;

                          if (!result && !changed && !wrongness && !nextVar) return null;
                          return (
                            <div className="rounded-md border border-slate-800 bg-slate-900/40 p-3">
                              <h4 className="mb-2 text-sm font-semibold text-slate-300">Synthesis</h4>
                              {result && <Badge variant="outline" className="mb-3">{result}</Badge>}
                              <div className="space-y-3 text-sm text-slate-200">
                                {changed && (
                                  <div>
                                    <span className="font-semibold text-slate-400 block mb-1">What Changed/Learned:</span>
                                    <p className="whitespace-pre-wrap">{changed}</p>
                                  </div>
                                )}
                                {wrongness && (
                                  <div>
                                    <span className="font-semibold text-slate-400 block mb-1">Honest Wrongness:</span>
                                    <p className="whitespace-pre-wrap">{wrongness}</p>
                                  </div>
                                )}
                                {nextVar && (
                                  <div>
                                    <span className="font-semibold text-slate-400 block mb-1">Next Variable to Test:</span>
                                    <p className="whitespace-pre-wrap">{nextVar}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })()}
                        {/* Test sessions */}
                        {(() => {
                          const detail = detailCache[selected.id] as CycleDetail | undefined;
                          const testSessionStep = detail?.steps?.find((s) => s.step_type === "test_session");
                          const stepTesters = testSessionStep?.submission_data?.testers as Array<any> | undefined;
                          const testRunStep = detail?.steps?.find((s) => s.step_type === "test_run");
                          const testRuns = testRunStep?.submission_data?.runs as Array<any> | undefined;

                          if (!detail?.test_sessions?.length && !stepTesters?.length && !testRuns?.length) return null;
                          return (
                            <div className="rounded-md border border-slate-800 bg-slate-900/40 p-3">
                              <h4 className="mb-2 text-sm font-semibold text-slate-300">Test Sessions ({(detail?.test_sessions?.length || 0) + (stepTesters?.length || 0) + (testRuns?.length || 0)})</h4>
                              <div className="space-y-3">
                                {detail?.test_sessions?.map((ts) => (
                                  <div key={ts.id} className="rounded border border-slate-700 bg-slate-950/60 p-3">
                                    <div className="flex items-center justify-between">
                                      <span className="text-sm font-medium text-slate-200">{ts.tester_name}</span>
                                      <Badge variant="outline" className={ts.fresh_tester ? "border-emerald-500/40 text-emerald-300" : "border-slate-600 text-slate-400"}>
                                        {ts.fresh_tester ? "Fresh" : "Repeat"}
                                      </Badge>
                                    </div>
                                    {ts.session_result && <Badge variant="outline" className="mt-1">{ts.session_result}</Badge>}
                                    {ts.painful_detail && <p className="mt-2 text-xs text-slate-400">Pain: {ts.painful_detail}</p>}
                                    {ts.unprompted_quotes?.length > 0 && (
                                      <div className="mt-2 space-y-1">
                                        {ts.unprompted_quotes.map((q, i) => (
                                          <p key={i} className="text-xs text-slate-300 italic">&ldquo;{q}&rdquo;</p>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                ))}
                                {stepTesters?.map((t, idx) => (
                                  <div key={idx} className="rounded border border-slate-700 bg-slate-950/60 p-3 space-y-1">
                                    <div className="flex items-center justify-between">
                                      <span className="text-sm font-medium text-slate-200">{t.name || t.tester_name}</span>
                                      {t.fresh_tester !== undefined && (
                                        <Badge variant="outline" className={t.fresh_tester ? "border-emerald-500/40 text-emerald-300" : "border-slate-600 text-slate-400"}>
                                          {t.fresh_tester ? "Fresh" : "Repeat"}
                                        </Badge>
                                      )}
                                    </div>
                                    {t.role && <p className="text-xs text-slate-400">Role: {t.role}</p>}
                                    {t.oldHabit && <p className="text-xs text-slate-400">Old Habit: {t.oldHabit}</p>}
                                    {t.painful_detail && <p className="mt-1 text-xs text-slate-400">Pain: {t.painful_detail}</p>}
                                    {t.session_result && <Badge variant="outline" className="mt-1">{t.session_result}</Badge>}
                                  </div>
                                ))}
                                {testRuns?.map((t, idx) => (
                                  <div key={`run-${idx}`} className="rounded border border-slate-700 bg-slate-950/60 p-3 space-y-1">
                                    <div className="flex items-center justify-between">
                                      <span className="text-sm font-medium text-slate-200">{t.name}</span>
                                    </div>
                                    {t.role && <p className="text-xs text-slate-400">Role: {t.role}</p>}
                                    {t.oldHabit && <p className="text-xs text-slate-400">Old Habit: {t.oldHabit}</p>}
                                    {t.observation && <p className="mt-1 text-xs text-slate-400">Observation: {t.observation}</p>}
                                    {t.result && <Badge variant="outline" className="mt-1">{t.result}</Badge>}
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })()}
                      </div>

                      {/* Grading form */}
                      <div className="space-y-4 rounded-md border border-slate-800 bg-slate-900/40 p-4">
                        <h4 className="text-sm font-semibold text-slate-300">Scorecard (0-20 each)</h4>
                        {[
                          { key: "hypothesis_quality", label: "Hypothesis quality" },
                          { key: "variable_isolation", label: "Variable isolation" },
                          { key: "behavioral_evidence", label: "Behavioral evidence" },
                          { key: "tester_freshness", label: "Tester freshness" },
                          { key: "synthesis_honesty", label: "Synthesis honesty" },
                        ].map(({ key, label }) => (
                          <div key={key} className="space-y-1">
                            <Label htmlFor={`score-${key}`}>{label}</Label>
                            <Input
                              id={`score-${key}`}
                              type="number"
                              min="0"
                              max="20"
                              value={cycleScores[key as keyof typeof cycleScores]}
                              onChange={(e) => setCycleScores((prev) => ({ ...prev, [key]: e.target.value }))}
                              placeholder="0-20"
                            />
                          </div>
                        ))}
                        <div className="space-y-1">
                          <Label htmlFor="feedback">Feedback</Label>
                          <Textarea id="feedback" value={feedback} onChange={(e) => setFeedback(e.target.value)} rows={5} placeholder="Student-facing feedback" />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="notes">Mentor notes</Label>
                          <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Private mentor notes" />
                        </div>
                        <Button onClick={submitReview} disabled={saving} className="w-full">
                          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                          Save review
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* MIDPHASE DETAIL */}
                  {selected.type === "midphase" && (
                    <div className="grid gap-4 py-4 lg:grid-cols-[1fr_320px]">
                      <div className="space-y-4">
                        {selected.what_learned && (
                          <div className="rounded-md border border-slate-800 bg-slate-900/40 p-3">
                            <h4 className="mb-1 text-sm font-semibold text-slate-300">What learned</h4>
                            <p className="text-sm text-slate-200">{selected.what_learned}</p>
                          </div>
                        )}
                        {selected.what_changed && (
                          <div className="rounded-md border border-slate-800 bg-slate-900/40 p-3">
                            <h4 className="mb-1 text-sm font-semibold text-slate-300">What changed</h4>
                            <p className="text-sm text-slate-200">{selected.what_changed}</p>
                          </div>
                        )}
                        {selected.what_wrong && (
                          <div className="rounded-md border border-slate-800 bg-slate-900/40 p-3">
                            <h4 className="mb-1 text-sm font-semibold text-slate-300">What was wrong</h4>
                            <p className="text-sm text-slate-200">{selected.what_wrong}</p>
                          </div>
                        )}
                        {(() => {
                          const detail = detailCache[selected.id] as MidphaseDetail | undefined;
                          if (!detail?.next_hypothesis) return null;
                          return (
                            <div className="rounded-md border border-slate-800 bg-slate-900/40 p-3">
                              <h4 className="mb-1 text-sm font-semibold text-slate-300">Next hypothesis</h4>
                              <p className="text-sm text-slate-200">{detail.next_hypothesis}</p>
                            </div>
                          );
                        })()}
                      </div>

                      <div className="space-y-4 rounded-md border border-slate-800 bg-slate-900/40 p-4">
                        <h4 className="text-sm font-semibold text-slate-300">Grading</h4>
                        <div className="space-y-1">
                          <Label htmlFor="confidence">Confidence (1-10)</Label>
                          <Input id="confidence" type="number" min="1" max="10" value={midphaseConfidence} onChange={(e) => setMidphaseConfidence(e.target.value)} placeholder="1-10" />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="feedback">Feedback</Label>
                          <Textarea id="feedback" value={feedback} onChange={(e) => setFeedback(e.target.value)} rows={5} placeholder="Student-facing feedback" />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="notes">Mentor notes</Label>
                          <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Private mentor notes" />
                        </div>
                        <Button onClick={submitReview} disabled={saving} className="w-full">
                          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                          Save review
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* VIDEO DETAIL */}
                  {selected.type === "video" && (
                    <div className="grid gap-4 py-4 lg:grid-cols-[1fr_320px]">
                      <div className="space-y-4">
                        {selected.video_url && (
                          <div className="rounded-md border border-slate-800 bg-slate-900/40 p-3">
                            <h4 className="mb-2 text-sm font-semibold text-slate-300">Video</h4>
                            <video src={selected.video_url} controls className="w-full max-h-96 rounded-md" />
                          </div>
                        )}
                      </div>

                      <div className="space-y-4 rounded-md border border-slate-800 bg-slate-900/40 p-4">
                        <h4 className="text-sm font-semibold text-slate-300">Judge scoring</h4>
                        <div className="space-y-1">
                          <Label htmlFor="judge-score">Total score (0-100)</Label>
                          <Input id="judge-score" type="number" min="0" max="100" value={judgeScore} onChange={(e) => setJudgeScore(e.target.value)} placeholder="0-100" />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="notes">Judge notes</Label>
                          <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={5} placeholder="Judge feedback" />
                        </div>
                        <Button onClick={submitReview} disabled={saving} className="w-full">
                          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                          Save review
                        </Button>
                      </div>
                    </div>
                  )}
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
